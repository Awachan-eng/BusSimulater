import * as THREE from "three";
import { createWorld } from "./world.js";
import { createBus, resetBus, updateBus } from "./bus.js";
import { createCameraRig } from "./cameras.js";
import { createControls } from "./controls.js";
import { createRules } from "./rules.js";
import { createStops } from "./stops.js";
import { getSetting, setSetting, getCoins, addCoins } from "./save.js";

const modeNames = {
  career: "キャリアモード",
  daily: "デイリーモード",
  free: "フリーモード"
};

const canvas = document.getElementById("game-canvas");
const speedEl = document.getElementById("speed-display");
const runCoinsEl = document.getElementById("run-coins");
const passengerEl = document.getElementById("passenger-count");
const titleCoinsEl = document.getElementById("title-coins");
const toastEl = document.getElementById("toast");
const blinkLeftEl = document.getElementById("blinker-left");
const blinkRightEl = document.getElementById("blinker-right");
const blinkLeftButton = document.getElementById("btn-blink-left");
const blinkRightButton = document.getElementById("btn-blink-right");
const cameraButton = document.getElementById("btn-camera");
const controlButton = document.getElementById("btn-control");
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

function initGame() {
  if (renderer) return;
  renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  scene = new THREE.Scene();
  scene.background = new THREE.Color(0x87ceeb);
  scene.fog = new THREE.Fog(0x87ceeb, 80, 320);
  camera = new THREE.PerspectiveCamera(60, 1, 0.1, 600);
  world = createWorld(scene);
  bus = createBus(0xf2c94c);
  scene.add(bus);
  rig = createCameraRig(camera, bus);
  rules = createRules(world, bus, controls, handleEvent);
  stops = createStops(scene, bus, handleEvent);
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
  renderer.render(scene, camera);
}

function startGame() {
  initGame();
  resize();
  gameTime = 0;
  resetBus(bus, -3, 180, 0);
  controls.reset();
  rules.reset();
  stops.reset();
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
}

document.querySelectorAll("[data-screen]").forEach((btn) => {
  btn.addEventListener("click", () => {
    showScreen(btn.dataset.screen);
  });
});

document.querySelectorAll("[data-mode]").forEach((btn) => {
  btn.addEventListener("click", () => {
    document.getElementById("game-mode-name").textContent = modeNames[btn.dataset.mode];
    enterLandscape();
    showScreen("game");
  });
});

document.querySelectorAll("[data-control]").forEach((btn) => {
  btn.addEventListener("click", () => {
    applyControlMode(btn.dataset.control);
  });
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

applyControlMode(getSetting("controlMode") === "wheel" ? "wheel" : "button");
updateTitleCoins();
showScreen("title");
