import { Component, computed, input } from '@angular/core';
import { FieldTree } from '@angular/forms/signals';

/** Shows a Signal Forms field's validation messages once the user has interacted with it. */
@Component({
  selector: 'app-field-errors',
  template: `
    <div aria-live="polite">
      @if (state().touched() && state().invalid()) {
        @for (error of state().errors(); track error.kind) {
          <p class="field__error" animate.enter="fade-enter">{{ error.message }}</p>
        }
      }
    </div>
  `,
})
export class FieldErrors<T> {
  readonly field = input.required<FieldTree<T>>();
  protected readonly state = computed(() => this.field()());
}
