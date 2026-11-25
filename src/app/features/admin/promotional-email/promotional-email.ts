import {
  Component,
  ElementRef,
  Injector,
  afterNextRender,
  computed,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { AdminService, PromotionalResult } from '../../../core/admin/admin.service';
import { httpErrorMessage } from '../../../core/http-error-message';
import {
  MAX_RECIPIENTS,
  MESSAGE_MAX,
  NAME_MAX,
  PromotionalErrors,
  messageErrors,
  newSendId,
  parseRecipients,
  recipientsError,
} from './promotional-rules';

/** The subject every recipient sees (the API sets it; shown here before a preview loads). */
export const PROMOTIONAL_SUBJECT = 'A personal invitation to my Private Lift Club';

/**
 * The admin page's Promotional Email section: "A personal invitation to my Private Lift
 * Club", opening with "Hi [name]," and the owner's own introduction. The preview is the
 * API's rendering of the email it sends. Each recipient gets a separate email, so nobody
 * sees anyone else's address. Sending needs a second click, and every press carries an
 * identifier the API remembers, so a repeated click or request can't email anyone twice.
 */
@Component({
  selector: 'app-promotional-email',
  templateUrl: './promotional-email.html',
  styleUrl: './promotional-email.scss',
})
export class PromotionalEmail {
  private readonly admin = inject(AdminService);
  private readonly sanitizer = inject(DomSanitizer);
  private readonly injector = inject(Injector);
  protected readonly limits = { recipients: MAX_RECIPIENTS, name: NAME_MAX, message: MESSAGE_MAX };
  protected readonly subject = PROMOTIONAL_SUBJECT;

  protected readonly recipientsText = signal('');
  protected readonly name = signal('');
  protected readonly message = signal('');
  protected readonly errors = signal<PromotionalErrors>({});
  /** A new one whenever what would be sent changes. */
  private readonly sendId = signal(newSendId());

  protected readonly parsed = computed(() => parseRecipients(this.recipientsText()));
  /** What the current form would send, to tell whether the preview is out of date. */
  private readonly contentKey = computed(() =>
    JSON.stringify([this.name().trim(), this.message().trim()]),
  );

  protected readonly preview = signal<{ subject: string; html: SafeHtml; key: string } | null>(
    null,
  );
  protected readonly previewing = signal(false);
  protected readonly previewError = signal<string | null>(null);
  protected readonly previewStale = computed(() => {
    const preview = this.preview();
    return !!preview && preview.key !== this.contentKey();
  });
  protected readonly previewWidth = signal<'desktop' | 'phone'>('desktop');

  /** "Send to N recipients?" is showing. */
  protected readonly confirming = signal(false);
  protected readonly sending = signal(false);
  protected readonly sendError = signal<string | null>(null);
  protected readonly results = signal<PromotionalResult[] | null>(null);
  /** The API had already sent this exact email and sent nothing new. */
  protected readonly duplicate = signal(false);
  protected readonly sentCount = computed(
    () => this.results()?.filter((result) => result.status === 'sent').length ?? 0,
  );
  protected readonly failed = computed(
    () => this.results()?.filter((result) => result.status === 'failed') ?? [],
  );

  private readonly confirmButton = viewChild<ElementRef<HTMLButtonElement>>('confirmButton');
  private readonly resultsHeading = viewChild<ElementRef<HTMLElement>>('resultsHeading');

  protected setRecipients(event: Event): void {
    this.recipientsText.set((event.target as HTMLTextAreaElement).value);
    this.changed('recipients');
  }

  protected setName(event: Event): void {
    this.name.set((event.target as HTMLInputElement).value);
    this.changed('name');
  }

  protected setMessage(event: Event): void {
    this.message.set((event.target as HTMLTextAreaElement).value);
    this.changed('message');
  }

  /** Any change makes a different email: it gets its own send, and confirmation starts over. */
  private changed(field: keyof PromotionalErrors): void {
    this.sendId.set(newSendId());
    this.confirming.set(false);
    if (this.errors()[field]) this.errors.update((errors) => ({ ...errors, [field]: undefined }));
  }

  protected async showPreview(): Promise<void> {
    const errors = messageErrors(this.name(), this.message());
    this.errors.update((current) => ({ ...current, name: errors.name, message: errors.message }));
    if (errors.name || errors.message || this.previewing()) return;
    this.previewing.set(true);
    this.previewError.set(null);
    const key = this.contentKey();
    try {
      const { subject, html } = await this.admin.previewPromotionalEmail(
        this.name().trim(),
        this.message(),
      );
      // The API escapes everything typed; the frame is sandboxed without scripts.
      this.preview.set({ subject, html: this.sanitizer.bypassSecurityTrustHtml(html), key });
    } catch (error) {
      this.previewError.set(httpErrorMessage(error, 'The preview could not be loaded.'));
    } finally {
      this.previewing.set(false);
    }
  }

  /** First click: check everything, then ask for confirmation. */
  protected requestSend(): void {
    if (this.sending()) return;
    const errors: PromotionalErrors = {
      recipients: recipientsError(this.parsed()),
      ...messageErrors(this.name(), this.message()),
    };
    this.errors.set(errors);
    this.sendError.set(null);
    if (errors.recipients || errors.name || errors.message) return;
    this.confirming.set(true);
    this.focusAfterRender(() => this.confirmButton()?.nativeElement);
  }

  /** Second click. Repeated clicks are ignored while a send is under way. */
  protected async send(): Promise<void> {
    if (this.sending() || !this.confirming()) return;
    this.sending.set(true);
    this.sendError.set(null);
    try {
      const response = await this.admin.sendPromotionalEmail({
        sendId: this.sendId(),
        recipients: this.parsed().recipients,
        name: this.name().trim(),
        message: this.message(),
      });
      this.results.set(response.results);
      this.duplicate.set(response.duplicate);
      this.confirming.set(false);
      this.focusAfterRender(() => this.resultsHeading()?.nativeElement);
    } catch (error) {
      // The sendId stays the same, so trying again can't email anyone a second time: if
      // the first attempt did go out, the API answers with its results instead.
      this.sendError.set(httpErrorMessage(error, 'The email could not be sent. Please try again.'));
      this.confirming.set(false);
    } finally {
      this.sending.set(false);
    }
  }

  /** Puts the addresses that failed back in the form, for another try. */
  protected retryFailed(): void {
    this.recipientsText.set(
      this.failed()
        .map((result) => result.email)
        .join('\n'),
    );
    this.changed('recipients');
    this.results.set(null);
    this.requestSend();
  }

  private focusAfterRender(target: () => HTMLElement | undefined): void {
    afterNextRender(() => target()?.focus(), { injector: this.injector });
  }

  protected startOver(): void {
    this.recipientsText.set('');
    this.name.set('');
    this.message.set('');
    this.errors.set({});
    this.preview.set(null);
    this.results.set(null);
    this.duplicate.set(false);
    this.sendError.set(null);
    this.confirming.set(false);
    this.sendId.set(newSendId());
  }
}
