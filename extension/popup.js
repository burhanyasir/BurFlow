// ── BurFlow Lead Generator — Popup Script ──────────────────────────────
// Scraping, contact extraction, CSV export, and email template draft dispatch.

const state = {
  leads: [],
  scraping: false,
  extracting: false,
  searchType: 'google',
  launching: false,
};

const DEFAULT_TEMPLATE = {
  subject: 'Quick question about {{Name}}',
  body: `Hi {{Name}},

I came across {{Website}} and wanted to reach out.

I help businesses like yours get more customers through AI-powered website assistants. I noticed a few quick wins that could boost your leads.

Would you be open to a 10-minute chat this week?

Best,
BurFlow Team`
};

// ── DOM Refs ──────────────────────────────────────────────────────────
const $ = (id) => document.getElementById(id);
const countLeads  = $('countLeads');
const countEmails = $('countEmails');
const countPhones = $('countPhones');
const statusDot   = $('statusDot');
const statusText  = $('statusText');
const startBtn    = $('startBtn');
const extractBtn  = $('extractBtn');
const resetBtn    = $('resetBtn');
const exportCsvBtn = $('exportCsvBtn');
const preview     = $('preview');
const previewBody = $('previewBody');
const mainContent = $('mainContent');
const notGoogle   = $('notGoogle');
const queryInput  = $('queryInput');

// Template refs
const templateSubject = $('templateSubject');
const templateBody    = $('templateBody');
const draftDelay      = $('draftDelay');
const previewSubject  = $('previewSubject');
const previewBody2    = $('previewBody2');
const launchDrafts    = $('launchDrafts');
const draftCount      = $('draftCount');
const launchStatus    = $('launchStatus');

// ── Tab Navigation ────────────────────────────────────────────────────
document.querySelectorAll('.tab-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
    btn.classList.add('active');
    document.getElementById(`tab-${btn.dataset.tab}`).classList.add('active');
  });
});

// ── Init ──────────────────────────────────────────────────────────────
async function init() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  const isGoogle = tab?.url && (
    tab.url.includes('google.com/search') || tab.url.includes('google.com/maps')
  );

  if (!isGoogle) {
    mainContent.classList.add('hidden');
    notGoogle.classList.add('visible');
    return;
  }

  if (tab.url.includes('google.com/maps')) {
    setSearchType('maps');
  } else {
    setSearchType('google');
  }

  try {
    const url = new URL(tab.url);
    const q = url.searchParams.get('q') || url.searchParams.get('query') || '';
    if (q) queryInput.value = q;
  } catch {}

  const saved = await chrome.storage.local.get(['leads', 'searchType', 'template']);
  if (saved.leads?.length) state.leads = saved.leads;
  if (saved.searchType) setSearchType(saved.searchType);

  if (saved.template) {
    templateSubject.value = saved.template.subject || DEFAULT_TEMPLATE.subject;
    templateBody.value = saved.template.body || DEFAULT_TEMPLATE.body;
  } else {
    templateSubject.value = DEFAULT_TEMPLATE.subject;
    templateBody.value = DEFAULT_TEMPLATE.body;
  }

  updateUI();
  updateTemplatePreview();
}

// ── Save template on change ───────────────────────────────────────────
function saveTemplate() {
  chrome.storage.local.set({
    template: { subject: templateSubject.value, body: templateBody.value }
  });
}
templateSubject.addEventListener('input', () => { saveTemplate(); updateTemplatePreview(); });
templateBody.addEventListener('input', () => { saveTemplate(); updateTemplatePreview(); });

// ── Template Variable Replacement ─────────────────────────────────────
function replaceVars(text, lead) {
  return text
    .replace(/\{\{Name\}\}/g, lead.name || '')
    .replace(/\{\{Website\}\}/g, lead.website || '')
    .replace(/\{\{Location\}\}/g, lead.address || '')
    .replace(/\{\{Phone\}\}/g, lead.phone || '')
    .replace(/\{\{Email\}\}/g, lead.email || '')
    .replace(/\{\{Rating\}\}/g, lead.rating ? `★ ${lead.rating}` : '')
    .replace(/\{\{Reviews\}\}/g, lead.reviews || '');
}

function updateTemplatePreview() {
  const subject = templateSubject.value || '—';
  const body = templateBody.value || '';
  if (state.leads.length > 0) {
    const sample = state.leads.find(l => l.email) || state.leads[0];
    previewSubject.textContent = replaceVars(subject, sample);
    previewBody2.textContent = replaceVars(body, sample);
  } else {
    const placeholder = {
      name: 'Acme Corp', website: 'https://acme.com', address: 'New York, NY',
      phone: '(555) 123-4567', email: 'info@acme.com', rating: '4.5', reviews: '128',
    };
    previewSubject.textContent = replaceVars(subject, placeholder);
    previewBody2.textContent = replaceVars(body, placeholder);
  }
}

// ── Search Type Toggle ────────────────────────────────────────────────
$('searchTypeToggle').addEventListener('click', (e) => {
  const btn = e.target.closest('.toggle-btn');
  if (!btn) return;
  setSearchType(btn.dataset.type);
});

function setSearchType(type) {
  state.searchType = type;
  document.querySelectorAll('.toggle-btn').forEach(b => {
    b.classList.toggle('active', b.dataset.type === type);
  });
  chrome.storage.local.set({ searchType: type });
}

// ── Start Scraping ────────────────────────────────────────────────────
startBtn.addEventListener('click', async () => {
  if (state.scraping) return;
  state.scraping = true;
  setScrapingStatus('active', 'Scraping page…');

  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    try {
      await chrome.scripting.executeScript({ target: { tabId: tab.id }, files: ['content.js'] });
    } catch {}

    const response = await chrome.tabs.sendMessage(tab.id, {
      action: 'scrape', searchType: state.searchType,
      times: state.searchType === 'maps' ? 8 : 0,
      delayMs: 1200,
    });

    if (response?.leads) {
      const existingKeys = new Set(state.leads.map(l => `${l.name}|||${l.website}`));
      for (const lead of response.leads) {
        const key = `${lead.name}|||${lead.website}`;
        if (!existingKeys.has(key)) {
          state.leads.push(lead);
          existingKeys.add(key);
        }
      }
      await chrome.storage.local.set({ leads: state.leads });
      updateUI();
      setScrapingStatus('done', `Found ${response.leads.length} results on this page`);
    } else {
      setScrapingStatus('done', 'No results found on this page');
    }
  } catch (err) {
    setScrapingStatus('paused', `Error: ${err.message || 'Could not connect'}`);
  } finally {
    state.scraping = false;
  }
});

// ── Extract Contacts (batch approach — opens real tabs) ───────────────
extractBtn.addEventListener('click', async () => {
  if (state.extracting || !state.leads.length) return;
  state.extracting = true;

  const withWebsites = state.leads.filter(l => l.website);
  if (withWebsites.length === 0) {
    setScrapingStatus('done', 'No leads with websites to inspect');
    state.extracting = false;
    return;
  }

  setScrapingStatus('active',
    `Opening ${withWebsites.length} websites in background tabs to find emails…`
  );

  // Listen for progress updates from background
  const progressListener = (msg) => {
    if (msg.action === 'EMAIL_PROGRESS') {
      setScrapingStatus('active',
        `[${msg.current}/${msg.total}] Checking ${msg.business}…`
      );
    }
  };
  chrome.runtime.onMessage.addListener(progressListener);

  try {
    const response = await chrome.runtime.sendMessage({
      action: 'FIND_EMAILS_BATCH',
      businesses: withWebsites,
    });

    chrome.runtime.onMessage.removeListener(progressListener);

    if (response?.results) {
      // Merge results back by website
      const emailMap = new Map(response.results.map(r => [r.website, r.email]));
      let emailsFound = 0;

      for (const lead of state.leads) {
        const email = emailMap.get(lead.website);
        if (email && !lead.email) {
          lead.email = email;
          emailsFound++;
        }
      }

      await chrome.storage.local.set({ leads: state.leads });
      updateUI();
      setScrapingStatus('done',
        `✅ Done — ${emailsFound} emails found from ${withWebsites.length} websites`
      );
    } else {
      setScrapingStatus('done', 'Email extraction completed');
    }
  } catch (err) {
    chrome.runtime.onMessage.removeListener(progressListener);
    setScrapingStatus('paused', `Error: ${err.message || 'Extraction failed'}`);
  } finally {
    state.extracting = false;
  }
});

// ── Reset ─────────────────────────────────────────────────────────────
resetBtn.addEventListener('click', async () => {
  state.leads = [];
  await chrome.storage.local.remove('leads');
  updateUI();
  setScrapingStatus('', 'Ready to scrape');
});

// ── Export CSV ─────────────────────────────────────────────────────────
exportCsvBtn.addEventListener('click', async () => {
  if (!state.leads.length) return;

  const headers = [
    'Business Name', 'Website', 'Phone', 'Email', 'Address',
    'Star Rating', 'Reviews',
    'Facebook', 'Instagram', 'LinkedIn', 'Twitter', 'YouTube', 'TikTok',
    'Source Query', 'Date Scraped'
  ];

  const rows = state.leads.map(lead => [
    csvEscape(lead.name || ''), csvEscape(lead.website || ''),
    csvEscape(lead.phone || ''), csvEscape(lead.email || ''),
    csvEscape(lead.address || ''), lead.rating || '', lead.reviews || '',
    csvEscape(lead.facebook || ''), csvEscape(lead.instagram || ''),
    csvEscape(lead.linkedin || ''), csvEscape(lead.twitter || ''),
    csvEscape(lead.youtube || ''), csvEscape(lead.tiktok || ''),
    csvEscape(lead.query || ''),
    lead.dateScraped || new Date().toISOString().split('T')[0]
  ]);

  const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const filename = `burflow_leads_${new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19)}.csv`;

  try {
    await chrome.downloads.download({ url, filename, saveAs: true });
  } catch { window.open(url, '_blank'); }
  setTimeout(() => URL.revokeObjectURL(url), 5000);
});

function csvEscape(val) {
  const s = String(val);
  if (s.includes(',') || s.includes('"') || s.includes('\n')) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

// ── Launch Email Drafts ───────────────────────────────────────────────
launchDrafts.addEventListener('click', async () => {
  if (state.launching) return;

  const leadsWithEmails = state.leads.filter(l => l.email);
  if (!leadsWithEmails.length) return;

  const subject = templateSubject.value || DEFAULT_TEMPLATE.subject;
  const body = templateBody.value || DEFAULT_TEMPLATE.body;
  const delay = Math.max(1, Math.min(30, parseInt(draftDelay.value) || 5)) * 1000;

  state.launching = true;
  launchDrafts.disabled = true;

  let sent = 0;
  const total = leadsWithEmails.length;
  setLaunchStatus('active', `Opening draft 1 of ${total}…`);

  for (let i = 0; i < leadsWithEmails.length; i++) {
    const lead = leadsWithEmails[i];
    const mailtoUrl = `mailto:${encodeURIComponent(lead.email)}` +
      `?subject=${encodeURIComponent(replaceVars(subject, lead))}` +
      `&body=${encodeURIComponent(replaceVars(body, lead))}`;

    try {
      await chrome.tabs.create({ url: mailtoUrl, active: false });
      sent++;
    } catch {}

    setLaunchStatus('active', `Opened ${sent}/${total}… ${lead.name}`);
    if (i < leadsWithEmails.length - 1) {
      await new Promise(r => setTimeout(r, delay));
    }
  }

  setLaunchStatus('done', `✅ Opened ${sent} email drafts`);
  state.launching = false;
  launchDrafts.disabled = false;
});

function setLaunchStatus(type, msg) {
  launchStatus.className = 'launch-status visible ' + type;
  launchStatus.textContent = msg;
}

// ── UI Updates ────────────────────────────────────────────────────────
function updateUI() {
  const total = state.leads.length;
  const emails = state.leads.filter(l => l.email).length;
  const phones = state.leads.filter(l => l.phone).length;

  countLeads.textContent = total;
  countEmails.textContent = emails;
  countPhones.textContent = phones;

  extractBtn.disabled = total === 0;
  exportCsvBtn.disabled = total === 0;

  const emailLeads = state.leads.filter(l => l.email);
  launchDrafts.disabled = emailLeads.length === 0;
  draftCount.textContent = `${emailLeads.length} lead${emailLeads.length !== 1 ? 's' : ''} with emails`;

  if (total > 0) {
    preview.classList.add('visible');
    const last5 = state.leads.slice(-5).reverse();
    previewBody.innerHTML = last5.map(l => {
      const socials = [
        l.facebook ? '📘' : '', l.instagram ? '📷' : '',
        l.linkedin ? '💼' : '', l.twitter ? '🐦' : '',
      ].filter(Boolean).join(' ');
      return `<tr>
        <td title="${escHtml(l.name)}">${escHtml(truncate(l.name, 18))}</td>
        <td title="${escHtml(l.website)}">${escHtml(truncate(l.website, 16))}</td>
        <td>${escHtml(l.phone || '—')}</td>
        <td>${escHtml(l.email || '—')}</td>
        <td>${socials || '—'}</td>
      </tr>`;
    }).join('');
  } else {
    preview.classList.remove('visible');
  }

  updateTemplatePreview();
}

function setScrapingStatus(type, msg) {
  statusDot.className = 'status-dot' + (type ? ` ${type}` : '');
  statusText.innerHTML = msg;
}

function truncate(s, n) {
  return s && s.length > n ? s.slice(0, n) + '…' : s || '';
}

function escHtml(s) {
  return String(s || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

// ── Boot ──────────────────────────────────────────────────────────────
init();
