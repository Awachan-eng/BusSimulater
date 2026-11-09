export const STEER = {
  maxDegrees: 360
};

export const DRIVE = {
  turnRate: 1.2,
  highSpeedLoss: 0.4,
  maxSpeed: 22,
  accel: 3.6,
  pedalRise: 2.2,
  pedalFall: 5,
  brake: 10
};

export const CITY = {
  spacing: 120,
  range: 2,
  roadWidth: 12,
  roadHalfLength: 450
};

export const SIGNAL = {
  green: 10,
  yellow: 3,
  period: 30
};

export function signalState(time, offset, axis) {
  const period = SIGNAL.period;
  const t = (((time + offset) % period) + period) % period;
  const start = axis === "z" ? 0 : period / 2;
  const local = (((t - start) % period) + period) % period;
  if (local < SIGNAL.green) return "green";
  if (local < SIGNAL.green + SIGNAL.yellow) return "yellow";
  return "red";
}
