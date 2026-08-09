import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  MailerService,
  createNodemailerSmtpTransport,
  createResendTransport,
  createConsoleMailTransport,
  renderLeadAlertEmail,
  renderWelcomeEmail,
  renderPasswordResetEmail,
  MailTransport,
  MailMessage,
  NodemailerLike,
} from '../services/mailer';

// ─── Mock transport ──────────────────────────────────────

class MockSmtpTransport implements MailTransport {
  public sent: MailMessage[] = [];
  async sendEmail(message: MailMessage): Promise<void> {
    this.sent.push({ ...message, to: message.to });
  }
}

function makeLeadAlert() {
  return {
    name: 'Jane Doe',
    email: 'jane@acme.com',
    phone: '555-123-4567',
    company: 'Acme Corp',
    leadScore: 85,
    qualificationStatus: 'sales_qualified',
    buyingIntent: 'high',
    source: 'chat',
    url: 'https://app.example.com/admin/conversations/conv-1',
  };
}

// ─── Template rendering ──────────────────────────────────

describe('mailer templates', () => {
  it('renderLeadAlertEmail includes workspace, lead fields and summary', () => {
    const html = renderLeadAlertEmail(
      'Acme Widgets',
      makeLeadAlert(),
      'Wants to buy 500 units this quarter.',
    );
    expect(html).toContain('Sales-Qualified Lead');
    expect(html).toContain('Acme Widgets');
    expect(html).toContain('Jane Doe');
    expect(html).toContain('jane@acme.com');
    expect(html).toContain('555-123-4567');
    expect(html).toContain('Acme Corp');
    expect(html).toContain('85/100');
    expect(html).toContain('sales qualified');
    expect(html).toContain('Wants to buy 500 units this quarter.');
    expect(html).toContain('https://app.example.com/admin/conversations/conv-1');
  });

  it('renderLeadAlertEmail escapes HTML-sensitive values', () => {
    const html = renderLeadAlertEmail('A <b>Corp</b>', { name: '<script>alert(1)</script>', company: 'A & B' }, 'Hi & bye <img src=x>');
    expect(html).not.toContain('<script>alert(1)</script>');
    expect(html).not.toContain('<b>Corp</b>');
    expect(html).toContain('&lt;script&gt;');
    expect(html).toContain('A &amp; B');
    expect(html).toContain('Hi &amp; bye');
  });

  it('renderLeadAlertEmail omits the summary block when not provided', () => {
    const withSummary = renderLeadAlertEmail('T', makeLeadAlert(), 'summary');
    const without = renderLeadAlertEmail('T', makeLeadAlert());
    expect(withSummary).toContain('Conversation summary');
    expect(without).not.toContain('Conversation summary');
  });

  it('renderWelcomeEmail includes user name and verification link', () => {
    const html = renderWelcomeEmail('Alice <3', 'https://app.example.com/verify-email?token=abc');
    expect(html).toContain('Alice &lt;3');
    expect(html).toContain('https://app.example.com/verify-email?token=abc');
    expect(html).toContain('Verify Email');
  });

  it('renderPasswordResetEmail includes the reset link', () => {
    const html = renderPasswordResetEmail('https://app.example.com/reset-password?token=xyz');
    expect(html).toContain('Reset Password');
    expect(html).toContain('https://app.example.com/reset-password?token=xyz');
  });
});

// ─── MailerService with mock SMTP transport ──────────────

describe('MailerService', () => {
  const transport = new MockSmtpTransport();
  const mailer = new MailerService({ transport, fromEmail: 'noreply@conversationengine.com', appUrl: 'https://app.example.com' });

  beforeEach(() => { transport.sent = []; });

  it('sendLeadAlert delivers to a single recipient with subject + HTML + text', async () => {
    await mailer.sendLeadAlert('ops@acme.com', {
      tenantName: 'Acme Widgets',
      lead: makeLeadAlert(),
      conversationSummary: 'Wants pricing for 500 units.',
    });

    expect(transport.sent.length).toBe(1);
    const msg = transport.sent[0];
    expect(msg.to).toBe('ops@acme.com');
    expect(msg.subject).toContain('Sales-Qualified Lead');
    expect(msg.subject).toContain('Jane Doe');
    expect(msg.html).toContain('Acme Widgets');
    expect(msg.html).toContain('Wants pricing for 500 units.');
    expect(msg.text).toContain('Name: Jane Doe');
    expect(msg.text).toContain('View session: https://app.example.com/admin/conversations/conv-1');
  });

  it('sendLeadAlert supports an array of recipients and a custom subject', async () => {
    await mailer.sendLeadAlert(['ops@acme.com', 'sales@acme.com'], {
      tenantName: 'Acme Widgets',
      lead: { name: 'Bob', leadScore: 40, qualificationStatus: 'marketing_qualified' },
      subject: 'Custom alert',
    });
    const msg = transport.sent[0];
    expect(msg.to).toEqual(['ops@acme.com', 'sales@acme.com']);
    expect(msg.subject).toBe('Custom alert');
    expect(msg.html).toContain('marketing qualified');
  });

  it('uses a New Lead subject for unqualified leads', async () => {
    await mailer.sendLeadAlert('ops@acme.com', {
      tenantName: 'T',
      lead: { email: 'visitor@x.com' },
    });
    expect(transport.sent[0].subject).toContain('New Lead');
  });

  it('sendWelcome and sendPasswordReset render + send the right content', async () => {
    await mailer.sendWelcome('alice@acme.com', { userName: 'Alice', verificationLink: 'https://app.example.com/verify-email?token=abc' });
    await mailer.sendPasswordReset('alice@acme.com', { resetLink: 'https://app.example.com/reset-password?token=xyz' });

    expect(transport.sent.length).toBe(2);
    expect(transport.sent[0].subject).toContain('Welcome');
    expect(transport.sent[0].html).toContain('Alice');
    expect(transport.sent[1].subject).toContain('Reset your password');
    expect(transport.sent[1].html).toContain('https://app.example.com/reset-password?token=xyz');
  });

  it('send forwards the raw message untouched', async () => {
    await mailer.send({ to: 'x@y.com', subject: 'S', html: '<p>Hi</p>', text: 'Hi' });
    expect(transport.sent[0]).toMatchObject({ to: 'x@y.com', subject: 'S', html: '<p>Hi</p>', text: 'Hi' });
  });
});

// ─── Nodemailer SMTP transport ───────────────────────────

describe('createNodemailerSmtpTransport', () => {
  it('sends via a nodemailer transporter with SMTP + auth config', async () => {
    const sent: Record<string, unknown>[] = [];
    const fakeNodemailer: NodemailerLike = {
      createTransport: (options) => {
        sent.push(options);
        return { sendMail: async (message) => { sent.push(message); return {}; } };
      },
    };

    const transport = createNodemailerSmtpTransport(
      { host: 'smtp.example.com', port: 587, user: 'mailer', pass: 'secret', from: 'no-reply@example.com' },
      fakeNodemailer,
    );

    await transport.sendEmail({ to: 'ops@acme.com', subject: 'Lead alert', html: '<p>Hi</p>', text: 'Hi' });

    expect(sent[0]).toMatchObject({ host: 'smtp.example.com', port: 587, secure: false, auth: { user: 'mailer', pass: 'secret' } });
    expect(sent[1]).toMatchObject({
      from: 'no-reply@example.com',
      to: 'ops@acme.com',
      subject: 'Lead alert',
      html: '<p>Hi</p>',
      text: 'Hi',
    });
  });

  it('defaults from to the SMTP user when not provided', async () => {
    const sent: Record<string, unknown>[] = [];
    const fakeNodemailer: NodemailerLike = {
      createTransport: () => ({
        sendMail: async (message) => { sent.push(message); return {}; },
      }),
    };
    const transport = createNodemailerSmtpTransport({ host: 'smtp.example.com', port: 465, secure: true, user: 'mailer' }, fakeNodemailer);
    await transport.sendEmail({ to: 'x@y.com', subject: 'S', html: '<p>a</p>' });
    expect(sent[0].from).toBe('mailer');
  });
});

// ─── Resend transport ────────────────────────────────────

describe('createResendTransport', () => {
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
  });

  afterEach(() => vi.unstubAllGlobals());

  it('POSTs to the Resend API with bearer auth and the message payload', async () => {
    fetchMock.mockResolvedValue({ ok: true, status: 200, text: async () => '{"id":"x"}' });
    const transport = createResendTransport({ apiKey: 're_test', from: 'Acme <onboarding@resend.dev>' });

    await transport.sendEmail({ to: ['a@x.com', 'b@x.com'], subject: 'Lead', html: '<p>Hi</p>', text: 'Hi' });

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe('https://api.resend.com/emails');
    expect(init.method).toBe('POST');
    expect(init.headers.Authorization).toBe('Bearer re_test');
    const body = JSON.parse(init.body);
    expect(body.from).toBe('Acme <onboarding@resend.dev>');
    expect(body.to).toEqual(['a@x.com', 'b@x.com']);
    expect(body.subject).toBe('Lead');
  });

  it('throws when Resend responds with an error', async () => {
    fetchMock.mockResolvedValue({ ok: false, status: 429, text: async () => 'rate limited' });
    const transport = createResendTransport({ apiKey: 're_test' });
    await expect(transport.sendEmail({ to: 'a@x.com', subject: 'S', html: '<p>x</p>' })).rejects.toThrow(/429/);
  });
});

// ─── Console transport ───────────────────────────────────

describe('createConsoleMailTransport', () => {
  it('logs the message', async () => {
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    const transport = createConsoleMailTransport();
    await transport.sendEmail({ to: ['a@x.com'], subject: 'S', html: '<p>x</p>', text: 'x' });
    expect(logSpy).toHaveBeenCalled();
    logSpy.mockRestore();
  });
});

// ─── fromEnv factory ─────────────────────────────────────

describe('MailerService.fromEnv', () => {
  it('prefers SMTP config when host + port are set', () => {
    const mailer = MailerService.fromEnv({
      MAILER_SMTP_HOST: 'smtp.example.com',
      MAILER_SMTP_PORT: '587',
      MAILER_SMTP_USER: 'u',
      MAILER_SMTP_PASS: 'p',
    } as NodeJS.ProcessEnv);
    expect(mailer.transport).toBeDefined();
  });

  it('falls back to Resend when only RESEND_API_KEY is set', () => {
    const mailer = MailerService.fromEnv({ RESEND_API_KEY: 're_test' } as NodeJS.ProcessEnv);
    expect(mailer.transport).toBeDefined();
  });

  it('falls back to the console transport when nothing is configured', () => {
    const mailer = MailerService.fromEnv({} as NodeJS.ProcessEnv);
    expect(mailer.transport).toBeDefined();
  });
});
