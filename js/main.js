import * as THREE from "three";
import { createWorld } from "./world.js";
import { createBus, resetBus, updateBus } from "./bus.js";
import { createCameraRig } from "./cameras.js";
import { createControls } from "./controls.js";
import { getSetting, setSetting } from "./save.js";

const modeNames = {
  career: "キャリアモード",
  daily: "デイリーモード",
  free: "フリーモード"
};

const canvas = document.getElementById("game-canvas");
const speedEl = document.getElementById("speed-display");
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
let running = false;
let frameId = 0;
let gameTime = 0;

function applyControlMode(mode) {
  controls.setMode(mode);
  setSetting("controlMode", controls.getMode());
  document.querySelectorAll("[data-control]").forEach((btn) => {
    btn.classList.toggle("selected", btn.dataset.control === controls.getMode());
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
  bus = createBus(0xf2c94c);
  scene.add(bus);
  rig = createCameraRig(camera, bus);
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
  rig.update(dt);
  speedEl.textContent = Math.round(bus.userData.speed * 3.6) + " km/h";
  renderer.render(scene, camera);
}

function startGame() {
  initGame();
  resize();
  gameTime = 0;
  resetBus(bus, -3, 180, 0);
  controls.reset();
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
showScreen("title");
