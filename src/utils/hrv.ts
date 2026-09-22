// RMSSD — root mean square of successive RR-interval differences, in ms.
// Standard short-term HRV metric. Needs at least two consecutive RR intervals.
export function rmssd(rrIntervals: number[]): number | null {
  const clean = rrIntervals.filter((rr) => rr >= 300 && rr <= 2000);
  if (clean.length < 2) return null;

  let sumSq = 0;
  for (let i = 1; i < clean.length; i++) {
    const diff = clean[i] - clean[i - 1];
    sumSq += diff * diff;
  }
  return Math.round(Math.sqrt(sumSq / (clean.length - 1)));
}
