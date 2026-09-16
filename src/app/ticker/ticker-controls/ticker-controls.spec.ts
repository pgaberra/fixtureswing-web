import { TestBed } from '@angular/core/testing';
import { describe, expect, it } from 'vitest';
import { GameweekRange, TickerView } from '../ticker-model';
import { TickerControlsComponent } from './ticker-controls';

function render(range: GameweekRange = { from: 5, to: 9 }, view: TickerView = 'overall') {
  TestBed.configureTestingModule({ imports: [TickerControlsComponent] });
  const component = TestBed.createComponent(TickerControlsComponent);
  component.componentRef.setInput('selectable', [5, 6, 7, 8, 9, 10, 11, 12, 13]);
  component.componentRef.setInput('range', range);
  component.componentRef.setInput('view', view);
  component.detectChanges();
  const ranges: GameweekRange[] = [];
  const views: TickerView[] = [];
  component.componentInstance.rangeChange.subscribe((r) => ranges.push(r));
  component.componentInstance.viewChange.subscribe((v) => views.push(v));
  return { element: component.nativeElement as HTMLElement, ranges, views };
}

function button(element: HTMLElement, label: string): HTMLButtonElement {
  return [...element.querySelectorAll<HTMLButtonElement>('button')].find(
    (b) => b.textContent?.trim() === label,
  )!;
}

describe('TickerControlsComponent', () => {
  it('marks the preset and view that match the current state', () => {
    const { element } = render();
    expect(button(element, 'Next 5').getAttribute('aria-pressed')).toBe('true');
    expect(button(element, 'Next 3').getAttribute('aria-pressed')).toBe('false');
    expect(button(element, 'Overall').getAttribute('aria-pressed')).toBe('true');
  });

  it('emits a preset range and a view', () => {
    const { element, ranges, views } = render();
    button(element, 'Next 3').click();
    button(element, 'Defence').click();
    expect(ranges).toEqual([{ from: 5, to: 7 }]);
    expect(views).toEqual(['defence']);
  });

  it('moves the end of the range along when the start passes it', () => {
    const { element, ranges } = render();
    const from = element.querySelectorAll('select')[0];
    from.value = '11';
    from.dispatchEvent(new Event('change'));
    expect(ranges).toEqual([{ from: 11, to: 11 }]);
  });

  it('only offers end gameweeks from the start onwards', () => {
    const { element } = render({ from: 8, to: 9 });
    const to = element.querySelectorAll('select')[1];
    expect([...to.options].map((o) => o.value)[0]).toBe('8');
  });

  it('hides presets longer than the season has left', () => {
    TestBed.configureTestingModule({ imports: [TickerControlsComponent] });
    const component = TestBed.createComponent(TickerControlsComponent);
    component.componentRef.setInput('selectable', [37, 38]);
    component.componentRef.setInput('range', { from: 37, to: 38 });
    component.componentRef.setInput('view', 'overall');
    component.detectChanges();
    const labels = [
      ...(component.nativeElement as HTMLElement).querySelectorAll('.presets button'),
    ];
    expect(labels.map((b) => b.textContent?.trim())).toEqual(['Next 1']);
  });
});
