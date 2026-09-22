import { parseHeartRateMeasurement } from '../ble/hrParser';

function b64(bytes: number[]): string {
  return Buffer.from(bytes).toString('base64');
}

describe('parseHeartRateMeasurement', () => {
  it('reads a uint8 BPM with no RR', () => {
    const result = parseHeartRateMeasurement(b64([0x00, 70]));
    expect(result.bpm).toBe(70);
    expect(result.rr).toEqual([]);
  });

  it('reads a uint16 BPM (flag bit 0 set)', () => {
    // 300 bpm = 0x012C, little-endian => 0x2C, 0x01
    const result = parseHeartRateMeasurement(b64([0x01, 0x2c, 0x01]));
    expect(result.bpm).toBe(300);
    expect(result.rr).toEqual([]);
  });

  it('parses RR-intervals and converts 1/1024 s to ms', () => {
    // flags 0x10 (RR present), bpm 60, RR raw 1024 (=1000ms) and 512 (=500ms)
    const result = parseHeartRateMeasurement(b64([0x10, 60, 0x00, 0x04, 0x00, 0x02]));
    expect(result.bpm).toBe(60);
    expect(result.rr).toEqual([1000, 500]);
  });

  it('skips the Energy Expended field before RR (flag bit 3)', () => {
    // flags 0x18 (RR + energy), bpm 60, energy 2 bytes, RR raw 1024 => 1000ms
    const result = parseHeartRateMeasurement(b64([0x18, 60, 0xff, 0x00, 0x00, 0x04]));
    expect(result.bpm).toBe(60);
    expect(result.rr).toEqual([1000]);
  });

  it('handles uint16 BPM together with RR', () => {
    // flags 0x11, bpm 200 (0x00C8 => 0xC8,0x00), RR raw 1024 => 1000ms
    const result = parseHeartRateMeasurement(b64([0x11, 0xc8, 0x00, 0x00, 0x04]));
    expect(result.bpm).toBe(200);
    expect(result.rr).toEqual([1000]);
  });
});
