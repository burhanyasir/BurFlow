function createKnowledgeBase(clinic, services, faqs) {
  const serviceIndex = services.map(s => ({
    ...s,
    keywords: s.name.toLowerCase().split(/[&\s,]+/).filter(k => k.length > 2)
  }));

  const faqIndex = faqs.map(f => {
    const tokens = (f.question + " " + f.answer).toLowerCase().split(/\s+/).filter(t => t.length > 3);
    const wordSet = new Set(tokens);
    return { ...f, wordSet, tokens };
  });

  function findService(query) {
    const q = query.toLowerCase();
    const scores = serviceIndex.map(s => {
      let score = 0;
      for (const kw of s.keywords) {
        if (q.includes(kw)) score += 10;
        const kwStem = kw.replace(/s$/, "");
        if (kwStem !== kw && q.includes(kwStem)) score += 8;
        const qStem = kw.slice(0, Math.max(kw.length - 1, 3));
        if (q.includes(qStem) && kw.includes(qStem)) score += 3;
      }
      const nameWords = s.name.toLowerCase().split(/\s+/);
      for (const w of nameWords) {
        if (w.length > 2 && q.includes(w)) score += 5;
        const wStem = w.replace(/s$/, "");
        if (wStem !== w && q.includes(wStem)) score += 3;
      }
      const exact = s.name.toLowerCase();
      if (q.includes(exact)) score += 15;
      return { service: s, score };
    });
    scores.sort((a, b) => b.score - a.score || a.service.name.localeCompare(b.service.name));
    return scores[0] && scores[0].score > 0 ? scores[0].service : null;
  }

  function findFaq(query) {
    const q = query.toLowerCase();
    const qTokens = new Set(q.split(/\s+/).filter(t => t.length > 3));
    const scores = faqIndex.map(f => {
      let overlap = 0;
      for (const t of qTokens) {
        if (f.wordSet.has(t)) overlap++;
      }
      const questionOverlap = f.question.toLowerCase().split(/\s+/).filter(t => t.length > 3)
        .filter(t => q.includes(t)).length;
      return { faq: f, overlap, questionOverlap };
    });
    scores.sort((a, b) => (b.overlap + b.questionOverlap * 3) - (a.overlap + a.questionOverlap * 3));
    const best = scores[0];
    if (best && (best.overlap + best.questionOverlap * 3) >= 6) return best.faq;
    return null;
  }

  function findInsurance(text) {
    const providers = [
      { name: "Delta Dental", keywords: ["delta dental", "delta"] },
      { name: "MetLife", keywords: ["metlife", "met life"] },
      { name: "Cigna", keywords: ["cigna"] },
      { name: "Aetna", keywords: ["aetna"] },
      { name: "Blue Cross Blue Shield", keywords: ["blue cross", "bcbs"] },
      { name: "United Healthcare", keywords: ["united healthcare", "united"] },
      { name: "Guardian", keywords: ["guardian"] },
      { name: "Humana", keywords: ["humana"] }
    ];
    const lower = text.toLowerCase();
    for (const p of providers) {
      for (const kw of p.keywords) {
        if (lower.includes(kw)) return p.name;
      }
    }
    return null;
  }

  function getClinicInfo() {
    return clinic;
  }

  function getServiceList() {
    return services;
  }

  function getPricing(serviceName) {
    const s = findService(serviceName);
    return s || null;
  }

  function getHours() {
    return clinic.hours;
  }

  function getLocation() {
    return { address: clinic.address, phone: clinic.phone, email: clinic.email };
  }

  return { findService, findFaq, findInsurance, getClinicInfo, getServiceList, getPricing, getHours, getLocation };
}

module.exports = { createKnowledgeBase };
