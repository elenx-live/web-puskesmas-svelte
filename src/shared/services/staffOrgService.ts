import type { OrganizationNode, StaffProfile, StaffAssignmentHistory } from '../types/index.js';
import { auditService } from './auditService';
import { sanitizeHtml, sanitizeText } from '../utils/sanitize';
import { getCollectionData, saveDocumentData, deleteDocumentData } from '../lib/firebase';
import { memStore } from '../lib/memStore';

const ORG_STORAGE_KEY = 'puskesmas_org_nodes';
const STAFF_STORAGE_KEY = 'puskesmas_staff_profiles';
const HISTORY_STORAGE_KEY = 'puskesmas_staff_history';

const ORG_COLLECTION = 'staff_org';
const STAFF_COLLECTION = 'staff_profiles';
const HISTORY_COLLECTION = 'staff_history';

const INITIAL_ORG_NODES: OrganizationNode[] = [
  {
    id: 'org-1',
    name: 'Puskesmas Manding',
    title: 'Kepala Puskesmas',
    order: 1,
    description: 'Pimpinan tertinggi fasilitas kesehatan tingkat pertama yang bertanggung jawab atas seluruh operasional klinis dan administratif.',
    status: 'active',
    showOnWebsite: true,
    userId: 'usr-superadmin-01',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: 'org-2',
    name: 'Sub Bagian Tata Usaha',
    title: 'Kepala Tata Usaha',
    parentId: 'org-1',
    order: 2,
    description: 'Mengelola administrasi keuangan, kepegawaian, surat-menyurat, dan pelaporan.',
    status: 'active',
    showOnWebsite: true,
    userId: 'usr-adminweb-02',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: 'org-3',
    name: 'Klaster 1: Manajemen, Ibu & Anak',
    title: 'Penanggung Jawab Klaster 1',
    parentId: 'org-1',
    order: 3,
    description: 'Fokus pada kesehatan ibu hamil, bersalin, nifas, bayi, balita, dan prasekolah.',
    status: 'active',
    showOnWebsite: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: 'org-4',
    name: 'Klaster 2: Usia Dewasa & Lanjut Usia',
    title: 'Penanggung Jawab Klaster 2',
    parentId: 'org-1',
    order: 4,
    description: 'Pelayanan kesehatan usia produktif dan lansia (Posyandu Lansia, PTM).',
    status: 'active',
    showOnWebsite: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: 'org-5',
    name: 'Klaster 3: Penanggulangan Penyakit & Lintas Klaster',
    title: 'Penanggung Jawab Klaster 3',
    parentId: 'org-1',
    order: 5,
    description: 'Surveilans, pencegahan dan pengendalian penyakit menular serta tidak menular.',
    status: 'active',
    showOnWebsite: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: 'org-6',
    name: 'Pelayanan Gawat Darurat & Kefarmasian',
    title: 'Kepala Unit UGD & Farmasi',
    parentId: 'org-1',
    order: 6,
    description: 'Layanan darurat medis 24 jam dan pengelolaan apotek puskesmas.',
    status: 'active',
    showOnWebsite: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  }
];

const INITIAL_STAFF_PROFILES: StaffProfile[] = [
  {
    id: 'staff-1',
    userId: 'usr-superadmin-01',
    name: 'dr. H. Ahmad Fauzi, M.Kes',
    photoUrl: 'https://images.unsplash.com/photo-1622253692010-333f2da6031d?auto=format&fit=crop&q=80&w=600',
    positionTitle: 'Kepala Puskesmas & Dokter Madya',
    unitId: 'org-1',
    unitName: 'Puskesmas Manding',
    serviceIds: ['srv-1', 'srv-2'],
    primaryServiceId: 'srv-1',
    locationId: 'loc-1',
    bio: 'Berpengalaman lebih dari 15 tahun di bidang kesehatan masyarakat dan manajemen layanan primer.',
    education: 'S2 Administrasi Rumah Sakit / Spesialis Kesehatan Masyarakat',
    scheduleSummary: 'Senin - Kamis (08:00 - 14:00)',
    showOnWebsite: true,
    status: 'active',
    reviewStatus: 'approved',
    createdAt: new Date(Date.now() - 86400000 * 30).toISOString(),
    updatedAt: new Date(Date.now() - 86400000 * 5).toISOString()
  },
  {
    id: 'staff-2',
    userId: 'usr-adminweb-02',
    name: 'Budi Santoso, SKM',
    photoUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=600',
    positionTitle: 'Administrator & Kepala Tata Usaha',
    unitId: 'org-2',
    unitName: 'Sub Bagian Tata Usaha',
    serviceIds: ['srv-2'],
    primaryServiceId: 'srv-2',
    locationId: 'loc-1',
    bio: 'Mengkoordinasikan administrasi publik, pengelolaan arsip digital, dan pelayanan informasi publik.',
    education: 'S1 Kesehatan Masyarakat (Universitas Indonesia)',
    scheduleSummary: 'Senin - Jumat (07:30 - 15:30)',
    showOnWebsite: true,
    status: 'active',
    reviewStatus: 'approved',
    createdAt: new Date(Date.now() - 86400000 * 25).toISOString(),
    updatedAt: new Date(Date.now() - 86400000 * 4).toISOString()
  },
  {
    id: 'staff-3',
    userId: 'usr-editor-03',
    name: 'drg. Maya Lestari',
    photoUrl: 'https://images.unsplash.com/photo-1594824813575-502a95574347?auto=format&fit=crop&q=80&w=600',
    positionTitle: 'Dokter Gigi Spesialis Poli Gigi',
    unitId: 'org-3',
    unitName: 'Klaster 1: Manajemen, Ibu & Anak',
    serviceIds: ['srv-dental'],
    primaryServiceId: 'srv-dental',
    locationId: 'loc-1',
    bio: 'Berdedikasi dalam kesehatan gigi dan mulut keluarga serta pencegahan karies anak sejak dini.',
    education: 'Profesi Dokter Gigi Universitas Gadjah Mada',
    scheduleSummary: 'Selasa, Rabu, Jumat (08:00 - 13:00)',
    showOnWebsite: true,
    status: 'active',
    reviewStatus: 'approved',
    createdAt: new Date(Date.now() - 86400000 * 20).toISOString(),
    updatedAt: new Date(Date.now() - 86400000 * 3).toISOString()
  },
  {
    id: 'staff-4',
    userId: 'usr-patient-01',
    name: 'Ns. Siti Rahmawati, S.Kep',
    photoUrl: 'https://images.unsplash.com/photo-1559839734-2b71ea197ec2?auto=format&fit=crop&q=80&w=600',
    positionTitle: 'Perawat Penanggung Jawab Klaster 2 & Lansia',
    unitId: 'org-4',
    unitName: 'Klaster 2: Usia Dewasa & Lanjut Usia',
    serviceIds: ['srv-lansia', 'srv-umum'],
    primaryServiceId: 'srv-lansia',
    locationId: 'loc-1',
    bio: 'Aktif mengelola posyandu lansia dan pendampingan pasien dengan penyakit kronis.',
    education: 'Ners & S1 Keperawatan',
    scheduleSummary: 'Senin - Jumat (08:00 - 14:00)',
    showOnWebsite: true,
    status: 'active',
    reviewStatus: 'approved',
    createdAt: new Date(Date.now() - 86400000 * 15).toISOString(),
    updatedAt: new Date(Date.now() - 86400000 * 2).toISOString()
  },
  {
    id: 'staff-5',
    userId: 'usr-guest-01',
    name: 'Apoteker Rina Hartati, S.Farm, Apt',
    photoUrl: 'https://images.unsplash.com/photo-1594824813575-502a95574347?auto=format&fit=crop&q=80&w=600',
    positionTitle: 'Apoteker Penanggung Jawab Farmasi',
    unitId: 'org-6',
    unitName: 'Pelayanan Gawat Darurat & Kefarmasian',
    serviceIds: ['srv-farmasi'],
    primaryServiceId: 'srv-farmasi',
    locationId: 'loc-1',
    bio: 'Memberikan edukasi penggunaan obat rasional dan pelayanan resep pasien rawat jalan.',
    education: 'Profesi Apoteker',
    scheduleSummary: 'Senin - Sabtu (08:00 - 16:00)',
    showOnWebsite: true,
    status: 'active',
    reviewStatus: 'approved',
    createdAt: new Date(Date.now() - 86400000 * 10).toISOString(),
    updatedAt: new Date(Date.now() - 86400000 * 1).toISOString()
  }
];

const INITIAL_HISTORY: StaffAssignmentHistory[] = [
  {
    id: 'hist-1',
    staffId: 'staff-3',
    staffName: 'drg. Maya Lestari',
    previousUnitName: 'Klaster 2: Usia Dewasa & Lanjut Usia',
    newUnitName: 'Klaster 1: Manajemen, Ibu & Anak',
    changedAt: new Date(Date.now() - 86400000 * 12).toISOString(),
    changedBy: { id: 'usr-superadmin-01', name: 'Administrator Utama' }
  }
];

function getStoredOrgNodes(): OrganizationNode[] {
  try {
    const data = memStore.getItem(ORG_STORAGE_KEY);
    if (!data) {
      memStore.setItem(ORG_STORAGE_KEY, JSON.stringify(INITIAL_ORG_NODES));
      return INITIAL_ORG_NODES;
    }
    return JSON.parse(data);
  } catch {
    return INITIAL_ORG_NODES;
  }
}

function saveStoredOrgNodes(nodes: OrganizationNode[]) {
  try {
    memStore.setItem(ORG_STORAGE_KEY, JSON.stringify(nodes));
  } catch (e) {
    console.error('Failed org nodes:', e);
  }
}

function getStoredStaffProfiles(): StaffProfile[] {
  try {
    const data = memStore.getItem(STAFF_STORAGE_KEY);
    if (!data) {
      memStore.setItem(STAFF_STORAGE_KEY, JSON.stringify(INITIAL_STAFF_PROFILES));
      return INITIAL_STAFF_PROFILES;
    }
    return JSON.parse(data);
  } catch {
    return INITIAL_STAFF_PROFILES;
  }
}

function saveStoredStaffProfiles(profiles: StaffProfile[]) {
  try {
    memStore.setItem(STAFF_STORAGE_KEY, JSON.stringify(profiles));
  } catch (e) {
    console.error('Failed staff profiles:', e);
  }
}

function getStoredHistory(): StaffAssignmentHistory[] {
  try {
    const data = memStore.getItem(HISTORY_STORAGE_KEY);
    if (!data) {
      memStore.setItem(HISTORY_STORAGE_KEY, JSON.stringify(INITIAL_HISTORY));
      return INITIAL_HISTORY;
    }
    return JSON.parse(data);
  } catch {
    return INITIAL_HISTORY;
  }
}

function saveStoredHistory(hist: StaffAssignmentHistory[]) {
  try {
    memStore.setItem(HISTORY_STORAGE_KEY, JSON.stringify(hist));
  } catch (e) {
    console.error('Failed history:', e);
  }
}

export const staffOrgService = {
  // Organization Nodes
  async getOrgNodes(): Promise<OrganizationNode[]> {
    const nodes = await getCollectionData<OrganizationNode>(ORG_COLLECTION, ORG_STORAGE_KEY, INITIAL_ORG_NODES);
    return nodes.sort((a, b) => a.order - b.order);
  },

  async saveOrgNode(node: Partial<OrganizationNode>, actor: { id: string; email: string; name: string }): Promise<OrganizationNode> {
    const nodes = await this.getOrgNodes();
    const now = new Date().toISOString();
    let saved: OrganizationNode;

    if (node.id) {
      const index = nodes.findIndex(n => n.id === node.id);
      if (index === -1) throw new Error('Node organisasi tidak ditemukan');
      saved = {
        ...nodes[index],
        ...node,
        updatedAt: now
      };
    } else {
      saved = {
        id: `org-${Date.now()}`,
        name: sanitizeText(node.name || 'Unit Baru'),
        title: sanitizeText(node.title || 'Posisi'),
        parentId: node.parentId,
        order: node.order || nodes.length + 1,
        description: sanitizeText(node.description || ''),
        status: node.status || 'active',
        showOnWebsite: node.showOnWebsite ?? true,
        userId: node.userId,
        createdAt: now,
        updatedAt: now
      };
    }

    await saveDocumentData(ORG_COLLECTION, saved.id, saved, ORG_STORAGE_KEY);

    await auditService.recordLog({
      userId: actor.id,
      userEmail: actor.email,
      userName: actor.name,
      action: node.id ? 'UPDATE' : 'CREATE',
      module: 'PAGES',
      targetId: saved.id,
      targetName: saved.name,
      description: `Mengelola struktur organisasi: "${saved.name}" (${saved.title})`
    });

    return saved;
  },

  async deleteOrgNode(id: string, actor: { id: string; email: string; name: string }): Promise<void> {
    const nodes = await this.getOrgNodes();
    const target = nodes.find(n => n.id === id);
    if (!target) return;

    await deleteDocumentData(ORG_COLLECTION, id, ORG_STORAGE_KEY);

    await auditService.recordLog({
      userId: actor.id,
      userEmail: actor.email,
      userName: actor.name,
      action: 'DELETE',
      module: 'PAGES',
      targetId: target.id,
      targetName: target.name,
      description: `Menghapus node organisasi: "${target.name}"`
    });
  },

  // Staff Profiles
  async getStaffProfiles(includeInactive: boolean = false): Promise<StaffProfile[]> {
    const profiles = await getCollectionData<StaffProfile>(STAFF_COLLECTION, STAFF_STORAGE_KEY, INITIAL_STAFF_PROFILES);
    if (includeInactive) return profiles;
    return profiles.filter(p => p.status === 'active' && p.showOnWebsite && p.reviewStatus === 'approved');
  },

  async getAllStaffProfilesForAdmin(): Promise<StaffProfile[]> {
    return getCollectionData<StaffProfile>(STAFF_COLLECTION, STAFF_STORAGE_KEY, INITIAL_STAFF_PROFILES);
  },

  async getStaffById(id: string): Promise<StaffProfile | null> {
    const profiles = await this.getAllStaffProfilesForAdmin();
    return profiles.find(p => p.id === id) || null;
  },

  async getStaffByService(serviceId: string): Promise<StaffProfile[]> {
    const profiles = await this.getAllStaffProfilesForAdmin();
    return profiles.filter(p => p.status === 'active' && p.showOnWebsite && p.reviewStatus === 'approved' && (p.serviceIds?.includes(serviceId) || p.primaryServiceId === serviceId));
  },

  async saveStaffProfile(profile: Partial<StaffProfile>, actor: { id: string; email: string; name: string }, isAdmin: boolean): Promise<StaffProfile> {
    const profiles = await this.getAllStaffProfilesForAdmin();
    const now = new Date().toISOString();
    let saved: StaffProfile;

    const isSelfEdit = !isAdmin && profile.id;

    if (profile.id) {
      const index = profiles.findIndex(p => p.id === profile.id);
      if (index === -1) throw new Error('Profil petugas tidak ditemukan');
      const existing = profiles[index];

      // Track unit change history
      if (profile.unitId && profile.unitId !== existing.unitId) {
        const histItem: StaffAssignmentHistory = {
          id: `hist-${Date.now()}`,
          staffId: existing.id,
          staffName: existing.name,
          previousUnitName: existing.unitName,
          newUnitName: profile.unitName || existing.unitName,
          changedAt: now,
          changedBy: { id: actor.id, name: actor.name }
        };
        await saveDocumentData(HISTORY_COLLECTION, histItem.id, histItem, HISTORY_STORAGE_KEY);
      }

      saved = {
        ...existing,
        ...profile,
        name: sanitizeText(profile.name || existing.name),
        positionTitle: sanitizeText(profile.positionTitle || existing.positionTitle),
        bio: profile.bio !== undefined ? sanitizeText(profile.bio) : existing.bio,
        education: profile.education !== undefined ? sanitizeText(profile.education) : existing.education,
        reviewStatus: isAdmin ? (profile.reviewStatus || existing.reviewStatus) : 'pending_review',
        updatedAt: now
      };
    } else {
      saved = {
        id: `staff-${Date.now()}`,
        userId: profile.userId || actor.id,
        name: sanitizeText(profile.name || actor.name),
        photoUrl: profile.photoUrl || 'https://images.unsplash.com/photo-1622253692010-333f2da6031d?auto=format&fit=crop&q=80&w=600',
        positionTitle: sanitizeText(profile.positionTitle || 'Tenaga Medis / Staf'),
        unitId: profile.unitId || 'org-1',
        unitName: profile.unitName || 'Puskesmas',
        serviceIds: profile.serviceIds || [],
        primaryServiceId: profile.primaryServiceId,
        locationId: profile.locationId || 'loc-1',
        bio: sanitizeText(profile.bio || ''),
        education: sanitizeText(profile.education || ''),
        scheduleSummary: sanitizeText(profile.scheduleSummary || 'Senin - Jumat (08:00 - 14:00)'),
        showOnWebsite: profile.showOnWebsite ?? true,
        status: profile.status || 'active',
        reviewStatus: isAdmin ? 'approved' : 'pending_review',
        createdAt: now,
        updatedAt: now
      };
    }

    await saveDocumentData(STAFF_COLLECTION, saved.id, saved, STAFF_STORAGE_KEY);

    await auditService.recordLog({
      userId: actor.id,
      userEmail: actor.email,
      userName: actor.name,
      action: profile.id ? 'UPDATE' : 'CREATE',
      module: 'PAGES',
      targetId: saved.id,
      targetName: saved.name,
      description: `Mengelola profil petugas: "${saved.name}" (${saved.positionTitle}) [Visibility: ${saved.showOnWebsite ? 'Public' : 'Hidden'}]`
    });

    return saved;
  },

  async updateStaffStatus(id: string, status: 'active' | 'inactive' | 'archived', actor: { id: string; email: string; name: string }): Promise<void> {
    const profiles = await this.getAllStaffProfilesForAdmin();
    const index = profiles.findIndex(p => p.id === id);
    if (index === -1) return;

    const updated = {
      ...profiles[index],
      status,
      showOnWebsite: status === 'active' ? profiles[index].showOnWebsite : false,
      updatedAt: new Date().toISOString()
    };

    await saveDocumentData(STAFF_COLLECTION, id, updated, STAFF_STORAGE_KEY);

    await auditService.recordLog({
      userId: actor.id,
      userEmail: actor.email,
      userName: actor.name,
      action: 'UPDATE',
      module: 'PAGES',
      targetId: updated.id,
      targetName: updated.name,
      description: `Mengubah status petugas ${updated.name} menjadi ${status}`
    });
  },

  async getAssignmentHistory(staffId?: string): Promise<StaffAssignmentHistory[]> {
    const hist = await getCollectionData<StaffAssignmentHistory>(HISTORY_COLLECTION, HISTORY_STORAGE_KEY, INITIAL_HISTORY);
    if (staffId) return hist.filter(h => h.staffId === staffId);
    return hist;
  }
};
