import {
  Aperture, Backpack, Bandage, Banknote, Battery, BatteryCharging, BedDouble, BedSingle,
  Binoculars, BookOpen, BookText, Briefcase, BriefcaseMedical, Brush, Bug, Cable, Camera,
  Circle, CloudRain, Coins, Compass, Contact, Cookie, CookingPot, CreditCard, CupSoda,
  Droplets, Ear, Eye, FileText, Flashlight, Footprints, Glasses, Globe, Hand, Handbag,
  Headphones, KeyRound, Laptop, LockKeyhole, Luggage, Map as MapIcon, MapPinned, Mountain,
  Navigation, Notebook, Package, Pen, Pill, Pin, PocketKnife, Plug, PlugZap, Radio,
  Sandwich, Scissors, Shield, ShieldCheck, Shirt, Smartphone, Soup, Spade, SprayCan,
  Stamp, Sun, Tablet, Tent, Thermometer, Ticket, Trash2, Umbrella, Utensils, Wallet,
  WalletCards, Watch, Waves, Wind, Wrench,
} from "lucide-react";

const ICONS = {
  passport: FileText, id: Contact, cash: Banknote, card: CreditCard, wallet: Wallet,
  coins: Coins, visa: Stamp, insurance: ShieldCheck, ticket: Ticket, itinerary: MapIcon,
  jacket: CloudRain, shirt: Shirt, pants: Shirt, raincoat: Umbrella, hat: Shirt,
  scarf: Wind, gloves: Hand, socks: Footprints, sunglasses: Glasses, swimwear: Waves,
  belt: Circle, boots: Footprints, sandals: Footprints, shoes: Footprints,
  toiletryBag: Briefcase, toothbrush: Brush, towel: Waves, wipes: Droplets,
  tissues: FileText, sunscreen: Sun, cream: Hand, shampoo: Droplets, soap: Droplets,
  deodorant: SprayCan, comb: Brush, clippers: Scissors, hairTie: Circle,
  firstAid: BriefcaseMedical, bandage: Bandage, insectRepellent: Bug, medicine: Pill,
  thermometer: Thermometer, sanitizer: Droplets, mask: Wind, phone: Smartphone,
  camera: Camera, tripod: Aperture, powerBank: BatteryCharging, charger: Plug,
  cable: Cable, battery: Battery, headphones: Headphones, radio: Radio, adapter: PlugZap,
  computer: Laptop, tablet: Tablet, memoryCard: CreditCard, watch: Watch, headlamp: Flashlight,
  sleepingBag: BedDouble, sleepingPad: BedSingle, pillow: BedDouble, eyeMask: Eye,
  earplugs: Ear, hammock: BedDouble, tent: Tent, food: Sandwich, snacks: Cookie,
  bottle: CupSoda, cup: CupSoda, utensils: Utensils, cookware: CookingPot, bowl: Soup,
  lock: LockKeyhole, emergency: Shield, whistle: Radio, safetyPin: Pin, poles: Mountain,
  compass: Compass, gps: Navigation, binoculars: Binoculars, knife: PocketKnife,
  multitool: Wrench, backpack: Backpack, crossbody: Handbag, dryBag: Droplets,
  packingCubes: Package, luggage: Luggage, book: BookOpen, notebook: Notebook,
  pen: Pen, trash: Trash2, journal: BookText, cards: Spade, keys: KeyRound,
  map: MapPinned, globe: Globe,
};

// Canonical luggage items plus common model/user wording. Several related items share
// an icon where a dedicated pictogram would add little value.
const CATALOG = [
  ["passport", "passport", "travel passport", "travel document"],
  ["ID card", "id", "identity card", "identification card"],
  ["cash", "cash", "money", "banknotes"],
  ["bank card", "card", "credit card", "debit card", "bankcard"],
  ["wallet", "wallet", "purse"],
  ["coins", "coins", "change"],
  ["visa", "visa", "visa document"],
  ["travel insurance", "insurance", "insurance papers"],
  ["ticket", "ticket", "boarding pass", "train ticket", "bus ticket"],
  ["itinerary", "itinerary", "travel itinerary", "trip documents"],
  ["shell jacket", "jacket", "waterproof jacket", "hardshell jacket"],
  ["rain jacket", "jacket", "waterproof coat"],
  ["quick-dry shirt", "shirt", "quick dry shirt", "quick-dry t-shirt"],
  ["t-shirt", "shirt", "t shirt", "tee", "tee shirt", "tshirt"],
  ["wool long-sleeve", "shirt", "wool long sleeve", "long-sleeve shirt", "base layer top"],
  ["down jacket", "jacket", "puffer jacket"],
  ["shell pants", "pants", "waterproof pants", "hardshell pants"],
  ["thermal pants", "pants", "long underwear", "base layer bottoms"],
  ["fleece jacket", "jacket", "fleece", "fleece liner"],
  ["raincoat", "raincoat", "rain coat", "poncho"],
  ["baseball cap", "hat", "cap"],
  ["beanie", "hat", "wool hat", "winter hat"],
  ["neck gaiter", "scarf", "buff", "neck warmer"],
  ["gloves", "gloves", "mittens"],
  ["wool socks", "socks", "hiking socks"],
  ["sports sunglasses", "sunglasses", "sport sunglasses"],
  ["underwear", "pants", "underpants"],
  ["sports bra", "shirt", "sport bra"],
  ["shorts", "pants", "short pants"],
  ["swimwear", "swimwear", "swimsuit", "bathing suit", "swimming trunks"],
  ["scarf", "scarf", "neck scarf"],
  ["belt", "belt", "waist belt"],
  ["hiking boots", "boots", "walking boots", "trekking boots"],
  ["slippers", "sandals", "flip-flops", "flip flops"],
  ["sandals", "sandals", "hiking sandals"],
  ["shoes", "shoes", "trainers", "sneakers"],
  ["insoles", "shoes", "shoe insoles"],
  ["gaiters", "boots", "hiking gaiters"],
  ["toiletry bag", "toiletryBag", "wash bag", "toiletries bag"],
  ["toothbrush", "toothbrush", "electric toothbrush"],
  ["toothpaste", "toothbrush", "tooth paste"],
  ["bath towel", "towel", "towel"],
  ["compressed towel", "towel", "travel towel"],
  ["wet wipes", "wipes", "baby wipes"],
  ["tissues", "tissues", "tissue", "paper tissues"],
  ["sunscreen", "sunscreen", "sun cream", "sunblock"],
  ["hand cream", "cream", "hand lotion"],
  ["shampoo", "shampoo", "shampoo bottle"],
  ["soap", "soap", "bar soap"],
  ["deodorant", "deodorant", "antiperspirant"],
  ["comb", "comb", "hairbrush", "hair brush"],
  ["nail clippers", "clippers", "nail scissors"],
  ["hair tie", "hairTie", "hair band", "hairband"],
  ["medicine kit", "firstAid", "first aid kit", "first-aid kit"],
  ["band-aids", "bandage", "bandages", "plasters"],
  ["insect repellent", "insectRepellent", "bug spray", "mosquito repellent"],
  ["medicine", "medicine", "medication", "medicines"],
  ["pain reliever", "medicine", "painkillers", "pain medication"],
  ["allergy medication", "medicine", "allergy medicine", "antihistamines"],
  ["blister pads", "bandage", "blister plasters", "moleskin"],
  ["thermometer", "thermometer", "medical thermometer"],
  ["hand sanitizer", "sanitizer", "hand sanitiser"],
  ["face masks", "mask", "face mask", "medical masks"],
  ["phone", "phone", "mobile phone", "cell phone", "smartphone"],
  ["camera", "camera", "digital camera"],
  ["tripod", "tripod", "camera tripod"],
  ["power bank", "powerBank", "powerbank", "portable charger"],
  ["charger", "charger", "phone charger", "wall charger"],
  ["charging cable", "cable", "data cable", "USB cable", "charging cord"],
  ["batteries", "battery", "battery pack"],
  ["earphones", "headphones", "earbuds", "wireless earbuds", "in-ear headphones"],
  ["walkie-talkie", "radio", "walkie talkie", "two-way radio"],
  ["power adapter", "adapter", "travel adapter", "plug adapter"],
  ["laptop", "computer", "notebook computer"],
  ["tablet", "tablet", "ipad"],
  ["memory card", "memoryCard", "SD card", "microSD card"],
  ["smartwatch", "watch", "fitness watch"],
  ["headlamp", "headlamp", "head torch", "headtorch"],
  ["sleeping bag", "sleepingBag", "sleep bag"],
  ["sleeping pad", "sleepingPad", "sleeping mat", "sleep mat"],
  ["inflatable pillow", "pillow", "travel pillow", "camping pillow"],
  ["eye mask", "eyeMask", "sleep mask"],
  ["earplugs", "earplugs", "ear plugs"],
  ["hammock", "hammock", "camping hammock"],
  ["tent", "tent", "camping tent"],
  ["food", "food", "meal", "meals"],
  ["snacks", "snacks", "snack", "trail mix"],
  ["water bottle", "bottle", "reusable water bottle", "flask"],
  ["thermos cup", "cup", "thermos", "travel mug"],
  ["utensils", "utensils", "cutlery", "silverware"],
  ["cookware", "cookware", "camping cookware"],
  ["cooking pot", "cookware", "pot", "camping pot"],
  ["bowl", "bowl", "camping bowl"],
  ["padlock", "lock", "luggage lock"],
  ["money belt", "wallet", "travel money belt"],
  ["backpack rain cover", "umbrella", "rain cover", "rain cover for backpack"],
  ["whistle", "whistle", "emergency whistle"],
  ["safety pins", "safetyPin", "safety pin"],
  ["emergency blanket", "emergency", "space blanket"],
  ["trekking poles", "poles", "hiking poles", "walking poles"],
  ["map", "map", "paper map"],
  ["compass", "compass", "navigation compass"],
  ["GPS", "gps", "GPS device", "navigation device"],
  ["binoculars", "binoculars", "field glasses"],
  ["pocket knife", "knife", "folding knife"],
  ["multitool", "multitool", "multi-tool", "multi tool"],
  ["rope", "cable", "cord", "paracord"],
  ["backpack", "backpack", "rucksack"],
  ["crossbody bag", "crossbody", "crossbody purse", "sling bag"],
  ["dry bag", "dryBag", "waterproof bag"],
  ["packing cubes", "packingCubes", "packing cube"],
  ["duffel bag", "luggage", "duffel", "duffle bag"],
  ["daypack", "backpack", "day pack"],
  ["book", "book", "paperback"],
  ["notebook", "notebook", "journal notebook"],
  ["pen", "pen", "pencil", "writing pen"],
  ["trash bags", "trash", "garbage bags", "bin bags"],
  ["travel journal", "journal", "travel diary"],
  ["playing cards", "cards", "deck of cards"],
  ["headphones", "headphones", "over-ear headphones"],
  ["keys", "keys", "key", "spare key"],
  ["travel guide", "book", "guidebook"],
  ["passport holder", "passport", "passport wallet"],
  ["laundry bag", "dryBag", "dirty laundry bag"],
  ["sleeping bag liner", "sleepingBag", "sleep liner"],
  ["waterproof phone pouch", "phone", "phone pouch"],
  ["portable speaker", "radio", "bluetooth speaker"],
];

function normalizeName(value) {
  return String(value || "").toLowerCase().replace(/&/g, " and ").replace(/[^a-z0-9]+/g, " ").trim();
}

const exactMatches = new Map();
const partialMatches = [];
for (const [canonical, iconKey, ...aliases] of CATALOG) {
  for (const phrase of [canonical, ...aliases]) {
    const normalized = normalizeName(phrase);
    if (!normalized) continue;
    exactMatches.set(normalized, iconKey);
    partialMatches.push([normalized, iconKey]);
  }
}
partialMatches.sort((a, b) => b[0].length - a[0].length);

export function resolveItemIcon(name, category) {
  const normalized = normalizeName(name);
  if (exactMatches.has(normalized)) return exactMatches.get(normalized);
  for (const [phrase, iconKey] of partialMatches) {
    if (phrase.length > 4 && ` ${normalized} `.includes(` ${phrase} `)) return iconKey;
  }
  const categoryDefaults = {
    "Documents & Money": "wallet",
    Clothing: "shirt",
    Footwear: "shoes",
    Toiletries: "toiletryBag",
    "Medicine & First Aid": "firstAid",
    Electronics: "phone",
    "Sleeping Gear": "sleepingBag",
    "Food & Drink": "utensils",
    Security: "lock",
    "Outdoor & Navigation": "compass",
    "Bags & Organization": "backpack",
    "Misc & Entertainment": "book",
  };
  return categoryDefaults[category] || "package";
}

ICONS.package = Package;

export function ItemIcon({ name, category, iconKey, size = 18, strokeWidth = 1.8, className = "" }) {
  const resolvedKey = ICONS[iconKey] ? iconKey : resolveItemIcon(name, category);
  const Icon = ICONS[resolvedKey] || Package;
  return <Icon className={className} size={size} strokeWidth={strokeWidth} aria-hidden="true" />;
}

// Keep this reference so catalog growth is intentional and easy to inspect.
export const ITEM_ICON_COUNT = CATALOG.length;
