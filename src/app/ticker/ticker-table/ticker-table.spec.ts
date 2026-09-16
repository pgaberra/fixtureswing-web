import { TestBed } from '@angular/core/testing';
import { describe, expect, it } from 'vitest';
import { TeamFixture, TickerRow } from '../ticker-model';
import { TickerTableComponent } from './ticker-table';

function fixture(id: number, gameweek: number, opponent: string, home: boolean): TeamFixture {
  return {
    fixtureId: id,
    gameweek,
    opponent,
    opponentName: `${opponent} FC`,
    home,
    neutralGoalsFor: 1.5,
    neutralGoalsAgainst: 1.2,
    neutralCleanSheet: Math.exp(-1.2),
    expectedGoals: 1.6,
    cleanSheet: 0.3,
  };
}

const ROWS: TickerRow[] = [
  {
    teamCode: 1,
    name: 'Arsenal',
    shortName: 'ARS',
    gameweeks: [
      { gameweek: 5, fixtures: [fixture(1, 5, 'BUR', true)] },
      { gameweek: 6, fixtures: [fixture(2, 6, 'CHE', false), fixture(3, 6, 'DER', true)] },
      { gameweek: 7, fixtures: [] },
    ],
    fixtureCount: 3,
    total: 3,
    easeIndex: 125,
    projectedGoals: 4.8,
    projectedCleanSheets: 0.9,
  },
  {
    teamCode: 2,
    name: 'Burnley',
    shortName: 'BUR',
    gameweeks: [
      { gameweek: 5, fixtures: [fixture(1, 5, 'ARS', false)] },
      { gameweek: 6, fixtures: [] },
      { gameweek: 7, fixtures: [] },
    ],
    fixtureCount: 1,
    total: 1,
    easeIndex: 75,
    projectedGoals: 1.1,
    projectedCleanSheets: 0.2,
  },
];

function render(sort: 'ease' | 'team' = 'ease') {
  TestBed.configureTestingModule({ imports: [TickerTableComponent] });
  const component = TestBed.createComponent(TickerTableComponent);
  component.componentRef.setInput('rows', ROWS);
  component.componentRef.setInput('range', { from: 5, to: 7 });
  component.componentRef.setInput('view', 'overall');
  component.componentRef.setInput('sort', sort);
  component.componentRef.setInput('scale', (f: TeamFixture) => (f.home ? 1 : 0));
  component.detectChanges();
  return component;
}

describe('TickerTableComponent', () => {
  it('ranks rows with their ease index, gameweek columns and projections', () => {
    const table = render().nativeElement as HTMLElement;
    const headers = [...table.querySelectorAll('thead th')].map((th) => th.textContent?.trim());
    expect(headers).toContain('GW 5');
    expect(headers).toContain('GW 7');
    const first = table.querySelector('tbody tr')!;
    expect(first.querySelector('.col-team')?.textContent).toContain('1');
    expect(first.querySelector('.col-team')?.textContent).toContain('Arsenal');
    expect(first.querySelector('.ease-value')?.textContent?.trim()).toBe('125');
    expect(first.textContent).toContain('4.8');
  });

  it('draws the ease bar relative to the best team', () => {
    const table = render().nativeElement as HTMLElement;
    const fills = [...table.querySelectorAll<HTMLElement>('.ease-fill')].map((f) => f.style.width);
    expect(fills).toEqual(['100%', '60%']);
  });

  it('stacks a double gameweek and labels a blank one', () => {
    const table = render().nativeElement as HTMLElement;
    const cells = table.querySelectorAll('tbody tr:first-child .col-gw');
    expect(cells[1].classList).toContain('double');
    expect(cells[1].querySelectorAll('.fixture')).toHaveLength(2);
    expect(cells[2].classList).toContain('blank');
    expect(cells[2].textContent).toContain('Blank');
  });

  it('colours from the scale and describes each fixture for screen readers', () => {
    const table = render().nativeElement as HTMLElement;
    const home = table.querySelector<HTMLElement>('tbody tr:first-child .col-gw')!;
    expect(home.style.background).toContain('--color-ease-easy');
    expect(home.textContent).toContain('BUR FC (home)');
  });

  it('marks the sorted column and asks for a new sort', () => {
    const component = render('team');
    const table = component.nativeElement as HTMLElement;
    expect(table.querySelector('[aria-sort]')?.textContent).toContain('Team');
    let requested: string | undefined;
    component.componentInstance.sortChange.subscribe((key) => (requested = key));
    [...table.querySelectorAll<HTMLButtonElement>('.sort')]
      .find((b) => b.textContent?.includes('Proj. goals'))!
      .click();
    expect(requested).toBe('projectedGoals');
  });
});
