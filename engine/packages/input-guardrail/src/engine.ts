import { GuardrailResult, GuardrailCategory, ClassifierProvider } from './types';
import { CircuitBreaker } from './circuit-breaker';

export class InputGuardrailEngine {
  constructor(
    private readonly classifier: ClassifierProvider,
    private readonly circuitBreaker: CircuitBreaker,
    private readonly timeoutMs: number = 3000,
  ) {}

  async check(message: string, signal: AbortSignal): Promise<GuardrailResult> {
    // Circuit breaker open → degrade (skip classification)
    if (this.circuitBreaker.isOpen()) {
      return { passed: true, categories: [], fallbackUsed: true };
    }

    // Race classification against timeout + abort
    try {
      const result = await this.classifyWithTimeout(message, signal);

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
    } catch (err: any) {
      this.circuitBreaker.onFailure();

      // Timeout or unavailable → degrade
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
    message: string,
    signal: AbortSignal,
  ): Promise<{ flagged: boolean; categories: GuardrailCategory[] }> {
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
        .classify(message, signal)
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
