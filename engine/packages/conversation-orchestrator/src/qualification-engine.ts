import { QualificationState, SmartButton } from './types';

export function processQualification(
  message: string,
  state: QualificationState
): { updatedState: QualificationState; promptQuestion?: string; options?: SmartButton[] } {
  const text = message.toLowerCase().trim();

  // If user clicked or typed monthly volume
  if (/\b(under 500|500–2,000|2k–10k|10k\+)\b/i.test(text)) {
    let qualifiedTier: 'free' | 'starter' | 'professional' | 'enterprise' = 'starter';
    if (text.includes('10k+')) qualifiedTier = 'enterprise';
    else if (text.includes('2k–10k')) qualifiedTier = 'professional';
    else if (text.includes('500–2,000')) qualifiedTier = 'starter';
    else if (text.includes('under 500')) qualifiedTier = 'free';

    const newState: QualificationState = {
      ...state,
      monthlyConversations: text,
      qualifiedForTier: qualifiedTier,
      completed: true
    };

    return {
      updatedState: newState,
      promptQuestion: `Based on your ${text} monthly questions, our ${qualifiedTier.toUpperCase()} plan is the recommended fit for your team. Would you like to start a 14-day free trial?`,
      options: [
        { id: 'opt_trial', label: '🚀 Start 14-Day Free Trial', action: 'navigate', payload: '/signup', variant: 'primary' },
        { id: 'opt_pricing', label: '💰 Compare Plan Features', action: 'navigate', payload: '/pricing', variant: 'secondary' }
      ]
    };
  }

  // If not qualified yet and asking about pricing/plans
  if (!state.monthlyConversations && state.questionsAskedCount < 2 && /pricing|recommend|which plan|what plan/i.test(text)) {
    const newState: QualificationState = {
      ...state,
      questionsAskedCount: state.questionsAskedCount + 1
    };

    return {
      updatedState: newState,
      promptQuestion: 'To recommend the best plan, how many customer questions or support tickets do you receive each month?',
      options: [
        { id: 'vol_sub500', label: 'Under 500 / mo', action: 'send_text', payload: 'under 500', variant: 'outline' },
        { id: 'vol_500_2k', label: '500–2,000 / mo', action: 'send_text', payload: '500–2,000', variant: 'outline' },
        { id: 'vol_2k_10k', label: '2k–10k / mo', action: 'send_text', payload: '2k–10k', variant: 'outline' },
        { id: 'vol_10k_plus', label: '10k+ / mo', action: 'send_text', payload: '10k+', variant: 'primary' }
      ]
    };
  }

  return { updatedState: state };
}
