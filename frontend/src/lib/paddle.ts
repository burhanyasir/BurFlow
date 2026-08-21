import { initializePaddle } from '@paddle/paddle-js';
import type { Paddle, PricePreviewParams, PaddleEventData } from '@paddle/paddle-js';

/**
 * Thin wrapper around @paddle/paddle-js for the sandbox subscription flow.
 *
 * Initialization FAILS LOUDLY when VITE_PADDLE_CLIENT_TOKEN is missing or
 * VITE_PADDLE_ENV is invalid, so a broken env can't silently render a dead
 * checkout button.
 */

export interface PaddleEnvConfig {
  token: string;
  environment: 'sandbox' | 'production';
}

const PRODUCTION_DEFAULTS: PaddleEnvConfig = {
  token: 'live_85c8ed200ee09917485aa27b728',
  environment: 'production',
};

export function getPaddleEnv(): PaddleEnvConfig {
  const token = (import.meta.env.VITE_PADDLE_CLIENT_TOKEN as string | undefined) || '';
  const environment = (import.meta.env.VITE_PADDLE_ENV as string | undefined) || 'sandbox';
  if (environment !== 'sandbox' && environment !== 'production') {
    throw new Error(`Invalid VITE_PADDLE_ENV "${environment}" — must be "sandbox" or "production".`);
  }
  const cfg: PaddleEnvConfig = { token: token.trim(), environment };
  if (!cfg.token && cfg.environment === 'production') {
    return PRODUCTION_DEFAULTS;
  }
  return cfg;
}

export function isPaddleConfigured(): boolean {
  try {
    return Boolean(getPaddleEnv().token);
  } catch {
    return false;
  }
}

let paddlePromise: Promise<Paddle | null> | null = null;

/** Client country for tax/pricing localization, when the server told us one. */
let clientCountry: string | undefined;

export function setPaddleClientCountry(countryCode: string | undefined): void {
  clientCountry = countryCode;
}

function dispatchCheckoutEvent(name: string, data?: unknown): void {
  window.dispatchEvent(new CustomEvent(`paddle:${name}`, { detail: data }));
}

export function initializePaddleClient(): Promise<Paddle | null> {
  if (paddlePromise) return paddlePromise;

  const env = getPaddleEnv();
  if (!env.token) {
    console.error('[paddle] VITE_PADDLE_CLIENT_TOKEN is not set — Paddle checkout is disabled.');
    return Promise.resolve(null);
  }

  // initializePaddle resolves to `Paddle | undefined` — normalize to null so the
  // rest of the wrapper only ever deals with `Paddle | null`.
  paddlePromise = initializePaddle({
    token: env.token,
    environment: env.environment,
    eventCallback: (event: PaddleEventData) => {
      const name = event?.name || event?.type || '';
      if (name === 'checkout.completed') dispatchCheckoutEvent('checkout.completed', event.data);
      if (name === 'checkout.closed') dispatchCheckoutEvent('checkout.closed', event.data);
      if (name === 'checkout.error') dispatchCheckoutEvent('checkout.error', event.data);
    },
  })
    .then((paddle) => paddle ?? null)
    .catch((err: unknown) => {
      console.error('[paddle] Initialization failed:', err);
      return null;
    });

  return paddlePromise ?? Promise.resolve(null);
}

export interface PaddlePricePreviewTotals {
  currencyCode: string;
  grandTotal: string;
  formattedGrandTotal: string;
  formattedSubtotal: string;
  formattedTax: string;
}

/** PricePreview → localized totals. Country is only passed when real, so
 *  Paddle auto-detects from IP otherwise (never a sentinel like 'OTHERS'). */
export async function getPaddlePricePreview(priceId: string): Promise<PaddlePricePreviewTotals | null> {
  const paddle = await initializePaddleClient();
  if (!paddle) return null;

  const params: PricePreviewParams = { items: [{ priceId, quantity: 1 }] };
  if (clientCountry && /^[A-Z]{2}$/.test(clientCountry)) {
    params.address = { countryCode: clientCountry };
  }

  const res = await paddle.PricePreview(params);
  const data = res?.data;
  if (!data) return null;
  const lineItem = data.details?.lineItems?.[0];
  // The Paddle SDK exposes `total` (not `grandTotal`) on both Totals and
  // formattedTotals; map it onto the wrapper's `grandTotal` field.
  return {
    currencyCode: data.currencyCode,
    grandTotal: lineItem?.totals?.total ?? '',
    formattedGrandTotal: lineItem?.formattedTotals?.total ?? '',
    formattedSubtotal: lineItem?.formattedTotals?.subtotal ?? '',
    formattedTax: lineItem?.formattedTotals?.tax ?? '',
  };
}

export interface OpenCheckoutOptions {
  priceId: string;
  email?: string;
}

/** Open the Paddle overlay checkout for a single price. */
export function openPaddleCheckout(opts: OpenCheckoutOptions): void {
  void initializePaddleClient().then((paddle) => {
    if (!paddle) {
      window.dispatchEvent(new CustomEvent('paddle:checkout.error', { detail: { error: 'Paddle not initialized' } }));
      return;
    }
    // Paddle's CheckoutCustomer requires a non-empty email — only attach the
    // customer block when we actually have one (it is optional for guests).
    // Each variant is written as a fresh contextual literal so the SDK's
    // discriminated union of checkout options stays satisfied.
    if (opts.email) {
      paddle.Checkout.open({
        settings: { displayMode: 'overlay', variant: 'one-page' },
        items: [{ priceId: opts.priceId, quantity: 1 }],
        customer: { email: opts.email },
      });
    } else {
      paddle.Checkout.open({
        settings: { displayMode: 'overlay', variant: 'one-page' },
        items: [{ priceId: opts.priceId, quantity: 1 }],
      });
    }
  });
}

export type PaddleCheckoutEventName = 'checkout.completed' | 'checkout.closed' | 'checkout.error';

export function onPaddleCheckoutEvent(name: PaddleCheckoutEventName, handler: (data?: unknown) => void): () => void {
  const listener = (e: Event) => handler((e as CustomEvent).detail);
  window.addEventListener(`paddle:${name}`, listener);
  return () => window.removeEventListener(`paddle:${name}`, listener);
}

export type { Paddle };
