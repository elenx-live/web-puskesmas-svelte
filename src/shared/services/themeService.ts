import type { GlobalThemeConfig } from '../types/index.js';
import { auditService } from './auditService';
import { saveSingleDocument } from '../lib/firebase';
import { apiFetch } from '../lib/api.js';

const DRAFT_KEY = 'puskesmas_theme_draft';
const PUBLISHED_KEY = 'puskesmas_theme_published';
const FIRESTORE_COLLECTION = 'site_themes';

export const THEME_PRESETS: Record<string, Omit<GlobalThemeConfig, 'id' | 'status' | 'updatedAt' | 'createdBy' | 'updatedBy'>> = {
  "fresh_mint": {
    "themeName": "Fresh Mint",
    "colorPrimary": "#18A878",
    "colorPrimaryForeground": "#FFFFFF",
    "colorSecondary": "#DDF5EA",
    "colorSecondaryForeground": "#145A3B",
    "colorAccent": "#27C7A5",
    "colorAccentForeground": "#FFFFFF",
    "colorBg": "#F8FCFA",
    "colorText": "#18332A",
    "colorCard": "#FFFFFF",
    "colorSurface": "#FFFFFF",
    "colorSurfaceForeground": "#18332A",
    "colorMuted": "#EEF6F2",
    "colorMutedForeground": "#60756C",
    "colorBorder": "#D9E9E1",
    "colorInput": "#D9E9E1",
    "colorRing": "#18A878",
    "colorSuccess": "#16A34A",
    "colorWarning": "#D97706",
    "colorDanger": "#DC2626",
    "colorInfo": "#0284C7",
    "radius": "rounded",
    "buttonStyle": "rounded"
  },
  "sehat_hijau": {
    "themeName": "Sehat Hijau",
    "colorPrimary": "#16834B",
    "colorPrimaryForeground": "#FFFFFF",
    "colorSecondary": "#DDF2E5",
    "colorSecondaryForeground": "#124C2F",
    "colorAccent": "#42B883",
    "colorAccentForeground": "#FFFFFF",
    "colorBg": "#F8FBF9",
    "colorText": "#19352A",
    "colorCard": "#FFFFFF",
    "colorSurface": "#FFFFFF",
    "colorSurfaceForeground": "#19352A",
    "colorMuted": "#EDF5EF",
    "colorMutedForeground": "#607369",
    "colorBorder": "#D7E6DB",
    "colorInput": "#D7E6DB",
    "colorRing": "#16834B",
    "colorSuccess": "#15803D",
    "colorWarning": "#B45309",
    "colorDanger": "#B91C1C",
    "colorInfo": "#0369A1",
    "radius": "rounded",
    "buttonStyle": "rounded"
  },
  "sage_wellness": {
    "themeName": "Sage Wellness",
    "colorPrimary": "#6F8F78",
    "colorPrimaryForeground": "#FFFFFF",
    "colorSecondary": "#E4ECE5",
    "colorSecondaryForeground": "#34463A",
    "colorAccent": "#91B59A",
    "colorAccentForeground": "#1F3527",
    "colorBg": "#FAFCF9",
    "colorText": "#29362E",
    "colorCard": "#FFFFFF",
    "colorSurface": "#FFFFFF",
    "colorSurfaceForeground": "#29362E",
    "colorMuted": "#F0F4F0",
    "colorMutedForeground": "#69766D",
    "colorBorder": "#DCE5DD",
    "colorInput": "#DCE5DD",
    "colorRing": "#6F8F78",
    "colorSuccess": "#4D8B5B",
    "colorWarning": "#B7791F",
    "colorDanger": "#C2413B",
    "colorInfo": "#4B7EA8",
    "radius": "rounded",
    "buttonStyle": "rounded"
  },
  "teal_health": {
    "themeName": "Teal Health",
    "colorPrimary": "#0F9D8A",
    "colorPrimaryForeground": "#FFFFFF",
    "colorSecondary": "#D9F3EF",
    "colorSecondaryForeground": "#155E57",
    "colorAccent": "#26BBD1",
    "colorAccentForeground": "#FFFFFF",
    "colorBg": "#F7FCFC",
    "colorText": "#193737",
    "colorCard": "#FFFFFF",
    "colorSurface": "#FFFFFF",
    "colorSurfaceForeground": "#193737",
    "colorMuted": "#EAF5F4",
    "colorMutedForeground": "#607676",
    "colorBorder": "#D6E8E6",
    "colorInput": "#D6E8E6",
    "colorRing": "#0F9D8A",
    "colorSuccess": "#16A085",
    "colorWarning": "#D97706",
    "colorDanger": "#DC2626",
    "colorInfo": "#0284C7",
    "radius": "rounded",
    "buttonStyle": "rounded"
  },
  "aqua_sehat": {
    "themeName": "Aqua Sehat",
    "colorPrimary": "#149EAA",
    "colorPrimaryForeground": "#FFFFFF",
    "colorSecondary": "#DDF4F5",
    "colorSecondaryForeground": "#14565C",
    "colorAccent": "#54C7B8",
    "colorAccentForeground": "#123E3B",
    "colorBg": "#F7FCFD",
    "colorText": "#18343A",
    "colorCard": "#FFFFFF",
    "colorSurface": "#FFFFFF",
    "colorSurfaceForeground": "#18343A",
    "colorMuted": "#EAF6F7",
    "colorMutedForeground": "#60767A",
    "colorBorder": "#D6E8EA",
    "colorInput": "#D6E8EA",
    "colorRing": "#149EAA",
    "colorSuccess": "#159957",
    "colorWarning": "#D97706",
    "colorDanger": "#DC2626",
    "colorInfo": "#2563EB",
    "radius": "rounded",
    "buttonStyle": "rounded"
  },
  "government_health": {
    "themeName": "Government Health",
    "colorPrimary": "#126B3A",
    "colorPrimaryForeground": "#FFFFFF",
    "colorSecondary": "#DCEEE3",
    "colorSecondaryForeground": "#174B2F",
    "colorAccent": "#1B8A57",
    "colorAccentForeground": "#FFFFFF",
    "colorBg": "#FAFCFA",
    "colorText": "#1D3026",
    "colorCard": "#FFFFFF",
    "colorSurface": "#FFFFFF",
    "colorSurfaceForeground": "#1D3026",
    "colorMuted": "#EEF4EF",
    "colorMutedForeground": "#647269",
    "colorBorder": "#D9E5DB",
    "colorInput": "#D9E5DB",
    "colorRing": "#126B3A",
    "colorSuccess": "#15803D",
    "colorWarning": "#A16207",
    "colorDanger": "#B91C1C",
    "colorInfo": "#075985",
    "radius": "rounded",
    "buttonStyle": "rounded"
  }
};

export const INITIAL_THEME: GlobalThemeConfig = {
  id: 'global-theme-config',
  status: 'draft',
  updatedAt: new Date().toISOString(),
  ...THEME_PRESETS.fresh_mint
};

export const themeService = {
  async getDraftConfig(): Promise<GlobalThemeConfig> {
    // 1. Check local cache first
    let cachedDraft = INITIAL_THEME;
    try {
      const data = localStorage.getItem(DRAFT_KEY);
      if (data) {
        cachedDraft = JSON.parse(data);
      }
    } catch {}

    // 2. Try fetching from server
    try {
      const res = await apiFetch('/api/theme/draft?_t=' + Date.now(), {
        headers: { 'Cache-Control': 'no-cache' }
      });
      if (res.ok) {
        const json = await res.json();
        if (json && json.theme && json.theme.themeName) {
          localStorage.setItem(DRAFT_KEY, JSON.stringify(json.theme));
          return json.theme;
        }
      }
    } catch {}

    return cachedDraft;
  },

  async getPublishedConfig(): Promise<GlobalThemeConfig> {
    const defaultPublished: GlobalThemeConfig = { ...INITIAL_THEME, status: 'published' };
    let cachedPublished: GlobalThemeConfig = defaultPublished;

    // 1. Read local storage for 0ms initial render
    try {
      const data = localStorage.getItem(PUBLISHED_KEY);
      if (data) {
        cachedPublished = { ...defaultPublished, ...JSON.parse(data), status: 'published' };
      }
    } catch {}

    // 2. Fetch latest published theme from Node.js server
    try {
      const res = await fetch('/api/theme/published?_t=' + Date.now(), {
        headers: { 'Cache-Control': 'no-cache' }
      });
      if (res.ok) {
        const json = await res.json();
        if (json && json.theme && json.theme.themeName) {
          const serverTheme: GlobalThemeConfig = { ...defaultPublished, ...json.theme, status: 'published' };
          const serverStr = JSON.stringify(serverTheme);
          const cachedStr = JSON.stringify(cachedPublished);
          if (serverStr !== cachedStr) {
            localStorage.setItem(PUBLISHED_KEY, serverStr);
            window.dispatchEvent(new Event('puskesmas_theme_updated'));
          }
          return serverTheme;
        }
      }
    } catch (e) {
      console.warn('Server theme fetch failed:', e);
    }

    return cachedPublished;
  },

  async saveDraft(config: Omit<GlobalThemeConfig, 'id' | 'status' | 'updatedAt'>, updatedBy: { id: string; email: string; name: string }): Promise<GlobalThemeConfig> {
    const fullConfig: GlobalThemeConfig = {
      ...config,
      id: 'global-theme-config',
      status: 'draft',
      updatedAt: new Date().toISOString(),
      updatedBy: updatedBy.id
    };

    // 1. Save locally
    localStorage.setItem(DRAFT_KEY, JSON.stringify(fullConfig));

    // 2. Save to server backend
    try {
      await apiFetch('/api/theme/draft', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(fullConfig)
      });
    } catch (err) {
      console.warn('Server theme draft save failed:', err);
    }

    // 3. Save to VPS database via /api/db/*
    saveSingleDocument(FIRESTORE_COLLECTION, 'draft', fullConfig, DRAFT_KEY).catch(() => {});

    await auditService.recordLog({
      userId: updatedBy.id,
      userEmail: updatedBy.email,
      userName: updatedBy.name,
      action: 'UPDATE',
      module: 'THEME',
      targetId: 'global-theme-config',
      targetName: `Tema Custom (${config.themeName})`,
      description: 'Menyimpan draft kustomisasi tema visual website publik.'
    });

    return fullConfig;
  },

  async publish(config: Omit<GlobalThemeConfig, 'id' | 'status' | 'updatedAt'>, updatedBy: { id: string; email: string; name: string }): Promise<GlobalThemeConfig> {
    await this.saveDraft(config, updatedBy);

    const fullConfig: GlobalThemeConfig = {
      ...config,
      id: 'global-theme-config',
      status: 'published',
      updatedAt: new Date().toISOString(),
      updatedBy: updatedBy.id
    };

    // 1. Save locally and dispatch event immediately
    localStorage.setItem(PUBLISHED_KEY, JSON.stringify(fullConfig));
    window.dispatchEvent(new Event('puskesmas_theme_updated'));

    // 2. Persist to Node.js server so all visitors get this theme instantly
    try {
      await apiFetch('/api/theme/publish', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(fullConfig)
      });
    } catch (err) {
      console.warn('Server theme publish failed:', err);
    }

    // 3. Persist to VPS database via /api/db/*
    saveSingleDocument(FIRESTORE_COLLECTION, 'published', fullConfig, PUBLISHED_KEY).catch(() => {});

    await auditService.recordLog({
      userId: updatedBy.id,
      userEmail: updatedBy.email,
      userName: updatedBy.name,
      action: 'PUBLISH',
      module: 'THEME',
      targetId: 'global-theme-config',
      targetName: `Tema Custom (${config.themeName})`,
      description: 'Mempublikasikan kustomisasi tema visual ke website publik.'
    });

    return fullConfig;
  },

  async resetToDefault(updatedBy: { id: string; email: string; name: string }): Promise<GlobalThemeConfig> {
    const resetConfig: GlobalThemeConfig = {
      ...INITIAL_THEME,
      updatedAt: new Date().toISOString(),
      updatedBy: updatedBy.id
    };

    // 1. Reset locally
    localStorage.setItem(DRAFT_KEY, JSON.stringify(resetConfig));
    localStorage.setItem(PUBLISHED_KEY, JSON.stringify({ ...resetConfig, status: 'published' }));
    window.dispatchEvent(new Event('puskesmas_theme_updated'));

    // 2. Reset on server
    try {
      await apiFetch('/api/theme/reset', { method: 'POST' });
    } catch (err) {
      console.warn('Server theme reset failed:', err);
    }

    // 3. Reset in VPS database via /api/db/*
    saveSingleDocument(FIRESTORE_COLLECTION, 'published', { ...resetConfig, status: 'published' }, PUBLISHED_KEY).catch(() => {});
    saveSingleDocument(FIRESTORE_COLLECTION, 'draft', resetConfig, DRAFT_KEY).catch(() => {});

    await auditService.recordLog({
      userId: updatedBy.id,
      userEmail: updatedBy.email,
      userName: updatedBy.name,
      action: 'UPDATE',
      module: 'THEME',
      targetId: 'global-theme-config',
      targetName: 'Tema Default',
      description: 'Mereset tema visual website publik ke pengaturan bawaan.'
    });

    return resetConfig;
  }
};
