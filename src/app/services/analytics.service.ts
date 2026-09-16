import { Injectable } from '@angular/core';
import type { PostHog } from 'posthog-js';
import { environment } from '../../environments/environment';

/** Business events worth counting. A union so call sites can't drift into two spellings. */
export type AnalyticsEvent = 'ticker_range_changed' | 'ticker_view_changed';

/**
 * The app's only entry point to PostHog; nothing else may import `posthog-js`.
 *
 * Off unless `environment.posthogKey` is set, and then **always cookieless**: there are no
 * accounts to identify, so nothing is stored in the visitor's browser and there is no consent
 * banner to show. Visitors are counted by PostHog's server-side daily hash, which needs the real
 * client IP (nginx forwards it on /ingest). Cookieless mode must also be switched on in the
 * PostHog project settings, or every event is silently dropped.
 */
@Injectable({ providedIn: 'root' })
export class AnalyticsService {
  private readonly enabled = environment.posthogKey !== '';
  private client: PostHog | null = null;

  /** Not awaited at bootstrap. posthog-js is imported dynamically to keep it out of the bundle. */
  async init(): Promise<void> {
    if (!this.enabled || this.client) {
      return;
    }
    const { default: posthog } = await import('posthog-js');
    posthog.init(environment.posthogKey, {
      // Same-origin proxy (nginx.conf): the CSP stays at 'self' and ad blockers can't strip it.
      api_host: `${window.location.origin}/ingest`,
      ui_host: 'https://eu.posthog.com',
      cookieless_mode: 'always',
      person_profiles: 'identified_only',
      // Autocapture records page text and replay records sessions; both are deliberate, reviewed
      // steps, not defaults.
      autocapture: false,
      disable_session_recording: true,
      capture_pageleave: true,
    });
    this.client = posthog;
  }

  capture(event: AnalyticsEvent, properties?: Record<string, string | number | boolean>): void {
    this.client?.capture(event, properties);
  }
}
