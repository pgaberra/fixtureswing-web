import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { environment } from '../environments/environment';
import { EnvironmentBannerComponent } from './shared/environment-banner/environment-banner';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, EnvironmentBannerComponent],
  template: `
    <app-environment-banner [environmentName]="environmentName" [version]="version" />
    <header class="site-header">
      <a class="brand" href="/">FixtureSwing</a>
    </header>
    <main class="site-main">
      <router-outlet />
    </main>
    <footer class="site-footer">
      <p>
        Not affiliated with the Premier League or Fantasy Premier League. Fixture data from the
        official FPL API.
      </p>
    </footer>
  `,
  styleUrl: './app.css',
})
export class App {
  protected readonly environmentName = environment.environmentName;
  protected readonly version = environment.version;
}
