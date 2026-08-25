// ── BurFlow Lead Generator — Background Service Worker ────────────────
// Opens real browser tabs for each lead website, injects a script to read
// emails from the fully rendered DOM (not raw HTML fetch). This handles
// JavaScript-rendered pages, Cloudflare, and CORS transparently.

const CONTACT_PATHS = ['/contact', '/contact-us', '/about', '/about-us', '/support', '/help'];
const TAB_LOAD_TIMEOUT_MS = 15000;

// ── Tab Helpers ───────────────────────────────────────────────────────
function waitForTabComplete(tabId) {
  return new Promise((resolve) => {
    const timeout = setTimeout(() => resolve(false), TAB_LOAD_TIMEOUT_MS);
    function listener(updatedTabId, changeInfo) {
      if (updatedTabId === tabId && changeInfo.status === 'complete') {
        clearTimeout(timeout);
        chrome.tabs.onUpdated.removeListener(listener);
        resolve(true);
      }
    }
    chrome.tabs.onUpdated.addListener(listener);
  });
}

// ── Email Extraction via Real Tab ─────────────────────────────────────
async function extractEmailsFromUrl(url) {
  let tab;
  try {
    tab = await chrome.tabs.create({ url, active: false });
    const loaded = await waitForTabComplete(tab.id);
    if (!loaded) return [];

    const [{ result } = {}] = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: () => {
        const EMAIL_REGEX = /[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}/g;
        const JUNK = [
          'example.com', 'sentry.io', 'wixpress.com', 'schema.org',
          'w3.org', 'googleapis.com', 'google.com', 'gstatic.com',
          'facebook.com', 'twitter.com', 'instagram.com',
          'cloudflare.com', 'wordpress.org', 'shopify.com',
          'noreply', 'no-reply', 'donotreply',
          '.png', '.jpg', '.gif', '.svg', '.webp',
        ];
        const found = new Set();

        // 1. mailto: links (most reliable)
        document.querySelectorAll('a[href^="mailto:"]').forEach(a => {
          const addr = a.getAttribute('href').replace('mailto:', '').split('?')[0].trim();
          if (addr && addr.includes('@')) found.add(addr.toLowerCase());
        });

        // 2. Visible text on the page
        const bodyText = document.body ? document.body.innerText : '';
        (bodyText.match(EMAIL_REGEX) || []).forEach(m => found.add(m.toLowerCase()));

        // 3. HTML source (catches hidden emails in attributes, scripts, etc.)
        const htmlSource = document.documentElement.innerHTML || '';
        (htmlSource.match(EMAIL_REGEX) || []).forEach(m => found.add(m.toLowerCase()));

        // 4. HTML entity encoded (&#64; = @)
        const decoded = htmlSource
          .replace(/&#64;/g, '@').replace(/&#x40;/g, '@').replace(/&at;/g, '@');
        (decoded.match(EMAIL_REGEX) || []).forEach(m => found.add(m.toLowerCase()));

        // 5. Data attributes
        document.querySelectorAll('[data-email], [data-contact], [data-mail]').forEach(el => {
          const val = el.getAttribute('data-email') || el.getAttribute('data-contact') || el.getAttribute('data-mail');
          if (val && val.includes('@')) found.add(val.toLowerCase());
        });

        // 6. Meta tags
        document.querySelectorAll('meta[name="email"], meta[property="email"], meta[content*="@"]').forEach(el => {
          const content = el.getAttribute('content') || '';
          const match = content.match(EMAIL_REGEX);
          if (match) match.forEach(m => found.add(m.toLowerCase()));
        });

        // Filter junk
        return [...found].filter(e =>
          e.includes('@') && e.length > 5 && e.length < 100 &&
          !JUNK.some(j => e.includes(j)) &&
          !/^[\d._-]+@/.test(e)
        );
      },
    });

    return result || [];
  } catch {
    return [];
  } finally {
    if (tab) {
      try { await chrome.tabs.remove(tab.id); } catch {}
    }
  }
}

// ── Full Business Inspection (emails + phones + social) ──────────────
async function inspectBusiness(url) {
  if (!url) return null;

  let base;
  try {
    base = new URL(url.startsWith('http') ? url : 'https://' + url);
    base.search = '';
    base.hash = '';
  } catch {
    return null;
  }

  const result = {
    email: '', phone: '', address: '',
    facebook: '', instagram: '', linkedin: '', twitter: '', youtube: '', tiktok: '',
  };

  // Try homepage first
  let emails = await extractEmailsFromUrl(base.href);
  if (emails.length === 0) {
    // Try contact/about sub-pages
    for (const path of CONTACT_PATHS) {
      emails = await extractEmailsFromUrl(base.origin + path);
      if (emails.length > 0) break;
    }
  }

  if (emails.length > 0) {
    // Prefer info@, contact@, hello@, sales@
    const preferred = emails.find(e =>
      /^(info|contact|hello|hi|hey|support|sales|team|office|admin|enquiries|inquiries|mail)@/.test(e)
    );
    result.email = preferred || emails[0];
  }

  return result;
}

// ── Batch Email Extraction ────────────────────────────────────────────
async function findEmailsForBatch(businesses) {
  const results = [];
  for (let i = 0; i < businesses.length; i++) {
    const b = businesses[i];
    const emails = await extractEmailsFromUrl(b.website);
    let email = '';
    if (emails.length > 0) {
      const preferred = emails.find(e =>
        /^(info|contact|hello|hi|hey|support|sales|team|office|admin|enquiries|inquiries|mail)@/.test(e)
      );
      email = preferred || emails[0];
    }
    results.push({ ...b, email, allEmails: emails.join('; ') });

    // Report progress
    chrome.runtime.sendMessage({
      action: 'EMAIL_PROGRESS',
      current: i + 1,
      total: businesses.length,
      business: b.name,
    });
  }
  return results;
}

// ── Message Listener ──────────────────────────────────────────────────
chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  if (msg.action === 'inspectWebsite') {
    inspectBusiness(msg.url)
      .then(result => sendResponse(result))
      .catch(err => {
        console.error('[BurFlow] inspect error:', err);
        sendResponse(null);
      });
    return true;
  }

  if (msg.action === 'FIND_EMAILS_BATCH') {
    findEmailsForBatch(msg.businesses || [])
      .then(results => sendResponse({ results }))
      .catch(err => {
        console.error('[BurFlow] batch error:', err);
        sendResponse({ results: [] });
      });
    return true;
  }
});
