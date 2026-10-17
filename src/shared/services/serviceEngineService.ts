// TAHAP 3 — file ini menjadi re-export kompatibel.
// Implementasi dipecah per domain ke src/shared/services/serviceEngine/.
// Seluruh import yang ada (serviceEngineService, INITIAL_*, dst.) tetap berfungsi
// tanpa perubahan; perilaku TIDAK berubah.
import { clustersApi } from './serviceEngine/clusters.js';
import { categoriesApi } from './serviceEngine/categories.js';
import { unitsApi } from './serviceEngine/units.js';
import { locationsApi } from './serviceEngine/locations.js';
import { servicesApi } from './serviceEngine/services.js';
import {
  requirementsApi,
  proceduresApi,
  productsApi,
  standardsApi,
} from './serviceEngine/serviceItems.js';
import { schedulesApi } from './serviceEngine/schedules.js';

export const serviceEngineService = {
  ...clustersApi,
  ...categoriesApi,
  ...unitsApi,
  ...locationsApi,
  ...servicesApi,
  ...requirementsApi,
  ...proceduresApi,
  ...productsApi,
  ...standardsApi,
  ...schedulesApi,
};

export { sanitizeInput, generateSlug } from './serviceEngine/common.js';
export {
  INITIAL_CLUSTERS,
  INITIAL_CATEGORIES,
  INITIAL_UNITS,
  INITIAL_LOCATIONS,
  INITIAL_SERVICES,
  INITIAL_REQUIREMENTS,
  INITIAL_PROCEDURES,
  INITIAL_PRODUCTS,
  INITIAL_STANDARDS,
} from './serviceEngine/initialData.js';
export {
  DEFAULT_DAYS,
  createDefaultScheduleRules,
  INITIAL_PRICING,
  validateTimeRule,
  checkPricingRangeOverlap,
  calculateTodayOperationalStatus,
} from './serviceEngine/schedules.js';
export type { OperationalStatusResult } from './serviceEngine/schedules.js';
