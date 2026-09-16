import { isPlatformBrowser } from '@angular/common';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import {
  ApplicationConfig,
  ErrorHandler,
  inject,
  PLATFORM_ID,
  provideAppInitializer,
  provideBrowserGlobalErrorListeners,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { provideClientHydration } from '@angular/platform-browser';
import {
  NavigationEnd,
  provideRouter,
  Router,
  withComponentInputBinding,
  withNavigationErrorHandler,
} from '@angular/router';

import { environment } from '../environments/environment';
import { provideApiConfiguration } from './api/api-configuration';
import { routes } from './app.routes';
import { retryInterceptor } from './interceptors/retry.interceptor';
import { timeoutInterceptor } from './interceptors/timeout.interceptor';
import { AnalyticsService } from './services/analytics.service';
import { ErrorReportingService } from './services/error-reporting.service';
import { ReportingErrorHandler } from './services/reporting-error-handler';
import { handleNavigationError } from './shared/navigation-error';
import { clearStaleBuildReload } from './shared/stale-build';

// Browser-only initialisers: a page prerendered at build time has no visitor to count, no error
// to report and no sessionStorage. None of them is awaited, so bootstrap never waits on a third
// party, and the empty catches are deliberate: a blocked analytics or Sentry fetch must not take
// the app down or be shown to anyone.
function initErrorReporting() {
  if (isPlatformBrowser(inject(PLATFORM_ID))) {
    void inject(ErrorReportingService)
      .init()
      .catch(() => undefined);
  }
}

function initAnalytics() {
  if (isPlatformBrowser(inject(PLATFORM_ID))) {
    void inject(AnalyticsService)
      .init()
      .catch(() => undefined);
  }
}

// A navigation that completes means the tab runs against a build that still exists, so the
// one-shot stale-build reload is spent and a later deploy may use it again.
function initNavigationRecovery() {
  if (!isPlatformBrowser(inject(PLATFORM_ID))) {
    return;
  }
  inject(Router)
    .events.pipe(takeUntilDestroyed())
    .subscribe((event) => {
      if (event instanceof NavigationEnd) {
        clearStaleBuildReload();
      }
    });
}

// retryInterceptor is outermost, so each retry gets its own timeout and a timeout isn't retried.
export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    { provide: ErrorHandler, useClass: ReportingErrorHandler },
    provideRouter(
      routes,
      withComponentInputBinding(),
      withNavigationErrorHandler(handleNavigationError),
    ),
    provideHttpClient(withInterceptors([retryInterceptor, timeoutInterceptor])),
    provideApiConfiguration(environment.apiRootUrl),
    provideClientHydration(),
    provideAppInitializer(initNavigationRecovery),
    provideAppInitializer(initErrorReporting),
    provideAppInitializer(initAnalytics),
  ],
};
