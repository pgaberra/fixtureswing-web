import { Component, computed, input, output } from '@angular/core';
import { IconComponent } from '../icon/icon';
import { FAILURE_ON_OUR_SIDE_MESSAGE, isFailureOnOurSide } from '../http-error';

/** The one way a page says its data didn't load, with a way to try again. */
@Component({
  selector: 'app-error-state',
  imports: [IconComponent],
  templateUrl: './error-state.html',
  styleUrl: './error-state.css',
})
export class ErrorStateComponent {
  readonly title = input('Something went wrong');
  readonly message = input('Check your connection and try again.');
  /** The failure itself. One on our side replaces a message that blames the reader's connection. */
  readonly error = input<unknown>();
  readonly retryable = input(true);
  readonly retry = output();

  protected readonly shownMessage = computed(() =>
    isFailureOnOurSide(this.error()) ? FAILURE_ON_OUR_SIDE_MESSAGE : this.message(),
  );
}
