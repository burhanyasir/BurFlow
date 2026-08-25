import { QualificationState, SmartButton } from './types';

export function processQualification(
  message: string,
  state: QualificationState,
): { updatedState: QualificationState; promptQuestion?: string; options?: SmartButton[] } {
  const text = (message || '').toLowerCase().trim();

  const extracted: Record<string, { value?: string; confidence: number }> = { ...(state.extractedFields || {}) };

  const companySizeMatch = text.match(/\b(\d{1,3}(?:,\d{3})+\s*(?:\+|employees|people|staff|agents)?|\d+k\+?|\bunder\s?\d+\b|small|medium|large|enterprise)\b/i);
  if (companySizeMatch) {
    const val = companySizeMatch[0].toLowerCase();
    if (/\d/.test(val) || /^(small|medium|large|enterprise)$/i.test(val)) {
      extracted.companySize = { value: companySizeMatch[0], confidence: 0.8 };
    }
  }

  const industries = [
    'ecommerce', 'e-commerce', 'healthcare', 'medical', 'dental', 'clinic',
    'finance', 'banking', 'insurance', 'fintech',
    'education', 'edtech', 'university', 'school',
    'legal', 'law firm', 'attorney',
    'saas', 'software', 'tech',
    'retail', 'store', 'shop',
    'hospitality', 'hotel', 'restaurant', 'travel',
    'logistics', 'shipping', 'supply chain',
    'manufacturing', 'factory', 'industrial',
    'real estate', 'property', 'realtor',
    'media', 'entertainment', 'publishing',
    'telecom', 'communications',
    'government', 'public sector', 'municipal',
    'nonprofit', 'ngo', 'charity',
    'agriculture', 'farming',
    'energy', 'utilities', 'renewable',
    'construction', 'building',
    'automotive', 'car dealership',
    'consulting', 'professional services',
    'marketing', 'advertising', 'agency',
    'fitness', 'gym', 'wellness', 'health',
  ];
  for (const ind of industries) {
    if (text.includes(ind)) {
      extracted.industry = { value: ind.split(' ')[0], confidence: 0.9 };
      break;
    }
  }

  const competitors = ['zendesk', 'intercom', 'gorgias', 'salesforce', 'hubspot', 'freshdesk', 'freshchat', 'drift', 'crisp', 'livechat', 'tawk.to', ' crisp'];
  for (const c of competitors) {
    if (text.includes(c)) extracted.currentSolution = { value: c.trim(), confidence: 0.85 };
  }

  const teamMatch = text.match(/(\b\d+\s?(?:employees|people|staff|agents|team members)\b)/i);
  if (teamMatch) extracted.teamSize = { value: teamMatch[0], confidence: 0.85 };

  const volMatch = text.match(/(under\s?\d+|\b\d{1,3}(?:,\d{3})+\b|\d+k|\d+k\+|\b500[\s–-]2,000\b|\b2k[\s–-]10k\b|10k\+|10k\s?\+|\b\d+[\s–-]\d+\b (?:per month|\/mo|monthly))/i);
  if (volMatch) {
    extracted.monthlyConversations = { value: volMatch[0], confidence: 0.9 };
  }

  const budgetMatch = text.match(/\$\s?\d+[kKmM]?|budget of \$?\d+[kKmM]?|budget.*\d+/i);
  if (budgetMatch) extracted.budget = { value: budgetMatch[0], confidence: 0.9 };

  if (/asap|this week|this month|by next|soon|in the next quarter|q[1-4]|immediately|urgent|need it fast/i.test(text)) {
    extracted.timeline = { value: 'soon', confidence: 0.8 };
  }

  const decisionMakerMatch = text.match(/\b(cto|ceo|coo|cfo|founder|co-founder|owner|director|manager|head of|vp|vice president|chief)\b/i);
  if (decisionMakerMatch) {
    extracted.decisionMaker = { value: decisionMakerMatch[0], confidence: 0.8 };
  }

  if (/slow|low accuracy|wrong answers|hard to integrate|setup time|onboarding|cost|expensive|security|privacy|compliance|difficult to use|complicated|too many tools|scattered|fragmented/i.test(text)) {
    extracted.biggestPainPoint = { value: text.substring(0, 120), confidence: 0.6 };
  }

  const updated: QualificationState = { ...state, extractedFields: { ...extracted } };

  if (extracted.monthlyConversations && !updated.monthlyConversations) {
    updated.monthlyConversations = extracted.monthlyConversations.value;
  }
  if (extracted.companySize && !updated.qualifiedForTier) {
    const vol = updated.monthlyConversations || '';
    if (vol.includes('10k') || /enterprise|large|50,000|500,000/i.test(extracted.companySize.value || '')) {
      updated.qualifiedForTier = 'enterprise';
    } else if (vol.includes('2k') || /medium|100|200|500/i.test(extracted.companySize.value || '')) {
      updated.qualifiedForTier = 'professional';
    }
  }

  const highConfCount = Object.values(extracted).filter(f => f.confidence >= 0.7).length;
  if (highConfCount >= 3) updated.completed = true;

  if (updated.completed && !state.completed) {
    return { updatedState: updated };
  }

  if (!updated.completed && /pricing|which plan|recommend.*plan|what plan|how much|compare|cost/i.test(text)) {
    updated.questionsAskedCount = (updated.questionsAskedCount || 0) + 1;
    const askCount = updated.questionsAskedCount;
    if (askCount <= 1) {
      return {
        updatedState: updated,
        promptQuestion: 'To recommend the best plan, how many customer questions or support tickets do you receive each month?',
        options: [
          { id: 'vol_sub500', label: 'Under 500 / mo', action: 'send_text', payload: 'under 500', variant: 'outline' },
          { id: 'vol_500_2k', label: '500–2,000 / mo', action: 'send_text', payload: '500–2,000', variant: 'outline' },
          { id: 'vol_2k_10k', label: '2k–10k / mo', action: 'send_text', payload: '2k–10k', variant: 'outline' },
          { id: 'vol_10k_plus', label: '10k+ / mo', action: 'send_text', payload: '10k+', variant: 'primary' },
        ],
      };
    }
    if (askCount === 2) {
      return {
        updatedState: updated,
        promptQuestion: 'And what industry is your business in?',
        options: [
          { id: 'ind_saas', label: 'SaaS / Software', action: 'send_text', payload: 'SaaS', variant: 'outline' },
          { id: 'ind_ecommerce', label: 'E-Commerce', action: 'send_text', payload: 'ecommerce', variant: 'outline' },
          { id: 'ind_healthcare', label: 'Healthcare', action: 'send_text', payload: 'healthcare', variant: 'outline' },
          { id: 'ind_other', label: 'Other', action: 'send_text', payload: 'other industry', variant: 'outline' },
        ],
      };
    }
  }

  return { updatedState: updated };
}
