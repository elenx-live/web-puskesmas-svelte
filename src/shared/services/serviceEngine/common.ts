// TAHAP 3 — hasil pemecahan serviceEngineService.ts (perilaku TIDAK berubah).
import type {
  ServiceEntity,
  ServiceStatus,
  ServiceCategoryEntity,
  ServiceClusterEntity,
  ServiceUnitEntity,
  ServiceLocationEntity,
  ServiceRequirementEntity,
  ServiceProcedureEntity,
  ServiceProductEntity,
  ServiceStandardEntity,
  DayOfWeek,
  ServiceScheduleRuleEntity,
  ServiceScheduleEntity,
  ScheduleExceptionType,
  ServiceScheduleExceptionEntity,
  PricingType,
  ServicePricingEntity,
  ActiveStatus
} from '../../types/index.js';
import { auditService } from '../auditService';
import { saveSingleDocument } from '../../lib/firebase';

export const SERVICES_STORAGE_KEY = 'puskesmas_services';
export const CATEGORIES_STORAGE_KEY = 'puskesmas_service_categories';
export const CLUSTERS_STORAGE_KEY = 'puskesmas_service_clusters';
export const UNITS_STORAGE_KEY = 'puskesmas_service_units';
export const LOCATIONS_STORAGE_KEY = 'puskesmas_service_locations';
export const REQUIREMENTS_STORAGE_KEY = 'puskesmas_service_requirements';
export const PROCEDURES_STORAGE_KEY = 'puskesmas_service_procedures';
export const PRODUCTS_STORAGE_KEY = 'puskesmas_service_products';
export const STANDARDS_STORAGE_KEY = 'puskesmas_service_standards';
export const SCHEDULES_STORAGE_KEY = 'puskesmas_service_schedules';
export const EXCEPTIONS_STORAGE_KEY = 'puskesmas_service_schedule_exceptions';
export const PRICING_STORAGE_KEY = 'puskesmas_service_pricing';


export function sanitizeInput(input?: string): string {
  if (!input) return '';
  return input
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/javascript:/gi, '')
    .replace(/on\w+\s*=/gi, '');
}


function getStoredRequirements(): ServiceRequirementEntity[] {
  try {
    const data = localStorage.getItem(REQUIREMENTS_STORAGE_KEY);
    if (!data) {
      fetch('/api/db/service_requirements').then(r => r.json()).then(res => {
        const arrData = Array.isArray(res) ? res : (res && Array.isArray(res.docs) ? res.docs : (res && res.success && Array.isArray(res.data) ? res.data : null)); if (arrData) {
          localStorage.setItem(REQUIREMENTS_STORAGE_KEY, JSON.stringify(arrData));
        }
      }).catch(() => {});
      return [];
    }
    return JSON.parse(data);
  } catch {
    return [];
  }
}

function saveStoredRequirements(items: ServiceRequirementEntity[]) {
  try {
    localStorage.setItem(REQUIREMENTS_STORAGE_KEY, JSON.stringify(items));
    saveSingleDocument('service_engine', 'requirements', items, REQUIREMENTS_STORAGE_KEY).catch(() => {});
    fetch('/api/db/service_requirements', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(items)
    }).catch(() => {});
  } catch (err) {
    console.error('Failed to save requirements:', err);
  }
}

function getStoredProcedures(): ServiceProcedureEntity[] {
  try {
    const data = localStorage.getItem(PROCEDURES_STORAGE_KEY);
    if (!data) {
      fetch('/api/db/service_procedures').then(r => r.json()).then(res => {
        const arrData = Array.isArray(res) ? res : (res && Array.isArray(res.docs) ? res.docs : (res && res.success && Array.isArray(res.data) ? res.data : null)); if (arrData) {
          localStorage.setItem(PROCEDURES_STORAGE_KEY, JSON.stringify(arrData));
        }
      }).catch(() => {});
      return [];
    }
    return JSON.parse(data);
  } catch {
    return [];
  }
}

function saveStoredProcedures(items: ServiceProcedureEntity[]) {
  try {
    localStorage.setItem(PROCEDURES_STORAGE_KEY, JSON.stringify(items));
    saveSingleDocument('service_engine', 'procedures', items, PROCEDURES_STORAGE_KEY).catch(() => {});
    fetch('/api/db/service_procedures', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(items)
    }).catch(() => {});
  } catch (err) {
    console.error('Failed to save procedures:', err);
  }
}

function getStoredProducts(): ServiceProductEntity[] {
  try {
    const data = localStorage.getItem(PRODUCTS_STORAGE_KEY);
    if (!data) {
      fetch('/api/db/service_products').then(r => r.json()).then(res => {
        const arrData = Array.isArray(res) ? res : (res && Array.isArray(res.docs) ? res.docs : (res && res.success && Array.isArray(res.data) ? res.data : null)); if (arrData) {
          localStorage.setItem(PRODUCTS_STORAGE_KEY, JSON.stringify(arrData));
        }
      }).catch(() => {});
      return [];
    }
    return JSON.parse(data);
  } catch {
    return [];
  }
}

function saveStoredProducts(items: ServiceProductEntity[]) {
  try {
    localStorage.setItem(PRODUCTS_STORAGE_KEY, JSON.stringify(items));
    saveSingleDocument('service_engine', 'products', items, PRODUCTS_STORAGE_KEY).catch(() => {});
    fetch('/api/db/service_products', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(items)
    }).catch(() => {});
  } catch (err) {
    console.error('Failed to save products:', err);
  }
}

function getStoredStandards(): ServiceStandardEntity[] {
  try {
    const data = localStorage.getItem(STANDARDS_STORAGE_KEY);
    if (!data) {
      fetch('/api/db/service_standards').then(r => r.json()).then(res => {
        const arrData = Array.isArray(res) ? res : (res && Array.isArray(res.docs) ? res.docs : (res && res.success && Array.isArray(res.data) ? res.data : null)); if (arrData) {
          localStorage.setItem(STANDARDS_STORAGE_KEY, JSON.stringify(arrData));
        }
      }).catch(() => {});
      return [];
    }
    return JSON.parse(data);
  } catch {
    return [];
  }
}

function saveStoredStandards(items: ServiceStandardEntity[]) {
  try {
    localStorage.setItem(STANDARDS_STORAGE_KEY, JSON.stringify(items));
    saveSingleDocument('service_engine', 'standards', items, STANDARDS_STORAGE_KEY).catch(() => {});
    fetch('/api/db/service_standards', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(items)
    }).catch(() => {});
  } catch (err) {
    console.error('Failed to save standards:', err);
  }
}

function getStoredServices(): ServiceEntity[] {
  try {
    const data = localStorage.getItem(SERVICES_STORAGE_KEY);
    if (!data) {
      fetch('/api/db/services').then(r => r.json()).then(res => {
        const arrData = Array.isArray(res) ? res : (res && Array.isArray(res.docs) ? res.docs : (res && res.success && Array.isArray(res.data) ? res.data : null)); if (arrData) {
          localStorage.setItem(SERVICES_STORAGE_KEY, JSON.stringify(arrData));
        }
      }).catch(() => {});
      return [];
    }
    return JSON.parse(data);
  } catch {
    return [];
  }
}

function saveStoredServices(services: ServiceEntity[]) {
  try {
    localStorage.setItem(SERVICES_STORAGE_KEY, JSON.stringify(services));
    saveSingleDocument('service_engine', 'services', services, SERVICES_STORAGE_KEY).catch(() => {});
    fetch('/api/db/services', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(services)
    }).catch(() => {});
  } catch (err) {
    console.error('Failed to save services:', err);
  }
}

function getStoredCategories(): ServiceCategoryEntity[] {
  try {
    const data = localStorage.getItem(CATEGORIES_STORAGE_KEY);
    if (!data) {
      fetch('/api/db/service_categories').then(r => r.json()).then(res => {
        const arrData = Array.isArray(res) ? res : (res && Array.isArray(res.docs) ? res.docs : (res && res.success && Array.isArray(res.data) ? res.data : null)); if (arrData) {
          localStorage.setItem(CATEGORIES_STORAGE_KEY, JSON.stringify(arrData));
        }
      }).catch(() => {});
      return [];
    }
    return JSON.parse(data);
  } catch {
    return [];
  }
}

function saveStoredCategories(categories: ServiceCategoryEntity[]) {
  try {
    localStorage.setItem(CATEGORIES_STORAGE_KEY, JSON.stringify(categories));
    saveSingleDocument('service_engine', 'categories', categories, CATEGORIES_STORAGE_KEY).catch(() => {});
    fetch('/api/db/service_categories', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(categories)
    }).catch(() => {});
  } catch (err) {
    console.error('Failed to save categories:', err);
  }
}

function getStoredClusters(): ServiceClusterEntity[] {
  try {
    const data = localStorage.getItem(CLUSTERS_STORAGE_KEY);
    if (!data) {
      fetch('/api/db/service_clusters').then(r => r.json()).then(res => {
        const arrData = Array.isArray(res) ? res : (res && Array.isArray(res.docs) ? res.docs : (res && res.success && Array.isArray(res.data) ? res.data : null)); if (arrData) {
          localStorage.setItem(CLUSTERS_STORAGE_KEY, JSON.stringify(arrData));
        }
      }).catch(() => {});
      return [];
    }
    return JSON.parse(data);
  } catch {
    return [];
  }
}

function saveStoredClusters(clusters: ServiceClusterEntity[]) {
  try {
    localStorage.setItem(CLUSTERS_STORAGE_KEY, JSON.stringify(clusters));
    saveSingleDocument('service_engine', 'clusters', clusters, CLUSTERS_STORAGE_KEY).catch(() => {});
    fetch('/api/db/service_clusters', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(clusters)
    }).catch(() => {});
  } catch (err) {
    console.error('Failed to save clusters:', err);
  }
}

function getStoredUnits(): ServiceUnitEntity[] {
  try {
    const data = localStorage.getItem(UNITS_STORAGE_KEY);
    if (!data) {
      fetch('/api/db/service_units').then(r => r.json()).then(res => {
        const arrData = Array.isArray(res) ? res : (res && Array.isArray(res.docs) ? res.docs : (res && res.success && Array.isArray(res.data) ? res.data : null)); if (arrData) {
          localStorage.setItem(UNITS_STORAGE_KEY, JSON.stringify(arrData));
        }
      }).catch(() => {});
      return [];
    }
    return JSON.parse(data);
  } catch {
    return [];
  }
}

function saveStoredUnits(units: ServiceUnitEntity[]) {
  try {
    localStorage.setItem(UNITS_STORAGE_KEY, JSON.stringify(units));
    saveSingleDocument('service_engine', 'units', units, UNITS_STORAGE_KEY).catch(() => {});
    fetch('/api/db/service_units', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(units)
    }).catch(() => {});
  } catch (err) {
    console.error('Failed to save units:', err);
  }
}

function getStoredLocations(): ServiceLocationEntity[] {
  try {
    const data = localStorage.getItem(LOCATIONS_STORAGE_KEY);
    if (!data) {
      fetch('/api/db/service_locations').then(r => r.json()).then(res => {
        const arrData = Array.isArray(res) ? res : (res && Array.isArray(res.docs) ? res.docs : (res && res.success && Array.isArray(res.data) ? res.data : null)); if (arrData) {
          localStorage.setItem(LOCATIONS_STORAGE_KEY, JSON.stringify(arrData));
        }
      }).catch(() => {});
      return [];
    }
    return JSON.parse(data);
  } catch {
    return [];
  }
}

function saveStoredLocations(locations: ServiceLocationEntity[]) {
  try {
    localStorage.setItem(LOCATIONS_STORAGE_KEY, JSON.stringify(locations));
    saveSingleDocument('service_engine', 'locations', locations, LOCATIONS_STORAGE_KEY).catch(() => {});
    fetch('/api/db/service_locations', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(locations)
    }).catch(() => {});
  } catch (err) {
    console.error('Failed to save locations:', err);
  }
}


export function generateSlug(text: string, currentId?: string, existingItems: { id: string; slug: string }[] = []): string {
  let baseSlug = text
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-');

  if (!baseSlug) baseSlug = 'item-baru';

  let uniqueSlug = baseSlug;
  let counter = 1;

  while (existingItems.some(item => item.slug === uniqueSlug && item.id !== currentId)) {
    uniqueSlug = `${baseSlug}-${counter}`;
    counter++;
  }

  return uniqueSlug;
}


export {
  getStoredRequirements, saveStoredRequirements,
  getStoredProcedures, saveStoredProcedures,
  getStoredProducts, saveStoredProducts,
  getStoredStandards, saveStoredStandards,
  getStoredServices, saveStoredServices,
  getStoredCategories, saveStoredCategories,
  getStoredClusters, saveStoredClusters,
  getStoredUnits, saveStoredUnits,
  getStoredLocations, saveStoredLocations,
  auditService, saveSingleDocument,
};
