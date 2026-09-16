import { Component, computed, input, output } from '@angular/core';
import { GameweekRange, TickerView, VIEWS } from '../ticker-model';

const PRESETS = [1, 3, 5, 8];

const VIEW_LABELS: Record<TickerView, string> = {
  overall: 'Overall',
  attack: 'Attack',
  defence: 'Defence',
};

const VIEW_HINTS: Record<TickerView, string> = {
  overall: 'Attack and defence together',
  attack: 'For forwards and midfielders: opponents who concede a lot',
  defence: 'For goalkeepers and defenders: opponents who score little',
};

/** Picks the gameweek range (free from/to, or a "next N" preset) and the view. */
@Component({
  selector: 'app-ticker-controls',
  templateUrl: './ticker-controls.html',
  styleUrl: './ticker-controls.css',
})
export class TickerControlsComponent {
  readonly selectable = input.required<number[]>();
  readonly range = input.required<GameweekRange>();
  readonly view = input.required<TickerView>();

  readonly rangeChange = output<GameweekRange>();
  readonly viewChange = output<TickerView>();

  protected readonly views = VIEWS;
  protected readonly viewLabels = VIEW_LABELS;
  protected readonly viewHint = computed(() => VIEW_HINTS[this.view()]);

  protected readonly presets = computed(() => {
    const available = this.selectable();
    return PRESETS.filter((n) => n <= available.length).map((n) => ({
      span: n,
      range: { from: available[0], to: available[n - 1] },
    }));
  });

  protected readonly toOptions = computed(() =>
    this.selectable().filter((n) => n >= this.range().from),
  );

  protected isActivePreset(preset: GameweekRange): boolean {
    return preset.from === this.range().from && preset.to === this.range().to;
  }

  protected changeFrom(value: string): void {
    const from = Number(value);
    const to = Math.max(from, this.range().to);
    this.rangeChange.emit({ from, to });
  }

  protected changeTo(value: string): void {
    this.rangeChange.emit({ from: this.range().from, to: Number(value) });
  }
}
