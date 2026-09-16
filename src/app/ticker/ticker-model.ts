import { FixtureDto } from '../api/models/fixture-dto';
import { TickerDto } from '../api/models/ticker-dto';

/**
 * Turns the api's per-fixture predictions into the ticker: one row per team over a gameweek range,
 * ranked by how easy the fixtures are. Pure functions only, so every rule here is unit-tested and
 * a range or view change recomputes instantly with no request.
 *
 * Difficulty uses the api's **neutral** numbers: what an average club would expect against this
 * opponent at this venue. That keeps "easy fixtures" separate from "good team". The team's own
 * projections (expected goals, clean sheet chance) are shown beside it, not mixed into the rank.
 */

export type TickerView = 'overall' | 'attack' | 'defence';

export const VIEWS: readonly TickerView[] = ['overall', 'attack', 'defence'];

export interface GameweekRange {
  from: number;
  to: number;
}

/** One side of one fixture, from the point of view of the team whose row it sits in. */
export interface TeamFixture {
  fixtureId: number;
  gameweek: number;
  opponent: string;
  opponentName: string;
  home: boolean;
  /** Goals an average club would expect to score here. Higher is easier. */
  neutralGoalsFor: number;
  /** Goals an average club would expect to concede here. Lower is easier. */
  neutralGoalsAgainst: number;
  /** Clean-sheet chance for an average club here: e^-neutralGoalsAgainst. Higher is easier. */
  neutralCleanSheet: number;
  /** This team's own projections. */
  expectedGoals: number;
  cleanSheet: number;
}

export interface TickerRow {
  teamCode: number;
  name: string;
  shortName: string;
  /** Fixtures per gameweek in the range, in order: [] is a blank, two entries a double. */
  gameweeks: { gameweek: number; fixtures: TeamFixture[] }[];
  fixtureCount: number;
  /** The raw total for the selected view (see `viewTotal`). */
  total: number;
  /** 100 is the league-average schedule for this range and view; 120 is 20 % easier. */
  easeIndex: number;
  projectedGoals: number;
  projectedCleanSheets: number;
}

export type SortKey = 'ease' | 'projectedGoals' | 'projectedCleanSheets' | 'team';

/** The gameweeks a user can pick: the first unfinished one to the end of the season. */
export function selectableGameweeks(ticker: TickerDto): number[] {
  const first = ticker.nextGameweek ?? 1;
  return ticker.gameweeks.map((g) => g.number).filter((n) => n >= first);
}

export const DEFAULT_SPAN = 5;

/**
 * The range to show: the requested one if it is valid, otherwise the next `DEFAULT_SPAN`
 * gameweeks. Values arrive from the URL, so anything may come in.
 */
export function resolveRange(
  selectable: number[],
  from: number | undefined,
  to: number | undefined,
): GameweekRange {
  if (selectable.length === 0) {
    return { from: 1, to: 1 };
  }
  const first = selectable[0];
  const last = selectable[selectable.length - 1];
  const valid = (n: number | undefined): n is number =>
    n !== undefined && Number.isInteger(n) && n >= first && n <= last;
  const start = valid(from) ? from : first;
  const end = valid(to) && to >= start ? to : Math.min(last, start + DEFAULT_SPAN - 1);
  return { from: start, to: end };
}

export function parseView(value: string | undefined): TickerView {
  return VIEWS.includes(value as TickerView) ? (value as TickerView) : 'overall';
}

export function parseSort(value: string | undefined): SortKey {
  const keys: SortKey[] = ['ease', 'projectedGoals', 'projectedCleanSheets', 'team'];
  return keys.includes(value as SortKey) ? (value as SortKey) : 'ease';
}

function sideOf(fixture: FixtureDto, teamCode: number, names: Map<number, TeamName>): TeamFixture {
  const home = fixture.homeTeam === teamCode;
  const side = home ? fixture.home : fixture.away;
  const opponentCode = home ? fixture.awayTeam : fixture.homeTeam;
  const opponent = names.get(opponentCode);
  return {
    fixtureId: fixture.id,
    gameweek: fixture.gameweek ?? 0,
    opponent: opponent?.shortName ?? '?',
    opponentName: opponent?.name ?? 'Unknown',
    home,
    neutralGoalsFor: side.neutralGoalsFor,
    neutralGoalsAgainst: side.neutralGoalsAgainst,
    neutralCleanSheet: Math.exp(-side.neutralGoalsAgainst),
    expectedGoals: side.expectedGoals,
    cleanSheet: side.cleanSheet,
  };
}

interface TeamName {
  name: string;
  shortName: string;
}

/**
 * How easy one fixture is for the view, on a scale where **more is easier and a blank adds
 * nothing**, so a double gameweek counts twice and a blank gameweek counts against a team:
 *
 * - attack: goals an average club would score (the opponent's defensive weakness, and venue);
 * - defence: clean-sheet chance for an average club (the opponent's attacking weakness, and venue);
 * - overall: the two, each relative to its league average, added together.
 */
export function fixtureEase(fixture: TeamFixture, view: TickerView, averages: Averages): number {
  const attack = fixture.neutralGoalsFor / averages.goalsFor;
  const defence = fixture.neutralCleanSheet / averages.cleanSheet;
  switch (view) {
    case 'attack':
      return attack;
    case 'defence':
      return defence;
    default:
      return (attack + defence) / 2;
  }
}

export interface Averages {
  goalsFor: number;
  cleanSheet: number;
}

/** Per-fixture league averages over every upcoming fixture side, so 1.0 is an average fixture. */
export function leagueAverages(ticker: TickerDto): Averages {
  const sides = ticker.fixtures.flatMap((f) => [f.home, f.away]);
  if (sides.length === 0) {
    return { goalsFor: 1, cleanSheet: 1 };
  }
  const goalsFor = sides.reduce((sum, s) => sum + s.neutralGoalsFor, 0) / sides.length;
  const cleanSheet =
    sides.reduce((sum, s) => sum + Math.exp(-s.neutralGoalsAgainst), 0) / sides.length;
  return { goalsFor, cleanSheet };
}

export function buildRows(ticker: TickerDto, range: GameweekRange, view: TickerView): TickerRow[] {
  const names = new Map(ticker.teams.map((t) => [t.code, t]));
  const averages = leagueAverages(ticker);
  const inRange = ticker.fixtures.filter(
    (f) => f.gameweek !== null && f.gameweek >= range.from && f.gameweek <= range.to,
  );
  const gameweekNumbers: number[] = [];
  for (let g = range.from; g <= range.to; g++) {
    gameweekNumbers.push(g);
  }

  const rows = ticker.teams.map((team): TickerRow => {
    const fixtures = inRange
      .filter((f) => f.homeTeam === team.code || f.awayTeam === team.code)
      .map((f) => sideOf(f, team.code, names));
    const total = fixtures.reduce((sum, f) => sum + fixtureEase(f, view, averages), 0);
    return {
      teamCode: team.code,
      name: team.name,
      shortName: team.shortName,
      gameweeks: gameweekNumbers.map((gameweek) => ({
        gameweek,
        fixtures: fixtures.filter((f) => f.gameweek === gameweek),
      })),
      fixtureCount: fixtures.length,
      total,
      easeIndex: 0,
      projectedGoals: fixtures.reduce((sum, f) => sum + f.expectedGoals, 0),
      projectedCleanSheets: fixtures.reduce((sum, f) => sum + f.cleanSheet, 0),
    };
  });

  const mean = rows.reduce((sum, r) => sum + r.total, 0) / (rows.length || 1);
  for (const row of rows) {
    row.easeIndex = mean > 0 ? (row.total / mean) * 100 : 100;
  }
  return rows;
}

export function sortRows(rows: TickerRow[], key: SortKey): TickerRow[] {
  const byName = (a: TickerRow, b: TickerRow) => a.name.localeCompare(b.name);
  const compare: Record<SortKey, (a: TickerRow, b: TickerRow) => number> = {
    ease: (a, b) => b.easeIndex - a.easeIndex || byName(a, b),
    projectedGoals: (a, b) => b.projectedGoals - a.projectedGoals || byName(a, b),
    projectedCleanSheets: (a, b) => b.projectedCleanSheets - a.projectedCleanSheets || byName(a, b),
    team: byName,
  };
  return [...rows].sort(compare[key]);
}

/**
 * Where a fixture sits between the hardest (0) and easiest (1) upcoming fixture for the view,
 * used for the cell colour. Scaled over every upcoming fixture, not just the visible range, so a
 * colour means the same thing whichever range is picked.
 */
export function easeScale(ticker: TickerDto, view: TickerView): (fixture: TeamFixture) => number {
  const averages = leagueAverages(ticker);
  const names = new Map(ticker.teams.map((t) => [t.code, t]));
  const values = ticker.fixtures.flatMap((f) =>
    [f.homeTeam, f.awayTeam].map((code) => fixtureEase(sideOf(f, code, names), view, averages)),
  );
  const min = Math.min(...values);
  const max = Math.max(...values);
  return (fixture) =>
    max > min ? (fixtureEase(fixture, view, averages) - min) / (max - min) : 0.5;
}
