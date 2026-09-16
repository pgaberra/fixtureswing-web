import { Component, computed, input } from '@angular/core';
import { NgIcon } from '@ng-icons/core';
import { lucideInfo, lucideRefreshCw, lucideTriangleAlert } from '@ng-icons/lucide';

/**
 * Every icon the app shows, under the name the app gives it (what it is for), mapped to the Lucide
 * drawing (what it looks like), so a call site never changes when a drawing does. Adding one is an
 * import and a line; only imported icons reach the bundle. Never draw an icon inline.
 */
const ICONS = {
  'alert-triangle': lucideTriangleAlert,
  info: lucideInfo,
  refresh: lucideRefreshCw,
} satisfies Record<string, string>;

export type IconName = keyof typeof ICONS;

/** 14 inline with text, 16 on buttons, 20 standalone, 48 for an empty or error state. */
export type IconSize = 14 | 16 | 20 | 48;

/** Colour comes from the surrounding text; the accessible name belongs on the control around it. */
@Component({
  selector: 'app-icon',
  imports: [NgIcon],
  template: '<ng-icon [svg]="svg()" [size]="cssSize()" aria-hidden="true" />',
  styleUrl: './icon.css',
})
export class IconComponent {
  readonly name = input.required<IconName>();
  readonly size = input<IconSize>(16);

  protected readonly svg = computed(() => ICONS[this.name()]);
  protected readonly cssSize = computed(() => `${this.size()}px`);
}
