const summary = 'Product overview, no pricing or budget info';
const pricingModel = '';
console.log('hasPricingInfo', /pricing|price|plan|tier|cost|quote/.test(`${summary} ${pricingModel}`));
console.log('hasBudgetSignal', /\$\s*\d|budget|budgets?|budgeted|spend|price range|pricing range|estimate|estimated|investment|funding|budget plan/.test(`${summary} ${pricingModel}`));
console.log('hasDecisionAuthoritySignal', /(decision maker|decision authority|approver|procurement|vendor evaluation|stakeholder|sponsor|executive approval|authority)/.test(summary));
console.log('hasTimeline', /(timeline|timeline|next quarter|quarter|month|weeks?|asap|soon|immediately|within 30 days|within 60 days|by .*\b)/.test(summary));
console.log('hasProcurement', /(procurement|vendor evaluation|request for proposal|rfp|vendor selection|vendor comparison|evaluation process)/.test(summary));
console.log('hasPlanComparison', /(compare|vs|competitor|alternative|compare plans|comparison)/.test(summary));
