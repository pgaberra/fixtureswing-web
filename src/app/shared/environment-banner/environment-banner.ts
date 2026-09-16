import { Component, computed, inject, input, resource, signal } from '@angular/core';
import { Api } from '../../api/api';
import { getVersions } from '../../api/fn/meta/get-versions';
import { LoadingIndicatorComponent } from '../loading-indicator/loading-indicator';

/**
 * Staging only: which web build this is, and on click which api version it talks to. Promotion
 * checks and "is my change deployed?" both start here. Renders nothing in production.
 */
@Component({
  selector: 'app-environment-banner',
  imports: [LoadingIndicatorComponent],
  template: `
    @if (visible()) {
      <div class="env-banner-wrap">
        <button
          type="button"
          class="env-banner"
          [attr.aria-expanded]="open()"
          (click)="open.set(!open())"
        >
          {{ label() }}
        </button>
        @if (open()) {
          <p class="version-panel" role="status">
            @if (versions.isLoading()) {
              <app-loading-indicator variant="inline" label="Loading versions" />
            } @else if (versions.error()) {
              Could not load the api version
            } @else {
              api {{ versions.value()?.api?.version }}
            }
          </p>
        }
      </div>
    }
  `,
  styleUrl: './environment-banner.css',
})
export class EnvironmentBannerComponent {
  private readonly api = inject(Api);

  readonly environmentName = input.required<string>();
  readonly version = input('');

  protected readonly visible = computed(() => this.environmentName() === 'staging');
  protected readonly open = signal(false);

  protected readonly versions = resource({
    params: () => (this.open() ? {} : undefined),
    loader: () => this.api.invoke(getVersions),
  });

  protected readonly label = computed(() => {
    const version = this.version().trim();
    return version
      ? `${this.environmentName().toUpperCase()} · web ${version}`
      : this.environmentName().toUpperCase();
  });
}
