import { OutputGuardrailResult, OutputGuardrailCategory, OutputClassifierProvider } from './types';
import { CircuitBreaker } from './circuit-breaker';

export class OutputGuardrailEngine {
  constructor(
    private readonly classifier: OutputClassifierProvider,
    private readonly circuitBreaker: CircuitBreaker,
    private readonly timeoutMs: number = 3000,
  ) {}

  async check(response: string, threshold: string, signal: AbortSignal): Promise<OutputGuardrailResult> {
    if (this.circuitBreaker.isOpen()) {
      return { passed: true, categories: [], fallbackUsed: true };
    }

    try {
      const result = await this.classifyWithTimeout(response, threshold, signal);

      if (!result.flagged) {
        this.circuitBreaker.onSuccess();
        return { passed: true, categories: [], fallbackUsed: false };
      }

      this.circuitBreaker.onSuccess();
      return {
        passed: false,
        categories: result.categories,
        fallbackUsed: false,
      };
    } catch {
      this.circuitBreaker.onFailure();
      return { passed: true, categories: [], fallbackUsed: true };
    }
  }

  getClassifierName(): string {
    return this.classifier.name;
  }

  getCircuitBreaker(): CircuitBreaker {
    return this.circuitBreaker;
  }

  private async classifyWithTimeout(
    response: string,
    threshold: string,
    signal: AbortSignal,
  ): Promise<{ flagged: boolean; categories: OutputGuardrailCategory[] }> {
    return new Promise((resolve, reject) => {
      const timeoutId = setTimeout(() => {
        reject(new Error('Classifier timeout'));
      }, this.timeoutMs);

      const cleanup = (): void => {
        clearTimeout(timeoutId);
        try { signal.removeEventListener('abort', abortHandler); } catch {}
      };

      const abortHandler = (): void => {
        cleanup();
        reject(new Error('Aborted'));
      };
      signal.addEventListener('abort', abortHandler, { once: true });

      this.classifier
        .classify(response, threshold, signal)
        .then((result) => {
          cleanup();
          resolve(result);
        })
        .catch((err) => {
          cleanup();
          reject(err);
        });
    });
  }
}
