// ── BurFlow Lead Generator — Content Script ───────────────────────────
// Parses Google Search and Google Maps result containers to extract business leads.
// Includes auto-scroll for both Search and Maps to load more results.

(() => {
  if (window.__burflowLeadGenLoaded) return;
  window.__burflowLeadGenLoaded = true;

  chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
    if (msg.action === 'scrape') {
      if (msg.searchType === 'maps') {
        // Auto-scroll then scrape
        autoScrollMaps(msg.times || 8, msg.delayMs || 1200).then(() => {
          const leads = scrapeGoogleMaps();
          sendResponse({ leads });
        });
        return true; // async
      } else {
        const leads = scrapeGoogleSearch();
        sendResponse({ leads });
      }
    }
    return true;
  });

  // ── Auto-scroll for Google Maps ──────────────────────────────────────
  function autoScrollMaps(times, delayMs) {
    return new Promise((resolve) => {
      const feed = document.querySelector('div[role="feed"]');
      if (!feed) return resolve();
      let count = 0;
      const interval = setInterval(() => {
        feed.scrollTop = feed.scrollHeight;
        count++;
        if (count >= times) {
          clearInterval(interval);
          setTimeout(resolve, 500); // wait for last batch to render
        }
      }, delayMs);
    });
  }

  // ── Google Search Parser ──────────────────────────────────────────
  function scrapeGoogleSearch() {
    const leads = [];
    const query = getQuery();

    const containers = document.querySelectorAll(
      '#search .g, #rso .g, #rso > div, .MjjYud'
    );

    containers.forEach(container => {
      try {
        const lead = parseSearchResult(container, query);
        if (lead && lead.name) leads.push(lead);
      } catch {}
    });

    if (leads.length === 0) {
      document.querySelectorAll('[data-hveid]').forEach(el => {
        try {
          const lead = parseSearchResult(el, query);
          if (lead && lead.name) leads.push(lead);
        } catch {}
      });
    }

    // Knowledge panel
    const knowledgePanel = document.querySelector(
      '.kp-wholepage, .ifM9K, .rZLbSb, [data-attrid="kc:/local:one box"]'
    );
    if (knowledgePanel) {
      const kpLead = parseKnowledgePanel(knowledgePanel, query);
      if (kpLead && kpLead.name) leads.unshift(kpLead);
    }

    return leads;
  }

  function parseSearchResult(container, query) {
    const linkEl = container.querySelector('a[href]');
    if (!linkEl) return null;

    const href = linkEl.href;
    if (href.includes('google.com/search') || href.includes('google.com/maps') ||
        href.includes('google.com/url') || !href.startsWith('http')) {
      return null;
    }

    const headingEl = container.querySelector('h3');
    const name = headingEl?.textContent?.trim() || '';
    if (!name) return null;

    let website = href;
    try {
      const urlObj = new URL(href);
      if (urlObj.searchParams.get('url')) {
        website = urlObj.searchParams.get('url');
      } else if (urlObj.pathname === '/url') {
        website = urlObj.searchParams.get('q') || href;
      }
    } catch {}

    let rootDomain = '';
    try { rootDomain = new URL(website).hostname.replace(/^www\./, ''); } catch {}

    const fullText = container.textContent || '';
    const snippetEl = container.querySelector(
      '.VwiC3b, .IsZvec, [data-sncf], .lEBKkf, span.aCOpRe'
    );
    const snippet = snippetEl?.textContent || '';
    const allText = snippet + ' ' + fullText;

    const phone = extractPhone(allText);
    const email = extractEmail(allText);
    const address = extractAddress(allText);
    const socials = extractSocialLinks(container, rootDomain);

    const ratingEl = container.querySelector(
      '[role="img"][aria-label*="star"], .fUvCCf, .yi40Hd'
    );
    const ratingText = ratingEl?.getAttribute('aria-label') ||
                       ratingEl?.textContent || '';
    const ratingMatch = ratingText.match(/([\d.]+)/);
    const rating = ratingMatch ? ratingMatch[1] : '';

    const reviewEl = container.querySelector(
      '.UfS5v, span[aria-label*="review"], .fUvCCf + span'
    );
    const reviewText = reviewEl?.textContent || '';
    const reviewMatch = reviewText.match(/([\d,]+)/);
    const reviews = reviewMatch ? reviewMatch[1] : '';

    return {
      name, website, phone, email, address, rating, reviews,
      facebook: socials.facebook, instagram: socials.instagram,
      linkedin: socials.linkedin, twitter: socials.twitter,
      query, dateScraped: new Date().toISOString().split('T')[0]
    };
  }

  // ── Knowledge Panel Parser ─────────────────────────────────────────
  function parseKnowledgePanel(panel, query) {
    const nameEl = panel.querySelector(
      '[data-attrid="title"], .KPjJ2e, .rZLbSb, h2, .yp1CPe'
    );
    const name = nameEl?.textContent?.trim() || '';
    if (!name) return null;

    const fullText = panel.textContent || '';
    let website = '';
    const webLink = panel.querySelector('a[href*="http"]');
    if (webLink) {
      try {
        const url = new URL(webLink.href);
        website = url.searchParams.get('q') || webLink.href;
        if (website.includes('google.com')) website = '';
      } catch {}
    }

    let rootDomain = '';
    try { rootDomain = new URL(website).hostname.replace(/^www\./, ''); } catch {}

    const phone = extractPhone(fullText);
    const email = extractEmail(fullText);
    const address = extractAddress(fullText);
    const socials = extractSocialLinks(panel, rootDomain);

    const ratingEl = panel.querySelector('[role="img"][aria-label*="star"]');
    const ratingMatch = (ratingEl?.getAttribute('aria-label') || '').match(/([\d.]+)/);

    const reviewEl = panel.querySelector('[aria-label*="review"]');
    const reviewMatch = (reviewEl?.getAttribute('aria-label') || '').match(/([\d,]+)/);

    return {
      name, website, phone, email, address,
      rating: ratingMatch ? ratingMatch[1] : '',
      reviews: reviewMatch ? reviewMatch[1] : '',
      facebook: socials.facebook, instagram: socials.instagram,
      linkedin: socials.linkedin, twitter: socials.twitter,
      query, dateScraped: new Date().toISOString().split('T')[0]
    };
  }

  // ── Google Maps Parser ────────────────────────────────────────────
  function scrapeGoogleMaps() {
    const leads = [];
    const query = getQuery();

    // Use the place link selector from the reference — most reliable
    const placeLinks = document.querySelectorAll('a[href*="/maps/place/"]');
    const seen = new Set();

    placeLinks.forEach(linkEl => {
      try {
        // Walk up to a reasonably-sized container
        let card = linkEl;
        for (let i = 0; i < 6 && card.parentElement; i++) {
          card = card.parentElement;
          if (card.innerText && card.innerText.length > 20) break;
        }

        const lead = parseMapsCard(card, linkEl, query);
        if (lead && lead.name && !seen.has(lead.name + lead.address)) {
          seen.add(lead.name + lead.address);
          leads.push(lead);
        }
      } catch {}
    });

    // Fallback: older selector
    if (leads.length === 0) {
      document.querySelectorAll('.Nv2PK, .bfv02d, [role="feed"] > div > div').forEach(container => {
        try {
          const lead = parseMapsResult(container, query);
          if (lead && lead.name && !seen.has(lead.name)) {
            seen.add(lead.name);
            leads.push(lead);
          }
        } catch {}
      });
    }

    return leads;
  }

  function parseMapsCard(card, linkEl, query) {
    const name = linkEl.getAttribute('aria-label') ||
                 card.querySelector('[class*="fontHeadline"]')?.textContent?.trim() ||
                 linkEl.textContent?.trim() || '';
    if (!name) return null;

    const text = card.innerText || '';
    const lines = text.split('\n').map(l => l.trim()).filter(Boolean);

    // Phone
    let phone = '';
    const phoneMatch = text.match(/(\+?\d[\d\-\.()\s]{7,}\d)/);
    if (phoneMatch && phoneMatch[0].replace(/\D/g, '').length >= 7) {
      phone = phoneMatch[0].trim();
    }

    // Website
    let website = '';
    const anchors = card.querySelectorAll('a[href]');
    for (const a of anchors) {
      const label = (a.getAttribute('aria-label') || '').toLowerCase();
      const href = a.getAttribute('href') || '';
      if (label.startsWith('website') || (href && !href.includes('google.com') && !href.startsWith('/maps'))) {
        try {
          const url = new URL(href);
          const q = url.searchParams.get('q') || url.searchParams.get('url');
          website = q || href;
        } catch { website = href; }
        break;
      }
    }

    // Address — heuristic: line that isn't name, rating, or phone
    let address = '';
    for (const line of lines) {
      if (line === name) continue;
      if (/^\d+(\.\d+)?\s*(\(\d+\))?$/.test(line)) continue;
      if (line === phone) continue;
      if (/star/i.test(line)) continue;
      if (line.length > 6 && line.length < 90) {
        address = line;
        break;
      }
    }

    // Rating
    const ratingEl = card.querySelector('.MW4etd, .UY7F9, [role="img"][aria-label*="star"]');
    const ratingText = ratingEl?.textContent || ratingEl?.getAttribute('aria-label') || '';
    const ratingMatch = ratingText.match(/([\d.]+)/);
    const rating = ratingMatch ? ratingMatch[1] : '';

    // Reviews
    const reviewMatch = text.match(/\(([\d,]+)\)/);
    const reviews = reviewMatch ? reviewMatch[1] : '';

    let rootDomain = '';
    try { rootDomain = new URL(website).hostname.replace(/^www\./, ''); } catch {}

    const socials = extractSocialLinks(card, rootDomain);
    const email = extractEmail(text);

    return {
      name, website, phone, email, address, rating, reviews,
      facebook: socials.facebook, instagram: socials.instagram,
      linkedin: socials.linkedin, twitter: socials.twitter,
      query, dateScraped: new Date().toISOString().split('T')[0]
    };
  }

  function parseMapsResult(container, query) {
    const nameEl = container.querySelector(
      '.qBF1Pd, .fontHeadlineSmall, .NrDZNb, [role="heading"]'
    );
    const name = nameEl?.textContent?.trim() || '';
    if (!name) return null;

    let website = '';
    const links = container.querySelectorAll('a[href*="http"]');
    for (const link of links) {
      try {
        const url = new URL(link.href);
        const q = url.searchParams.get('q') || url.searchParams.get('url') || '';
        if (q && !q.includes('google.com')) { website = q; break; }
        if (!link.href.includes('google.com')) website = link.href;
      } catch {}
    }

    let rootDomain = '';
    try { rootDomain = new URL(website).hostname.replace(/^www\./, ''); } catch {}

    const fullText = container.textContent || '';

    const ratingEl = container.querySelector('.MW4etd, .UY7F9, [role="img"][aria-label*="star"]');
    const ratingText = ratingEl?.textContent || ratingEl?.getAttribute('aria-label') || '';
    const ratingMatch = ratingText.match(/([\d.]+)/);
    const rating = ratingMatch ? ratingMatch[1] : '';

    const reviewMatch = fullText.match(/\(([\d,]+)\)/);
    const reviews = reviewMatch ? reviewMatch[1] : '';

    const addrEl = container.querySelector(
      '.W4Efsd:last-child .W4Efsd, .W4Efsd .UFzxvf, .rllt__details div:not([class])'
    );
    const address = addrEl?.textContent?.trim() || '';

    const phoneEl = container.querySelector(
      '[data-item-id*="phone"], .zdRr4, .Io6YTe'
    );
    let phone = phoneEl?.textContent?.trim() || '';
    if (!phone) phone = extractPhone(fullText);

    const email = extractEmail(fullText);
    const socials = extractSocialLinks(container, rootDomain);

    return {
      name, website, phone, email, address, rating, reviews,
      facebook: socials.facebook, instagram: socials.instagram,
      linkedin: socials.linkedin, twitter: socials.twitter,
      query, dateScraped: new Date().toISOString().split('T')[0]
    };
  }

  // ── Social Link Extraction ────────────────────────────────────────
  function extractSocialLinks(container, rootDomain) {
    const result = { facebook: '', instagram: '', linkedin: '', twitter: '' };
    const links = container.querySelectorAll('a[href]');

    for (const link of links) {
      const href = link.href.toLowerCase();
      if (!href.startsWith('http')) continue;

      try {
        const url = new URL(link.href);
        const host = url.hostname.toLowerCase().replace(/^www\./, '');

        if (host.includes('facebook.com') && !result.facebook) {
          if (!url.pathname.includes('/search') && url.pathname !== '/') {
            result.facebook = link.href;
          }
        } else if (host.includes('instagram.com') && !result.instagram) {
          if (url.pathname !== '/' && !url.pathname.includes('/explore')) {
            result.instagram = link.href;
          }
        } else if (host.includes('linkedin.com') && !result.linkedin) {
          if (url.pathname.includes('/company/') || url.pathname.includes('/in/')) {
            result.linkedin = link.href;
          }
        } else if ((host.includes('twitter.com') || host.includes('x.com')) && !result.twitter) {
          const path = url.pathname;
          if (path && path !== '/' && !path.includes('/search') && !path.includes('/hashtag')) {
            result.twitter = link.href;
          }
        }
      } catch {}
    }

    return result;
  }

  // ── Phone Extraction ──────────────────────────────────────────────
  function extractPhone(text) {
    const clean = text.replace(/<[^>]+>/g, ' ');

    const patterns = [
      /\+[\d]{1,3}[\s.\-]?\(?\d{1,4}\)?[\s.\-]?\d{1,4}[\s.\-]?\d{1,9}/,
      /\(?[\d]{3}\)?[\s.\-]?[\d]{3}[\s.\-]?[\d]{4}/,
      /\b0[\d]{2,4}[\s.\-]?[\d]{3,4}[\s.\-]?[\d]{3,4}\b/,
      /\b[\d][\d\s.\-]{6,14}[\d]\b/,
    ];

    for (const pattern of patterns) {
      const match = clean.match(pattern);
      if (match) {
        const phone = match[0].trim();
        const digits = phone.replace(/\D/g, '');
        if (digits.length >= 7 && digits.length <= 15 &&
            !/^(19|20)\d{2}$/.test(digits) && !/^\d{5}$/.test(digits)) {
          return phone;
        }
      }
    }
    return '';
  }

  // ── Email Extraction ──────────────────────────────────────────────
  function extractEmail(text) {
    const clean = text.replace(/<[^>]+>/g, ' ');
    const matches = clean.match(
      /[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}/g
    );
    if (!matches) return '';

    const junk = [
      'example.com', 'sentry.io', 'wixpress.com', 'schema.org',
      'w3.org', 'googleapis.com', 'google.com', 'gstatic.com',
      'facebook.com', 'twitter.com', 'instagram.com',
      'placeholder', 'test@', 'noreply', 'no-reply',
      '.png', '.jpg', '.gif', '.svg', '.webp',
    ];

    for (const email of matches) {
      const lower = email.toLowerCase();
      if (junk.every(j => !lower.includes(j))) return lower;
    }
    return '';
  }

  // ── Address Extraction ────────────────────────────────────────────
  function extractAddress(text) {
    const clean = text.replace(/<[^>]+>/g, ' ');

    const patterns = [
      /\d+[\s]+[\w\s]+(?:Street|St|Avenue|Ave|Boulevard|Blvd|Road|Rd|Drive|Dr|Way|Lane|Ln|Court|Ct|Place|Pl|Close|Crescent|Cres)[\s,]+[\w\s]{3,}/i,
      /(?:located in|located at|address|office|headquarters)[:\s]+([^\n.;]{5,80})/i,
      /\b[A-Z][a-z]+(?:,\s*[A-Z]{2})+\b/,
    ];

    for (const pattern of patterns) {
      const match = clean.match(pattern);
      if (match) {
        const addr = match[0].trim();
        if (addr.length > 5 && addr.length < 200) return addr;
      }
    }
    return '';
  }

  function getQuery() {
    try {
      const url = new URL(window.location.href);
      return url.searchParams.get('q') || url.searchParams.get('query') || '';
    } catch { return ''; }
  }
})();
