import * as THREE from "three";
import { createWorld } from "./world.js";
import { createBus } from "./bus.js";

const modeNames = {
  career: "キャリアモード",
  daily: "デイリーモード",
  free: "フリーモード"
};

const canvas = document.getElementById("game-canvas");

let renderer = null;
let scene = null;
let camera = null;
let bus = null;
let running = false;
let angle = 0;

function initGame() {
  if (renderer) return;
  renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  scene = new THREE.Scene();
  scene.background = new THREE.Color(0x87ceeb);
  scene.fog = new THREE.Fog(0x87ceeb, 80, 320);
  camera = new THREE.PerspectiveCamera(60, 1, 0.1, 600);
  createWorld(scene);
  bus = createBus(0xf2c94c);
  scene.add(bus);
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
  requestAnimationFrame(loop);
  angle += 0.005;
  camera.position.set(Math.sin(angle) * 18, 6, Math.cos(angle) * 18);
  camera.lookAt(0, 1.5, 0);
  renderer.render(scene, camera);
}

function startGame() {
  initGame();
  resize();
  if (!running) {
    running = true;
    loop();
  }
}

function stopGame() {
  running = false;
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

window.addEventListener("resize", resize);
window.addEventListener("orientationchange", () => {
  setTimeout(resize, 200);
});

showScreen("title");
