/**
 * PackBrain — Packing Data & Persistence Layer
 */

export const PACKING_DATA = [
  {
    id: "clothes",
    title: "Clothes",
    icon: "👕",
    color: "#6C63FF",
    items: [
      { id: "underwear", name: "Underwear", qty: 7, bag: "checked-bag", note: "" },
      { id: "tshirts", name: "T-shirts", qty: 7, bag: "checked-bag", note: "" },
      { id: "socks", name: "Pairs of socks", qty: 7, bag: "checked-bag", note: "" },
      { id: "shorts", name: "Shorts", qty: 1, bag: "checked-bag", note: "" },
      { id: "pants", name: "Pants", qty: 1, bag: "checked-bag", note: "Wear or pack" },
      { id: "hoodie", name: "Hoodie", qty: 1, bag: "checked-bag", note: "Or wear on plane" },
    ],
  },
  {
    id: "streaming",
    title: "Streaming Setup",
    icon: "🎙️",
    color: "#FF6B6B",
    items: [
      { id: "laptop", name: "Laptop", qty: 1, bag: "backpack", note: "Keep accessible for TSA" },
      { id: "laptop-charger", name: "Laptop charger", qty: 1, bag: "backpack", note: "" },
      { id: "mouse", name: "Mouse", qty: 1, bag: "backpack", note: "" },
      { id: "webcam", name: "Webcam", qty: 1, bag: "backpack", note: "" },
      { id: "yeti-mic", name: "Yeti Microphone", qty: 1, bag: "checked-bag", note: "Heavy — checked bag" },
      { id: "streamdeck", name: "Elgato Stream Deck", qty: 1, bag: "backpack", note: "" },
      { id: "ipad", name: "iPad (sheet music)", qty: 1, bag: "backpack", note: "" },
      { id: "ipad-charger", name: "iPad charger", qty: 1, bag: "backpack", note: "" },
    ],
  },
  {
    id: "tech-accessories",
    title: "Tech & Cables",
    icon: "🔌",
    color: "#00C9A7",
    items: [
      { id: "usb-cables", name: "USB-C cables", qty: 2, bag: "backpack", note: "" },
      { id: "lightning-cables", name: "Lightning cables", qty: 2, bag: "backpack", note: "" },
      { id: "converters", name: "Adapters / converters", qty: 1, bag: "backpack", note: "USB-C hub, dongles" },
      { id: "monitor-stack", name: "Dual monitor stack", qty: 1, bag: "checked-bag", note: "Wrap carefully!" },
      { id: "monitor-cables", name: "Monitor cables", qty: 1, bag: "checked-bag", note: "HDMI / DisplayPort" },
      { id: "power-strip", name: "Power strip / extension", qty: 1, bag: "checked-bag", note: "If needed" },
    ],
  },
  {
    id: "toiletries",
    title: "Toiletries",
    icon: "🧴",
    color: "#FF9F43",
    items: [
      { id: "toothpaste", name: "Toothpaste", qty: 1, bag: "backpack", note: "⚠️ TSA: quart bag" },
      { id: "toothbrush", name: "Toothbrush (Oral-B)", qty: 1, bag: "backpack", note: "Charger if electric" },
      { id: "shaver", name: "Shaver", qty: 1, bag: "checked-bag", note: "Blades must be checked" },
      { id: "luffa", name: "Luffa", qty: 1, bag: "checked-bag", note: "" },
      { id: "floss", name: "Floss", qty: 1, bag: "backpack", note: "" },
      { id: "mouthwash", name: "Mouthwash", qty: 1, bag: "backpack", note: "⚠️ TSA: ≤3.4oz" },
      { id: "deodorant", name: "Deodorant", qty: 1, bag: "checked-bag", note: "Spray = checked" },
    ],
  },
  {
    id: "travel-comfort",
    title: "Travel Comfort",
    icon: "😴",
    color: "#A55EEA",
    items: [
      { id: "travel-pillow", name: "Travel pillow", qty: 1, bag: "worn", note: "🚨 DON'T FORGET!" },
      { id: "eye-mask", name: "Eye mask", qty: 1, bag: "backpack", note: "" },
      { id: "earplugs", name: "Earplugs", qty: 1, bag: "backpack", note: "" },
    ],
  },
  {
    id: "shoes",
    title: "Footwear",
    icon: "👟",
    color: "#2BCBBA",
    items: [
      { id: "slippers", name: "Slippers", qty: 1, bag: "worn", note: "Wear to airport" },
      { id: "sneakers", name: "Sneakers", qty: 1, bag: "checked-bag", note: "Pack in bag" },
    ],
  },
  {
    id: "essentials",
    title: "Essentials (Always On You)",
    icon: "🔑",
    color: "#FD79A8",
    items: [
      { id: "wallet", name: "Wallet", qty: 1, bag: "worn", note: "ID, cards, cash" },
      { id: "phone", name: "Phone", qty: 1, bag: "worn", note: "" },
      { id: "keys", name: "Keys", qty: 1, bag: "worn", note: "House keys" },
      { id: "headphones", name: "Headphones", qty: 1, bag: "worn", note: "" },
      { id: "boarding-pass", name: "Boarding pass", qty: 1, bag: "worn", note: "Digital or printed" },
    ],
  },
  {
    id: "home-prep",
    title: "Before Leaving Home",
    icon: "🏠",
    color: "#FDCB6E",
    items: [
      { id: "dog-water", name: "Fill dog's water bowl", qty: null, bag: "home", note: "Extra water" },
      { id: "dog-food", name: "Arrange dog food / pet sitter", qty: null, bag: "home", note: "" },
      { id: "ac-heat", name: "Set AC/heat to away temp", qty: null, bag: "home", note: "~72°F / ~65°F" },
      { id: "lights", name: "Turn off unnecessary lights", qty: null, bag: "home", note: "" },
      { id: "lock-doors", name: "Lock all doors & windows", qty: null, bag: "home", note: "" },
      { id: "trash", name: "Take out trash", qty: null, bag: "home", note: "" },
      { id: "unplug", name: "Unplug non-essential electronics", qty: null, bag: "home", note: "" },
      { id: "mail", name: "Hold mail / ask neighbor", qty: null, bag: "home", note: "" },
    ],
  },
];

// Alias for server-side seed import
export const DEFAULT_CATEGORIES = PACKING_DATA;

// ── localStorage Helpers ─────────────────────────────────
const CHECKED_KEY = "packbrain-checked-items";
const DATA_KEY = "packbrain-item-overrides";
const PHASES_KEY = "packbrain-phases";

export function loadCheckedItems() {
  if (typeof window === "undefined") return new Set();
  try {
    const data = localStorage.getItem(CHECKED_KEY);
    return data ? new Set(JSON.parse(data)) : new Set();
  } catch {
    return new Set();
  }
}

export function saveCheckedItems(checkedItems) {
  localStorage.setItem(CHECKED_KEY, JSON.stringify([...checkedItems]));
}

export function loadItems() {
  if (typeof window === "undefined") return structuredClone(PACKING_DATA);
  try {
    const data = localStorage.getItem(DATA_KEY);
    if (!data) return structuredClone(PACKING_DATA);
    const overrides = JSON.parse(data);
    const base = structuredClone(PACKING_DATA);
    overrides.forEach((override) => {
      const cat = base.find((c) => c.id === override.id);
      if (cat) cat.items = override.items;
    });
    return base;
  } catch {
    return structuredClone(PACKING_DATA);
  }
}

export function saveItems(categories) {
  const snapshot = categories.map((cat) => ({
    id: cat.id,
    items: cat.items.map((item) => ({
      id: item.id,
      name: item.name,
      qty: item.qty,
      bag: item.bag,
      note: item.note,
    })),
  }));
  localStorage.setItem(DATA_KEY, JSON.stringify(snapshot));
}

export function loadPhases() {
  if (typeof window === "undefined") return null;
  try {
    const data = localStorage.getItem(PHASES_KEY);
    return data ? JSON.parse(data) : null;
  } catch {
    return null;
  }
}

export function savePhases(phases) {
  localStorage.setItem(PHASES_KEY, JSON.stringify(phases));
}

export function clearPhases() {
  localStorage.removeItem(PHASES_KEY);
}

export function getBagLabel(bag) {
  const labels = {
    "checked-bag": "🧳 Checked",
    backpack: "🎒 Backpack",
    worn: "👟 On you",
    home: "🏠 Home",
  };
  return labels[bag] || bag;
}
