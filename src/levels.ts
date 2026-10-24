export const FLOOR_DB = -80;
export const CLIP_DB = -0.5;
export const HOT_DB = -3;
export const WARM_DB = -12;

// Peak hold: the marker stays put for HOLD_SAMPLES (~1.5s at 100ms), then falls.
const HOLD_SAMPLES = 15;
const FALL_DB_PER_SAMPLE = 0.5;

export type TagStats = {
  max: number;
  avg: number;
  current: number;
  hold: number;
  holdAge: number;
  clipped: boolean;
  samples: number;
};

export const emptyStats = (): TagStats => ({
  max: FLOOR_DB,
  avg: FLOOR_DB,
  current: FLOOR_DB,
  hold: FLOOR_DB,
  holdAge: 0,
  clipped: false,
  samples: 0,
});

const toPower = (db: number) => Math.pow(10, db / 10);

// The average is taken over power (energy) and converted back to dB, so loud
// moments are weighted correctly rather than averaging logarithmic values.
export function addSample(stats: TagStats, db: number): TagStats {
  const clamped = Math.max(FLOOR_DB, Math.min(0, db));
  const samples = stats.samples + 1;
  const meanPower = (toPower(stats.avg) * stats.samples + toPower(clamped)) / samples;

  let { hold, holdAge } = stats;
  if (stats.samples === 0 || clamped >= hold) {
    hold = clamped;
    holdAge = 0;
  } else {
    holdAge += 1;
    if (holdAge > HOLD_SAMPLES) hold = Math.max(clamped, hold - FALL_DB_PER_SAMPLE);
  }

  return {
    max: stats.samples === 0 ? clamped : Math.max(stats.max, clamped),
    avg: Math.max(FLOOR_DB, 10 * Math.log10(meanPower)),
    current: clamped,
    hold,
    holdAge,
    clipped: stats.clipped || clamped >= CLIP_DB,
    samples,
  };
}

export type Zone = 'safe' | 'warm' | 'hot';

export const zoneOf = (db: number): Zone => (db >= HOT_DB ? 'hot' : db >= WARM_DB ? 'warm' : 'safe');

// 0..1 position of a dB value on the meter bar.
export const dbToFraction = (db: number) => (db - FLOOR_DB) / -FLOOR_DB;

export const formatDb = (db: number, samples = 1) =>
  samples === 0 ? '—' : `${db.toFixed(1)} dB`;
