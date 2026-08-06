"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.buildSalesPlaybook = buildSalesPlaybook;
function normalize(value) {
    return (value || '').toLowerCase();
}
function pickIndustryTemplate(industry) {
    const normalized = normalize(industry);
    if (normalized.includes('saas') || normalized.includes('software'))
        return 'SaaS';
    if (normalized.includes('ecommerce') || normalized.includes('retail') || normalized.includes('shop'))
        return 'E-commerce';
    if (normalized.includes('healthcare') || normalized.includes('medical'))
        return 'Healthcare';
    if (normalized.includes('agency') || normalized.includes('marketing') || normalized.includes('creative'))
        return 'Agencies';
    if (normalized.includes('restaurant') || normalized.includes('food') || normalized.includes('hospitality'))
        return 'Restaurants';
    if (normalized.includes('real estate') || normalized.includes('property'))
        return 'Real Estate';
    if (normalized.includes('manufacturing') || normalized.includes('industrial'))
        return 'Manufacturing';
    return 'SaaS';
}
function buildSalesPlaybook(input) {
    const intent = normalize(input.visitorIntent.primaryIntent);
    const stage = normalize(input.conversationStage);
    const signals = input.websiteScanner.extractedSignals || [];
    const trustSignals = (input.businessIntelligence.trustSignals || []).filter(Boolean).slice(0, 4);
    const hasPricingInfo = /pricing|price|plan|tier|cost|quote/.test(`${input.websiteScanner.pageSummary || ''} ${input.businessIntelligence.pricingModel || ''}`);
    const hasDemoPath = /demo|book|schedule|contact|request/.test(`${input.websiteScanner.pageSummary || ''} ${signals.join(' ')}`);
    let pricingStrategy = 'answer_directly';
    let cta = {
        id: 'book-demo',
        label: 'Book Demo',
        action: 'send_text',
        payload: 'I want to book a demo',
        variant: 'primary',
    };
    let recommendationStrategy = 'recommend_immediately';
    let rationale = [];
    if (intent.includes('pricing') || intent.includes('buy') || /pricing|price|plan|tier/.test(stage)) {
        pricingStrategy = hasPricingInfo ? 'recommend_plan' : 'summarize_pricing';
        cta = {
            id: 'compare-plans',
            label: 'Compare Plans',
            action: 'send_text',
            payload: 'Compare plans and pricing',
            variant: 'primary',
        };
        recommendationStrategy = 'compare_options';
        rationale = ['Pricing intent is strong, so the playbook should frame the offer around a clear recommendation path.'];
    }
    else if (intent.includes('contact') || intent.includes('general') || stage.includes('decision')) {
        pricingStrategy = 'request_contact';
        cta = {
            id: 'contact-sales',
            label: 'Contact Sales',
            action: 'send_text',
            payload: 'Connect me with sales',
            variant: 'primary',
        };
        recommendationStrategy = 'ask_qualifying_question';
        rationale = ['The visitor appears to be evaluating fit, so the playbook should guide them to a direct contact path.'];
    }
    else if (intent.includes('support') || intent.includes('general')) {
        pricingStrategy = 'answer_directly';
        cta = {
            id: 'start-free-trial',
            label: 'Start Free Trial',
            action: 'send_text',
            payload: 'Start a free trial',
            variant: 'primary',
        };
        recommendationStrategy = 'explain_differences';
        rationale = ['The visitor is still exploring the offer, so the playbook should explain the difference between options without pushing too hard.'];
    }
    else {
        pricingStrategy = hasDemoPath ? 'encourage_demo' : 'answer_directly';
        recommendationStrategy = 'recommend_immediately';
        rationale = ['The visitor is broadening the context, so the playbook should keep the next step simple and low-friction.'];
    }
    if (pickIndustryTemplate(input.businessIntelligence.industry) === 'Healthcare') {
        cta = {
            id: 'contact-sales',
            label: 'Contact Sales',
            action: 'send_text',
            payload: 'Connect me with sales',
            variant: 'primary',
        };
    }
    if (pickIndustryTemplate(input.businessIntelligence.industry) === 'E-commerce' && hasPricingInfo) {
        cta = {
            id: 'request-quote',
            label: 'Request Quote',
            action: 'send_text',
            payload: 'Request a quote',
            variant: 'primary',
        };
    }
    if (pickIndustryTemplate(input.businessIntelligence.industry) === 'Restaurants' && hasDemoPath) {
        cta = {
            id: 'book-demo',
            label: 'Book Demo',
            action: 'send_text',
            payload: 'I want to book a demo',
            variant: 'primary',
        };
    }
    return {
        pricingStrategy,
        cta,
        trustSignals,
        recommendationStrategy,
        industryTemplate: pickIndustryTemplate(input.businessIntelligence.industry),
        rationale,
    };
}
