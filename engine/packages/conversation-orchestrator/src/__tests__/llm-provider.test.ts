import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { resolveBrainProvider } from '../conversation-brain';

// resolveBrainProvider reads process.env at call time; each test pins a
// clean key set so results are deterministic.
const KEYS = [
  'LLM_PROVIDER',
  'ANTHROPIC_API_KEY',
  'OPENROUTER_API_KEY',
  'XAI_API_KEY',
  'GROK_API_KEY',
  'GROQ_API_KEY',
];

function withEnv(env: Record<string, string | undefined>, fn: () => void): void {
  const saved: Record<string, string | undefined> = {};
  for (const key of KEYS) saved[key] = process.env[key];
  try {
    for (const key of KEYS) delete process.env[key];
    for (const [key, value] of Object.entries(env)) {
      if (value) process.env[key] = value;
    }
    fn();
  } finally {
    for (const key of KEYS) {
      if (saved[key] === undefined) delete process.env[key];
      else process.env[key] = saved[key];
    }
  }
}

describe('resolveBrainProvider — LLM_PROVIDER pinning', () => {
  it('pins anthropic when LLM_PROVIDER=anthropic and the key exists', () => {
    withEnv({ LLM_PROVIDER: 'anthropic', ANTHROPIC_API_KEY: 'sk-ant-test' }, () => {
      expect(resolveBrainProvider()).toBe('ANTHROPIC');
    });
  });

  it('pins openrouter when LLM_PROVIDER=openrouter and the key exists', () => {
    withEnv({ LLM_PROVIDER: 'openrouter', OPENROUTER_API_KEY: 'sk-or-test' }, () => {
      expect(resolveBrainProvider()).toBe('OPENROUTER');
    });
  });

  it('pins grok when LLM_PROVIDER=grok and XAI_API_KEY exists', () => {
    withEnv({ LLM_PROVIDER: 'grok', XAI_API_KEY: 'xai-test' }, () => {
      expect(resolveBrainProvider()).toBe('GROK');
    });
  });

  it('pins grok via the GROK_API_KEY alias', () => {
    withEnv({ LLM_PROVIDER: 'grok', GROK_API_KEY: 'xai-test' }, () => {
      expect(resolveBrainProvider()).toBe('GROK');
    });
  });

  it('is case-insensitive and trims whitespace', () => {
    withEnv({ LLM_PROVIDER: '  OpenRouter ', OPENROUTER_API_KEY: 'sk-or-test' }, () => {
      expect(resolveBrainProvider()).toBe('OPENROUTER');
    });
  });

  it('falls back to auto-detection when the pinned provider has no key', () => {
    withEnv({ LLM_PROVIDER: 'anthropic', OPENROUTER_API_KEY: 'sk-or-test' }, () => {
      expect(resolveBrainProvider()).toBe('OPENROUTER');
    });
  });
});

describe('resolveBrainProvider — auto-detection without LLM_PROVIDER', () => {
  it('returns HEURISTIC_FALLBACK when no keys are set', () => {
    withEnv({}, () => {
      expect(resolveBrainProvider()).toBe('HEURISTIC_FALLBACK');
    });
  });

  it('detects anthropic from ANTHROPIC_API_KEY', () => {
    withEnv({ ANTHROPIC_API_KEY: 'sk-ant-test' }, () => {
      expect(resolveBrainProvider()).toBe('ANTHROPIC');
    });
  });

  it('detects openrouter from OPENROUTER_API_KEY', () => {
    withEnv({ OPENROUTER_API_KEY: 'sk-or-test' }, () => {
      expect(resolveBrainProvider()).toBe('OPENROUTER');
    });
  });

  it('detects grok from XAI_API_KEY or GROK_API_KEY', () => {
    withEnv({ XAI_API_KEY: 'xai-test' }, () => {
      expect(resolveBrainProvider()).toBe('GROK');
    });
    withEnv({ GROK_API_KEY: 'xai-test' }, () => {
      expect(resolveBrainProvider()).toBe('GROK');
    });
  });

  it('detects groq from GROQ_API_KEY', () => {
    withEnv({ GROQ_API_KEY: 'gsk-test' }, () => {
      expect(resolveBrainProvider()).toBe('GROQ');
    });
  });
});
