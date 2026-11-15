export const SCHEDULE_TIME_ZONE = 'Africa/Johannesburg';
export const SLOT_HOURS = Array.from({ length: 21 }, (_, index) => index + 5);

export function serviceDate(now = new Date()): string {
  const parts = new Intl.DateTimeFormat('en-ZA', {
    timeZone: SCHEDULE_TIME_ZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(now);
  const part = (name: string) => parts.find((item) => item.type === name)!.value;
  return `${part('year')}-${part('month')}-${part('day')}`;
}

export function dateAfter(date: string, offset: number): string {
  const value = new Date(`${date}T12:00:00Z`);
  value.setUTCDate(value.getUTCDate() + offset);
  return value.toISOString().slice(0, 10);
}

export function slotInstant(date: string, hour: number): string {
  const value = new Date(`${date}T00:00:00+02:00`);
  value.setTime(value.getTime() + hour * 60 * 60 * 1000);
  return value.toISOString();
}

export function hourLabel(hour: number): string {
  return `${String(hour % 24).padStart(2, '0')}:00`;
}

export function slotLabel(hour: number): string {
  return `${hourLabel(hour)} – ${hourLabel(hour + 1)}`;
}

export function scheduleDays(now = new Date()) {
  const today = serviceDate(now);
  return Array.from({ length: 7 }, (_, index) => {
    const key = dateAfter(today, index);
    const date = new Date(`${key}T12:00:00+02:00`);
    return {
      key,
      label:
        index === 0
          ? 'Today'
          : `This ${new Intl.DateTimeFormat('en-ZA', {
              timeZone: SCHEDULE_TIME_ZONE,
              weekday: 'long',
            }).format(date)}`,
      short: new Intl.DateTimeFormat('en-ZA', {
        timeZone: SCHEDULE_TIME_ZONE,
        day: 'numeric',
        month: 'short',
      }).format(date),
      full: new Intl.DateTimeFormat('en-ZA', {
        timeZone: SCHEDULE_TIME_ZONE,
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      }).format(date),
    };
  });
}
