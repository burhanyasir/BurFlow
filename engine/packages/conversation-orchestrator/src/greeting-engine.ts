import { PersonaType } from './types';
import { GREETING_PATTERNS, GRATITUDE_PATTERNS } from './patterns';

export function handleGreeting(message: string, persona: PersonaType, companyName?: string): string | null {
  const text = message.toLowerCase().trim();

  const isGreeting = GREETING_PATTERNS.test(text);
  const isThanks = GRATITUDE_PATTERNS.test(text);

  if (!isGreeting && !isThanks) return null;

  const name = companyName || 'this business';

  if (isThanks) {
    return `You're very welcome! Let me know if you have any other questions about ${name} — I'm happy to help.`;
  }

  switch (persona) {
    case 'developer':
      return `Hi! I can help with technical questions, documentation, or getting you set up. What are you working on?`;
    case 'enterprise':
      return `Hello! I can help you with our platform, security compliance, or arrange a demo. What would be most helpful?`;
    case 'agency':
      return `Hi! Welcome to ${name}. I can help you explore our offerings, partnerships, or answer any questions. What can I assist with?`;
    case 'ecommerce':
      return `Hello! Welcome to ${name}. I can help you with product info, orders, shipping, or store policies. How can I help?`;
    case 'support_manager':
      return `Hi! I can help you find answers, troubleshoot issues, or connect you with our team. What can I assist with?`;
    case 'startup':
    case 'small_business':
    default:
      return `Hi! Welcome to ${name}. How can I help you today?`;
  }
}
