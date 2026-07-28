import { TurnContext, Message } from '@conversation-engine/core-types';
import { ChatMessage } from './provider';

const CHARS_PER_TOKEN = 4;

export function estimateTokens(text: string): number {
  return Math.ceil(text.length / CHARS_PER_TOKEN);
}

export function buildPrompt(context: TurnContext): ChatMessage[] {
  const messages: ChatMessage[] = [];
  const maxTokens = context.tenantConfig?.llm.maxTokens || 1024;
  const model = context.tenantConfig?.llm.model || '';
  const contextWindow = getContextWindow(model);
  const reservedForOutput = maxTokens;
  const availableForInput = contextWindow - reservedForOutput;

  let systemTokens = 0;
  if (context.tenantConfig?.llm.systemPrompt) {
    systemTokens = estimateTokens(context.tenantConfig.llm.systemPrompt);
    messages.push({ role: 'system', content: context.tenantConfig.llm.systemPrompt });
  }

  const userMessageTokens = estimateTokens(context.message);
  let historyTokens = 0;
  const historyMessages: ChatMessage[] = [];

  if (context.conversationHistory) {
    for (const msg of context.conversationHistory) {
      const role = msg.role === 'user' ? 'user' : 'assistant';
      const tokens = estimateTokens(msg.content);
      historyTokens += tokens;
      historyMessages.push({ role, content: msg.content });
    }
  }

  const totalStatic = systemTokens + userMessageTokens;
  const budgetForHistory = availableForInput - totalStatic;

  if (budgetForHistory <= 0) {
    messages.push({ role: 'user', content: context.message });
    checkContextLimit(messages, availableForInput);
    return messages;
  }

  if (historyTokens <= budgetForHistory) {
    for (const msg of historyMessages) {
      messages.push(msg);
    }
  } else {
    let used = 0;
    const kept: ChatMessage[] = [];
    for (let i = historyMessages.length - 1; i >= 0; i--) {
      const msgTokens = estimateTokens(historyMessages[i].content);
      if (used + msgTokens <= budgetForHistory) {
        kept.unshift(historyMessages[i]);
        used += msgTokens;
      } else {
        break;
      }
    }
    for (const msg of kept) {
      messages.push(msg);
    }
  }

  messages.push({ role: 'user', content: context.message });
  checkContextLimit(messages, availableForInput);
  return messages;
}

function checkContextLimit(messages: ChatMessage[], availableForInput: number): void {
  const totalTokens = messages.reduce((sum, m) => sum + estimateTokens(m.content), 0);
  if (totalTokens > availableForInput) {
    const err = new Error(`ERR_CONTEXT_TOO_LARGE: Prompt exceeds context window (${totalTokens} > ${availableForInput})`);
    (err as any).code = 'ERR_CONTEXT_TOO_LARGE';
    throw err;
  }
}

function getContextWindow(model: string): number {
  const lower = model.toLowerCase();
  if (lower.includes('gpt-4o-mini') || lower.includes('gpt-4o-mini')) return 128000;
  if (lower.includes('gpt-4o')) return 128000;
  if (lower.includes('gpt-4-turbo') || lower.includes('gpt-4-turbo')) return 128000;
  if (lower.includes('gpt-4')) return 8192;
  if (lower.includes('gpt-3.5')) return 16385;
  if (lower.includes('o3')) return 200000;
  if (lower.includes('o4')) return 200000;
  if (lower.includes('claude')) return 200000;
  return 8192;
}
