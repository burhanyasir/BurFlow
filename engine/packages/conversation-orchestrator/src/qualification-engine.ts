import { QualificationState, SmartButton } from './types';

export function processQualification(
  message: string,
  state: QualificationState
): { updatedState: QualificationState; promptQuestion?: string; options?: SmartButton[] } {
  const text = (message || '').toLowerCase().trim();

  const extracted: Record<string, { value?: string; confidence: number }> = { ...(state.extractedFields || {}) };

  // Company size heuristics
  const companySizeMatch = text.match(/\b(\d{1,3}(?:,\d{3})+|\d+k|\d+k\+|under \d+|small|medium|large|enterprise)\b/i);
  if (companySizeMatch) {
    extracted.companySize = { value: companySizeMatch[0], confidence: 0.8 };
  }

  // Industry detection
  const industries = ['ecommerce','healthcare','finance','education','legal','saas','software','retail','hospitality','logistics','manufacturing'];
  for (const ind of industries) {
    if (text.includes(ind)) {
      extracted.industry = { value: ind, confidence: 0.9 };
      break;
    }
  }

  // Current solution / competitors
  const competitors = ['zendesk','intercom','gorgias','salesforce','hubspot','freshdesk'];
  for (const c of competitors) if (text.includes(c)) extracted.currentSolution = { value: c, confidence: 0.85 };

  // Team size
  const teamMatch = text.match(/(\b\d+\s?(employees|people|staff|agents)\b)/i);
  if (teamMatch) extracted.teamSize = { value: teamMatch[0], confidence: 0.85 };

  // Monthly conversation volume
  const volMatch = text.match(/(under\s?\d+|\b\d{1,3}(?:,\d{3})+\b|\d+k|\d+k\+|\b500–2,000\b|\b2k–10k\b|10k\+|10k\s?\+)/i);
  if (volMatch) {
    extracted.monthlyConversations = { value: volMatch[0], confidence: 0.9 };
  }

  // Budget detection
  const budgetMatch = text.match(/\$\s?\d+[kKmM]?|budget of \$?\d+[kKmM]?/i);
  if (budgetMatch) extracted.budget = { value: budgetMatch[0], confidence: 0.9 };

  // Timeline / urgency
  if (/asap|this week|this month|by next|soon|in the next quarter|q[1-4]/i.test(text)) extracted.timeline = { value: 'soon', confidence: 0.8 };

  // Decision maker / authority
  if (/cto|ceo|coo|founder|owner|director|manager|head of/i.test(text)) extracted.decisionMaker = { value: text.match(/cto|ceo|coo|founder|owner|director|manager|head of/i)![0], confidence: 0.8 };

  // Pain points
  if (/slow|low accuracy|wrong answers|hard to integrate|setup time|onboarding|cost|expensive|security|privacy|compliance/i.test(text)) {
    extracted.biggestPainPoint = { value: text.substring(0, 120), confidence: 0.6 };
  }

  // Merge into updated state
  const updated: QualificationState = { ...state, extractedFields: { ...extracted } };

  // Map some common fields to legacy top-level fields
  if (extracted.monthlyConversations && !updated.monthlyConversations) updated.monthlyConversations = extracted.monthlyConversations.value;
  if (extracted.companySize && !updated.qualifiedForTier) updated.qualifiedForTier = updated.monthlyConversations ? (updated.monthlyConversations.includes('10k') ? 'enterprise' : 'professional') : undefined;
  if (extracted.budget && !updated.completed) {
    updated.completed = true;
  }

  // Heuristic: consider qualification complete when 3+ fields have confidence >= .7
  const highConfCount = Object.values(extracted).filter(f => f.confidence >= 0.7).length;
  if (highConfCount >= 3) updated.completed = true;

  // If not complete, and question about pricing or plans, prompt for volume
  if (!updated.completed && /pricing|which plan|recommend.*plan|what plan|how much/i.test(text)) {
    updated.questionsAskedCount = (updated.questionsAskedCount || 0) + 1;
    return {
      updatedState: updated,
      promptQuestion: 'To recommend the best plan, how many customer questions or support tickets do you receive each month?',
      options: [
        { id: 'vol_sub500', label: 'Under 500 / mo', action: 'send_text', payload: 'under 500', variant: 'outline' },
        { id: 'vol_500_2k', label: '500–2,000 / mo', action: 'send_text', payload: '500–2,000', variant: 'outline' },
        { id: 'vol_2k_10k', label: '2k–10k / mo', action: 'send_text', payload: '2k–10k', variant: 'outline' },
        { id: 'vol_10k_plus', label: '10k+ / mo', action: 'send_text', payload: '10k+', variant: 'primary' }
      ]
    };
  }

  return { updatedState: updated };
}
