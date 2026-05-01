// Generate an .ics file from event data and trigger download
interface IcsEvent {
  id: string;
  title: string;
  description?: string | null;
  location_name: string;
  event_date: string; // ISO
  end_time?: string | null;
}

function pad(n: number) {
  return n < 10 ? `0${n}` : `${n}`;
}

function toIcsDate(iso: string): string {
  const d = new Date(iso);
  return (
    d.getUTCFullYear().toString() +
    pad(d.getUTCMonth() + 1) +
    pad(d.getUTCDate()) +
    'T' +
    pad(d.getUTCHours()) +
    pad(d.getUTCMinutes()) +
    pad(d.getUTCSeconds()) +
    'Z'
  );
}

function escapeIcs(text: string): string {
  return text.replace(/\\/g, '\\\\').replace(/\n/g, '\\n').replace(/,/g, '\\,').replace(/;/g, '\\;');
}

export function downloadEventIcs(event: IcsEvent) {
  const start = toIcsDate(event.event_date);
  const end = toIcsDate(event.end_time || new Date(new Date(event.event_date).getTime() + 2 * 60 * 60 * 1000).toISOString());
  const now = toIcsDate(new Date().toISOString());

  const ics = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//EVENDLE//EN',
    'CALSCALE:GREGORIAN',
    'BEGIN:VEVENT',
    `UID:${event.id}@evendle.app`,
    `DTSTAMP:${now}`,
    `DTSTART:${start}`,
    `DTEND:${end}`,
    `SUMMARY:${escapeIcs(event.title)}`,
    `LOCATION:${escapeIcs(event.location_name)}`,
    `DESCRIPTION:${escapeIcs(event.description || '')}`,
    'END:VEVENT',
    'END:VCALENDAR',
  ].join('\r\n');

  const blob = new Blob([ics], { type: 'text/calendar;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${event.title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.ics`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function formatCountdown(eventDateIso: string, endTimeIso?: string | null): string {
  const now = new Date();
  const start = new Date(eventDateIso);
  const end = endTimeIso ? new Date(endTimeIso) : new Date(start.getTime() + 2 * 60 * 60 * 1000);

  if (now > end) return 'Beendet';
  if (now >= start && now <= end) return 'Läuft jetzt';

  const diffMs = start.getTime() - now.getTime();
  const diffMin = Math.round(diffMs / 60000);
  const diffH = Math.round(diffMs / 3600000);
  const diffD = Math.round(diffMs / 86400000);

  const timeStr = start.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' });

  if (diffMin < 60) return `In ${diffMin} Min · ${timeStr}`;
  if (diffH < 24) {
    const isToday = start.toDateString() === now.toDateString();
    return isToday ? `Heute · ${timeStr} · in ${diffH} Std` : `In ${diffH} Std · ${timeStr}`;
  }
  if (diffD === 1) return `Morgen · ${timeStr}`;
  if (diffD <= 7) {
    const weekday = start.toLocaleDateString('de-DE', { weekday: 'short' });
    return `${weekday} · ${timeStr} · in ${diffD} Tagen`;
  }
  const dateStr = start.toLocaleDateString('de-DE', { day: '2-digit', month: 'short' });
  return `${dateStr} · ${timeStr}`;
}
