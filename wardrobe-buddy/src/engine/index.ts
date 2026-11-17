/**
 * Outfit engine public API. Pure TypeScript: no React, storage, network,
 * Date.now() or Math.random() anywhere under src/engine (enforced by a test).
 */
export { BANDS, ENGINE_CONFIG, type BandName } from './engine.config';
export { extrasFor } from './extras';
export { applyRating, initialLearning, pruneLearning, summarizeLearning, type LearningSummary } from './learning';
export { suggest, type Reason, type SuggestInput, type SuggestResult, type Suggestion, type Tip } from './suggest';
export { planWeek, type PlannedDay } from './week';
export { swapIn } from './swap';
export { bandFor, isRainy, isWindy, manualWeatherDay, summarizeSchoolHours, type ManualWeather } from './weather';
