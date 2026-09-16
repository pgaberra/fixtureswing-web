import { DecimalPipe } from '@angular/common';
import { Component, computed, input, output } from '@angular/core';
import { GameweekRange, SortKey, TeamFixture, TickerRow, TickerView } from '../ticker-model';

/**
 * The ticker grid: one row per team, ranked, with its ease index and a bar showing the gap to the
 * rest, each gameweek's fixtures coloured from hard to easy, and the team's own projections.
 * Scrolls sideways in its own box on narrow screens with the team column pinned.
 */
@Component({
  selector: 'app-ticker-table',
  imports: [DecimalPipe],
  templateUrl: './ticker-table.html',
  styleUrl: './ticker-table.css',
})
export class TickerTableComponent {
  readonly rows = input.required<TickerRow[]>();
  readonly range = input.required<GameweekRange>();
  readonly view = input.required<TickerView>();
  readonly sort = input.required<SortKey>();
  /** 0 (hardest upcoming fixture) … 1 (easiest), for the cell colour. */
  readonly scale = input.required<(fixture: TeamFixture) => number>();

  readonly sortChange = output<SortKey>();

  protected readonly gameweeks = computed(() => {
    const out: number[] = [];
    for (let g = this.range().from; g <= this.range().to; g++) {
      out.push(g);
    }
    return out;
  });

  protected readonly maxIndex = computed(() => Math.max(1, ...this.rows().map((r) => r.easeIndex)));

  protected ariaSort(key: SortKey): 'descending' | 'ascending' | null {
    if (this.sort() !== key) {
      return null;
    }
    return key === 'team' ? 'ascending' : 'descending';
  }

  /**
   * Hard → neutral → easy through the tokens in styles.css, mixed in OKLab so the midpoint stays
   * a clean grey instead of a muddy brown.
   */
  protected cellColour(fixture: TeamFixture): string {
    const t = this.scale()(fixture);
    if (t < 0.5) {
      const share = Math.round((t / 0.5) * 100);
      return `color-mix(in oklab, var(--color-ease-neutral) ${share}%, var(--color-ease-hard))`;
    }
    const share = Math.round(((t - 0.5) / 0.5) * 100);
    return `color-mix(in oklab, var(--color-ease-easy) ${share}%, var(--color-ease-neutral))`;
  }

  /** Background for a gameweek cell: its only fixture's colour, or the mean for a double. */
  protected gameweekColour(fixtures: TeamFixture[]): string | null {
    if (fixtures.length === 0) {
      return null;
    }
    if (fixtures.length === 1) {
      return this.cellColour(fixtures[0]);
    }
    return null;
  }

  protected describe(fixture: TeamFixture): string {
    const venue = fixture.home ? 'home' : 'away';
    return (
      `${fixture.opponentName} (${venue}): an average side would expect ` +
      `${fixture.neutralGoalsFor.toFixed(2)} goals for, ` +
      `${fixture.neutralGoalsAgainst.toFixed(2)} against, ` +
      `${Math.round(fixture.neutralCleanSheet * 100)}% clean sheet. ` +
      `This team: ${fixture.expectedGoals.toFixed(2)} projected goals, ` +
      `${Math.round(fixture.cleanSheet * 100)}% clean sheet.`
    );
  }
}
