export const FLOOR_DB = -80;

export type TagStats = {
  max: number;
  avg: number;
  current: number;
  samples: number;
};

export const emptyStats = (): TagStats => ({
  max: FLOOR_DB,
  avg: FLOOR_DB,
  current: FLOOR_DB,
  samples: 0,
});

const toPower = (db: number) => Math.pow(10, db / 10);

// The average is taken over power (energy) and converted back to dB, so loud
// moments are weighted correctly rather than averaging logarithmic values.
export function addSample(stats: TagStats, db: number): TagStats {
  const clamped = Math.max(FLOOR_DB, Math.min(0, db));
  const samples = stats.samples + 1;
  const meanPower = (toPower(stats.avg) * stats.samples + toPower(clamped)) / samples;
  return {
    max: stats.samples === 0 ? clamped : Math.max(stats.max, clamped),
    avg: Math.max(FLOOR_DB, 10 * Math.log10(meanPower)),
    current: clamped,
    samples,
  };
}

// 0..1 position of a dB value on the meter bar.
export const dbToFraction = (db: number) => (db - FLOOR_DB) / -FLOOR_DB;

export const formatDb = (db: number, samples = 1) =>
  samples === 0 ? '—' : `${db.toFixed(1)} dB`;
