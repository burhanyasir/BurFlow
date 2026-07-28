import { OutputGuardrailCategory, OutputClassifierProvider } from './types';

export class NoopProvider implements OutputClassifierProvider {
  readonly name = 'noop';

  async classify(_response: string, _threshold: string, _signal: AbortSignal): Promise<{ flagged: boolean; categories: OutputGuardrailCategory[] }> {
    return { flagged: false, categories: [] };
  }
}
