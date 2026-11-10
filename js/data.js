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

export const BUS_TYPES = {
  gas: { label: "ガソリンバス" },
  hybrid: { label: "ハイブリッドバス" },
  tour: { label: "観光バス" }
};

export const BUSES = [
  { id: "gas1", type: "gas", name: "ベーシック", price: 0, color: 0xf2c94c, accent: 0xffffff, maxSpeed: 22, accel: 1.0, brake: 1.0, turn: 1.0 },
  { id: "gas2", type: "gas", name: "スタンダード", price: 15000, color: 0xf2994a, accent: 0xffffff, maxSpeed: 24, accel: 1.1, brake: 1.05, turn: 1.0 },
  { id: "gas3", type: "gas", name: "ハイパワー", price: 40000, color: 0xeb5757, accent: 0x222222, maxSpeed: 26, accel: 1.25, brake: 1.1, turn: 0.95 },
  { id: "hybrid1", type: "hybrid", name: "エコ", price: 30000, color: 0x27ae60, accent: 0xffffff, maxSpeed: 22, accel: 1.0, brake: 1.15, turn: 1.1 },
  { id: "hybrid2", type: "hybrid", name: "エコプラス", price: 60000, color: 0x6fcf97, accent: 0xffffff, maxSpeed: 24, accel: 1.1, brake: 1.2, turn: 1.15 },
  { id: "hybrid3", type: "hybrid", name: "エコプレミアム", price: 110000, color: 0x2d9cdb, accent: 0xffffff, maxSpeed: 26, accel: 1.2, brake: 1.3, turn: 1.2 },
  { id: "tour1", type: "tour", name: "クラシック", price: 50000, color: 0xf5f5f5, accent: 0x1565c0, maxSpeed: 24, accel: 0.85, brake: 0.9, turn: 0.85 },
  { id: "tour2", type: "tour", name: "ゴールド", price: 100000, color: 0xe0b84c, accent: 0x6d4c00, maxSpeed: 28, accel: 0.95, brake: 0.95, turn: 0.9 },
  { id: "tour3", type: "tour", name: "プレミアム", price: 200000, color: 0x9b51e0, accent: 0xffd54f, maxSpeed: 30, accel: 1.05, brake: 1.0, turn: 0.95 }
];

export function findBus(id) {
  return BUSES.find((item) => item.id === id) || BUSES[0];
}

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
