// Sensor Contact bits of the Heart Rate Measurement flags (bits 1-2):
// 'detected' / 'lost' when the strap reports skin contact, 'unsupported' when it
// does not implement the feature (then contact has to be inferred from the data).
export type SensorContact = 'detected' | 'lost' | 'unsupported';

export interface HeartRateSample {
  bpm: number;
  rr: number[]; // RR-intervals in ms, empty if the sensor does not send them
  contact: SensorContact;
}

export function base64ToBytes(base64: string): Uint8Array {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
  const clean = base64.replace(/=+$/, '');
  const bytes: number[] = [];
  let buffer = 0;
  let bits = 0;
  for (const char of clean) {
    const value = chars.indexOf(char);
    if (value === -1) continue;
    buffer = (buffer << 6) | value;
    bits += 6;
    if (bits >= 8) {
      bits -= 8;
      bytes.push((buffer >> bits) & 0xff);
    }
  }
  return Uint8Array.from(bytes);
}

// Heart Rate Measurement (0x2A37): byte 0 = flags.
// bit 0: HR value format (0 = uint8, 1 = uint16)
// bit 1: Sensor Contact Status (1 = contact detected), meaningful only when bit 2 is set
// bit 2: Sensor Contact Support (1 = the sensor reports contact status)
// bit 3: Energy Expended present (uint16)
// bit 4: one or more RR-intervals present (uint16 each, units of 1/1024 s)
export function parseHeartRateMeasurement(base64Value: string): HeartRateSample {
  const bytes = base64ToBytes(base64Value);
  const flags = bytes[0];

  const contactSupported = (flags & 0x04) !== 0;
  const contactDetected = (flags & 0x02) !== 0;
  const contact: SensorContact = contactSupported ? (contactDetected ? 'detected' : 'lost') : 'unsupported';

  const minLength = (flags & 0x01) === 1 ? 3 : 2;
  if (bytes.length < minLength) {
    // Truncated packet: report "no reading" instead of an undefined BPM slipping through.
    return { bpm: 0, rr: [], contact };
  }

  let offset: number;
  let bpm: number;
  if ((flags & 0x01) === 1) {
    bpm = bytes[1] | (bytes[2] << 8);
    offset = 3;
  } else {
    bpm = bytes[1];
    offset = 2;
  }

  if ((flags & 0x08) !== 0) {
    offset += 2; // Energy Expended field present
  }

  const rr: number[] = [];
  if ((flags & 0x10) !== 0) {
    for (let i = offset; i + 1 < bytes.length; i += 2) {
      const raw = bytes[i] | (bytes[i + 1] << 8);
      rr.push(Math.round((raw / 1024) * 1000));
    }
  }

  return { bpm, rr, contact };
}
