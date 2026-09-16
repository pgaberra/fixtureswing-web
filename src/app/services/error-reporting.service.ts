import { Injectable } from '@angular/core';
import type { ErrorEvent, EventHint } from '@sentry/browser';
import { environment } from '../../environments/environment';
import { isRecoveringFromStaleBuild } from '../shared/stale-build';

type SentryApi = typeof import('@sentry/browser');

/**
 * How many reports to hold while the SDK is still loading. The import is dynamic, so errors thrown
 * during bootstrap (often the interesting ones) would otherwise be dropped. Bounded so an app that
 * throws in a loop cannot grow it without limit.
 */
const MAX_PENDING = 20;

/**
 * The last gate before an event leaves, and the only one that sees every event: Sentry's global
 * listeners report past Angular's ErrorHandler. A tab reloading for a stale build is not a fault,
 * and reporting it made every SlapStat deploy raise an alert.
 */
export function beforeSendEvent(event: ErrorEvent, hint?: EventHint): ErrorEvent | null {
  const thrown = hint?.originalException ?? event.exception?.values?.[0]?.value ?? '';
  return isRecoveringFromStaleBuild(thrown) ? null : event;
}

/**
 * The app's only entry point to Sentry; nothing else may import `@sentry/browser`.
 *
 * Off unless `environment.sentryDsn` is set: local dev, tests and any build without the DSN never
 * fetch the SDK. The dynamic import keeps it out of the initial bundle.
 */
@Injectable({ providedIn: 'root' })
export class ErrorReportingService {
  private readonly enabled = environment.sentryDsn !== '';
  private sentry: SentryApi | null = null;
  private pending: { error: unknown; hint?: EventHint }[] = [];

  /** Not awaited at bootstrap: the app must never wait on, or fail because of, error reporting. */
  async init(): Promise<void> {
    if (!this.enabled || this.sentry) {
      return;
    }
    const sentry = await import('@sentry/browser');
    sentry.init({
      dsn: environment.sentryDsn,
      environment: environment.environmentName,
      release: environment.version || undefined,
      // Errors only: performance spans would bury the faults this exists to surface.
      tracesSampleRate: 0,
      beforeSend: beforeSendEvent,
    });
    this.sentry = sentry;
    for (const { error, hint } of this.pending) {
      sentry.captureException(error, hint);
    }
    this.pending = [];
  }

  report(error: unknown, context?: Record<string, unknown>): void {
    if (!this.enabled) {
      return;
    }
    const hint = context ? { captureContext: { extra: context } } : undefined;
    if (!this.sentry) {
      if (this.pending.length < MAX_PENDING) {
        this.pending.push({ error, hint });
      }
      return;
    }
    this.sentry.captureException(error, hint);
  }
}
