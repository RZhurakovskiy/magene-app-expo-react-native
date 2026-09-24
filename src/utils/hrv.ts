const MIN_RR_MS = 300;
const MAX_RR_MS = 2000;

// A beat-to-beat change bigger than this share of the previous interval is
// almost always a missed/extra beat or a contact artifact rather than real
// variability (Malik's 20% rule). Such pairs are skipped so one bad beat can't
// blow a whole minute's RMSSD up into a fake spike.
const MAX_RELATIVE_CHANGE = 0.2;

// RMSSD — root mean square of successive RR-interval differences, in ms.
// Standard short-term HRV metric. Needs at least one usable pair of intervals.
export function rmssd(rrIntervals: number[]): number | null {
  const clean = rrIntervals.filter((rr) => rr >= MIN_RR_MS && rr <= MAX_RR_MS);
  if (clean.length < 2) return null;

  let sumSq = 0;
  let pairs = 0;
  for (let i = 1; i < clean.length; i++) {
    const diff = clean[i] - clean[i - 1];
    if (Math.abs(diff) > clean[i - 1] * MAX_RELATIVE_CHANGE) continue;
    sumSq += diff * diff;
    pairs += 1;
  }
  if (pairs === 0) return null;
  return Math.round(Math.sqrt(sumSq / pairs));
}
