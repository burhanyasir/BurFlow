import { GuardrailCategory, ClassifierProvider } from './types';

export class NoopProvider implements ClassifierProvider {
  readonly name = 'noop';

  async classify(_message: string, _signal: AbortSignal): Promise<{ flagged: boolean; categories: GuardrailCategory[] }> {
    return { flagged: false, categories: [] };
  }
}
