import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
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
  gameweeks: [5, 6, 7, 8, 9, 10].map((number) => ({ number, deadlineTime: null, finished: false })),
  teams: [
    { code: 3, name: 'Arsenal', shortName: 'ARS' },
    { code: 7, name: 'Aston Villa', shortName: 'AVL' },
  ],
  fixtures: [
    {
      id: 41,
      gameweek: 5,
      kickoffTime: '2026-09-19T14:00:00Z',
      homeTeam: 3,
      awayTeam: 7,
      home: {
        expectedGoals: 2.1,
        cleanSheet: 0.45,
        neutralGoalsFor: 1.8,
        neutralGoalsAgainst: 0.9,
      },
      away: {
        expectedGoals: 0.8,
        cleanSheet: 0.12,
        neutralGoalsFor: 1.1,
        neutralGoalsAgainst: 1.6,
      },
      homeWin: 0.62,
      draw: 0.22,
      awayWin: 0.16,
    },
  ],
};

async function render(load: () => Promise<TickerDto>) {
  TestBed.configureTestingModule({
    imports: [HomeComponent],
    providers: [provideRouter([]), { provide: TickerApiService, useValue: { load } }],
  });
  const fixture = TestBed.createComponent(HomeComponent);
  fixture.detectChanges();
  await fixture.whenStable();
  fixture.detectChanges();
  return fixture.nativeElement as HTMLElement;
}

describe('HomeComponent', () => {
  it('ranks the teams over the next five gameweeks', async () => {
    const page = await render(() => Promise.resolve(TICKER));
    expect(page.querySelector('h1')?.textContent).toContain('FPL Fixture Ticker');
    const rows = [...page.querySelectorAll('app-ticker-table tbody tr')];
    expect(rows.map((r) => r.querySelector('.team-name')?.textContent)).toEqual([
      'Arsenal',
      'Aston Villa',
    ]);
    // The default range is the next five gameweeks.
    expect(page.querySelectorAll('thead .col-gw')).toHaveLength(5);
    expect(page.querySelector('.as-of')?.textContent).toContain('using results up to');
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
