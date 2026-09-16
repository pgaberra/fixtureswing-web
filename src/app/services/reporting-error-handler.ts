import { ErrorHandler, Injectable, inject } from '@angular/core';
import { ErrorReportingService } from './error-reporting.service';
import { isRecoveringFromStaleBuild } from '../shared/stale-build';

/** Reports uncaught errors, then hands them to Angular's default handler so they reach the console. */
@Injectable()
export class ReportingErrorHandler extends ErrorHandler {
  private readonly reporting = inject(ErrorReportingService);

  override handleError(error: unknown): void {
    if (!isRecoveringFromStaleBuild(error)) {
      try {
        this.reporting.report(error);
      } catch {
        // Deliberately empty: if Sentry itself throws there is nowhere left to report it, and the
        // original error below is the one that matters.
      }
    }
    super.handleError(error);
  }
}
