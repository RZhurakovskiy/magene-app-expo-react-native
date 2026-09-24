import type { SensorContact } from './hrParser';

// Decides whether the strap is actually reading a heart, sample by sample.
//
// A chest strap that loses skin contact does not necessarily stop notifying:
// it can keep repeating its last BPM (seen on the Magene H64 for about a
// minute) until it powers down. Those packets look like live data, so they
// have to be recognised and kept out of the stats.

export type ContactLossReason = 'no-signal' | 'sensor-flag' | 'no-rr' | 'flatline';

export interface ContactVerdict {
  hasContact: boolean;
  reason: ContactLossReason | null;
}

export interface ContactSample {
  bpm: number;
  rr: number[];
  contact: SensorContact;
}

export interface ContactDetectorOptions {
  // Readings below this are "no signal" (straps send 0 when they read nothing).
  minValidBpm: number;
  // Sensor known to send RR-intervals: no new beat for this long means no contact.
  noRrTimeoutMs: number;
  // Sensor without RR and without contact reporting: an unchanged BPM for this
  // long is treated as a frozen reading.
  flatlineTimeoutMs: number;
  // Notifications with new RR-intervals needed before the sensor counts as RR-capable.
  rrCapableAfter: number;
}

export const DEFAULT_CONTACT_OPTIONS: ContactDetectorOptions = {
  minValidBpm: 20,
  noRrTimeoutMs: 5000,
  flatlineTimeoutMs: 30000,
  rrCapableAfter: 3,
};

export interface ContactDetector {
  push(sample: ContactSample, now: number): ContactVerdict;
  // A new connection to the same sensor: keep what was learned about it
  // (sends RR, reports contact) but restart the timers.
  onConnected(now: number): void;
}

const CONTACT_OK: ContactVerdict = { hasContact: true, reason: null };

function lost(reason: ContactLossReason): ContactVerdict {
  return { hasContact: false, reason };
}

function sameIntervals(a: number[], b: number[]): boolean {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) {
    if (a[i] !== b[i]) return false;
  }
  return true;
}

export function createContactDetector(options: Partial<ContactDetectorOptions> = {}): ContactDetector {
  const opts: ContactDetectorOptions = { ...DEFAULT_CONTACT_OPTIONS, ...options };

  let freshRrNotifications = 0;
  let reportedContact = false;
  let lastFreshRrAt = 0;
  let previousRr: number[] = [];
  let lastBpm: number | null = null;
  let bpmChangedAt = 0;

  return {
    onConnected(now) {
      lastFreshRrAt = now;
      previousRr = [];
      lastBpm = null;
      bpmChangedAt = now;
    },

    push(sample, now) {
      if (sample.contact === 'detected') reportedContact = true;

      // A packet that only repeats the previous RR list carries no new beat.
      const freshRr = sample.rr.length > 0 && !sameIntervals(sample.rr, previousRr);
      if (sample.rr.length > 0) previousRr = sample.rr;
      if (freshRr) {
        freshRrNotifications += 1;
        lastFreshRrAt = now;
      }

      if (sample.bpm !== lastBpm) {
        lastBpm = sample.bpm;
        bpmChangedAt = now;
      }

      const sendsRr = freshRrNotifications >= opts.rrCapableAfter;

      if (sample.bpm < opts.minValidBpm) return lost('no-signal');
      // Only trust "lost" from a strap that has shown it reports contact at all.
      if (sample.contact === 'lost' && reportedContact) return lost('sensor-flag');
      if (sendsRr && now - lastFreshRrAt > opts.noRrTimeoutMs) return lost('no-rr');
      if (!sendsRr && sample.contact !== 'detected' && now - bpmChangedAt > opts.flatlineTimeoutMs) {
        return lost('flatline');
      }
      return CONTACT_OK;
    },
  };
}
