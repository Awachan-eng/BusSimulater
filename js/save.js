const KEY = "bus-simulator-save";

const defaults = {
  controlMode: "button"
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
