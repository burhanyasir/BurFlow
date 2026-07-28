export interface EmailPayload {
  to: string;
  subject: string;
  text: string;
  html?: string;
}

export interface EmailService {
  send(payload: EmailPayload): Promise<void>;
}

export class ConsoleEmailProvider implements EmailService {
  async send(payload: EmailPayload): Promise<void> {
    console.log('=== Email Service ===');
    console.log(`To: ${payload.to}`);
    console.log(`Subject: ${payload.subject}`);
    console.log(`Body:\n${payload.text}`);
    if (payload.html) {
      console.log(`HTML:\n${payload.html}`);
    }
    console.log('=== End Email ===');
  }
}

let _instance: EmailService = new ConsoleEmailProvider();

export function setEmailProvider(provider: EmailService): void {
  _instance = provider;
}

export function getEmailService(): EmailService {
  return _instance;
}
