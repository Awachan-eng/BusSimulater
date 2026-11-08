export function createControls() {
  const touch = { left: false, right: false, accel: false, brake: false };
  const key = { left: false, right: false, accel: false, brake: false };
  const input = { throttle: 0, brake: 0, steer: 0 };

  const keyMap = {
    ArrowLeft: "left",
    KeyA: "left",
    ArrowRight: "right",
    KeyD: "right",
    ArrowUp: "accel",
    KeyW: "accel",
    ArrowDown: "brake",
    KeyS: "brake",
    Space: "brake"
  };

  const maxAngle = (150 * Math.PI) / 180;
  const root = document.getElementById("screen-game");
  const wheelEl = document.getElementById("steer-wheel");

  let mode = "button";
  let dragging = false;
  let centerX = 0;
  let centerY = 0;
  let startPointer = 0;
  let startAngle = 0;

  function bindButton(id, name) {
    const el = document.getElementById(id);
    const release = () => {
      touch[name] = false;
    };
    el.addEventListener("pointerdown", (e) => {
      e.preventDefault();
      touch[name] = true;
      el.setPointerCapture(e.pointerId);
    });
    el.addEventListener("pointerup", release);
    el.addEventListener("pointercancel", release);
    el.addEventListener("lostpointercapture", release);
    el.addEventListener("contextmenu", (e) => {
      e.preventDefault();
    });
  }

  bindButton("btn-left", "left");
  bindButton("btn-right", "right");
  bindButton("btn-accel", "accel");
  bindButton("btn-brake", "brake");

  function pointerAngle(e) {
    return Math.atan2(e.clientY - centerY, e.clientX - centerX);
  }

  function releaseWheel() {
    dragging = false;
  }

  wheelEl.addEventListener("pointerdown", (e) => {
    e.preventDefault();
    const rect = wheelEl.getBoundingClientRect();
    centerX = rect.left + rect.width / 2;
    centerY = rect.top + rect.height / 2;
    startPointer = pointerAngle(e);
    startAngle = input.steer * maxAngle;
    dragging = true;
    wheelEl.setPointerCapture(e.pointerId);
  });

  wheelEl.addEventListener("pointermove", (e) => {
    if (!dragging) return;
    let delta = pointerAngle(e) - startPointer;
    while (delta > Math.PI) delta -= Math.PI * 2;
    while (delta < -Math.PI) delta += Math.PI * 2;
    const angle = Math.max(-maxAngle, Math.min(maxAngle, startAngle + delta));
    input.steer = angle / maxAngle;
  });

  wheelEl.addEventListener("pointerup", releaseWheel);
  wheelEl.addEventListener("pointercancel", releaseWheel);
  wheelEl.addEventListener("lostpointercapture", releaseWheel);
  wheelEl.addEventListener("contextmenu", (e) => {
    e.preventDefault();
  });

  window.addEventListener("keydown", (e) => {
    const name = keyMap[e.code];
    if (name) {
      key[name] = true;
      e.preventDefault();
    }
  });

  window.addEventListener("keyup", (e) => {
    const name = keyMap[e.code];
    if (name) {
      key[name] = false;
      e.preventDefault();
    }
  });

  function showWheel() {
    wheelEl.style.transform = "rotate(" + ((input.steer * maxAngle * 180) / Math.PI) + "deg)";
  }

  function update(dt) {
    if (!dragging) {
      const left = touch.left || key.left;
      const right = touch.right || key.right;
      const target = (right ? 1 : 0) - (left ? 1 : 0);
      const returnRate = mode === "wheel" ? 3 : 6;
      const rate = (target === 0 ? returnRate : 4) * dt;

      if (input.steer < target) {
        input.steer = Math.min(target, input.steer + rate);
      } else if (input.steer > target) {
        input.steer = Math.max(target, input.steer - rate);
      }
    }

    input.throttle = touch.accel || key.accel ? 1 : 0;
    input.brake = touch.brake || key.brake ? 1 : 0;

    if (mode === "wheel") {
      showWheel();
    }
  }

  function reset() {
    Object.keys(touch).forEach((name) => {
      touch[name] = false;
      key[name] = false;
    });
    dragging = false;
    input.throttle = 0;
    input.brake = 0;
    input.steer = 0;
    showWheel();
  }

  function setMode(next) {
    mode = next === "wheel" ? "wheel" : "button";
    dragging = false;
    root.classList.toggle("mode-wheel", mode === "wheel");
    root.classList.toggle("mode-button", mode === "button");
  }

  function getMode() {
    return mode;
  }

  return { input: input, update: update, reset: reset, setMode: setMode, getMode: getMode };
}
