import { inject } from '@angular/core';
import { ErrorReportingService } from '../services/error-reporting.service';
import { isStaleBuildError, RELOADED_KEY } from './stale-build';

/**
 * Every route is lazy, so a tab left open across a deploy asks for chunks that no longer exist.
 * The first time, reload once to pick up the new build; if that doesn't help the build is broken
 * rather than stale, so report it instead of reloading in a loop. Runs in an injection context.
 */
export function handleNavigationError(error: unknown): void {
  if (isStaleBuildError(error) && !sessionStorage.getItem(RELOADED_KEY)) {
    sessionStorage.setItem(RELOADED_KEY, '1');
    location.reload();
    return;
  }
  inject(ErrorReportingService).report(error, { during: 'navigation' });
}
