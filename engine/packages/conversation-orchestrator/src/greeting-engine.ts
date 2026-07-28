import { PersonaType } from './types';

export function handleGreeting(message: string, persona: PersonaType): string | null {
  const text = message.toLowerCase().trim();

  const isGreeting = /^(hi|hello|hey|good morning|good afternoon|good evening|greetings)\b/i.test(text);
  const isThanks = /^(thanks|thank you|thx|awesome|great|perfect)\b/i.test(text);

  if (!isGreeting && !isThanks) return null;

  if (isThanks) {
    return "You're very welcome! Let me know if you'd like to check out our features, explore pricing, or start a 14-day free trial.";
  }

  switch (persona) {
    case 'developer':
      return "Hello! 👋 Welcome to Conversation Engine. Ready to explore our grounded vector search, API embed snippets, or start a developer sandbox trial?";
    case 'enterprise':
      return "Hello! Welcome to Conversation Engine. I can help you evaluate our SOC 2 compliance, SLA guarantees, dedicated TAM support, or schedule an executive demo.";
    case 'agency':
      return "Hello! Welcome to Conversation Engine. Are you looking to explore white-labeling, multi-tenant workspace management, or our agency partner program?";
    case 'ecommerce':
      return "Hello! Welcome to Conversation Engine. I can show you how to deflect repetitive store FAQs (sizing, shipping, policies) with grounded citations.";
    case 'support_manager':
      return "Hello! Welcome to Conversation Engine. Ready to see how grounded doc answers can deflect 60%+ of support tickets and integrate with Zendesk/Intercom?";
    case 'startup':
    case 'small_business':
    default:
      return "Hello! 👋 Welcome to Conversation Engine. I'm your AI assistant, grounded strictly in our documentation to answer your questions accurately. How can I help you today?";
  }
}
