import { TestBed } from '@angular/core/testing';
import { describe, expect, it } from 'vitest';
import { HttpErrorResponse } from '@angular/common/http';
import { TickerDto } from '../../api/models/ticker-dto';
import { TickerApiService } from '../../services/ticker-api.service';
import { HomeComponent } from './home';

const TICKER: TickerDto = {
  season: '2026-27',
  modelVersion: 'xg-dc-v2',
  generatedAt: '2026-09-16T22:00:00Z',
  dataThrough: '2026-09-14T19:00:00Z',
  nextGameweek: 5,
  gameweeks: [],
  teams: [{ code: 3, name: 'Arsenal', shortName: 'ARS' }],
  fixtures: [],
};

async function render(load: () => Promise<TickerDto>) {
  TestBed.configureTestingModule({
    imports: [HomeComponent],
    providers: [{ provide: TickerApiService, useValue: { load } }],
  });
  const fixture = TestBed.createComponent(HomeComponent);
  fixture.detectChanges();
  await fixture.whenStable();
  fixture.detectChanges();
  return fixture.nativeElement as HTMLElement;
}

describe('HomeComponent', () => {
  it('shows the heading and what was loaded', async () => {
    const page = await render(() => Promise.resolve(TICKER));
    expect(page.querySelector('h1')?.textContent).toContain('FPL Fixture Ticker');
    expect(page.textContent).toContain('from gameweek 5');
  });

  it('shows the error state with a retry when the api fails', async () => {
    const page = await render(() =>
      // HttpClient rejects with HttpErrorResponse, which is not an Error subclass.
      // eslint-disable-next-line @typescript-eslint/prefer-promise-reject-errors
      Promise.reject(new HttpErrorResponse({ status: 503 })),
    );
    expect(page.querySelector('[role="alert"]')?.textContent).toContain(
      "Couldn't load the fixtures",
    );
    expect(page.querySelector('button')?.textContent).toContain('Try again');
  });
});
