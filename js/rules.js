import { CITY, signalState } from "./data.js";

const HALF = CITY.roadWidth / 2;
const OUTER = 24;
const FRONT = 4.5;
const TURN_ANGLE = 0.7;

function normalizeAngle(angle) {
  let a = angle;
  while (a > Math.PI) a -= Math.PI * 2;
  while (a < -Math.PI) a += Math.PI * 2;
  return a;
}

export function createRules(world, bus, controls, onEvent) {
  let session = null;
  let hasPrev = false;
  let prevFx = 0;
  let prevFz = 0;
  let runCoins = 0;

  function award(amount, text) {
    runCoins += amount;
    onEvent({ amount: amount, text: text, total: runCoins });
  }

  function nearestIntersection() {
    let best = null;
    let bestDist = Infinity;
    world.intersections.forEach((inter) => {
      const dx = bus.position.x - inter.x;
      const dz = bus.position.z - inter.z;
      const dist = dx * dx + dz * dz;
      if (dist < bestDist) {
        bestDist = dist;
        best = inter;
      }
    });
    return best;
  }

  function startSession(inter, prevX, prevZ, time, heading) {
    const axis = Math.abs(prevZ) > Math.abs(prevX) ? "z" : "x";
    const state = signalState(time, inter.offset, axis);

    session = {
      inter: inter,
      heading: heading,
      blinker: controls.input.blinker
    };

    if (state === "green") {
      award(100, "青信号で通過");
    } else if (state === "red") {
      award(-50, "赤信号を無視");
    } else {
      onEvent({ amount: 0, text: "黄信号で通過", total: runCoins });
    }
  }

  function finishSession() {
    const delta = normalizeAngle(bus.rotation.y - session.heading);

    if (Math.abs(delta) > TURN_ANGLE) {
      const direction = delta > 0 ? "left" : "right";
      if (session.blinker === direction) {
        award(100, "方向指示OK");
      } else if (session.blinker) {
        award(-50, "ウインカーの向きが違う");
      } else {
        award(-50, "ウインカーなしで曲がった");
      }
    }

    controls.clearBlinker();
    session = null;
  }

  function update(time) {
    const heading = bus.rotation.y;
    const fx = bus.position.x - Math.sin(heading) * FRONT;
    const fz = bus.position.z - Math.cos(heading) * FRONT;

    if (session) {
      const dx = Math.abs(bus.position.x - session.inter.x);
      const dz = Math.abs(bus.position.z - session.inter.z);
      if (dx >= OUTER || dz >= OUTER) {
        finishSession();
      }
    } else if (hasPrev) {
      const inter = nearestIntersection();
      const prevX = prevFx - inter.x;
      const prevZ = prevFz - inter.z;
      const nowX = fx - inter.x;
      const nowZ = fz - inter.z;
      const insideNow = Math.abs(nowX) < HALF && Math.abs(nowZ) < HALF;
      const insidePrev = Math.abs(prevX) < HALF && Math.abs(prevZ) < HALF;
      if (insideNow && !insidePrev) {
        startSession(inter, prevX, prevZ, time, heading);
      }
    }

    prevFx = fx;
    prevFz = fz;
    hasPrev = true;
  }

  function reset() {
    session = null;
    hasPrev = false;
    runCoins = 0;
  }

  function getRunCoins() {
    return runCoins;
  }

  return { update: update, reset: reset, getRunCoins: getRunCoins };
}
