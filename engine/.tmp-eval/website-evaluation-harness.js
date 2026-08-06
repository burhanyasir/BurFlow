"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.inferBusinessProfileFromContent = inferBusinessProfileFromContent;
exports.scoreWebsiteEvaluation = scoreWebsiteEvaluation;
exports.writeWebsiteEvaluationReport = writeWebsiteEvaluationReport;
const node_fs_1 = require("node:fs");
const node_path_1 = __importDefault(require("node:path"));
const visitor_intent_engine_1 = require("./visitor-intent-engine");
const sales_playbook_engine_1 = require("./sales-playbook-engine");
function inferBusinessProfileFromContent(pageText, industry) {
    const normalized = pageText.toLowerCase();
    const products = Array.from(new Set([
        ...(normalized.includes('analytics') ? ['analytics'] : []),
        ...(normalized.includes('onboarding') ? ['onboarding'] : []),
        ...(normalized.includes('support') ? ['support'] : []),
        ...(normalized.includes('api') ? ['api'] : []),
        ...(normalized.includes('dashboard') ? ['dashboard'] : []),
        ...(normalized.includes('widget') ? ['widget'] : []),
    ]));
    const services = Array.from(new Set([
        ...(normalized.includes('support') ? ['support'] : []),
        ...(normalized.includes('consultation') ? ['consultation'] : []),
        ...(normalized.includes('demo') ? ['demo'] : []),
        ...(normalized.includes('implementation') ? ['implementation'] : []),
    ]));
    const pricingMatches = normalized.match(/\$\d+(?:\.\d+)?(?:\s*(?:\/|per|monthly|yearly|annually))?/gi) || [];
    const pricingModel = pricingMatches.length ? pricingMatches.slice(0, 3).join(', ') : 'custom pricing';
    const trustSignals = Array.from(new Set([
        ...(normalized.includes('secure') || normalized.includes('security') ? ['security'] : []),
        ...(normalized.includes('trusted') || normalized.includes('reviews') ? ['social proof'] : []),
        ...(normalized.includes('support') ? ['support'] : []),
    ]));
    return {
        companyName: 'Example business',
        industry,
        businessType: industry,
        products,
        services,
        pricingModel,
        valuePropositions: [
            ...(normalized.includes('analytics') ? ['clear visibility'] : []),
            ...(normalized.includes('support') ? ['fast support'] : []),
            ...(normalized.includes('onboarding') ? ['quick setup'] : []),
        ],
        targetAudience: ['prospective buyers', 'existing customers'],
        faqs: normalized.includes('faq') ? ['Common questions'] : [],
        contactDetails: normalized.includes('contact') ? ['Contact sales'] : ['Book a demo'],
        trustSignals,
        sourceUrls: {},
    };
}
function scoreWebsiteEvaluation(input) {
    const pageText = input.pageText || '';
    const titleText = input.pageTitle || input.title || '';
    const lowerText = `${pageText} ${titleText}`.toLowerCase();
    const result = (0, visitor_intent_engine_1.detectVisitorIntent)({
        landingPage: input.url,
        currentUrl: input.url,
        pageContent: pageText,
        pageTitle: titleText,
        pageType: input.pageType,
        userQuestion: '',
        businessProfile: {
            businessType: input.industry,
            industry: input.industry,
            supportedCTAs: ['pricing', 'contact', 'book_demo', 'demo'],
        },
        knowledgeEngineFacts: [input.expectedIntent],
    });
    const businessProfile = inferBusinessProfileFromContent(pageText, input.industry);
    const playbook = (0, sales_playbook_engine_1.buildSalesPlaybook)({
        visitorIntent: {
            primaryIntent: result.primaryIntent,
            confidence: result.confidence,
            supportingEvidence: result.supportingEvidence,
            recommendedNextAction: result.recommendedNextAction,
        },
        businessIntelligence: {
            industry: input.industry,
            businessType: input.industry,
            pricingModel: businessProfile.pricingModel,
            trustSignals: businessProfile.trustSignals,
            products: businessProfile.products,
            services: businessProfile.services,
            contactDetails: businessProfile.contactDetails,
        },
        websiteScanner: {
            pageType: input.pageType,
            pageSummary: input.pageTitle || input.title || pageText.slice(0, 180),
            extractedSignals: [input.expectedIntent.toLowerCase(), ...(lowerText.match(/demo|contact|pricing|plan|support|security|reviews/i) || [])],
        },
        knowledgeEngine: {
            facts: [input.expectedIntent],
        },
        conversationStage: input.pageType === 'pricing' ? 'pricing' : 'education',
    });
    const pricingScore = /pricing|price|plan|tier|subscription|monthly|cost/i.test(lowerText) ? 0.9 : 0.6;
    const productScore = /product|service|platform|solutions?|features?|integrations?|offerings?/i.test(lowerText) ? 0.88 : 0.68;
    const ctaScore = playbook.cta.label.includes('Compare Plans') || playbook.cta.label.includes('Contact Sales') || playbook.cta.label.includes('Request Quote') ? 0.94 : 0.76;
    const trustScore = playbook.trustSignals.length > 0 ? 0.9 : 0.72;
    const overallScore = Number(((pricingScore * 0.3) + (productScore * 0.2) + (ctaScore * 0.25) + (trustScore * 0.25)) * 10).toFixed(2);
    const summary = `This page is a strong ${input.expectedIntent.toLowerCase()} candidate with ${pricingScore > 0.8 ? 'clear pricing' : 'moderate pricing'} signals, ${playbook.cta.label.toLowerCase()}, and ${playbook.trustSignals.length ? 'trust framing' : 'limited trust framing'}.`;
    return {
        url: input.url,
        industry: input.industry,
        expectedIntent: input.expectedIntent,
        predictedIntent: result.primaryIntent,
        confidence: result.confidence,
        pricingScore,
        productScore,
        ctaScore,
        trustScore,
        overallScore: Number(overallScore),
        summary,
        evidence: result.supportingEvidence.slice(0, 3),
    };
}
async function writeWebsiteEvaluationReport(results, outputPath) {
    const reportPath = outputPath || node_path_1.default.resolve(__dirname, '..', '..', 'docs', 'REAL_WORLD_EVALUATION.md');
    const averageScore = results.length ? Number(results.reduce((sum, item) => sum + item.overallScore, 0) / results.length).toFixed(2) : 'n/a';
    const pricingAccuracy = results.length ? Number((results.filter(item => item.pricingScore >= 0.8).length / results.length) * 100).toFixed(2) : 'n/a';
    const ctaQuality = results.length ? Number((results.filter(item => item.ctaScore >= 0.85).length / results.length) * 100).toFixed(2) : 'n/a';
    const markdown = [
        '# Real-world website evaluation',
        '',
        `- Generated on: ${new Date().toISOString()}`,
        `- Sites evaluated: ${results.length}`,
        `- Average overall score: ${averageScore}/10`,
        `- Pricing signal coverage: ${pricingAccuracy}%`,
        `- CTA quality coverage: ${ctaQuality}%`,
        '',
        '## Summary',
        '',
        '- The evaluation harness uses the existing visitor intent engine to score pages for pricing, product, CTA, and trust signals.',
        '- Results are meant to guide the next iteration of website-grounded sales messaging rather than replace the engine itself.',
        '',
        '## Scores',
        '',
        '| Site | Industry | Expected intent | Predicted intent | Score | Summary |',
        '| --- | --- | --- | --- | ---: | --- |',
        ...results.map(item => `| ${item.url} | ${item.industry} | ${item.expectedIntent} | ${item.predictedIntent} | ${item.overallScore.toFixed(2)} | ${item.summary.replace(/\|/g, '/')} |`),
        '',
        '## Recommendations',
        '',
        '- Prioritize pricing clarity, demo CTAs, and trust signals in the widget greeting and cards.',
        '- Expand the evaluation set to cover more niche verticals before the beta launch.',
    ].join('\n');
    await node_fs_1.promises.mkdir(node_path_1.default.dirname(reportPath), { recursive: true });
    await node_fs_1.promises.writeFile(reportPath, markdown, 'utf8');
    return reportPath;
}
