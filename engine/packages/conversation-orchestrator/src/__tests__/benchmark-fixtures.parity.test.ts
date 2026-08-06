import buildCanonicalBenchmarkInputs from '../benchmark-fixtures';
import { expect, it, describe } from 'vitest';

describe('benchmark fixture parity', () => {
  it('produces identical canonical inputs for paired synthetic and real-world cases', () => {
    // paired case: SaaS pricing / 50 / $250
    const rwCase: any = {
      url: 'https://www.hubspot.com/pricing',
      industry: 'SaaS',
      pageType: 'pricing',
      journeyStage: 'decision',
      visitorIntent: 'pricing',
      products: ['CRM plans'],
      pricingModel: 'tiered subscription',
      trustSignals: ['free trial', 'customer references'],
      objectionCategory: 'price',
      companySize: '50',
      budget: '$250',
      persona: 'small_business',
      message: 'We need to understand pricing options for a CRM subscription for our small team and evaluate whether the plans fit our budget.',
      plan: { goal: 'recommend_plan', customerIntent: 'evaluating', funnelStage: 'decision', missingQualification: ['budget'] },
    };

    const synCase: any = {
      industry: 'SaaS',
      companySize: '50',
      budget: '$250',
      persona: 'small_business',
      message: 'We need to understand pricing options for a CRM subscription for our small team and evaluate whether the plans fit our budget.',
      plan: { goal: 'recommend_plan', customerIntent: 'evaluating', funnelStage: 'decision', missingQualification: ['budget'] },
      trustSignals: ['free trial', 'customer references'],
      objectionCategory: 'price',
    };

    const rw = buildCanonicalBenchmarkInputs(rwCase);
    const sn = buildCanonicalBenchmarkInputs(synCase);

    // canonical fields to compare
    const fields = [
      'qualificationCollected.completed',
      'qualificationCollected.questionsAskedCount',
      'trustLevel',
      'buyingIntentDetected',
      'leadScore',
      'missingQualification',
      'currentStage',
    ];

    function pluck(obj: any, path: string) {
      return path.split('.').reduce((s: any, p: string) => (s ? s[p] : undefined), obj);
    }

    const diffs: string[] = [];
    for (const field of fields) {
      const a = pluck(rw.memory, field.startsWith('qualification') ? `qualificationCollected.${field.split('.').pop()}` : field === 'missingQualification' ? 'contextSummary.missingQualification' : field);
      const b = pluck(sn.memory, field.startsWith('qualification') ? `qualificationCollected.${field.split('.').pop()}` : field === 'missingQualification' ? 'contextSummary.missingQualification' : field);
      if (JSON.stringify(a) !== JSON.stringify(b)) diffs.push(`${field}: rw=${JSON.stringify(a)} sn=${JSON.stringify(b)}`);
    }

    if (diffs.length > 0) {
      // fail with details
      throw new Error('Fixture parity mismatch:\n' + diffs.join('\n'));
    }
  });
});
