/**
 * Landing page analytics.
 *
 * Safe no-op wrapper: when PostHog is configured via
 * VITE_POSTHOG_API_KEY the events are forwarded; otherwise events are
 * logged to the dev console only.
 */

let ready = false;

export function initAnalytics() {
  if (ready || typeof window === 'undefined') return;
  const token = import.meta.env.VITE_POSTHOG_API_KEY as string | undefined;
  if (!token) return;
  // PostHog is an optional dependency; only load when configured at build time.
  void import('posthog-js')
    .then(({ posthog }) => {
      const region = import.meta.env.VITE_POSTHOG_REGION || 'eu';
      posthog.init(token, {
        api_host: region === 'us' ? 'https://us.i.posthog.com' : 'https://eu.i.posthog.com',
        capture_pageview: true,
        person_profiles: 'identified_only',
      });
      ready = true;
    })
    .catch(() => {
      /* posthog-js unavailable — analytics stay inert */
    });
}

export function track(event: string, props: Record<string, unknown> = {}) {
  if (typeof window === 'undefined') return;
  if (ready) {
    void import('posthog-js').then(({ posthog }) => posthog.capture(event, props));
    return;
  }
  if (import.meta.env.DEV) console.info('[analytics]', event, props);
}

const seen = new Set<string>();

export function trackOnce(event: string, props: Record<string, unknown> = {}) {
  const key = `${event}:${JSON.stringify(props)}`;
  if (seen.has(key)) return;
  seen.add(key);
  track(event, props);
}