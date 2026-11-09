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

export const STOP = {
  reward: 200,
  dwell: 0.6,
  interval: 0.7,
  cooldown: 45,
  maxWaiting: 4
};

export const STOPS = [
  { name: "市役所前", dir: "n", road: 0, at: 60 },
  { name: "公園前", dir: "e", road: 0, at: 60 },
  { name: "駅前", dir: "n", road: 120, at: -60 },
  { name: "学校前", dir: "w", road: -120, at: -60 },
  { name: "病院前", dir: "s", road: -120, at: 60 },
  { name: "商店街", dir: "e", road: 120, at: -180 },
  { name: "図書館前", dir: "s", road: -240, at: -180 },
  { name: "港前", dir: "e", road: 240, at: 180 }
];

export const START = {
  x: -3,
  z: 180,
  heading: 0
};

export const MULTIPLIER = {
  perMeter: 1 / 600,
  max: 4
};

export const COURSES = [
  { name: "短距離コース", stops: [0, 1, 2] },
  { name: "中距離コース", stops: [0, 1, 2, 3, 4] },
  { name: "長距離コース", stops: [0, 4, 5, 6, 3, 1, 2, 7] }
];

export function routeMultiplier(length) {
  const value = 1 + length * MULTIPLIER.perMeter;
  return Math.min(MULTIPLIER.max, Math.round(value * 10) / 10);
}

export function signalState(time, offset, axis) {
  const period = SIGNAL.period;
  const t = (((time + offset) % period) + period) % period;
  const start = axis === "z" ? 0 : period / 2;
  const local = (((t - start) % period) + period) % period;
  if (local < SIGNAL.green) return "green";
  if (local < SIGNAL.green + SIGNAL.yellow) return "yellow";
  return "red";
}
