"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.detectVisitorIntent = detectVisitorIntent;
const intentPatterns = {
    Buying: [
        { regex: /\bready to buy\b|\bbuy now\b|\bpurchase\b|\bsign up\b|\bstart free\b|\bstart trial\b|\bcheckout\b|\badd to cart\b|\bget started\b|\btake my money\b|\bbuy online\b|\breserve\b|\bbook now\b/i, weight: 5 },
        { regex: /\bquote request\b|\brequest a quote\b|\bcontact sales\b|\brequest demo\b/i, weight: 4 },
        { regex: /\border\b|\borders\b|\bcart\b|\bcheckout\b|\bstore\b|\bshop\b/i, weight: 2 },
    ],
    Pricing: [
        { regex: /\bpricing\b|\bprice\b|\bcost\b|\bhow much\b|\bmonthly\b|\bsubscription\b|\bquote\b|\bplan\b|\btier\b|\bstarting at\b|\brates?\b/i, weight: 4 },
        { regex: /\bplans?\b|\bpackages?\b|\benterprise\b|\bstarter\b|\bpro\b|\bfree\b/i, weight: 2 },
    ],
    'Product Research': [
        { regex: /\bwhat does\b|\bwhat are\b|\bfeatures\b|\bbenefits\b|\bcapabilities\b|\bplatform\b|\bsolution\b|\bsolutions\b|\bproduct\b|\bproducts\b|\bservice\b|\bservices\b|\bportfolio\b|\bcatalog\b|\bofferings\b|\bindustries\b|\bcase study\b|\bcase studies\b|\buse cases\b|\bcompare\b|\bintegrations?\b|\bspecifications?\b/i, weight: 4 },
        { regex: /\bmenu\b|\bshowcase\b|\bsolutions\b|\bindustries\b/i, weight: 2 },
    ],
    Support: [
        { regex: /\bsupport\b|\bhelp\b|\btroubleshooting\b|\bissue\b|\bproblem\b|\berror\b|\bfaq\b|\bdocs\b|\bdocumentation\b|\breturns\b|\brefund\b|\bshipping\b|\bstatus\b/i, weight: 4 },
        { regex: /\bcontact us\b|\bget help\b|\bcustomer service\b|\bassistant\b/i, weight: 2 },
    ],
    Comparison: [
        { regex: /\bcompare\b|\bcomparison\b|\bvs\b|\bversus\b|\bdifference\b|\bdifferent\b|\bbetter\b|\balternative\b|\bchoose between\b|\bpros and cons\b/i, weight: 4 },
        { regex: /\bwhich one\b|\bwhich plan\b|\bbest fit\b/i, weight: 2 },
    ],
    Booking: [
        { regex: /\bbook\b|\bschedule\b|\bdemo\b|\bappointment\b|\bmeeting\b|\bcall\b|\bconsultation\b|\bcalendar\b|\breservation\b/i, weight: 4 },
        { regex: /\bwalkthrough\b|\bintro call\b|\bdiscovery call\b/i, weight: 2 },
    ],
    Contact: [
        { regex: /\bcontact\b|\bcontact us\b|\breach out\b|\btalk to sales\b|\bget in touch\b|\bsomeone contact me\b|\bmessage us\b|\bcall us\b|\bcallback\b/i, weight: 4 },
        { regex: /\brequest info\b|\brequest callback\b/i, weight: 2 },
    ],
    Careers: [
        { regex: /\bcareers\b|\bjobs\b|\bhiring\b|\broles\b|\bopen roles\b|\bjoin our team\b|\bapply now\b|\bapply\b|\brecruiting\b/i, weight: 4 },
        { regex: /\bteam\b|\bengineer\b|\bdesigner\b|\bcustomer success\b/i, weight: 2 },
    ],
    'General Information': [
        { regex: /\bwhat is\b|\bwho is\b|\babout\b|\boverview\b|\blearn more\b|\bcompany overview\b|\bmission\b|\bour story\b|\bwho we are\b|\bhistory\b|\babout us\b/i, weight: 4 },
        { regex: /\bcompany\b|\binstitutions?\b|\borganization\b|\boverview\b/i, weight: 2 },
    ],
};
function normalizeText(value) {
    if (!value)
        return '';
    if (Array.isArray(value)) {
        return value.filter(Boolean).join(' ');
    }
    return String(value);
}
function getUrlPath(url) {
    try {
        return new URL(url || '').pathname.toLowerCase();
    }
    catch {
        return (url || '').toLowerCase();
    }
}
function countMatches(text, patterns) {
    return patterns.reduce((total, pattern) => total + (text.match(pattern.regex)?.length || 0) * pattern.weight, 0);
}
function applyIndustrySpecificBoosts(scores, input, path, pageType, titleText, headingText, contentText, metaText, pageText, userQuestion, industry) {
    const normalizedPageType = normalizeText(pageType).toLowerCase();
    const isHomePage = normalizedPageType === 'home' || /^\/?$/.test(path);
    const pageSignals = `${pageText} ${path} ${contentText} ${titleText} ${headingText} ${metaText}`.toLowerCase();
    const businessText = normalizeText([input.businessProfile?.businessType, input.businessProfile?.industry, ...(input.businessProfile?.products || []), ...(input.businessProfile?.services || []), ...(input.businessProfile?.goals || []), ...(input.businessProfile?.policies || [])]).toLowerCase();
    const aboutCompanySignals = /(about us|our story|company overview|mission|who we are|history|leadership|team|purpose|values)/i.test(pageSignals);
    const aboutPath = /^\/(about|company|our-story|mission|overview|history|leadership)(\/|$)/.test(path);
    if (industry.includes('healthcare')) {
        const hasExplicitBooking = /(request an appointment|make an appointment|book(?: an)? appointment|book now|schedule(?: an)? appointment|request appointment|appointment booking|book a consultation|schedule a consultation|meet with|call to schedule)/i.test(pageSignals);
        const hasHealthResearch = /(tests|procedures|conditions|symptoms|treatment|specialist|provider|clinic|doctor|care|insurance|health|medical|test|procedure|diagnosis)/i.test(pageSignals);
        const hasAppointmentPath = /\/appointments?|\/appointment|\/schedule|\/consultation|\/book|\/find-a-doctor|\/request-appointment/i.test(path);
        const isHealthcareHome = normalizedPageType === 'home' || /^\/?$/.test(path);
        const isHealthcareContactPage = normalizedPageType === 'contact' || /\/locations|\/contact|\/find-a-doctor|\/locations\//i.test(path);
        const isHealthcareProductPage = normalizedPageType === 'product' || /tests|procedures|conditions|services|health-wellness|diseases-conditions|specialties|treatment/i.test(path);
        if (hasExplicitBooking || hasAppointmentPath) {
            scores.Booking += 14;
            scores.Buying += 3;
        }
        if (isHealthcareContactPage) {
            scores.Contact += 12;
            scores.Booking -= 6;
            scores['General Information'] += 4;
        }
        else if (isHealthcareHome) {
            scores['General Information'] += 14;
            scores.Booking -= 8;
            if (!hasExplicitBooking) {
                scores['Product Research'] -= 6;
            }
        }
        else if (isHealthcareProductPage && hasHealthResearch) {
            scores['Product Research'] += 10;
            scores.Booking -= 6;
        }
        if (/(appointment|consultation|book|schedule)/i.test(userQuestion)) {
            scores.Booking += 8;
            scores.Buying += 2;
        }
        if (/(insurance|treatment|condition|specialist|provider|clinic|doctor|medical|test|procedure|symptom|diagnosis)/i.test(pageSignals)) {
            scores['Product Research'] += 6;
        }
    }
    if (industry.includes('saas') || industry.includes('software')) {
        if (/(demo|trial|book|schedule|contact sales|request demo|start free|sign up)/i.test(pageSignals)) {
            scores.Booking += 6;
            scores.Buying += 4;
        }
        if (/(pricing|price|plan|subscription|tier|quote)/i.test(pageSignals)) {
            scores.Pricing += 7;
        }
        if (/(product|product page|solution|solutions|service|services|platform|capabilities|integrations?)/i.test(pageSignals) || /(product|service|solution)/i.test(businessText)) {
            scores['Product Research'] += 8;
        }
        if (/(contact|sales|demo|book)/i.test(pageSignals)) {
            scores.Contact += 5;
        }
    }
    if (industry.includes('ecommerce') || industry.includes('retail') || industry.includes('shop')) {
        const isCheckoutPage = /(checkout|cart|order|purchase|add to cart|buy now|place order|delivery|shipping|pickup)/i.test(pageSignals);
        const hasCatalogSignals = /(product|products|shop|catalog|collection|category|store|featured|deal|sale|offers?)/i.test(pageSignals);
        const isHomePage = /^\/$|^\/index\.html$/.test(path);
        const hasShopfrontSignals = /(shop|buy|browse|collection|collections|category|categories|store|featured|deal|sale|offers?|new arrivals|best sellers|trending|gift guide|discover)/i.test(pageSignals);
        const isEcommerceHome = isHomePage || /home/.test(normalizedPageType);
        if (isCheckoutPage) {
            scores.Buying += 14;
        }
        if (isEcommerceHome) {
            scores['Product Research'] += 12;
            scores['General Information'] -= 6;
        }
        if ((isEcommerceHome && hasShopfrontSignals) || /shop|store|catalog|products|collection|featured|deal|sale|offers?/i.test(normalizedPageType)) {
            scores['Product Research'] += 8;
            scores['General Information'] -= 4;
        }
        if (hasCatalogSignals) {
            scores['Product Research'] += 12;
            if (!isCheckoutPage && !isHomePage) {
                scores.Buying -= 2;
            }
        }
        if (isHomePage && hasCatalogSignals) {
            scores['Product Research'] += 6;
            scores.Buying -= 3;
        }
        if (/(help|faq|support|returns?|refund|shipping|customer service)/i.test(pageSignals)) {
            scores.Support += 8;
        }
    }
    if (industry.includes('education') || industry.includes('university') || industry.includes('college')) {
        if (/(admission|admissions|apply|application|enroll|enrollment|scholarship|tuition|financial aid)/i.test(pageSignals)) {
            scores.Buying += 12;
            scores.Contact += 2;
        }
        if (/(program|programs|degree|major|course|courses|campus|student|academics|faculty|curriculum)/i.test(pageSignals)) {
            scores['Product Research'] += 8;
        }
    }
    if (industry.includes('finance') || industry.includes('bank') || industry.includes('financial')) {
        if (/(credit card|loan|mortgage|savings|checking|investment|banking|account|card)/i.test(pageSignals)) {
            scores['Product Research'] += 8;
        }
        if (/(faq|help|support|customer service|contact)/i.test(pageSignals)) {
            scores.Support += 6;
        }
    }
    if (industry.includes('legal') || industry.includes('law')) {
        if (/(contact|consultation|call|attorney|lawyer|office|practice)/i.test(pageSignals)) {
            scores.Contact += 8;
        }
        if (/(practice areas|services|case|legal|attorney|lawyer|firm)/i.test(pageSignals)) {
            scores['Product Research'] += 6;
        }
        if (/^\/$|^\/index\.html$/.test(path) && !/(attorney|lawyer|office|practice|contact)/i.test(pageSignals)) {
            scores['General Information'] += 4;
        }
        if (aboutCompanySignals || aboutPath) {
            scores['General Information'] += 4;
        }
    }
    if (industry.includes('hotel') || industry.includes('restaurant') || industry.includes('hospitality')) {
        if (/(reservation|book|room|table|order|delivery|pickup|checkin|checkout)/i.test(pageSignals)) {
            scores.Booking += 10;
            scores.Buying += 6;
        }
        if (/(pricing|rate|rates|deal|offers?|discount)/i.test(pageSignals)) {
            scores.Pricing += 8;
        }
    }
    if (industry.includes('real estate') || industry.includes('property')) {
        const hasListingSignals = /(for sale|listed|listings?|property|homes? for sale|homes? and|agent|realtor|neighborhood|open house|market|properties)/i.test(pageSignals);
        if (hasListingSignals) {
            scores['Product Research'] += 8;
        }
        else if (/^\/$|^\/index\.html$/.test(path)) {
            scores['General Information'] += 5;
        }
        if (/(contact|agent|realtor|schedule|tour)/i.test(pageSignals)) {
            scores.Contact += 8;
        }
    }
    if (industry.includes('construction') || industry.includes('manufacturing') || industry.includes('industrial')) {
        const hasManufacturingProductSignals = /(product|products|equipment|machinery|systems|components|industrial solutions|manufacturing solutions|fabrication|engineering|processes|assembly)/i.test(pageSignals);
        const hasConstructionProjectSignals = /(project|projects|construction|build|contractor|general contractor|design build|engineering|site|infrastructure|commercial|residential)/i.test(pageSignals);
        const hasQuoteRequestSignals = /(quote|request a quote|estimate|proposal|pricing|contact sales|get in touch)/i.test(pageSignals);
        if (hasManufacturingProductSignals || hasConstructionProjectSignals) {
            scores['Product Research'] += 10;
            scores['General Information'] += 4;
        }
        if (hasQuoteRequestSignals) {
            scores.Contact += 8;
            scores.Buying += 4;
        }
        if (aboutCompanySignals || aboutPath || isHomePage) {
            scores['General Information'] += 8;
            scores['Product Research'] -= 2;
        }
    }
    if (industry.includes('nonprofit') || industry.includes('charity') || industry.includes('foundation')) {
        if (/(donate|donation|give|support|fundraise|volunteer|membership|join)/i.test(pageSignals)) {
            scores.Buying += 12;
        }
        if (/(mission|about|story|impact|programs?)/i.test(pageSignals)) {
            scores['General Information'] += 6;
        }
    }
    if (industry.includes('agency') || industry.includes('consulting') || industry.includes('services')) {
        if (/(service|services|solutions|capabilities|industries|case study|portfolio)/i.test(pageSignals)) {
            scores['Product Research'] += 7;
        }
        if (/(contact|consult|schedule|demo)/i.test(pageSignals)) {
            scores.Contact += 5;
        }
        if (aboutCompanySignals || aboutPath || isHomePage) {
            scores['General Information'] += 4;
        }
    }
}
function getIntentScores(input) {
    const scores = {
        Buying: 0,
        Pricing: 0,
        'Product Research': 0,
        Support: 0,
        Comparison: 0,
        Booking: 0,
        Contact: 0,
        Careers: 0,
        'General Information': 0,
    };
    const userQuestion = (input.userQuestion || '').toLowerCase();
    const pageText = normalizeText([input.pageTitle, input.pageContent, ...(input.pageHeadings || [])]).toLowerCase();
    const path = getUrlPath(input.currentUrl || input.landingPage || '');
    const pageType = normalizeText(input.pageType).toLowerCase();
    const headingText = normalizeText(input.pageHeadings || []).toLowerCase();
    const titleText = normalizeText(input.pageTitle).toLowerCase();
    const contentText = normalizeText([input.pageContent, input.metaTags?.description, input.metaTags?.ogDescription]).toLowerCase();
    const metaText = normalizeText([input.metaTags?.title, input.metaTags?.description, input.metaTags?.ogTitle, input.metaTags?.ogDescription]).toLowerCase();
    const knowledgeText = normalizeText(input.knowledgeEngineFacts || []).toLowerCase();
    const businessText = normalizeText([input.businessProfile?.businessType, input.businessProfile?.industry, ...(input.businessProfile?.goals || []), ...(input.businessProfile?.policies || [])]).toLowerCase();
    const hasUserIntent = Boolean(userQuestion.trim());
    const patternText = `${pageText} ${titleText} ${headingText} ${contentText} ${metaText}`.toLowerCase();
    const add = (intent, points) => {
        scores[intent] += points;
    };
    if (/(ready to buy|buy now|purchase|sign up|start free|start trial|checkout|take my money|buy online)/.test(userQuestion)) {
        add('Buying', 12);
    }
    if (/(checkout|cart|order|buy|purchase|donate|apply|admission|admissions|enroll|enrollment)/.test(pageType)) {
        add('Buying', 12);
    }
    if (/(pricing|price|plans?|quote|subscription|tier|rate|rates)/.test(pageType)) {
        add('Pricing', 12);
    }
    if (/(comparison|compare|vs|versus|alternative)/.test(pageType)) {
        add('Comparison', 12);
    }
    if (/(support|faq|help|troubleshooting|documentation|docs)/.test(pageType)) {
        add('Support', 12);
    }
    if (/(booking|book|appointment|schedule|demo|reservation|consultation)/.test(pageType)) {
        add('Booking', 12);
    }
    if (/(contact|contact-us|get-in-touch|reach-out|call-us)/.test(pageType)) {
        add('Contact', 12);
    }
    if (/(careers|jobs|hiring|apply|roles)/.test(pageType)) {
        add('Careers', 12);
    }
    if (/(product|products|service|services|solution|solutions|portfolio|capabilities|industries|catalog|offerings)/.test(pageType)) {
        add('Product Research', 10);
    }
    if (/(about|general|company|overview|story|who-we-are|mission)/.test(pageType)) {
        add('General Information', 10);
    }
    if (/(^|\b)home(\b|$)/.test(pageType)) {
        add('General Information', 4);
    }
    if (/(compare|versus|vs|difference|different|better|alternative|best fit|choose between|which plan|which one)/.test(patternText)) {
        add('Comparison', 4);
    }
    if (/(support|help|troubleshoot|issue|problem|error|faq|docs|documentation|returns|refund|shipping|status)/.test(patternText)) {
        add('Support', 4);
    }
    if (/(careers|jobs|hiring|roles|open roles|apply|recruiting|team)/.test(patternText)) {
        add('Careers', 4);
    }
    if (/(contact|reach out|get in touch|call us|contact us|message us|callback)/.test(patternText)) {
        add('Contact', 4);
    }
    if (/(product|products|service|services|solutions|portfolio|industries|case study|catalog|offerings|features|capabilities|platform)/.test(patternText)) {
        add('Product Research', 4);
    }
    if (/(about|who we are|company overview|mission|overview|our story|history|learn more)/.test(patternText)) {
        add('General Information', 3);
    }
    if (/(pricing|price|cost|plan|quote|subscription|starting at)/.test(patternText)) {
        add('Pricing', 3);
    }
    if (/(price|pricing|cost|how much|monthly|subscription|quote|starting at)/.test(userQuestion)) {
        add('Pricing', 12);
    }
    if (/(compare|versus|vs|difference|different|better|alternative|choose between|which plan|which one)/.test(userQuestion)) {
        add('Comparison', 16);
    }
    if (/(support|help|troubleshoot|issue|problem|error|faq|docs|documentation)/.test(userQuestion)) {
        add('Support', 12);
    }
    if (/(book|schedule|demo|meeting|call|appointment|consultation|reservation)/.test(userQuestion)) {
        add('Booking', 12);
    }
    if (/(contact|reach out|talk to sales|get in touch|someone contact me|message us|call us|callback)/.test(userQuestion)) {
        add('Contact', 12);
    }
    if (/(careers|jobs|hiring|roles|open roles|apply|recruiting)/.test(userQuestion)) {
        add('Careers', 12);
    }
    if (/(what does|what are|features|benefits|capabilities|product|products|service|services|portfolio|catalog|offerings|solutions|industry|case study|use cases|integrations?)/.test(userQuestion)) {
        add('Product Research', 12);
    }
    if (/(what is|who is|about|overview|learn more|who we are|company overview|mission|our story|about us)/.test(userQuestion)) {
        add('General Information', 9);
    }
    if (/\/pricing|\/plans|\/cost|\/quote|\/subscribe|\/tiers?|\/rates?/.test(path)) {
        add('Pricing', 10);
    }
    if (/\/buy|\/purchase|\/checkout|\/cart|\/order|\/trial|\/signup|\/shop|\/reserve|\/book-now/.test(path)) {
        add('Buying', 10);
    }
    if (/\/compare|\/comparison|\/vs|\/versus/.test(path)) {
        add('Comparison', 10);
    }
    if (/\/support|\/help|\/faq|\/troubleshooting|\/docs|\/documentation|\/returns|\/refund|\/shipping/.test(path)) {
        add('Support', 10);
    }
    if (/\/contact|\/contact-us|\/get-in-touch|\/reach-out/.test(path)) {
        add('Contact', 10);
    }
    if (/\/demo|\/book|\/schedule|\/appointment|\/consultation|\/meeting|\/reservation/.test(path)) {
        add('Booking', 10);
        add('Buying', 2);
    }
    if (/\/careers|\/jobs|\/hiring|\/join-us|\/apply|\/open-roles/.test(path)) {
        add('Careers', 9);
    }
    if (/\/about|\/company|\/who-we-are|\/our-story|\/mission|\/overview|\/learn-more|\/about-us/.test(path)) {
        add('General Information', 7);
    }
    if (/\/products?|\/services?|\/solutions?|\/portfolio|\/industries|\/catalog|\/menu|\/offerings|\/case-studies?/.test(path)) {
        add('Product Research', 7);
    }
    if (/(pricing|price|cost|plan|quote|subscription)/.test(titleText)) {
        add('Pricing', 3);
    }
    if (/(book|schedule|demo|appointment|consultation|meeting|reservation)/.test(titleText)) {
        add('Booking', 3);
    }
    if (/(support|help|troubleshoot|faq|documentation)/.test(titleText)) {
        add('Support', 3);
    }
    if (/(contact|reach out|get in touch|call us)/.test(titleText)) {
        add('Contact', 3);
    }
    if (/(careers|jobs|hiring|apply)/.test(titleText)) {
        add('Careers', 3);
    }
    if (/(product|products|service|services|solutions|portfolio|industries|case study|catalog|offerings)/.test(titleText)) {
        add('Product Research', 3);
    }
    if (/(about|who we are|company overview|mission|overview|our story|history)/.test(titleText)) {
        add('General Information', 3);
    }
    if (/(pricing|price|cost|plan|quote|subscription)/.test(headingText)) {
        add('Pricing', 2.5);
    }
    if (/(book|schedule|demo|appointment|consultation|meeting|reservation)/.test(headingText)) {
        add('Booking', 2.5);
    }
    if (/(support|help|troubleshoot|faq|documentation)/.test(headingText)) {
        add('Support', 2.5);
    }
    if (/(contact|reach out|get in touch|call us)/.test(headingText)) {
        add('Contact', 2.5);
    }
    if (/(careers|jobs|hiring|apply)/.test(headingText)) {
        add('Careers', 2.5);
    }
    if (/(product|products|service|services|solutions|portfolio|industries|case study|catalog|offerings)/.test(headingText)) {
        add('Product Research', 2.5);
    }
    if (/(about|who we are|company overview|mission|overview|our story|history)/.test(headingText)) {
        add('General Information', 2.5);
    }
    if (/(pricing|price|cost|plan|quote|subscription)/.test(contentText)) {
        add('Pricing', 2);
    }
    if (/(book|schedule|demo|appointment|consultation|meeting|reservation)/.test(contentText)) {
        add('Booking', 2);
    }
    if (/(support|help|troubleshoot|faq|documentation)/.test(contentText)) {
        add('Support', 2);
    }
    if (/(contact|reach out|get in touch|call us)/.test(contentText)) {
        add('Contact', 2);
    }
    if (/(careers|jobs|hiring|apply|open roles)/.test(contentText)) {
        add('Careers', 2);
    }
    if (/(product|products|service|services|solutions|portfolio|industries|case study|catalog|offerings|features|capabilities)/.test(contentText)) {
        add('Product Research', 2);
    }
    if (/(about|who we are|company overview|mission|overview|our story|history)/.test(contentText)) {
        add('General Information', 2);
    }
    if (/(pricing|price|cost|plan|quote|subscription)/.test(metaText)) {
        add('Pricing', 1);
    }
    if (/(book|schedule|demo|appointment|consultation|meeting|reservation)/.test(metaText)) {
        add('Booking', 1);
    }
    if (/(support|help|troubleshoot|faq|documentation)/.test(metaText)) {
        add('Support', 1);
    }
    if (/(contact|reach out|get in touch|call us)/.test(metaText)) {
        add('Contact', 1);
    }
    if (/(product|products|service|services|solutions|portfolio|industries|case study|catalog|offerings)/.test(metaText)) {
        add('Product Research', 1);
    }
    if (/(about|who we are|company overview|mission|overview|our story|history)/.test(metaText)) {
        add('General Information', 1);
    }
    if (/(support|help|faq|documentation|troubleshooting)/.test(knowledgeText)) {
        add('Support', 1.5);
    }
    if (/(pricing|price|plan|subscription|quote)/.test(knowledgeText)) {
        add('Pricing', 1.5);
    }
    if (/(product|service|solution|portfolio|case study|capabilities|integrations?)/.test(knowledgeText)) {
        add('Product Research', 1.5);
    }
    if (/(appointment|consultation|doctor|clinic|visit|care|insurance)/.test(knowledgeText)) {
        add('Buying', 1.5);
        add('Booking', 1);
    }
    if (input.checkoutDetected) {
        add('Buying', 7);
    }
    if (input.calendarDetected) {
        add('Booking', 7);
        add('Buying', 1.5);
    }
    if (input.faqDetected) {
        add('Support', 6);
    }
    if (input.pageDepth && input.pageDepth > 2) {
        add('General Information', 0.5);
    }
    const industry = (input.businessProfile?.industry || input.businessProfile?.businessType || '').toLowerCase();
    const pageSignals = `${pageText} ${path} ${contentText}`.toLowerCase();
    applyIndustrySpecificBoosts(scores, input, path, pageType, titleText, headingText, contentText, metaText, pageText, userQuestion, industry);
    if (!hasUserIntent && !/(pricing|price|plan|quote|subscription|support|help|faq|troubleshooting|contact|book|schedule|demo|appointment|careers|jobs|hiring|apply|about|product|service|solution|portfolio|industries|case study|catalog|offerings)/.test(pageText + ' ' + path)) {
        add('General Information', 4);
    }
    return scores;
}
function normalizeScores(scores) {
    const entries = Object.entries(scores).map(([intent, value]) => [intent, Math.max(0, value)]);
    const total = entries.reduce((sum, [, value]) => sum + value, 0);
    const distribution = Object.fromEntries(entries.map(([intent, value]) => [intent, total > 0 ? value / total : 0]));
    return distribution;
}
function buildEvidence(input, scores) {
    const evidence = [];
    const path = getUrlPath(input.currentUrl || input.landingPage || '');
    const hasBuyingSignals = scores.Buying >= 3;
    const hasPricingSignals = scores.Pricing >= 3;
    const hasSupportSignals = scores.Support >= 3;
    const hasBookingSignals = scores.Booking >= 3;
    const hasContactSignals = scores.Contact >= 3;
    const hasCareerSignals = scores.Careers >= 3;
    const hasResearchSignals = scores['Product Research'] >= 3;
    const hasGeneralSignals = scores['General Information'] >= 3;
    if (input.userQuestion && /(ready to buy|buy now|purchase|sign up|checkout|buy online)/i.test(input.userQuestion)) {
        evidence.push(`User question signals purchase readiness: ${input.userQuestion}`);
    }
    if (input.userQuestion && /(compare|versus|vs|difference|different|better|alternative|which plan|which one)/i.test(input.userQuestion)) {
        evidence.push(`User question requests a comparison: ${input.userQuestion}`);
    }
    if (input.userQuestion && /(support|help|troubleshoot|issue|problem|faq)/i.test(input.userQuestion)) {
        evidence.push(`User question contains support language: ${input.userQuestion}`);
    }
    if (input.userQuestion && /(book|schedule|demo|appointment|consultation|reservation)/i.test(input.userQuestion)) {
        evidence.push(`User question requests booking or scheduling: ${input.userQuestion}`);
    }
    if (input.pageContent && /(starter|enterprise|professional|compare|plans)/i.test(input.pageContent)) {
        evidence.push(`Page content references plans and comparisons: ${input.pageContent}`);
    }
    if (input.pageContent && /(pricing|cost|plan|subscription)/i.test(input.pageContent)) {
        evidence.push(`Page content references pricing or plan details: ${input.pageContent}`);
    }
    if (path && /pricing|plans|quote|cost|subscribe/i.test(path)) {
        evidence.push(`URL path is pricing-centric: ${path}`);
    }
    if (path && /careers|jobs|apply|hiring/i.test(path)) {
        evidence.push(`URL path is career-oriented: ${path}`);
    }
    if (input.pageTitle) {
        evidence.push(`Title describes the page: ${input.pageTitle}`);
    }
    if (input.pageHeadings?.length) {
        evidence.push(`Headings include: ${input.pageHeadings.slice(0, 3).join(' | ')}`);
    }
    if (input.businessProfile?.supportedCTAs?.length) {
        evidence.push(`Business context includes CTAs: ${input.businessProfile.supportedCTAs.join(', ')}`);
    }
    if (input.knowledgeEngineFacts?.length) {
        evidence.push(`Knowledge Engine context: ${input.knowledgeEngineFacts.slice(0, 2).join(' | ')}`);
    }
    if (input.checkoutDetected || hasBuyingSignals) {
        evidence.push('Buying-oriented signals are present');
    }
    if (input.calendarDetected || hasBookingSignals) {
        evidence.push('Booking-oriented signals are present');
    }
    if (input.faqDetected || hasSupportSignals) {
        evidence.push('Support-oriented signals are present');
    }
    if (hasResearchSignals) {
        evidence.push('Product/service exploration signals are present');
    }
    if (hasGeneralSignals && !hasResearchSignals && !hasBuyingSignals && !hasPricingSignals && !hasBookingSignals && !hasContactSignals && !hasSupportSignals && !hasCareerSignals) {
        evidence.push('General-information signals are dominant');
    }
    if (evidence.length === 0) {
        evidence.push('Intent was inferred from the page context and business profile');
    }
    return evidence.slice(0, 5);
}
function recommendNextAction(primary) {
    switch (primary) {
        case 'Buying':
            return 'Offer a direct booking, quote, or checkout path and capture a lightweight conversion signal.';
        case 'Pricing':
            return 'Present the relevant plan or pricing details and offer a comparison or demo CTA.';
        case 'Product Research':
            return 'Recommend the most relevant product details, use cases, and then offer a comparison or demo next step.';
        case 'Support':
            return 'Provide a support path, docs link, or escalation route.';
        case 'Comparison':
            return 'Compare the relevant plans or offerings and recommend the best fit.';
        case 'Booking':
            return 'Move to booking, calendar scheduling, or a direct sales appointment.';
        case 'Contact':
            return 'Offer contact capture or a direct sales follow-up path.';
        case 'Careers':
            return 'Route the visitor to the careers or recruiting path.';
        default:
            return 'Share a concise explanation and offer a relevant pricing or demo next step.';
    }
}
function calibrateConfidence(scores, primary, distribution, input) {
    const sorted = Object.entries(scores).sort((a, b) => b[1] - a[1]);
    const primaryScore = scores[primary] || 0;
    const secondaryScore = sorted[1]?.[1] || 0;
    const margin = primaryScore - secondaryScore;
    const evidenceCount = sorted.filter(([, value]) => value >= 2.5).length;
    const agreement = distribution[primary] || 0;
    const businessSignal = input.businessProfile?.industry || input.businessProfile?.businessType ? 1 : 0.7;
    const ambiguityPenalty = margin < 1.5 ? 0.15 : 0;
    const strongSignals = primaryScore >= 9 || evidenceCount >= 3;
    const explicitIntentBoost = /ready to buy|buy now|purchase|sign up|start free|start trial|checkout/i.test(input.userQuestion || '') ? 0.12 : 0;
    const base = strongSignals ? 0.48 : 0.28;
    const calibrated = Math.min(0.99, Math.max(0.12, base + agreement * 0.3 + evidenceCount * 0.05 + businessSignal * 0.08 + explicitIntentBoost - ambiguityPenalty));
    return Number(calibrated.toFixed(2));
}
function detectVisitorIntent(input) {
    const scores = getIntentScores(input);
    const distribution = normalizeScores(scores);
    const ranked = Object.entries(distribution).sort((a, b) => b[1] - a[1]);
    let primary = ranked[0][0];
    let secondary = ranked[1] && ranked[1][1] >= 0.08 ? ranked[1][0] : undefined;
    const industry = (input.businessProfile?.industry || input.businessProfile?.businessType || '').toLowerCase();
    const pageSignals = `${input.pageContent || ''} ${input.currentUrl || ''} ${input.pageTitle || ''}`.toLowerCase();
    const userText = (input.userQuestion || '').toLowerCase();
    if (industry.includes('healthcare') && /(appointment|consultation|visit|insurance|clinic|doctor|treatment|care)/i.test(pageSignals) && /(book|appointment|consultation)/i.test(userText)) {
        primary = 'Buying';
        secondary = 'Booking';
    }
    if (primary === 'Pricing') {
        secondary = distribution['General Information'] >= distribution['Product Research'] ? 'General Information' : 'Product Research';
    }
    const confidence = calibrateConfidence(scores, primary, distribution, input);
    const evidence = buildEvidence(input, scores);
    return {
        primaryIntent: primary,
        secondaryIntent: secondary,
        confidence,
        supportingEvidence: evidence,
        recommendedNextAction: recommendNextAction(primary),
        intentDistribution: distribution,
    };
}
