export function formatDuration(totalSeconds: number): string {
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = Math.floor(totalSeconds % 60);
  const pad = (n: number) => n.toString().padStart(2, '0');
  if (hours > 0) return `${hours}:${pad(minutes)}:${pad(seconds)}`;
  return `${pad(minutes)}:${pad(seconds)}`;
}

export function formatPace(secPerKm: number | undefined): string {
  if (!secPerKm || !Number.isFinite(secPerKm)) return '—';
  const minutes = Math.floor(secPerKm / 60);
  const seconds = Math.round(secPerKm % 60);
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

export function formatDistanceKm(meters: number | undefined): string {
  if (!meters) return '—';
  return (meters / 1000).toFixed(2);
}

export function formatSessionDate(timestampMs: number): string {
  const date = new Date(timestampMs);
  return date.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' });
}

export function formatSessionDateTime(timestampMs: number): string {
  const date = new Date(timestampMs);
  const datePart = date.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' });
  const timePart = date.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
  return `${datePart}, ${timePart}`;
}

export function formatMonthYear(timestampMs: number): string {
  const date = new Date(timestampMs);
  const label = date.toLocaleDateString('ru-RU', { month: 'long', year: 'numeric' });
  return label.charAt(0).toUpperCase() + label.slice(1);
}
