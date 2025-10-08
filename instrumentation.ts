/**
 * Next.js Instrumentation Hook
 * Initializes server-side monitoring and error tracking
 * Runs when the server starts up
 */

export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    const { initializeServerSentry } = await import('./lib/analytics/sentry-server');
    initializeServerSentry();
  }

  if (process.env.NEXT_RUNTIME === 'edge') {
    const { initializeServerSentry } = await import('./lib/analytics/sentry-server');
    initializeServerSentry();
  }
}
