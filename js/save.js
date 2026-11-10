const KEY = "bus-simulator-save";

const defaults = {
  controlMode: "button",
  coins: 0,
  ownedBuses: ["gas1"],
  selectedBus: "gas1"
};

let data = Object.assign({}, defaults);

try {
  const raw = localStorage.getItem(KEY);
  if (raw) {
    data = Object.assign({}, defaults, JSON.parse(raw));
  }
} catch (e) {
  data = Object.assign({}, defaults);
}

function persist() {
  try {
    localStorage.setItem(KEY, JSON.stringify(data));
  } catch (e) {
  }
}

export function getSetting(name) {
  return data[name];
}

export function setSetting(name, value) {
  data[name] = value;
  persist();
}

export function getCoins() {
  return Math.max(0, Math.floor(Number(data.coins) || 0));
}

export function addCoins(amount) {
  data.coins = Math.max(0, getCoins() + Math.round(amount));
  persist();
  return data.coins;
}

export function spendCoins(amount) {
  if (getCoins() < amount) return false;
  data.coins = getCoins() - amount;
  persist();
  return true;
}

export function getOwnedBuses() {
  const owned = Array.isArray(data.ownedBuses) ? data.ownedBuses : [];
  return owned.includes("gas1") ? owned : ["gas1"].concat(owned);
}

export function addOwnedBus(id) {
  const owned = getOwnedBuses();
  if (!owned.includes(id)) {
    data.ownedBuses = owned.concat(id);
    persist();
  }
}

export function getSelectedBus() {
  return getOwnedBuses().includes(data.selectedBus) ? data.selectedBus : "gas1";
}

export function setSelectedBus(id) {
  if (getOwnedBuses().includes(id)) {
    data.selectedBus = id;
    persist();
  }
}
