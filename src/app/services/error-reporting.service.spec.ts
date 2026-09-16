import type { ErrorEvent } from '@sentry/browser';
import { afterEach, describe, expect, it } from 'vitest';
import { RELOADED_KEY } from '../shared/stale-build';
import { beforeSendEvent, ErrorReportingService } from './error-reporting.service';

describe('beforeSendEvent', () => {
  afterEach(() => sessionStorage.clear());

  it('drops the error of a tab already reloading for a new build', () => {
    sessionStorage.setItem(RELOADED_KEY, '1');
    const event = { type: undefined } as ErrorEvent;
    const stale = new Error('Failed to fetch dynamically imported module');
    expect(beforeSendEvent(event, { originalException: stale })).toBeNull();
  });

  it('keeps every other error', () => {
    const event = { type: undefined } as ErrorEvent;
    expect(beforeSendEvent(event, { originalException: new Error('boom') })).toBe(event);
  });
});

describe('ErrorReportingService without a DSN', () => {
  it('stays inert and never loads the SDK', async () => {
    const service = new ErrorReportingService();
    await service.init();
    expect(() => service.report(new Error('ignored'))).not.toThrow();
  });
});
