import { auditService } from './auditService';

export interface ContentVersion {
  id: string;
  targetType: 'post' | 'page' | 'faq' | 'announcement' | 'document';
  targetId: string;
  versionNumber: number;
  snapshot: any;
  author: string;
  createdAt: string;
  changeSummary: string;
}

const STORAGE_KEY = 'puskesmas_content_versions_v1';

export const versioningService = {
  getVersions(targetType?: string, targetId?: string): ContentVersion[] {
    try {
      const data = localStorage.getItem(STORAGE_KEY);
      let list: ContentVersion[] = data ? JSON.parse(data) : [];
      if (targetType) {
        list = list.filter(v => v.targetType === targetType);
      }
      if (targetId) {
        list = list.filter(v => v.targetId === targetId);
      }
      return list;
    } catch {
      return [];
    }
  },

  saveVersions(versions: ContentVersion[]) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(versions));
  },

  createVersion(
    targetType: 'post' | 'page' | 'faq' | 'announcement' | 'document',
    targetId: string,
    snapshot: any,
    changeSummary: string,
    actor: { id: string; email: string; name: string }
  ): ContentVersion {
    const all = this.getVersions();
    const existingForTarget = all.filter(v => v.targetType === targetType && v.targetId === targetId);
    const nextVersionNumber = existingForTarget.length + 1;

    const newVersion: ContentVersion = {
      id: `ver-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      targetType,
      targetId,
      versionNumber: nextVersionNumber,
      snapshot,
      author: actor.name || actor.email,
      createdAt: new Date().toISOString(),
      changeSummary: changeSummary || `Pembaruan versi ke-${nextVersionNumber}`
    };

    all.unshift(newVersion);
    this.saveVersions(all);

    auditService.recordLog({
      userId: actor.id,
      userName: actor.name,
      userEmail: actor.email,
      module: 'PAGES',
      action: 'CREATE',
      description: `Membuat versi baru v${nextVersionNumber} untuk ${targetType} ID ${targetId}.`
    });

    return newVersion;
  },

  restoreVersion(versionId: string, actor: { id: string; email: string; name: string }): ContentVersion {
    const all = this.getVersions();
    const targetVer = all.find(v => v.id === versionId);
    if (!targetVer) throw new Error('Versi konten tidak ditemukan.');

    const restoredSnapshot = { ...targetVer.snapshot, status: 'draft' };
    const newVer = this.createVersion(
      targetVer.targetType,
      targetVer.targetId,
      restoredSnapshot,
      `Restore dari Versi ${targetVer.versionNumber}`,
      actor
    );

    auditService.recordLog({
      userId: actor.id,
      userName: actor.name,
      userEmail: actor.email,
      module: 'PAGES',
      action: 'UPDATE',
      description: `Restore dari Versi ${targetVer.versionNumber}, membuat Versi baru v${newVer.versionNumber} (Draft).`
    });

    return newVer;
  }
};
