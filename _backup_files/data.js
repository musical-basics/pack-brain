/**
 * PackBrain — Packing Data
 * All items organized by category with bag assignments and notes.
 * 
 * bag values: "checked-bag" | "backpack" | "worn" | "home"
 * TSA note: Liquids/gels must go in backpack (quart-size bag) for TSA screening
 */

const PACKING_DATA = [
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
    ]
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
    ]
  },
  {
    id: "tech-accessories",
    title: "Tech & Cables",
    icon: "🔌",
    color: "#00C9A7",
    items: [
      { id: "usb-cables", name: "USB-C cables", qty: 2, bag: "backpack", note: "" },
      { id: "lightning-cables", name: "Lightning cables", qty: 2, bag: "backpack", note: "" },
      { id: "converters", name: "Adapters / converters", qty: 1, bag: "backpack", note: "USB-C hub, dongles, etc." },
      { id: "monitor-stack", name: "Dual monitor stack", qty: 1, bag: "checked-bag", note: "Wrap carefully!" },
      { id: "monitor-cables", name: "Monitor cables", qty: 1, bag: "checked-bag", note: "HDMI / DisplayPort" },
      { id: "power-strip", name: "Power strip / extension", qty: 1, bag: "checked-bag", note: "If needed at parents'" },
    ]
  },
  {
    id: "toiletries",
    title: "Toiletries",
    icon: "🧴",
    color: "#FF9F43",
    items: [
      { id: "toothpaste", name: "Toothpaste", qty: 1, bag: "backpack", note: "⚠️ TSA: quart bag (liquid)" },
      { id: "toothbrush", name: "Toothbrush (Oral-B)", qty: 1, bag: "backpack", note: "Charger too if electric" },
      { id: "shaver", name: "Shaver", qty: 1, bag: "checked-bag", note: "Blades must be checked" },
      { id: "luffa", name: "Luffa", qty: 1, bag: "checked-bag", note: "" },
      { id: "floss", name: "Floss", qty: 1, bag: "backpack", note: "" },
      { id: "mouthwash", name: "Mouthwash", qty: 1, bag: "backpack", note: "⚠️ TSA: ≤3.4oz / quart bag" },
      { id: "deodorant", name: "Deodorant", qty: 1, bag: "checked-bag", note: "Stick OK carry-on; spray = checked" },
    ]
  },
  {
    id: "travel-comfort",
    title: "Travel Comfort",
    icon: "😴",
    color: "#A55EEA",
    items: [
      { id: "travel-pillow", name: "Travel pillow", qty: 1, bag: "worn", note: "🚨 DON'T FORGET — clip to backpack!" },
      { id: "eye-mask", name: "Eye mask", qty: 1, bag: "backpack", note: "" },
      { id: "earplugs", name: "Earplugs", qty: 1, bag: "backpack", note: "Or noise-cancelling buds" },
    ]
  },
  {
    id: "shoes",
    title: "Footwear",
    icon: "👟",
    color: "#2BCBBA",
    items: [
      { id: "slippers", name: "Slippers", qty: 1, bag: "worn", note: "Wear to airport" },
      { id: "sneakers", name: "Sneakers", qty: 1, bag: "checked-bag", note: "Pack in bag" },
    ]
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
    ]
  },
  {
    id: "home-prep",
    title: "Before Leaving Home",
    icon: "🏠",
    color: "#FDCB6E",
    items: [
      { id: "dog-water", name: "Fill dog's water bowl", qty: null, bag: "home", note: "Extra water if gone 6 days" },
      { id: "dog-food", name: "Arrange dog's food / pet sitter", qty: null, bag: "home", note: "" },
      { id: "ac-heat", name: "Set AC/heat to away temp", qty: null, bag: "home", note: "~72°F summer / ~65°F winter" },
      { id: "lights", name: "Turn off unnecessary lights", qty: null, bag: "home", note: "Or set smart timer" },
      { id: "lock-doors", name: "Lock all doors & windows", qty: null, bag: "home", note: "" },
      { id: "trash", name: "Take out trash", qty: null, bag: "home", note: "Don't leave for 6 days!" },
      { id: "unplug", name: "Unplug non-essential electronics", qty: null, bag: "home", note: "Save energy, prevent hazards" },
      { id: "mail", name: "Hold mail / ask neighbor", qty: null, bag: "home", note: "" },
    ]
  },
];
