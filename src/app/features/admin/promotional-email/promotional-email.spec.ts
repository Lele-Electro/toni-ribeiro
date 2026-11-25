import { HttpErrorResponse } from '@angular/common/http';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { AdminService } from '../../../core/admin/admin.service';
import { PromotionalEmail } from './promotional-email';
import { isEmail, parseRecipients } from './promotional-rules';

describe('PromotionalEmail', () => {
  let fixture: ComponentFixture<PromotionalEmail>;
  let element: HTMLElement;
  const api = { previewPromotionalEmail: vi.fn(), sendPromotionalEmail: vi.fn() };
  const settle = async () => {
    for (let i = 0; i < 3; i++) await fixture.whenStable();
  };
  const type = (selector: string, value: string) => {
    const input = element.querySelector<HTMLInputElement | HTMLTextAreaElement>(selector)!;
    input.value = value;
    input.dispatchEvent(new Event('input'));
  };
  const button = (label: string) =>
    [...element.querySelectorAll<HTMLButtonElement>('button')].find(
      (item) => item.textContent?.trim() === label,
    )!;
  const fill = async () => {
    type('#promo-recipients', 'ann@example.com, Bob@example.com\nann@EXAMPLE.com');
    type('#promo-name', 'Maboneng Rooftop');
    type('#promo-message', 'We met at the market.\n\nI’d love to drive your guests.');
    await settle();
  };
  const sendPayload = () => api.sendPromotionalEmail.mock.calls.at(-1)![0];

  beforeEach(async () => {
    api.previewPromotionalEmail.mockReset().mockResolvedValue({
      subject: 'A personal invitation to my Private Lift Club',
      html: '<html><body><h2>Hi Maboneng Rooftop,</h2></body></html>',
    });
    api.sendPromotionalEmail.mockReset().mockResolvedValue({
      duplicate: false,
      results: [
        { email: 'ann@example.com', status: 'sent' },
        {
          email: 'Bob@example.com',
          status: 'failed',
          message: 'The mail server rejected this address (550).',
        },
      ],
    });
    TestBed.configureTestingModule({
      imports: [PromotionalEmail],
      providers: [{ provide: AdminService, useValue: api }],
    });
    fixture = TestBed.createComponent(PromotionalEmail);
    element = fixture.nativeElement;
    await settle();
  });

  afterEach(() => fixture.destroy());

  it('counts recipients, drops duplicates and points out invalid addresses', async () => {
    type('#promo-recipients', 'ann@example.com; ANN@example.com bad-address\nbob@example.co.za');
    await settle();
    const summary = element.querySelector('#promo-recipients-summary')!.textContent!;
    expect(summary).toContain('2 recipients');
    expect(summary).toContain('1 duplicate removed');
    expect(summary).toContain('1 not valid');
    type('#promo-name', 'Ann');
    type('#promo-message', 'Hello');
    button('Send…').click();
    await settle();
    expect(element.querySelector('#promo-recipients-error')!.textContent).toContain('bad-address');
    expect(element.querySelector('#promo-recipients')!.getAttribute('aria-invalid')).toBe('true');
    expect(api.sendPromotionalEmail).not.toHaveBeenCalled();
  });

  it('requires a name and an introduction', async () => {
    type('#promo-recipients', 'ann@example.com');
    button('Send…').click();
    await settle();
    expect(element.querySelector('#promo-name-error')!.textContent).toContain('person or business');
    expect(element.querySelector('#promo-message-error')!.textContent).toContain(
      'introductory message',
    );
    button('Preview').click();
    await settle();
    expect(api.previewPromotionalEmail).not.toHaveBeenCalled();
  });

  it('previews the email the API renders, and says when the preview is out of date', async () => {
    await fill();
    expect(element.querySelector('#promo-name-hint')!.textContent).toContain(
      'Hi Maboneng Rooftop,',
    );
    button('Preview').click();
    await settle();
    expect(api.previewPromotionalEmail).toHaveBeenCalledWith(
      'Maboneng Rooftop',
      'We met at the market.\n\nI’d love to drive your guests.',
    );
    const frame = element.querySelector<HTMLIFrameElement>('iframe')!;
    expect(frame.getAttribute('srcdoc')).toContain('Hi Maboneng Rooftop,');
    expect(frame.getAttribute('sandbox')).not.toContain('allow-scripts');
    expect(element.textContent).toContain('A personal invitation to my Private Lift Club');
    expect(element.querySelector('.promo__stale')).toBeNull();
    type('#promo-name', 'Someone else');
    await settle();
    expect(element.querySelector('.promo__stale')!.textContent).toContain('changed');
    button('Phone').click();
    await settle();
    expect(frame.classList.contains('promo__frame--phone')).toBe(true);
  });

  it('sends after confirmation, once, and reports each recipient', async () => {
    await fill();
    button('Send…').click();
    await settle();
    expect(api.sendPromotionalEmail).not.toHaveBeenCalled();
    expect(element.querySelector('.promo__question')!.textContent).toContain(
      'Send 2 separate emails',
    );
    expect(document.activeElement).toBe(button('Yes, send now'));

    let finish!: () => void;
    api.sendPromotionalEmail.mockImplementationOnce(
      () =>
        new Promise((done) => {
          finish = () =>
            done({
              duplicate: false,
              results: [
                { email: 'ann@example.com', status: 'sent' },
                { email: 'Bob@example.com', status: 'failed', message: 'Rejected (550).' },
              ],
            });
        }),
    );
    const confirm = button('Yes, send now');
    confirm.click();
    confirm.click();
    await settle();
    expect(api.sendPromotionalEmail).toHaveBeenCalledOnce();
    expect(button('Sending…').disabled).toBe(true);
    expect(element.querySelector<HTMLTextAreaElement>('#promo-message')!.disabled).toBe(true);
    finish();
    await settle();

    expect(sendPayload()).toEqual({
      sendId: expect.any(String),
      recipients: ['ann@example.com', 'Bob@example.com'],
      name: 'Maboneng Rooftop',
      message: 'We met at the market.\n\nI’d love to drive your guests.',
    });
    expect(element.querySelector('.promo__results h3')!.textContent).toContain('Sent 1 of 2');
    const rows = [...element.querySelectorAll('.promo__results li')];
    expect(rows[0].textContent).toContain('Sent');
    expect(rows[1].classList.contains('is-failed')).toBe(true);
    expect(rows[1].textContent).toContain('Rejected (550).');
  });

  it('never gives a repeated send a new identity, and retries failures as a new send', async () => {
    await fill();
    button('Send…').click();
    await settle();
    button('Yes, send now').click();
    await settle();
    const first = sendPayload().sendId;

    // Pressing Send again with nothing changed is the same send: the API reports it.
    api.sendPromotionalEmail.mockResolvedValueOnce({
      duplicate: true,
      results: [{ email: 'ann@example.com', status: 'sent' }],
    });
    button('Send…').click();
    await settle();
    button('Yes, send now').click();
    await settle();
    expect(sendPayload().sendId).toBe(first);
    expect(element.querySelector('.promo__results h3')!.textContent).toContain(
      'nobody was emailed again',
    );

    // A failure from the server keeps the identity too, so trying again can't double-send.
    api.sendPromotionalEmail.mockRejectedValueOnce(new HttpErrorResponse({ status: 0 }));
    button('Send…').click();
    await settle();
    button('Yes, send now').click();
    await settle();
    expect(sendPayload().sendId).toBe(first);
    expect(element.querySelector('[role="alert"]')!.textContent).toContain('couldn');
  });

  it('puts failed addresses back for a retry under a new identity', async () => {
    await fill();
    button('Send…').click();
    await settle();
    button('Yes, send now').click();
    await settle();
    const first = sendPayload().sendId;
    button('Retry the 1 that failed').click();
    await settle();
    expect(element.querySelector<HTMLTextAreaElement>('#promo-recipients')!.value).toBe(
      'Bob@example.com',
    );
    button('Yes, send now').click();
    await settle();
    expect(sendPayload().recipients).toEqual(['Bob@example.com']);
    expect(sendPayload().sendId).not.toBe(first);
  });
});

describe('promotional rules', () => {
  it('parses addresses like the API', () => {
    expect(parseRecipients('a@example.com,A@EXAMPLE.COM  b@example.co.za;bad')).toEqual({
      recipients: ['a@example.com', 'b@example.co.za'],
      invalid: ['bad'],
      duplicates: 1,
    });
    expect(isEmail("o'brien@example.ie")).toBe(true);
    for (const bad of ['a@b', 'a@@b.com', '.a@b.com', 'Toni <t@example.com>'])
      expect(isEmail(bad)).toBe(false);
  });
});
