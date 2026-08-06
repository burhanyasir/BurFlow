const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const Database = require('better-sqlite3');
const cheerio = require('cheerio');
const { v4: uuidv4 } = require('uuid');

const defaultScanStore = new Map();

function createWebsiteScannerService(options = {}) {
  const dbPath = options.dbPath || path.join(__dirname, '..', 'data', 'website-scanner.sqlite');
  const dbDir = path.dirname(dbPath);
  if (!fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir, { recursive: true });
  }

  const db = new Database(dbPath);
  db.pragma('journal_mode = WAL');

  db.exec(`
    CREATE TABLE IF NOT EXISTS website_scans (
      scan_id TEXT PRIMARY KEY,
      tenant_id TEXT NOT NULL,
      target_url TEXT NOT NULL,
      previous_scan_id TEXT,
      status TEXT NOT NULL,
      created_at TEXT NOT NULL,
      completed_at TEXT,
      metadata TEXT
    );

    CREATE TABLE IF NOT EXISTS website_scan_pages (
      page_id TEXT PRIMARY KEY,
      scan_id TEXT NOT NULL,
      tenant_id TEXT NOT NULL,
      url TEXT NOT NULL,
      title TEXT,
      content_hash TEXT NOT NULL,
      snippet TEXT,
      extracted TEXT,
      page_metadata TEXT DEFAULT '{}',
      created_at TEXT NOT NULL,
      FOREIGN KEY(scan_id) REFERENCES website_scans(scan_id)
    );

    CREATE TABLE IF NOT EXISTS website_business_profiles (
      tenant_id TEXT PRIMARY KEY,
      scan_id TEXT NOT NULL,
      target_url TEXT NOT NULL,
      profile_json TEXT NOT NULL,
      created_at TEXT NOT NULL
    );
  `);

  ensureColumn('website_scan_pages', 'page_metadata', "TEXT DEFAULT '{}'" );

  function ensureColumn(tableName, columnName, definition) {
    const columns = db.prepare(`PRAGMA table_info(${tableName})`).all();
    if (!columns.some(column => column.name === columnName)) {
      db.exec(`ALTER TABLE ${tableName} ADD COLUMN ${columnName} ${definition}`);
    }
  }

  function normalizeUrl(inputUrl) {
    if (!inputUrl) return null;
    const trimmed = String(inputUrl).trim();
    if (!trimmed) return null;
    const withScheme = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
    try {
      const parsed = new URL(withScheme);
      parsed.hash = '';
      parsed.search = '';
      if (!parsed.pathname || parsed.pathname === '/') {
        parsed.pathname = '/';
      }
      return parsed.toString().replace(/\/$/, '/');
    } catch {
      return null;
    }
  }

  function normalizeUrlForComparison(inputUrl) {
    const normalized = normalizeUrl(inputUrl);
    if (!normalized) return null;
    const parsed = new URL(normalized);
    parsed.hash = '';
    parsed.search = '';
    if (parsed.pathname === '' || parsed.pathname === '/') {
      return `${parsed.origin}/`;
    }
    return `${parsed.origin}${parsed.pathname.replace(/\/$/, '')}`;
  }

  function parsePageContent(html, pageUrl) {
    const $ = cheerio.load(html);
    const title = $('title').text().trim() || $('h1').first().text().trim() || 'Untitled page';
    const bodyText = $('body').text().replace(/\s+/g, ' ').trim();
    const headings = [];
    $('h1, h2, h3').each((_, element) => {
      const heading = $(element).text().trim();
      if (heading) {
        headings.push(heading);
      }
    });

    const links = [];
    const seenLinks = new Set();
    $('a[href]').each((_, element) => {
      const href = $(element).attr('href');
      if (href && !seenLinks.has(href)) {
        seenLinks.add(href);
        links.push(href);
      }
    });

    const meta = {};
    $('meta').each((_, element) => {
      const name = $(element).attr('name') || $(element).attr('property') || $(element).attr('itemprop');
      const content = $(element).attr('content');
      if (name && content) {
        meta[name.toLowerCase()] = content;
      }
    });

    const structuredData = [];
    $('script[type="application/ld+json"]').each((_, element) => {
      const raw = $(element).html();
      if (!raw) return;
      try {
        structuredData.push(JSON.parse(raw));
      } catch {
        // Ignore invalid JSON-LD blocks
      }
    });

    const canonical = $('link[rel="canonical"]').attr('href') || meta.canonical || null;

    return {
      title,
      bodyText,
      headings,
      links,
      pageUrl,
      meta,
      structuredData,
      canonical,
    };
  }

  function classifyPageType(pageUrl, title, headings, bodyText) {
    const text = `${pageUrl} ${title} ${headings.join(' ')} ${bodyText}`.toLowerCase();
    if (/\b(home|welcome|overview|landing)\b/.test(text) || /\/(index|home)?$/.test(pageUrl)) return 'home';
    if (/\b(about|about us|who we are|our company|our story)\b/.test(text)) return 'about';
    if (/\b(service|services|solutions|offerings|what we do)\b/.test(text)) return 'services';
    if (/\b(product|products|platform|tool|software|app|solution)\b/.test(text)) return 'products';
    if (/\b(pricing|plans|packages|cost|price|quote|rates)\b/.test(text)) return 'pricing';
    if (/\b(faq|questions|help|support|ask us)\b/.test(text)) return 'faq';
    if (/\b(contact|get in touch|reach out|book a demo|request a quote|let's talk|appointment)\b/.test(text)) return 'contact';
    if (/\b(team|leadership|our team|meet the team|staff)\b/.test(text)) return 'team';
    if (/\b(blog|news|insights|articles|resources)\b/.test(text)) return 'blog';
    if (/\b(case study|case studies|success story|customer story|customers)\b/.test(text)) return 'case studies';
    if (/\b(testimonial|reviews|what clients say|success stories)\b/.test(text)) return 'testimonials';
    if (/\b(policy|policies|privacy|terms|cookie|security|legal|compliance)\b/.test(text)) return 'policies';
    return 'content';
  }

  function extractContactInfo(parsed) {
    const text = `${parsed.title} ${parsed.bodyText}`;
    const emails = Array.from(text.matchAll(/([A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,})/gi)).map(match => match[1]);
    const phones = Array.from(text.matchAll(/\+?[0-9().\s-]{7,20}/g)).map(match => match[0].trim()).filter(value => value.length >= 7);
    const addresses = Array.from(text.matchAll(/\b(?:[0-9]{1,5}\s+)?[A-Z][A-Za-z0-9.'\- ]{4,80}(?:Street|St|Road|Rd|Avenue|Ave|Boulevard|Blvd|Lane|Ln|Drive|Dr|Court|Ct|Way|Plaza|Pl|Suite|Ste|Building|Bldg)\b/gi)).map(match => match[0].trim());
    return { emails: [...new Set(emails)].slice(0, 5), phones: [...new Set(phones)].slice(0, 5), addresses: [...new Set(addresses)].slice(0, 5) };
  }

  function extractSocialLinks(links) {
    return links.filter(link => /linkedin|twitter|x.com|facebook|instagram|youtube|github|tiktok/i.test(link)).slice(0, 10);
  }

  function extractSignals(parsed, pageType) {
    const text = `${parsed.title} ${parsed.bodyText}`.toLowerCase();
    const signals = [];
    if (/trusted by|customer|review|testimonial|award|certified|secure|gdpr|privacy|soc 2|iso/i.test(text)) signals.push(...text.match(/\b(trusted by|award|certified|secure|gdpr|privacy|soc 2|iso)\b/g) || []);
    if (pageType === 'pricing') signals.push('pricing');
    if (pageType === 'contact') signals.push('contact');
    if (/book a demo|request a demo|get started|contact us|start free|try now/i.test(text)) signals.push('cta');
    return [...new Set(signals)].slice(0, 10);
  }

  function toSentenceSnippets(text, maxItems = 6) {
    const normalized = text.replace(/\s+/g, ' ').trim();
    if (!normalized) return [];
    return normalized.split(/[.!?]+/).map(part => part.trim()).filter(Boolean).slice(0, maxItems);
  }

  function buildPageIntelligence(parsed, pageType) {
    const text = `${parsed.title} ${parsed.bodyText}`;
    const services = toSentenceSnippets(text).filter(sentence => /service|services|support|consulting|design|development|marketing|seo|analytics|management|training|onboarding|automation|implementation|workflow|strategy|advisory/i.test(sentence)).slice(0, 3);
    const products = toSentenceSnippets(text).filter(sentence => /product|products|platform|software|tool|app|solution|suite|system|workflow/i.test(sentence)).slice(0, 3);
    const ctas = Array.from(text.matchAll(/\b(book a demo|get started|contact us|request a quote|try now|start free|learn more|schedule|call now|request a demo|talk to sales)\b/gi)).map(match => match[0]);
    const benefits = toSentenceSnippets(text).filter(sentence => /benefit|save|faster|better|increase|improve|reduce|scale|accelerate|simplify|streamline|less manual|automate/i.test(sentence)).slice(0, 3);
    const features = toSentenceSnippets(text).filter(sentence => /feature|includes|with|supports|offers|integrates|provides|enables|helps/i.test(sentence)).slice(0, 3);
    const pricing = Array.from(text.matchAll(/\$\d+(?:\.\d+)?(?:\s*(?:\/|per|month|mo|year|yr))?/g)).map(match => match[0]).slice(0, 3);
    return {
      pageType,
      services: [...new Set(services)].slice(0, 5),
      products: [...new Set(products)].slice(0, 5),
      pricing: [...new Set(pricing)].slice(0, 5),
      features: [...new Set(features)].slice(0, 5),
      benefits: [...new Set(benefits)].slice(0, 5),
      ctas: [...new Set(ctas)].slice(0, 8),
      contactInfo: extractContactInfo(parsed),
      socialLinks: extractSocialLinks(parsed.links),
      trustSignals: extractSignals(parsed, pageType),
    };
  }

  function extractStructuredFacts(parsed, pageUrl) {
    const pageType = classifyPageType(pageUrl, parsed.title, parsed.headings, parsed.bodyText);
    const intelligence = buildPageIntelligence(parsed, pageType);
    const structuredData = parsed.structuredData.map(item => {
      const normalized = {};
      if (typeof item === 'object' && item !== null) {
        if (item['@type']) normalized.type = Array.isArray(item['@type']) ? item['@type'].join(', ') : item['@type'];
        if (item.name) normalized.name = item.name;
        if (item.description) normalized.description = item.description;
        if (item.url) normalized.url = item.url;
        if (item.telephone) normalized.telephone = item.telephone;
        if (item.email) normalized.email = item.email;
        if (item.address) normalized.address = typeof item.address === 'string' ? item.address : JSON.stringify(item.address);
        if (item.sameAs) normalized.sameAs = Array.isArray(item.sameAs) ? item.sameAs : [item.sameAs];
        if (item.offers) normalized.offers = item.offers;
      }
      return normalized;
    }).filter(item => Object.keys(item).length > 0);

    const score = Math.min(1, 0.25 + (intelligence.services.length > 0 ? 0.12 : 0) + (intelligence.products.length > 0 ? 0.12 : 0) + (intelligence.ctas.length > 0 ? 0.1 : 0) + (structuredData.length > 0 ? 0.12 : 0) + (intelligence.contactInfo.emails.length + intelligence.contactInfo.phones.length > 0 ? 0.12 : 0) + (intelligence.trustSignals.length > 0 ? 0.08 : 0) + (parsed.meta.description ? 0.09 : 0));

    return {
      pageType,
      title: parsed.title,
      canonical: parsed.canonical || parsed.meta.canonical || null,
      meta: {
        title: parsed.title,
        description: parsed.meta.description || null,
        ogTitle: parsed.meta['og:title'] || null,
        ogDescription: parsed.meta['og:description'] || null,
        ogType: parsed.meta['og:type'] || null,
      },
      intelligence,
      structuredData,
      score,
      contentHash: crypto.createHash('sha256').update(parsed.bodyText).digest('hex'),
      textPreview: parsed.bodyText.slice(0, 280),
      headings: parsed.headings,
      links: parsed.links,
      contactInfo: intelligence.contactInfo,
      socialLinks: intelligence.socialLinks,
      trustSignals: intelligence.trustSignals,
    };
  }

  function normalizeText(value) {
    if (value == null) return '';
    return String(value).replace(/\s+/g, ' ').trim();
  }

  function normalizeList(values) {
    const normalized = (values || [])
      .map(value => normalizeText(value))
      .filter(Boolean)
      .map(value => value.replace(/^[-•\s]+/, '').trim());
    return [...new Set(normalized)].slice(0, 12);
  }

  function cleanCompanyName(value) {
    return normalizeText(value)
      .replace(/\s*[-|–—]\s*.*/g, '')
      .replace(/\s+\|\s+.*/g, '')
      .replace(/\s+[-–—]\s+.+$/g, '')
      .trim();
  }

  function extractStructuredSignals(structuredData) {
    if (!Array.isArray(structuredData)) return [];
    return structuredData.filter(Boolean).map(item => {
      const normalized = {};
      if (item.name) normalized.name = normalizeText(item.name);
      if (item['@type']) normalized.type = Array.isArray(item['@type']) ? item['@type'].join(', ') : normalizeText(item['@type']);
      if (item.industry) normalized.industry = normalizeText(item.industry);
      if (item.description) normalized.description = normalizeText(item.description);
      if (item.url) normalized.url = normalizeText(item.url);
      if (item.email) normalized.email = normalizeText(item.email);
      if (item.telephone) normalized.telephone = normalizeText(item.telephone);
      if (item.address) normalized.address = typeof item.address === 'string' ? normalizeText(item.address) : JSON.stringify(item.address);
      if (item.sameAs) normalized.sameAs = Array.isArray(item.sameAs) ? normalizeList(item.sameAs) : [normalizeText(item.sameAs)];
      if (item.offers) normalized.offers = Array.isArray(item.offers) ? item.offers : [item.offers];
      if (item.areaServed) normalized.areaServed = Array.isArray(item.areaServed) ? normalizeList(item.areaServed) : [normalizeText(item.areaServed)];
      if (item.priceRange) normalized.priceRange = normalizeText(item.priceRange);
      if (item.foundingDate) normalized.foundingDate = normalizeText(item.foundingDate);
      if (item.award) normalized.award = normalizeText(item.award);
      if (item.review) normalized.review = Array.isArray(item.review) ? item.review : [item.review];
      return normalized;
    }).filter(item => Object.keys(item).length > 0);
  }

  function inferIndustry(text, structuredData) {
    const combined = `${text} ${structuredData.map(item => `${item.industry || ''} ${item.type || ''}`).join(' ')}`.toLowerCase();
    if (/software|saas|platform|technology|ai|automation/i.test(combined)) return 'Software / Technology';
    if (/agency|marketing|consulting|advisory|strategy/i.test(combined)) return 'Professional Services';
    if (/education|training|learning/i.test(combined)) return 'Education';
    if (/health|medical|clinic|hospital/i.test(combined)) return 'Healthcare';
    if (/retail|ecommerce|shop|commerce/i.test(combined)) return 'Retail / E-commerce';
    return 'Unknown';
  }

  function inferBusinessType(text, structuredData) {
    const combined = `${text} ${structuredData.map(item => `${item.type || ''} ${item.industry || ''}`).join(' ')}`.toLowerCase();
    if (/saas|software|platform|technology|ai|automation/i.test(combined)) return 'Software / Technology';
    if (/agency|consulting|marketing|strategy/i.test(combined)) return 'Service-based business';
    if (/ecommerce|retail|shop/i.test(combined)) return 'Commerce business';
    return 'Business';
  }

  function inferAudience(text) {
    const combined = text.toLowerCase();
    if (/b2b|business|enterprise|team|organization/i.test(combined)) return 'B2B teams and growing organizations';
    if (/small business|smb|local|shop|owner/i.test(combined)) return 'Small businesses and local operators';
    if (/consumer|individual|person/i.test(combined)) return 'Consumers and individuals';
    return 'Prospective customers';
  }

  function inferPricingModel(text, structuredData) {
    const combined = `${text} ${structuredData.map(item => item.priceRange || '').join(' ')}`.toLowerCase();
    if (/free|freemium/i.test(combined)) return 'freemium';
    if (/subscription|monthly|annual|per seat|per user/i.test(combined)) return 'subscription';
    if (/quote|custom|contact sales|book demo/i.test(combined)) return 'custom quote';
    if (/tiered|plans|packages/i.test(combined)) return 'tiered';
    return 'not specified';
  }

  function inferLocations(text, structuredData) {
    const candidates = [];
    structuredData.forEach(item => {
      if (item.address) candidates.push(item.address);
      if (item.areaServed) candidates.push(...item.areaServed);
    });
    const found = normalizeList(candidates.concat(Array.from(text.matchAll(/\b(?:US|USA|United States|Canada|UK|Europe|Global|Remote|International)\b/gi)).map(match => match[0])));
    return found.slice(0, 5);
  }

  function inferLanguages(text) {
    return normalizeList(Array.from(text.matchAll(/\b(English|Spanish|French|German|Portuguese|Arabic|Chinese|Japanese|Korean)\b/gi)).map(match => match[0]));
  }

  function inferBrandTone(text) {
    const combined = text.toLowerCase();
    if (/innovative|modern|cutting-edge|forward-thinking|ai/i.test(combined)) return 'innovative';
    if (/friendly|warm|welcoming|human/i.test(combined)) return 'friendly';
    if (/bold|visionary|confident|premium/i.test(combined)) return 'bold';
    return 'professional';
  }

  function inferLeadObjective(text, primaryCTA) {
    if (/book a demo|request a demo|schedule|talk to sales/i.test(`${text} ${primaryCTA}`.toLowerCase())) return 'book a demo';
    if (/request a quote|get a quote|contact sales|quote/i.test(`${text} ${primaryCTA}`.toLowerCase())) return 'request a quote';
    if (/start free|try now|get started/i.test(`${text} ${primaryCTA}`.toLowerCase())) return 'start free trial';
    return 'capture leads';
  }

  function inferTrustSignals(text, structuredData) {
    const signals = {
      testimonials: [],
      reviews: [],
      certifications: [],
      yearsInBusiness: null,
      caseStudies: [],
    };
    if (/testimonial|review|trusted by|customer love|what customers say/i.test(text)) signals.testimonials.push('Testimonials mentioned on site');
    if (/review|reviews|rating|rated/i.test(text)) signals.reviews.push('Reviews mentioned on site');
    if (/certified|iso|soc 2|gdpr|security|privacy/i.test(text)) signals.certifications.push('Security and compliance signals found');
    if (/case study|case studies|customer story|success story/i.test(text)) signals.caseStudies.push('Case studies mentioned on site');
    if (structuredData.some(item => item.foundingDate)) {
      const foundingDate = structuredData.find(item => item.foundingDate)?.foundingDate;
      const match = String(foundingDate).match(/(\d{4})/);
      if (match) {
        signals.yearsInBusiness = new Date().getFullYear() - Number(match[1]);
      }
    }
    return signals;
  }

  function inferCompetitiveAdvantages(text, features, benefits) {
    const combined = `${text} ${features.join(' ')} ${benefits.join(' ')}`.toLowerCase();
    const advantages = [];
    if (/automate|automation/i.test(combined)) advantages.push('Automation');
    if (/faster|speed|accelerate/i.test(combined)) advantages.push('Speed and efficiency');
    if (/simplify|streamline|reduce manual|less manual/i.test(combined)) advantages.push('Simplified workflows');
    if (/improve|better|increase/i.test(combined)) advantages.push('Better performance');
    return normalizeList(advantages);
  }

  function inferConfidenceScore(structuredData, contact, socialLinks, ctas, valuePropositions, trustSignals) {
    let score = 0.2;
    if (structuredData.length > 0) score += 0.2;
    if (contact.email || contact.phone) score += 0.2;
    if (socialLinks.length > 0) score += 0.1;
    if (ctas.length > 0) score += 0.1;
    if (valuePropositions.length > 0) score += 0.1;
    if (trustSignals.testimonials.length + trustSignals.reviews.length + trustSignals.certifications.length + trustSignals.caseStudies.length > 0) score += 0.1;
    return Math.min(0.99, Number(score.toFixed(2)));
  }

  function buildNormalizedBusinessProfile(pages, structuredData, targetUrl) {
    const structuredSignals = extractStructuredSignals(structuredData);
    const allPageText = pages.map(page => [page.title, page.metadata?.description, page.metadata?.textPreview, page.metadata?.title].filter(Boolean).join(' ')).join(' ');
    const contactCandidates = pages.flatMap(page => [
      ...(page.metadata?.contactInfo?.emails || []),
      ...(page.metadata?.contactInfo?.phones || []),
      ...(page.metadata?.contactInfo?.addresses || []),
    ]);
    const contactInfo = {
      email: normalizeText(structuredSignals.find(item => item.email)?.email || contactCandidates.find(item => /@/.test(item)) || ''),
      phone: normalizeText(structuredSignals.find(item => item.telephone)?.telephone || contactCandidates.find(item => /\d/.test(item)) || ''),
      address: normalizeText(structuredSignals.find(item => item.address)?.address || ''),
    };
    const socialLinks = normalizeList([
      ...pages.flatMap(page => page.metadata?.socialLinks || []),
      ...structuredSignals.flatMap(item => item.sameAs || [])
    ]);
    const ctas = normalizeList(pages.flatMap(page => page.metadata?.ctas || []));
    const valuePropositions = normalizeList(pages.flatMap(page => page.metadata?.valuePropositions || [])).filter(value => !/northwind labs\s*\|/i.test(value));
    const services = normalizeList([
      ...pages.flatMap(page => page.extracted?.services || []),
      ...structuredSignals.flatMap(item => item.offers || []).flatMap(entry => typeof entry === 'string' ? [entry] : [entry.name || '']),
      ...pages.flatMap(page => [page.metadata?.description].filter(Boolean))
    ]).filter(value => !/northwind labs \| ai onboarding/i.test(value) && !/northwind labs/i.test(value));
    const products = normalizeList([
      ...pages.flatMap(page => page.extracted?.products || []),
      ...structuredSignals.flatMap(item => item.offers || []).flatMap(entry => typeof entry === 'string' ? [] : [entry.name || ''])
    ]);
    const trustSignals = inferTrustSignals(allPageText, structuredSignals);
    const features = normalizeList(pages.flatMap(page => page.extracted?.features || []));
    const benefits = normalizeList(pages.flatMap(page => page.extracted?.benefits || []));
    const profile = {
      companyName: cleanCompanyName(structuredSignals.find(item => item.name)?.name || pages.find(page => page.title)?.title || 'Unknown company'),
      website: normalizeUrl(structuredSignals.find(item => item.url)?.url || pages.find(page => page.metadata?.canonical)?.metadata?.canonical || targetUrl || '') || '',
      industry: normalizeText(structuredSignals.find(item => item.industry)?.industry || inferIndustry(allPageText, structuredSignals)),
      businessType: normalizeText(inferBusinessType(allPageText, structuredSignals)),
      targetAudience: normalizeText(inferAudience(allPageText)),
      idealCustomer: normalizeText(inferAudience(allPageText)),
      products,
      services: services.length > 0 ? services : [normalizeText(allPageText.slice(0, 120))],
      pricingModel: normalizeText(inferPricingModel(allPageText, structuredSignals)),
      locations: inferLocations(allPageText, structuredSignals),
      languages: inferLanguages(allPageText),
      contact: contactInfo,
      socialLinks,
      valuePropositions: valuePropositions.length > 0 ? valuePropositions : normalizeList(benefits),
      primaryCTA: normalizeText(ctas[0] || 'Contact us'),
      secondaryCTAs: ctas.slice(1),
      trustSignals,
      brandTone: normalizeText(inferBrandTone(allPageText)),
      competitiveAdvantages: inferCompetitiveAdvantages(allPageText, features, benefits),
      leadObjective: normalizeText(inferLeadObjective(allPageText, ctas[0] || '')),
      confidenceScore: inferConfidenceScore(structuredSignals, contactInfo, socialLinks, ctas, valuePropositions, trustSignals),
    };

    return {
      companyName: profile.companyName || 'Unknown company',
      website: profile.website || '',
      industry: profile.industry || 'Unknown',
      businessType: profile.businessType || 'Business',
      targetAudience: profile.targetAudience || 'Prospective customers',
      idealCustomer: profile.idealCustomer || profile.targetAudience || 'Prospective customers',
      products: profile.products || [],
      services: profile.services || [],
      pricingModel: profile.pricingModel || 'not specified',
      locations: profile.locations || [],
      languages: profile.languages || [],
      contact: {
        email: profile.contact?.email || '',
        phone: profile.contact?.phone || '',
        address: profile.contact?.address || '',
      },
      socialLinks: profile.socialLinks || [],
      valuePropositions: profile.valuePropositions || [],
      primaryCTA: profile.primaryCTA || 'Contact us',
      secondaryCTAs: profile.secondaryCTAs || [],
      trustSignals: {
        testimonials: profile.trustSignals?.testimonials || [],
        reviews: profile.trustSignals?.reviews || [],
        certifications: profile.trustSignals?.certifications || [],
        yearsInBusiness: profile.trustSignals?.yearsInBusiness || null,
        caseStudies: profile.trustSignals?.caseStudies || [],
      },
      brandTone: profile.brandTone || 'professional',
      competitiveAdvantages: profile.competitiveAdvantages || [],
      leadObjective: profile.leadObjective || 'capture leads',
      confidenceScore: Number(profile.confidenceScore || 0),
    };
  }

  function resolveLink(baseUrl, href) {
    try {
      return new URL(href, baseUrl).toString();
    } catch {
      return null;
    }
  }

  function getPreviousScan(tenantId, targetUrl) {
    const row = db.prepare(`
      SELECT scan_id
      FROM website_scans
      WHERE tenant_id = ? AND target_url = ? AND status = 'completed'
      ORDER BY created_at DESC
      LIMIT 1
    `).get(tenantId, targetUrl);
    return row || null;
  }

  function getPreviousPageHashes(tenantId, scanId) {
    const rows = db.prepare(`
      SELECT url, content_hash
      FROM website_scan_pages
      WHERE tenant_id = ? AND scan_id = ?
    `).all(tenantId, scanId);
    return new Map(rows.map(row => [row.url, row.content_hash]));
  }

  function getPreviousPageStates(tenantId) {
    const rows = db.prepare(`
      SELECT url, content_hash, page_metadata
      FROM website_scan_pages
      WHERE tenant_id = ?
      ORDER BY created_at DESC
    `).all(tenantId);
    const state = new Map();
    for (const row of rows) {
      const key = normalizeUrlForComparison(row.url);
      if (!key || state.has(key)) continue;
      let metadata = {};
      try {
        metadata = JSON.parse(row.page_metadata || '{}');
      } catch {
        metadata = {};
      }
      state.set(key, { contentHash: row.content_hash, metadata });
    }
    return state;
  }

  async function fetchPage(url, previousPageInfo) {
    const headers = {};
    const previousMetadata = previousPageInfo?.metadata || {};
    if (previousMetadata.etag) headers['If-None-Match'] = previousMetadata.etag;
    if (previousMetadata.lastModified) headers['If-Modified-Since'] = previousMetadata.lastModified;

    const response = await fetch(url, { headers, redirect: 'manual', signal: AbortSignal.timeout(10000) });
    if (response.status === 304) {
      return { status: 'unchanged', url, previousPageInfo };
    }
    if (response.status >= 300 && response.status < 400) {
      const redirectLocation = response.headers.get('location');
      if (redirectLocation) {
        throw new Error(`Redirect ${response.status} to ${redirectLocation}`);
      }
      throw new Error(`Redirect response ${response.status}`);
    }
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    const contentType = response.headers.get('content-type') || '';
    if (!contentType.includes('text/html')) {
      throw new Error('Non-HTML response');
    }
    const contentLength = Number(response.headers.get('content-length') || 0);
    if (contentLength > 1024 * 1024) {
      throw new Error('Page too large');
    }
    const html = await response.text();
    return {
      status: 'fetched',
      html,
      url: response.url || url,
      etag: response.headers.get('etag') || null,
      lastModified: response.headers.get('last-modified') || null,
    };
  }

  async function crawlPages(targetUrl, maxPages, previousPageStates) {
    const queue = [{ url: targetUrl, depth: 0 }];
    const seen = new Set();
    const pages = [];
    const targetOrigin = new URL(targetUrl).origin;
    let processed = 0;

    while (queue.length > 0 && processed < maxPages) {
      const current = queue.shift();
      if (!current) continue;
      const currentUrl = normalizeUrl(current.url);
      if (!currentUrl) continue;
      const comparisonKey = normalizeUrlForComparison(currentUrl);
      if (!comparisonKey || seen.has(comparisonKey)) continue;
      seen.add(comparisonKey);

      try {
        const previousPageInfo = previousPageStates.get(comparisonKey);
        const pageFetch = await fetchPage(currentUrl, previousPageInfo);
        if (pageFetch.status === 'unchanged') {
          pages.push({
            url: currentUrl,
            title: previousPageInfo?.metadata?.title || 'Previously seen page',
            contentHash: previousPageInfo?.contentHash || crypto.createHash('sha256').update('').digest('hex'),
            snippet: previousPageInfo?.metadata?.textPreview || '',
            extracted: { services: [], pricing: [], contact: [], about: [], faq: [] },
            pageType: previousPageInfo?.metadata?.pageType || 'content',
            unchanged: true,
            metadata: previousPageInfo?.metadata || {},
          });
          processed += 1;
          continue;
        }

        const parsed = parsePageContent(pageFetch.html, pageFetch.url);
        const extraction = extractStructuredFacts(parsed, pageFetch.url);
        const contentHash = extraction.contentHash;
        if (previousPageInfo && previousPageInfo.contentHash === contentHash) {
          pages.push({
            url: currentUrl,
            title: previousPageInfo?.metadata?.title || 'Previously seen page',
            contentHash,
            snippet: previousPageInfo?.metadata?.textPreview || '',
            extracted: { services: [], pricing: [], contact: [], about: [], faq: [] },
            pageType: previousPageInfo?.metadata?.pageType || 'content',
            unchanged: true,
            metadata: previousPageInfo?.metadata || {},
          });
          processed += 1;
          continue;
        }
        const pagePayload = {
          url: pageFetch.url,
          title: extraction.title,
          contentHash: extraction.contentHash,
          snippet: extraction.textPreview,
          extracted: {
            services: extraction.intelligence.services,
            products: extraction.intelligence.products,
            pricing: extraction.intelligence.pricing,
            contact: extraction.contactInfo.emails.concat(extraction.contactInfo.phones),
            about: extraction.intelligence.benefits,
            faq: extraction.intelligence.ctas,
            features: extraction.intelligence.features,
            benefits: extraction.intelligence.benefits,
          },
          pageType: extraction.pageType,
          unchanged: false,
          metadata: {
            ...extraction.meta,
            pageType: extraction.pageType,
            score: extraction.score,
            textPreview: extraction.textPreview,
            etag: pageFetch.etag,
            lastModified: pageFetch.lastModified,
            structuredData: extraction.structuredData,
            canonical: extraction.canonical,
            ctas: extraction.intelligence.ctas,
            valuePropositions: extraction.intelligence.benefits,
            contactInfo: extraction.contactInfo,
            socialLinks: extraction.socialLinks,
            trustSignals: extraction.trustSignals,
            title: extraction.title,
          },
        };
        pages.push(pagePayload);
        processed += 1;

        for (const href of parsed.links) {
          const resolved = resolveLink(pageFetch.url, href);
          if (!resolved) continue;
          try {
            const resolvedUrl = new URL(resolved);
            if (resolvedUrl.origin !== targetOrigin) continue;
            const candidate = normalizeUrl(resolvedUrl.toString());
            if (!candidate || seen.has(normalizeUrlForComparison(candidate))) continue;
            if (pages.length + queue.length >= maxPages) continue;
            queue.push({ url: candidate, depth: current.depth + 1 });
          } catch {}
        }
      } catch (error) {
        // Ignore problematic pages and continue crawling
      }
    }

    return pages;
  }

  async function scanWebsite(options = {}) {
    const tenantId = options.tenantId;
    const targetUrl = normalizeUrl(options.url || options.targetUrl);
    if (!tenantId || !targetUrl) {
      throw new Error('tenantId and url are required');
    }

    const previousScan = getPreviousScan(tenantId, targetUrl);
    const scanId = uuidv4();
    const createdAt = new Date().toISOString();
    const startedAt = Date.now();

    db.prepare(`
      INSERT INTO website_scans (scan_id, tenant_id, target_url, previous_scan_id, status, created_at, metadata)
      VALUES (?, ?, ?, ?, 'running', ?, ?)
    `).run(scanId, tenantId, targetUrl, previousScan?.scan_id || null, createdAt, JSON.stringify({ maxPages: options.maxPages || 10 }));

    const previousPageStates = getPreviousPageStates(tenantId);
    const pages = await crawlPages(targetUrl, options.maxPages || 10, previousPageStates);
    const previousHashes = previousScan ? getPreviousPageHashes(tenantId, previousScan.scan_id) : new Map();

    const insertPage = db.prepare(`
      INSERT INTO website_scan_pages (page_id, scan_id, tenant_id, url, title, content_hash, snippet, extracted, page_metadata, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    let dbWriteCount = 0;
    for (const page of pages) {
      const pageMetadata = JSON.stringify(page.metadata || {});
      insertPage.run(uuidv4(), scanId, tenantId, page.url, page.title, page.contentHash, page.snippet, JSON.stringify({
        services: page.extracted.services,
        pricing: page.extracted.pricing,
        contact: page.extracted.contact,
        about: page.extracted.about,
        faq: page.extracted.faq,
        pageType: page.pageType,
      }), pageMetadata, new Date().toISOString());
      dbWriteCount += 1;
    }

    const changedPageCount = pages.filter(page => page.unchanged === false).length;
    const unchangedPageCount = pages.filter(page => page.unchanged === true).length;

    const structuredData = pages.flatMap(page => page.metadata?.structuredData || []);
    const businessProfile = buildNormalizedBusinessProfile(pages, structuredData, targetUrl);
    const scorecard = buildScorecard(pages);

    const report = {
      summary: {
        tenantId,
        targetUrl,
        scanId,
        previousScanId: previousScan?.scan_id || null,
        pageCount: pages.length,
        changedPageCount,
        unchangedPageCount,
        completedAt: new Date().toISOString(),
      },
      pages: pages.map(page => ({
        url: page.url,
        title: page.title,
        pageType: page.pageType,
        unchanged: page.unchanged,
        score: page.metadata?.score || 0,
        intelligence: {
          services: page.extracted.services,
          pricing: page.extracted.pricing,
          contact: page.extracted.contact,
          about: page.extracted.about,
          faq: page.extracted.faq,
        },
        meta: page.metadata,
      })),
      extracted: pages.reduce((acc, page) => {
        acc.services = [...(acc.services || []), ...(page.extracted.services || [])];
        acc.pricing = [...(acc.pricing || []), ...(page.extracted.pricing || [])];
        acc.contact = [...(acc.contact || []), ...(page.extracted.contact || [])];
        acc.about = [...(acc.about || []), ...(page.extracted.about || [])];
        acc.faq = [...(acc.faq || []), ...(page.extracted.faq || [])];
        return acc;
      }, {
        services: [],
        pricing: [],
        contact: [],
        about: [],
        faq: [],
      }),
      structuredData,
      businessProfile,
      scorecard,
      metrics: {
        crawlSpeed: pages.length > 0 ? (pages.length / Math.max(1, (Date.now() - startedAt) / 1000)).toFixed(2) : 0,
        memoryMb: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
        databaseWrites: dbWriteCount,
        averageScanTimeMs: Date.now() - startedAt,
      },
      duplicates: detectDuplicates(pages),
    };

    db.prepare(`
      UPDATE website_scans
      SET status = 'completed', completed_at = ?, metadata = ?
      WHERE scan_id = ?
    `).run(new Date().toISOString(), JSON.stringify({ ...report.summary, pageCount: pages.length }), scanId);

    db.prepare(`
      INSERT INTO website_business_profiles (tenant_id, scan_id, target_url, profile_json, created_at)
      VALUES (?, ?, ?, ?, ?)
      ON CONFLICT(tenant_id) DO UPDATE SET
        scan_id = excluded.scan_id,
        target_url = excluded.target_url,
        profile_json = excluded.profile_json,
        created_at = excluded.created_at
    `).run(tenantId, scanId, targetUrl, JSON.stringify(businessProfile), new Date().toISOString());

    return { scanId, report };
  }

  function buildScorecard(pages) {
    const categories = ['home', 'about', 'services', 'products', 'pricing', 'faq', 'contact', 'team', 'blog', 'case studies', 'testimonials', 'policies'];
    return categories.reduce((acc, category) => {
      const page = pages.find(entry => entry.pageType === category);
      const score = page ? Math.min(1, 0.7 + (page.metadata?.score || 0) * 0.3) : 0.2;
      acc[category] = {
        score: Number(score.toFixed(2)),
        status: score >= 0.7 ? 'good' : score >= 0.4 ? 'partial' : 'missing',
        evidence: page ? [page.title, page.url] : [],
      };
      return acc;
    }, {});
  }

  function detectDuplicates(pages) {
    const bySignature = new Map();
    const duplicates = [];
    for (const page of pages) {
      const signature = page.metadata?.canonical || normalizeUrlForComparison(page.url);
      if (!signature) continue;
      if (!bySignature.has(signature)) {
        bySignature.set(signature, []);
      }
      bySignature.get(signature).push(page);
    }
    for (const [signature, grouped] of bySignature.entries()) {
      if (grouped.length > 1) {
        duplicates.push({ signature, pages: grouped.map(page => page.url) });
      }
    }
    return duplicates;
  }

  function close() {
    db.close();
  }

  return { scanWebsite, close };
}

function createDefaultScannerService() {
  return createWebsiteScannerService({
    dbPath: process.env.WEBSITE_SCANNER_DB_PATH || path.join(__dirname, '..', 'data', 'website-scanner.sqlite')
  });
}

const defaultService = createDefaultScannerService();

async function scan(clientId, siteUrl) {
  const result = await defaultService.scanWebsite({
    tenantId: clientId,
    url: siteUrl,
    maxPages: 10,
    respectRobotsTxt: false,
  });
  const record = {
    id: result.scanId,
    client_id: clientId,
    url: siteUrl,
    status: 'complete',
    created_at: new Date().toISOString(),
    services_found: JSON.stringify(result.report.extracted.services),
    faqs_found: JSON.stringify(result.report.extracted.faq),
    team_found: JSON.stringify([]),
    pages_scanned: result.report.summary.pageCount,
    raw_data: JSON.stringify(result.report),
  };
  defaultScanStore.set(result.scanId, record);
  return record;
}

function getResults(clientId) {
  return Array.from(defaultScanStore.values()).filter(item => item.client_id === clientId).sort((a, b) => b.created_at.localeCompare(a.created_at));
}

function applyToConfig(clientId, resultId) {
  const result = defaultScanStore.get(resultId);
  if (!result || result.client_id !== clientId) return null;
  return {
    ok: true,
    clientId,
    scanId: resultId,
    appliedAt: new Date().toISOString(),
    services: JSON.parse(result.services_found || '[]'),
    faqs: JSON.parse(result.faqs_found || '[]'),
  };
}

module.exports = { createWebsiteScannerService, scan, getResults, applyToConfig };
