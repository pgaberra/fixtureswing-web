import { isPlatformBrowser } from '@angular/common';
import { Component, PLATFORM_ID, inject, resource } from '@angular/core';
import { TickerApiService } from '../../services/ticker-api.service';
import { ErrorStateComponent } from '../../shared/error-state/error-state';
import { LoadingIndicatorComponent } from '../../shared/loading-indicator/loading-indicator';

/**
 * The home page. Its heading and explanation are prerendered; the ticker data loads in the
 * browser only (the build has no api to call).
 */
@Component({
  selector: 'app-home',
  imports: [ErrorStateComponent, LoadingIndicatorComponent],
  templateUrl: './home.html',
  styleUrl: './home.css',
})
export class HomeComponent {
  private readonly tickerApi = inject(TickerApiService);
  private readonly isBrowser = isPlatformBrowser(inject(PLATFORM_ID));

  protected readonly ticker = resource({
    params: () => (this.isBrowser ? {} : undefined),
    loader: () => this.tickerApi.load(),
  });
}
