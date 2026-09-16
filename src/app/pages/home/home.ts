import { DatePipe, isPlatformBrowser } from '@angular/common';
import { Component, PLATFORM_ID, computed, inject, input, resource } from '@angular/core';
import { Router } from '@angular/router';
import { AnalyticsService } from '../../services/analytics.service';
import { TickerApiService } from '../../services/ticker-api.service';
import { ErrorStateComponent } from '../../shared/error-state/error-state';
import { LoadingIndicatorComponent } from '../../shared/loading-indicator/loading-indicator';
import { TickerControlsComponent } from '../../ticker/ticker-controls/ticker-controls';
import {
  buildRows,
  easeScale,
  GameweekRange,
  parseSort,
  parseView,
  resolveRange,
  selectableGameweeks,
  SortKey,
  sortRows,
  TickerView,
} from '../../ticker/ticker-model';
import { TickerTableComponent } from '../../ticker/ticker-table/ticker-table';

/**
 * The ticker page. Its heading and explanation are prerendered; the data loads in the browser only
 * (the build has no api to call). The range, view and sort live in the URL (`?from=&to=&view=&sort=`)
 * so a view can be shared and survives a reload.
 */
@Component({
  selector: 'app-home',
  imports: [
    DatePipe,
    ErrorStateComponent,
    LoadingIndicatorComponent,
    TickerControlsComponent,
    TickerTableComponent,
  ],
  templateUrl: './home.html',
  styleUrl: './home.css',
})
export class HomeComponent {
  private readonly tickerApi = inject(TickerApiService);
  private readonly analytics = inject(AnalyticsService);
  private readonly router = inject(Router);
  private readonly isBrowser = isPlatformBrowser(inject(PLATFORM_ID));

  // Query parameters, bound by the router (withComponentInputBinding).
  readonly from = input<string>();
  readonly to = input<string>();
  readonly view = input<string>();
  readonly sort = input<string>();

  protected readonly ticker = resource({
    params: () => (this.isBrowser ? {} : undefined),
    loader: () => this.tickerApi.load(),
  });

  protected readonly selectable = computed(() => {
    const data = this.ticker.value();
    return data ? selectableGameweeks(data) : [];
  });

  protected readonly range = computed(() =>
    resolveRange(this.selectable(), toNumber(this.from()), toNumber(this.to())),
  );

  protected readonly currentView = computed(() => parseView(this.view()));
  protected readonly currentSort = computed(() => parseSort(this.sort()));

  protected readonly rows = computed(() => {
    const data = this.ticker.value();
    if (!data) {
      return [];
    }
    return sortRows(buildRows(data, this.range(), this.currentView()), this.currentSort());
  });

  protected readonly scale = computed(() => {
    const data = this.ticker.value();
    return data ? easeScale(data, this.currentView()) : () => 0.5;
  });

  protected changeRange(range: GameweekRange): void {
    this.analytics.capture('ticker_range_changed', { span: range.to - range.from + 1 });
    this.updateUrl({ from: range.from, to: range.to });
  }

  protected changeView(view: TickerView): void {
    this.analytics.capture('ticker_view_changed', { view });
    this.updateUrl({ view });
  }

  protected changeSort(sort: SortKey): void {
    this.updateUrl({ sort });
  }

  private updateUrl(params: Record<string, string | number>): void {
    void this.router.navigate([], {
      queryParams: params,
      queryParamsHandling: 'merge',
      replaceUrl: true,
    });
  }
}

function toNumber(value: string | undefined): number | undefined {
  if (value === undefined || value === '') {
    return undefined;
  }
  const n = Number(value);
  return Number.isInteger(n) ? n : undefined;
}
