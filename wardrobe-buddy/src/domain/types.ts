/**
 * Domain types for Wardrobe Buddy.
 * Shared by the engine, storage and UI. No runtime code here.
 * See docs/ARCHITECTURE.md → "Data model".
 */

export const CATEGORIES = ['top', 'bottom', 'dress', 'outerwear', 'shoes', 'accessory'] as const;
export type Category = (typeof CATEGORIES)[number];

/** Optional finer type, used for display, tabs and mood matching (e.g. a skirt is a "fancy" bottom). */
export const SUBCATEGORIES = {
  top: ['tshirt', 'shirt', 'sweater', 'hoodie', 'top'],
  bottom: ['trousers', 'jeans', 'shorts', 'skirt', 'leggings'],
  dress: ['dress'],
  outerwear: ['jacket', 'raincoat', 'coat', 'puffer', 'cardigan'],
  shoes: ['sneakers', 'boots', 'sandals', 'shoes'],
  accessory: ['hat', 'cap', 'scarf', 'gloves', 'bag'],
} as const satisfies Record<Category, readonly string[]>;
export type Subcategory = (typeof SUBCATEGORIES)[Category][number];

export const COLORS = [
  'black',
  'white',
  'grey',
  'beige',
  'brown',
  'navy',
  'denim',
  'blue',
  'lightblue',
  'green',
  'yellow',
  'orange',
  'red',
  'pink',
  'purple',
  'multi',
] as const;
export type ColorName = (typeof COLORS)[number];

export const STYLE_TAGS = ['casual', 'cozy', 'sporty', 'fancy', 'bright', 'comfy'] as const;
export type StyleTag = (typeof STYLE_TAGS)[number];

export const OCCASIONS = ['school', 'sport', 'party', 'home'] as const;
export type Occasion = (typeof OCCASIONS)[number];

export const MOODS = ['happy', 'cozy', 'sporty', 'fancy', 'chill'] as const;
export type Mood = (typeof MOODS)[number];

/** "Choose your style" from her sketch (page 2). Style, not identity: no gender is stored. */
export const STYLE_PREFS = ['dresses', 'trousers', 'mix'] as const;
export type StylePref = (typeof STYLE_PREFS)[number];

export type Warmth = 1 | 2 | 3 | 4 | 5;

export interface ClothingItem {
  id: string;
  /** Local sandbox URI of the clothing photo (JPEG, metadata stripped). */
  photoUri?: string;
  /** Background-removed garment (PNG with transparency) the avatar wears (D-059). Missing when the cut-out failed. */
  cutoutUri?: string;
  /** Width ÷ height of the cut-out, so the avatar can hang it from the shoulders or waist. */
  cutoutAspect?: number;
  category: Category;
  subcategory?: Subcategory;
  colors: ColorName[];
  warmth: Warmth;
  waterproof: boolean;
  windproof: boolean;
  styleTags: StyleTag[];
  occasions: Occasion[];
  favorite: boolean;
  inLaundry: boolean;
  /** Her own fine-tuning of where the garment sits when worn (D-065); same on the avatar and her photo. */
  fit?: GarmentFit;
  /** The garment's measured shape, read from the cut-out (D-068). Missing for old items until re-read. */
  shape?: GarmentShape;
  /** She turned the picture herself: don't turn it automatically again. */
  turnedByHand?: boolean;
  /** ISO timestamp, supplied by the caller (never Date.now() inside the engine). */
  createdAt: string;
}

/** A sleeve of a garment cut-out (D-068): x as a share of the cut-out's width, y of its height. */
export interface SleeveShape {
  /** Where the sleeve hangs from (the shoulder seam). */
  pivot: Pt;
  /** Degrees below horizontal, pointing outwards (0 = straight out, 90 = straight down). */
  angle: number;
  /** Length and width, as shares of the cut-out's width. */
  length: number;
  width: number;
}

/**
 * A garment's measured shape (D-068), as shares of its cut-out: centre line, half the body's width
 * (without sleeves; the waistband for trousers and skirts), and the y of the shoulder seams or the
 * waistband.
 */
export interface GarmentShape {
  v: 1;
  /** The type it was measured as (a top is measured differently from trousers). */
  of: Category;
  cx: number;
  bodyHalf: number;
  top: number;
  sleeves?: { l?: SleeveShape; r?: SleeveShape };
  /** Stretchy legwear (leggings): worn wider than it lies. */
  stretchy?: boolean;
}

/** dx/dy move the garment in shoulder-widths; scale resizes it (1 = automatic size). */
export interface GarmentFit {
  dx: number;
  dy: number;
  scale: number;
}

export type AgeBand = '11-12' | '13-15';
export type UiStyle = 'playful' | 'clean';
export type ThemeName = 'pink' | 'blue' | 'green' | 'purple';
export type ThemeMode = 'system' | 'light' | 'dark';
export type Locale = 'da' | 'en';

export const HAIR_STYLE_IDS = ['short', 'bob', 'long', 'ponytail', 'buns', 'braids', 'curly', 'puffs'] as const;
export type HairStyle = (typeof HAIR_STYLE_IDS)[number];
export const HAIR_ACCESSORIES = ['none', 'bow', 'headband', 'clips'] as const;
export type HairAccessory = (typeof HAIR_ACCESSORIES)[number];
/** Avatar height and build are picked from drawings, never as numbers (D-062: no body measurements). */
export const AVATAR_HEIGHTS = ['shorter', 'medium', 'taller'] as const;
export type AvatarHeight = (typeof AVATAR_HEIGHTS)[number];
export type AvatarBuild = 1 | 2 | 3;

export interface AvatarLook {
  skin: number; // index into the avatar skin palette
  hair: number; // index into the avatar hair palette
  hairStyle: HairStyle;
  eyes?: number; // index into the eye colour palette
  height?: AvatarHeight;
  build?: AvatarBuild;
  glasses?: boolean;
  freckles?: boolean;
  earrings?: boolean;
  accessory?: HairAccessory;
}

/** A point in a picture, as a share of its width (x) and height (y), 0–1. */
export interface Pt {
  x: number;
  y: number;
}

/** Where her shoulders, hips and feet are (left/right as seen in the picture). On-device only (D-064). */
export interface BodyPose {
  lShoulder: Pt;
  rShoulder: Pt;
  lHip: Pt;
  rHip: Pt;
  lAnkle: Pt;
  rAnkle: Pt;
  /** Where the arms point, when known (D-068): the elbow, or the wrist, on each side of the picture. */
  lArm?: Pt;
  rArm?: Pt;
}

export interface Profile {
  id: string;
  nickname: string;
  ageBand: AgeBand;
  uiStyle: UiStyle;
  stylePref: StylePref;
  likedColors: ColorName[];
  dislikedColors: ColorName[];
  /** "I run cold/warm" from the profile: negative = runs cold. Degrees C. */
  tempOffsetC: number;
  theme: ThemeName;
  themeMode: ThemeMode;
  locale: Locale;
  avatar: AvatarLook;
  /** Optional free text (school dress rules). Never leaves the device. */
  schoolRules?: string;
  /** City centre from geocoding, not GPS. */
  city?: City;
  /**
   * Parent's explicit choice to allow weather + town lookups (Open-Meteo sees the device's IP address).
   * false → the app makes no network calls at all and asks "What's it like outside?" instead.
   */
  weatherConsent: boolean;
  /** She has seen the friendly explanation shown once before the camera permission prompt. */
  cameraIntroSeen?: boolean;
  /**
   * Optional full-body photo of herself to try clothes on (D-063). During the owner's test period it
   * is stored WITHOUT blurring; blurring is to be decided before any store release. On-device only.
   */
  selfieUri?: string;
  /** Show the photo instead of the drawn avatar. */
  useSelfie?: boolean;
  /** Width ÷ height of the photo. */
  photoAspect?: number;
  /** Shoulders, hips and feet in the photo: found on the device (D-064) or tapped by her. */
  photoPose?: BodyPose;
  photoPoseSource?: 'auto' | 'manual';
}

export interface City {
  name: string;
  /** Region/country label for disambiguation in the picker. */
  label: string;
  lat: number;
  lon: number;
  timezone?: string;
}

/** One hour of forecast, already in local time of the city. */
export interface WeatherHour {
  /** Local ISO-like time "YYYY-MM-DDTHH:mm" as returned with timezone=auto. */
  time: string;
  tempC: number;
  feelsC: number;
  rainChancePct: number;
  rainMm: number;
  windKmh: number;
  uvIndex: number;
  snowCm: number;
}

/** A day summarised over school hours. This is what the engine reads. */
export interface WeatherDay {
  date: string; // YYYY-MM-DD
  tempMinC: number;
  tempMaxC: number;
  feelsMinC: number;
  feelsMaxC: number;
  rainChanceMaxPct: number;
  rainMm: number;
  windMaxKmh: number;
  uvMax: number;
  snow: boolean;
  /** True when built from her "What's it like outside?" answer instead of a forecast. */
  manual?: boolean;
}

export type OutfitSource = 'suggested' | 'edited' | 'manual';

export interface Outfit {
  id: string;
  date: string; // YYYY-MM-DD
  itemIds: string[];
  extras: ExtraKind[];
  mood?: Mood;
  weatherSnapshot?: WeatherDay;
  source: OutfitSource;
}

export const RATING_REASONS = ['tooCold', 'tooWarm', 'notMyStyle', 'loveIt', 'uncomfortable'] as const;
export type RatingReason = (typeof RATING_REASONS)[number];

export interface Rating {
  outfitId: string;
  stars: 1 | 2 | 3 | 4 | 5;
  reasons: RatingReason[];
  wore: boolean;
  createdAt: string;
}

export interface LearningState {
  /** Learned per-item weights in [-1, 1]. */
  itemWeights: Record<string, number>;
  /** Learned style-tag weights in [-1, 1]. */
  tagWeights: Partial<Record<StyleTag, number>>;
  /** Learned temperature offset in °C, added to feels-like. */
  tempOffsetC: number;
  updatedAt: string | null;
}

export interface DiaryPhoto {
  id: string;
  outfitId: string;
  photoUri: string;
  faceBlurred: boolean;
}

export const EXTRA_KINDS = [
  'rainJacket',
  'umbrella',
  'hood',
  'hat',
  'gloves',
  'scarf',
  'lipBalm',
  'sunscreen',
  'cap',
  'warmBoots',
  'layers',
] as const;
export type ExtraKind = (typeof EXTRA_KINDS)[number];
