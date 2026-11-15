import * as THREE from "three";
import { createWorld } from "./world.js";
import { createBus, applyBusSpec, resetBus, updateBus } from "./bus.js";
import { createCameraRig } from "./cameras.js";
import { createControls } from "./controls.js";
import { createRules, createStops, courseInfo, makeDailyStops } from "./rules.js";
import {
  getSetting,
  setSetting,
  getCoins,
  addCoins,
  spendCoins,
  getOwnedBuses,
  addOwnedBus,
  getSelectedBus,
  setSelectedBus
} from "./save.js";
import { START, COURSES, BUSES, BUS_TYPES, findBus } from "./data.js";

const modeNames = {
  career: "キャリアモード",
  daily: "デイリーモード",
  free: "フリーモード"
};

function createAudio() {
  const MASTER = 0.6;
  let ctx = null;
  let master = null;
  let engine = null;
  let enabled = getSetting("sound") !== false;
  let tickTimer = 0;
  let tickPhase = 0;
  let lastBlinker = null;
  let beepTimer = 0;

  function buildEngine() {
    const osc1 = ctx.createOscillator();
    osc1.type = "sawtooth";
    const osc2 = ctx.createOscillator();
    osc2.type = "triangle";
    const filter = ctx.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.value = 400;
    const gain = ctx.createGain();
    gain.gain.value = 0;
    osc1.connect(filter);
    osc2.connect(filter);
    filter.connect(gain);
    gain.connect(master);
    osc1.start();
    osc2.start();
    engine = { osc1: osc1, osc2: osc2, filter: filter, gain: gain, kind: "gas" };
  }

  function unlock() {
    if (ctx) {
      if (ctx.state === "suspended") ctx.resume();
      return;
    }
    const Ctor = window.AudioContext || window.webkitAudioContext;
    if (!Ctor) return;
    ctx = new Ctor();
    master = ctx.createGain();
    master.gain.value = enabled ? MASTER : 0;
    master.connect(ctx.destination);
    buildEngine();
  }

  function suspend() {
    if (ctx && ctx.state === "running") ctx.suspend();
  }

  function setEnabled(on) {
    enabled = on;
    if (master) {
      master.gain.setTargetAtTime(on ? MASTER : 0, ctx.currentTime, 0.05);
    }
  }

  function isEnabled() {
    return enabled;
  }

  function tone(freq, duration, type, volume, when, slideTo) {
    if (!ctx || !enabled) return;
    const start = ctx.currentTime + (when || 0);
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, start);
    if (slideTo) {
      osc.frequency.exponentialRampToValueAtTime(slideTo, start + duration);
    }
    gain.gain.setValueAtTime(0.0001, start);
    gain.gain.exponentialRampToValueAtTime(volume, start + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
    osc.connect(gain);
    gain.connect(master);
    osc.start(start);
    osc.stop(start + duration + 0.05);
  }

  function noise(duration, volume, cutoff) {
    if (!ctx || !enabled) return;
    const size = Math.floor(ctx.sampleRate * duration);
    const buffer = ctx.createBuffer(1, size, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < size; i++) {
      data[i] = (Math.random() * 2 - 1) * (1 - i / size);
    }
    const source = ctx.createBufferSource();
    source.buffer = buffer;
    const filter = ctx.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.value = cutoff;
    const gain = ctx.createGain();
    gain.gain.value = volume;
    source.connect(filter);
    filter.connect(gain);
    gain.connect(master);
    source.start();
  }

  function coin() {
    tone(988, 0.12, "square", 0.15, 0);
    tone(1319, 0.25, "square", 0.15, 0.09);
  }

  function chime() {
    tone(660, 0.18, "sine", 0.3, 0);
    tone(880, 0.32, "sine", 0.3, 0.12);
  }

  function doorChime() {
    tone(520, 0.25, "sine", 0.25, 0);
  }

  function buzz() {
    tone(150, 0.35, "sawtooth", 0.25, 0, 90);
  }

  function crash() {
    noise(0.5, 0.7, 600);
    tone(80, 0.4, "sine", 0.6, 0, 40);
  }

  function gearClick() {
    tone(300, 0.05, "square", 0.12, 0);
  }

  function fanfare() {
    tone(523, 0.18, "square", 0.18, 0);
    tone(659, 0.18, "square", 0.18, 0.16);
    tone(784, 0.18, "square", 0.18, 0.32);
    tone(1047, 0.5, "square", 0.2, 0.48);
  }

  function playEvent(event) {
    if (event.text === "建物に衝突") {
      crash();
    } else if (event.amount < 0) {
      buzz();
    } else if (event.text === "乗客が乗車") {
      chime();
    } else if (event.amount > 0) {
      coin();
    } else if (event.text.indexOf("降車") >= 0) {
      doorChime();
    }
  }

  function updateEngine(bus) {
    if (!ctx || !engine) return;
    const now = ctx.currentTime;
    const spec = findBus(bus.userData.specId);
    const ratio = Math.min(1, Math.abs(bus.userData.speed) / bus.userData.stats.maxSpeed);
    const pedal = bus.userData.pedal;

    let idle = 38;
    let range = 70;
    let volume = 0.12;
    if (spec.type === "hybrid") {
      idle = 52;
      range = 90;
      volume = 0.05;
    } else if (spec.type === "tour") {
      idle = 30;
      range = 55;
      volume = 0.15;
    }

    if (engine.kind !== spec.type) {
      engine.kind = spec.type;
      engine.osc1.type = spec.type === "hybrid" ? "triangle" : "sawtooth";
    }

    const pitch = idle + ratio * range + pedal * 12;
    engine.osc1.frequency.setTargetAtTime(pitch, now, 0.1);
    engine.osc2.frequency.setTargetAtTime(pitch * 2.01, now, 0.1);
    engine.filter.frequency.setTargetAtTime(250 + ratio * 600 + pedal * 250, now, 0.1);
    engine.gain.gain.setTargetAtTime(volume * (0.6 + 0.5 * ratio + 0.4 * pedal), now, 0.1);
  }

  function stopEngine() {
    if (ctx && engine) {
      engine.gain.gain.setTargetAtTime(0, ctx.currentTime, 0.05);
    }
    tickTimer = 0;
    lastBlinker = null;
    beepTimer = 0;
  }

  function updateBlinker(side, dt) {
    if (!side) {
      tickTimer = 0;
      lastBlinker = null;
      return;
    }
    if (side !== lastBlinker) {
      lastBlinker = side;
      tickTimer = 0;
      tickPhase = 0;
    }
    tickTimer -= dt;
    if (tickTimer <= 0) {
      tickTimer += 0.4;
      tone(tickPhase === 0 ? 1500 : 1100, 0.04, "square", 0.12, 0);
      tickPhase = 1 - tickPhase;
    }
  }

  function updateReverse(gear, dt) {
    if (gear !== "R") {
      beepTimer = 0;
      return;
    }
    beepTimer -= dt;
    if (beepTimer <= 0) {
      beepTimer += 0.9;
      tone(1000, 0.2, "square", 0.1, 0);
    }
  }

  return {
    unlock: unlock,
    suspend: suspend,
    setEnabled: setEnabled,
    isEnabled: isEnabled,
    playEvent: playEvent,
    gearClick: gearClick,
    fanfare: fanfare,
    updateEngine: updateEngine,
    stopEngine: stopEngine,
    updateBlinker: updateBlinker,
    updateReverse: updateReverse
  };
}

const audio = createAudio();

const canvas = document.getElementById("game-canvas");
const speedEl = document.getElementById("speed-display");
const runCoinsEl = document.getElementById("run-coins");
const passengerEl = document.getElementById("passenger-count");
const routeEl = document.getElementById("route-info");
const titleCoinsEl = document.getElementById("title-coins");
const toastEl = document.getElementById("toast");
const modeNameEl = document.getElementById("game-mode-name");
const courseListEl = document.getElementById("course-list");
const shopListEl = document.getElementById("shop-list");
const shopCoinsEl = document.getElementById("shop-coins");
const shopMessageEl = document.getElementById("shop-message");
const resultTitleEl = document.getElementById("result-title");
const resultBaseEl = document.getElementById("result-base");
const resultLengthEl = document.getElementById("result-length");
const resultMultEl = document.getElementById("result-mult");
const resultTotalEl = document.getElementById("result-total");
const resultCoinsEl = document.getElementById("result-coins");
const blinkLeftEl = document.getElementById("blinker-left");
const blinkRightEl = document.getElementById("blinker-right");
const blinkLeftButton = document.getElementById("btn-blink-left");
const blinkRightButton = document.getElementById("btn-blink-right");
const gearDButton = document.getElementById("btn-gear-d");
const gearRButton = document.getElementById("btn-gear-r");
const cameraButton = document.getElementById("btn-camera");
const controlButton = document.getElementById("btn-control");
const soundButton = document.getElementById("btn-sound");
const retryButton = document.getElementById("btn-retry");
const controls = createControls();
const clock = new THREE.Clock();

let renderer = null;
let scene = null;
let camera = null;
let world = null;
let bus = null;
let rig = null;
let rules = null;
let stops = null;
let running = false;
let frameId = 0;
let gameTime = 0;
let toastTimer = 0;
let currentMode = "free";
let currentRoute = null;
let pendingFinish = false;

function totalRunCoins() {
  return rules.getRunCoins() + stops.getRunCoins();
}

function updateTitleCoins() {
  titleCoinsEl.textContent = "所持コイン：" + getCoins();
}

function showToast(text, kind) {
  toastEl.textContent = text;
  toastEl.className = "show " + kind;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => {
    toastEl.classList.remove("show");
  }, 1800);
}

function handleEvent(event) {
  runCoinsEl.textContent = "コイン " + totalRunCoins();
  audio.playEvent(event);
  if (event.amount === 0) {
    showToast(event.text, "neutral");
  } else if (event.amount > 0) {
    showToast("+" + event.amount + " " + event.text, "plus");
  } else {
    showToast(event.amount + " " + event.text, "minus");
  }
}

function handleRouteFinish() {
  pendingFinish = true;
}

function buildRoute(label, stopIndices) {
  const info = courseInfo(stopIndices);
  return {
    label: label,
    stops: stopIndices,
    length: info.length,
    multiplier: info.multiplier
  };
}

function buildDailyRoute() {
  const now = new Date();
  const label = now.getMonth() + 1 + "月" + now.getDate() + "日のルート";
  return buildRoute(label, makeDailyStops(now));
}

function applyControlMode(mode) {
  controls.setMode(mode);
  setSetting("controlMode", controls.getMode());
  document.querySelectorAll("[data-control]").forEach((btn) => {
    btn.classList.toggle("selected", btn.dataset.control === controls.getMode());
  });
}

function applySound(on) {
  audio.setEnabled(on);
  setSetting("sound", on);
  document.querySelectorAll("[data-sound]").forEach((btn) => {
    btn.classList.toggle("selected", (btn.dataset.sound === "on") === on);
  });
  soundButton.textContent = on ? "音：ON" : "音：OFF";
}

function updateBlinkerDisplay() {
  const side = controls.input.blinker;
  blinkLeftEl.classList.toggle("on", side === "left");
  blinkRightEl.classList.toggle("on", side === "right");
  blinkLeftButton.classList.toggle("on", side === "left");
  blinkRightButton.classList.toggle("on", side === "right");
}

function updateGearDisplay() {
  const gear = bus ? bus.userData.gear : "D";
  gearDButton.classList.toggle("on", gear === "D");
  gearRButton.classList.toggle("on", gear === "R");
}

function syncGear() {
  const wanted = controls.input.gear;
  if (wanted === bus.userData.gear) return;
  if (Math.abs(bus.userData.speed) < 0.5) {
    bus.userData.gear = wanted;
    bus.userData.speed = 0;
    bus.userData.pedal = 0;
    audio.gearClick();
  } else {
    controls.input.gear = bus.userData.gear;
    showToast("停車してから切り替えてください", "neutral");
  }
}

function updateRouteInfo() {
  const info = stops.getRouteInfo();
  if (!info) {
    routeEl.textContent = "";
    return;
  }
  const dx = info.x - bus.position.x;
  const dz = info.z - bus.position.z;
  const heading = bus.rotation.y;
  const forward = dx * -Math.sin(heading) + dz * -Math.cos(heading);
  const right = dx * Math.cos(heading) + dz * -Math.sin(heading);
  const angle = Math.atan2(right, forward);
  const arrows = ["↑", "↗", "→", "↘", "↓", "↙", "←", "↖"];
  const index = ((Math.round(angle / (Math.PI / 4)) % 8) + 8) % 8;
  const distance = Math.round(Math.abs(dx) + Math.abs(dz));
  routeEl.textContent =
    arrows[index] + " " + info.name + " " + distance + "m (" + (info.index + 1) + "/" + info.total + ")";
}

function colorText(value) {
  return "#" + value.toString(16).padStart(6, "0");
}

function renderShop() {
  shopCoinsEl.textContent = "所持コイン：" + getCoins();
  shopListEl.innerHTML = "";
  const owned = getOwnedBuses();
  const selected = getSelectedBus();

  Object.keys(BUS_TYPES).forEach((type) => {
    const title = document.createElement("div");
    title.className = "shop-group-title";
    title.textContent = BUS_TYPES[type].label;
    shopListEl.appendChild(title);

    BUSES.filter((item) => item.type === type).forEach((item) => {
      const card = document.createElement("div");
      card.className = "bus-card";

      const name = document.createElement("div");
      name.className = "bus-name";
      const swatch = document.createElement("span");
      swatch.className = "swatch";
      swatch.style.background = colorText(item.color);
      name.appendChild(swatch);
      name.appendChild(document.createTextNode(item.name));
      card.appendChild(name);

      const stats = document.createElement("div");
      stats.innerHTML =
        "最高速 " +
        Math.round(item.maxSpeed * 3.6) +
        "km/h<br>加速 ×" +
        item.accel.toFixed(2) +
        "　ブレーキ ×" +
        item.brake.toFixed(2) +
        "<br>曲がり ×" +
        item.turn.toFixed(2);
      card.appendChild(stats);

      const price = document.createElement("div");
      price.className = "bus-price";
      price.textContent = item.price === 0 ? "無料" : item.price + " コイン";
      card.appendChild(price);

      const button = document.createElement("button");
      const fullName = BUS_TYPES[item.type].label + " " + item.name;

      if (selected === item.id) {
        button.textContent = "使用中";
        button.disabled = true;
      } else if (owned.includes(item.id)) {
        button.textContent = "使用する";
        button.addEventListener("click", () => {
          setSelectedBus(item.id);
          shopMessageEl.textContent = "「" + fullName + "」を使用します";
          renderShop();
        });
      } else {
        button.textContent = "購入";
        button.addEventListener("click", () => {
          if (spendCoins(item.price)) {
            addOwnedBus(item.id);
            shopMessageEl.textContent = "「" + fullName + "」を購入しました";
            updateTitleCoins();
          } else {
            shopMessageEl.textContent = "コインが足りません";
          }
          renderShop();
        });
      }

      card.appendChild(button);
      shopListEl.appendChild(card);
    });
  });
}

function initGame() {
  if (renderer) return;
  renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  scene = new THREE.Scene();
  scene.background = new THREE.Color(0x87ceeb);
  scene.fog = new THREE.Fog(0x87ceeb, 80, 320);
  camera = new THREE.PerspectiveCamera(60, 1, 0.1, 600);
  world = createWorld(scene);
  bus = createBus(findBus(getSelectedBus()));
  scene.add(bus);
  rig = createCameraRig(camera, bus);
  rules = createRules(world, bus, controls, handleEvent);
  stops = createStops(scene, bus, handleEvent, handleRouteFinish);
}

function resize() {
  if (!renderer) return;
  const w = canvas.clientWidth;
  const h = canvas.clientHeight;
  if (w === 0 || h === 0) return;
  renderer.setSize(w, h, false);
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
}

function loop() {
  if (!running) return;
  frameId = requestAnimationFrame(loop);
  const dt = Math.min(clock.getDelta(), 0.05);
  gameTime += dt;
  controls.update(dt);
  syncGear();
  updateBus(bus, controls.input, dt);
  world.update(gameTime);
  rules.update(gameTime);
  stops.update(dt);
  rig.update(dt);
  audio.updateEngine(bus);
  audio.updateBlinker(controls.input.blinker, dt);
  audio.updateReverse(bus.userData.gear, dt);
  const kmh = Math.round(Math.abs(bus.userData.speed) * 3.6);
  speedEl.textContent = bus.userData.gear + "　" + kmh + " km/h";
  passengerEl.textContent = "乗客 " + bus.userData.passengers;
  updateBlinkerDisplay();
  updateGearDisplay();
  updateRouteInfo();
  renderer.render(scene, camera);
  if (pendingFinish) {
    finishRoute();
  }
}

function startGame() {
  initGame();
  resize();
  const spec = findBus(getSelectedBus());
  if (bus.userData.specId !== spec.id) {
    applyBusSpec(bus, spec);
  }
  gameTime = 0;
  pendingFinish = false;
  resetBus(bus, START.x, START.z, START.heading);
  controls.reset();
  rules.reset();
  stops.setRoute(currentRoute ? currentRoute.stops : null);
  runCoinsEl.textContent = "コイン 0";
  passengerEl.textContent = "乗客 0";
  toastEl.classList.remove("show");
  updateGearDisplay();
  rig.snap();
  clock.getDelta();
  if (!running) {
    running = true;
    loop();
  }
}

function stopGame() {
  running = false;
  cancelAnimationFrame(frameId);
  controls.reset();
  audio.stopEngine();
  updateBlinkerDisplay();
}

function settleRun() {
  addCoins(totalRunCoins());
  rules.reset();
  stops.reset();
  updateTitleCoins();
}

function finishRoute() {
  pendingFinish = false;
  const base = totalRunCoins();
  const multiplier = currentRoute.multiplier;
  const total = Math.round(base * multiplier);
  const owned = addCoins(total);
  resultTitleEl.textContent = currentRoute.label + " 完了！";
  resultBaseEl.textContent = base;
  resultLengthEl.textContent = currentRoute.length + " m";
  resultMultEl.textContent = "×" + multiplier.toFixed(1);
  resultTotalEl.textContent = (total > 0 ? "+" : "") + total;
  resultCoinsEl.textContent = owned;
  rules.reset();
  stops.reset();
  running = false;
  showScreen("result");
  audio.fanfare();
  updateTitleCoins();
}

async function enterLandscape() {
  try {
    if (!document.fullscreenElement && document.documentElement.requestFullscreen) {
      await document.documentElement.requestFullscreen();
    }
    if (screen.orientation && screen.orientation.lock) {
      await screen.orientation.lock("landscape");
    }
  } catch (e) {
  }
}

function showScreen(name) {
  document.querySelectorAll(".screen").forEach((el) => {
    el.classList.toggle("active", el.id === "screen-" + name);
  });
  if (name === "game") {
    startGame();
  } else {
    if (running) {
      settleRun();
    }
    stopGame();
  }
  if (name === "shop") {
    shopMessageEl.textContent = "";
    renderShop();
  }
}

function startMode(mode, route) {
  currentMode = mode;
  currentRoute = route;
  modeNameEl.textContent = route ? route.label : modeNames[mode];
  audio.unlock();
  enterLandscape();
  showScreen("game");
}

function createCourseButtons() {
  COURSES.forEach((course) => {
    const info = courseInfo(course.stops);
    const button = document.createElement("button");
    button.className = "course-btn";
    button.innerHTML =
      "<strong>" +
      course.name +
      "</strong><br>バス停 " +
      course.stops.length +
      "か所<br>約" +
      info.length +
      "m　×" +
      info.multiplier.toFixed(1);
    button.addEventListener("click", () => {
      startMode("career", buildRoute(course.name, course.stops));
    });
    courseListEl.appendChild(button);
  });
}

document.querySelectorAll("[data-screen]").forEach((btn) => {
  btn.addEventListener("click", () => {
    showScreen(btn.dataset.screen);
  });
});

document.querySelectorAll("[data-mode]").forEach((btn) => {
  btn.addEventListener("click", () => {
    const mode = btn.dataset.mode;
    if (mode === "career") {
      showScreen("courses");
    } else if (mode === "daily") {
      startMode("daily", buildDailyRoute());
    } else {
      startMode("free", null);
    }
  });
});

document.querySelectorAll("[data-control]").forEach((btn) => {
  btn.addEventListener("click", () => {
    applyControlMode(btn.dataset.control);
  });
});

document.querySelectorAll("[data-sound]").forEach((btn) => {
  btn.addEventListener("click", () => {
    applySound(btn.dataset.sound === "on");
  });
});

retryButton.addEventListener("click", () => {
  startMode(currentMode, currentRoute);
});

cameraButton.addEventListener("click", () => {
  if (rig) rig.toggle();
  cameraButton.blur();
});

controlButton.addEventListener("click", () => {
  applyControlMode(controls.getMode() === "button" ? "wheel" : "button");
  controlButton.blur();
});

soundButton.addEventListener("click", () => {
  applySound(!audio.isEnabled());
  soundButton.blur();
});

document.addEventListener("pointerdown", () => {
  audio.unlock();
});

document.addEventListener("visibilitychange", () => {
  if (document.hidden) {
    audio.suspend();
  } else {
    audio.unlock();
  }
});

document.addEventListener("keydown", (e) => {
  if (running && rig && e.code === "KeyC") {
    rig.toggle();
  }
});

window.addEventListener("resize", resize);
window.addEventListener("orientationchange", () => {
  setTimeout(resize, 200);
});

createCourseButtons();
applyControlMode(getSetting("controlMode") === "wheel" ? "wheel" : "button");
applySound(audio.isEnabled());
updateTitleCoins();
showScreen("title");
