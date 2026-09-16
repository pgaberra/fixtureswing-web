import { describe, expect, it } from 'vitest';
import { FixtureDto } from '../api/models/fixture-dto';
import { TickerDto } from '../api/models/ticker-dto';
import {
  buildRows,
  easeScale,
  parseSort,
  parseView,
  resolveRange,
  selectableGameweeks,
  sortRows,
} from './ticker-model';

/** A fixture whose difficulty is set per side: `homeFor` is what an average home club would score. */
function fixture(
  id: number,
  gameweek: number | null,
  homeTeam: number,
  awayTeam: number,
  homeFor: number,
  awayFor: number,
): FixtureDto {
  return {
    id,
    gameweek,
    kickoffTime: null,
    homeTeam,
    awayTeam,
    home: {
      expectedGoals: homeFor + 0.1,
      cleanSheet: Math.exp(-awayFor),
      neutralGoalsFor: homeFor,
      neutralGoalsAgainst: awayFor,
    },
    away: {
      expectedGoals: awayFor + 0.1,
      cleanSheet: Math.exp(-homeFor),
      neutralGoalsFor: awayFor,
      neutralGoalsAgainst: homeFor,
    },
    homeWin: 0.4,
    draw: 0.3,
    awayWin: 0.3,
  };
}

function ticker(fixtures: FixtureDto[], nextGameweek = 5): TickerDto {
  return {
    season: '2026-27',
    modelVersion: 'test',
    generatedAt: '2026-09-17T00:00:00Z',
    dataThrough: null,
    nextGameweek,
    gameweeks: Array.from({ length: 38 }, (_, i) => ({
      number: i + 1,
      deadlineTime: null,
      finished: i + 1 < nextGameweek,
    })),
    teams: [
      { code: 1, name: 'Arsenal', shortName: 'ARS' },
      { code: 2, name: 'Burnley', shortName: 'BUR' },
      { code: 3, name: 'Chelsea', shortName: 'CHE' },
      { code: 4, name: 'Derby', shortName: 'DER' },
    ],
    fixtures,
  };
}

describe('range and URL parsing', () => {
  const data = ticker([]);
  const selectable = selectableGameweeks(data);

  it('offers the next gameweek to the end of the season', () => {
    expect(selectable[0]).toBe(5);
    expect(selectable.at(-1)).toBe(38);
  });

  it('defaults to the next five gameweeks', () => {
    expect(resolveRange(selectable, undefined, undefined)).toEqual({ from: 5, to: 9 });
  });

  it('keeps a valid range and repairs an invalid one', () => {
    expect(resolveRange(selectable, 8, 8)).toEqual({ from: 8, to: 8 });
    expect(resolveRange(selectable, 3, 12)).toEqual({ from: 5, to: 12 });
    expect(resolveRange(selectable, 20, 10)).toEqual({ from: 20, to: 24 });
    expect(resolveRange(selectable, 36, undefined)).toEqual({ from: 36, to: 38 });
    expect(resolveRange(selectable, Number.NaN, 99)).toEqual({ from: 5, to: 9 });
  });

  it('falls back to known views and sorts', () => {
    expect(parseView('attack')).toBe('attack');
    expect(parseView('nonsense')).toBe('overall');
    expect(parseSort('projectedGoals')).toBe('projectedGoals');
    expect(parseSort(undefined)).toBe('ease');
  });
});

describe('buildRows', () => {
  // GW5: ARS (easy home) v BUR, CHE v DER. GW6: BUR v CHE, DER v ARS. GW7: ARS v CHE and BUR v DER,
  // plus a second ARS fixture (double gameweek). Nothing for DER... in GW8 (blank for everyone).
  const data = ticker([
    fixture(1, 5, 1, 2, 2.0, 0.8),
    fixture(2, 5, 3, 4, 1.4, 1.2),
    fixture(3, 6, 2, 3, 1.1, 1.5),
    fixture(4, 6, 4, 1, 0.9, 1.9),
    fixture(5, 7, 1, 3, 1.6, 1.0),
    fixture(6, 7, 2, 4, 1.3, 1.3),
    fixture(7, 7, 4, 1, 1.0, 1.7),
    fixture(8, null, 2, 1, 1.2, 1.2),
  ]);

  it('lays out every gameweek of the range, with doubles and blanks', () => {
    const rows = buildRows(data, { from: 5, to: 8 }, 'overall');
    const arsenal = rows.find((r) => r.shortName === 'ARS')!;
    expect(arsenal.gameweeks.map((g) => g.fixtures.length)).toEqual([1, 1, 2, 0]);
    expect(arsenal.fixtureCount).toBe(4);
    expect(arsenal.gameweeks[1].fixtures[0]).toMatchObject({ opponent: 'DER', home: false });
  });

  it('ignores fixtures without a gameweek', () => {
    const rows = buildRows(data, { from: 1, to: 38 }, 'overall');
    expect(rows.reduce((n, r) => n + r.fixtureCount, 0)).toBe(14);
  });

  it('indexes against the league average, so the mean index is 100', () => {
    const rows = buildRows(data, { from: 5, to: 7 }, 'attack');
    const mean = rows.reduce((sum, r) => sum + r.easeIndex, 0) / rows.length;
    expect(mean).toBeCloseTo(100);
  });

  it('ranks the team with the easier attacking fixtures first', () => {
    const rows = sortRows(buildRows(data, { from: 5, to: 5 }, 'attack'), 'ease');
    expect(rows[0].shortName).toBe('ARS');
    expect(rows.at(-1)?.shortName).toBe('BUR');
  });

  it('counts a double gameweek for, and a blank against, a team', () => {
    const rows = buildRows(data, { from: 7, to: 7 }, 'overall');
    const arsenal = rows.find((r) => r.shortName === 'ARS')!;
    const chelsea = rows.find((r) => r.shortName === 'CHE')!;
    expect(arsenal.fixtureCount).toBe(2);
    expect(arsenal.easeIndex).toBeGreaterThan(chelsea.easeIndex);
  });

  it('sums the team projections over the range', () => {
    const rows = buildRows(data, { from: 5, to: 5 }, 'overall');
    const arsenal = rows.find((r) => r.shortName === 'ARS')!;
    expect(arsenal.projectedGoals).toBeCloseTo(2.1);
    expect(arsenal.projectedCleanSheets).toBeCloseTo(Math.exp(-0.8));
  });

  it('sorts by the chosen column, ties by name', () => {
    const rows = buildRows(data, { from: 5, to: 7 }, 'overall');
    expect(sortRows(rows, 'team').map((r) => r.shortName)).toEqual(['ARS', 'BUR', 'CHE', 'DER']);
    const goals = sortRows(rows, 'projectedGoals').map((r) => r.projectedGoals);
    expect(goals).toEqual([...goals].sort((a, b) => b - a));
  });
});

describe('easeScale', () => {
  it('maps the easiest fixture to 1 and the hardest to 0', () => {
    const data = ticker([fixture(1, 5, 1, 2, 2.5, 0.5), fixture(2, 5, 3, 4, 1.0, 1.0)]);
    const scale = easeScale(data, 'attack');
    const rows = buildRows(data, { from: 5, to: 5 }, 'attack');
    const cell = (code: number) => rows.find((r) => r.teamCode === code)!.gameweeks[0].fixtures[0];
    expect(scale(cell(1))).toBe(1);
    expect(scale(cell(2))).toBe(0);
    expect(scale(cell(3))).toBeGreaterThan(0);
  });
});
