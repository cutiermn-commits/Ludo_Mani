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
  /** ISO timestamp, supplied by the caller (never Date.now() inside the engine). */
  createdAt: string;
}

export type AgeBand = '11-12' | '13-15';
export type UiStyle = 'playful' | 'clean';
export type ThemeName = 'pink' | 'blue' | 'green' | 'purple';
export type ThemeMode = 'system' | 'light' | 'dark';
export type Locale = 'da' | 'en';

export interface AvatarLook {
  skin: number; // index into the avatar skin palette
  hair: number; // index into the avatar hair palette
  hairStyle: 'short' | 'long' | 'ponytail' | 'buns';
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
  /** Optional selfie, stored with the face area blurred (D-033, D-045). */
  selfieUri?: string;
  /** Show the selfie instead of the drawn avatar. */
  useSelfie?: boolean;
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
