import {
  dateAfter,
  scheduleDays,
  serviceDate,
  slotInstant,
  slotLabel,
  SLOT_HOURS,
} from './scheduler-time';

describe('South African scheduler times', () => {
  it('offers seven days from today in Johannesburg, even when UTC is the previous day', () => {
    const days = scheduleDays(new Date('2026-11-01T22:30:00Z'));
    expect(days).toHaveLength(7);
    expect(days[0].key).toBe('2026-11-02');
    expect(days[0].label).toBe('Today');
    expect(days[1].label).toBe('This Tuesday');
    expect(days[6].key).toBe('2026-11-08');
  });

  it('ends at 02:00 the following calendar day', () => {
    expect(SLOT_HOURS).toHaveLength(21);
    expect(slotInstant('2026-11-02', 5)).toBe('2026-11-02T03:00:00.000Z');
    expect(slotInstant('2026-11-02', 24)).toBe('2026-11-02T22:00:00.000Z');
    expect(slotInstant('2026-11-02', 25)).toBe('2026-11-02T23:00:00.000Z');
    expect(slotLabel(25)).toBe('01:00 – 02:00');
  });

  it('handles month and year boundaries', () => {
    expect(dateAfter('2026-12-31', 1)).toBe('2027-01-01');
    expect(serviceDate(new Date('2026-12-31T22:01:00Z'))).toBe('2027-01-01');
  });
});
