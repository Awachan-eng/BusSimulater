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
const cameraButton = document.getElementById("btn-camera");
const controlButton = document.getElementById("btn-control");
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

function updateBlinkerDisplay() {
  const side = controls.input.blinker;
  blinkLeftEl.classList.toggle("on", side === "left");
  blinkRightEl.classList.toggle("on", side === "right");
  blinkLeftButton.classList.toggle("on", side === "left");
  blinkRightButton.classList.toggle("on", side === "right");
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
  updateBus(bus, controls.input, dt);
  world.update(gameTime);
  rules.update(gameTime);
  stops.update(dt);
  rig.update(dt);
  speedEl.textContent = Math.round(bus.userData.speed * 3.6) + " km/h";
  passengerEl.textContent = "乗客 " + bus.userData.passengers;
  updateBlinkerDisplay();
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
updateTitleCoins();
showScreen("title");
