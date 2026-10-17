<!-- @component Manajemen dokumen & formulir pelayanan digital — unggah, versi, filter, dan kontrol akses. -->
<script lang="ts">
  import {
    FileText, Plus, Search, Trash2, Download,
    UploadCloud, AlertCircle, Eye, EyeOff,
    History, Check, Layers, Edit2
  } from 'lucide-svelte';
  import Card from '../../../shared/ui/Card.svelte';
  import Button from '../../../shared/ui/Button.svelte';
  import Input from '../../../shared/ui/Input.svelte';
  import Select from '../../../shared/ui/Select.svelte';
  import Badge from '../../../shared/ui/Badge.svelte';
  import Modal from '../../../shared/ui/Modal.svelte';
  import ConfirmModal from '../../../shared/components/ConfirmModal.svelte';
  import { authStore } from '../../../shared/stores/auth.svelte.js';
  import { toastStore } from '../../../shared/stores/toast.svelte.js';
  import { documentService } from '../../../shared/services/documentService.js';
  import { categoryService } from '../../../shared/services/categoryService.js';
  import { serviceEngineService } from '../../../shared/services/serviceEngineService.js';
  import type { DocumentEntity, CategoryEntity, ServiceEntity, ServiceUnitEntity } from '../../../shared/types/index.js';

  let documents = $state<DocumentEntity[]>([]);
  let categories = $state<CategoryEntity[]>([]);
  let services = $state<ServiceEntity[]>([]);
  let units = $state<ServiceUnitEntity[]>([]);
  let loading = $state(true);

  // Filters
  let search = $state('');
  let selectedCat = $state('');
  let selectedService = $state('');
  let selectedUnit = $state('');
  let statusFilter = $state('');
  let visibilityFilter = $state('');

  // Row state
  let expandedDocId = $state<string | null>(null);
  let versionHistories = $state<Record<string, DocumentEntity[]>>({});

  // Modals
  let isModalOpen = $state(false);
  let isCategoryModalOpen = $state(false);
  let editingDoc = $state<Partial<DocumentEntity> | null>(null);
  let isNewVersionMode = $state(false);
  let saving = $state(false);

  // New Category form
  let newCatName = $state('');
  let newCatDesc = $state('');

  // Delete Confirm
  let deleteModalOpen = $state(false);
  let docToDelete = $state<DocumentEntity | null>(null);

  async function loadData() {
    loading = true;
    try {
      const [docList, catList, serviceList, unitList] = await Promise.all([
        documentService.getDocuments(selectedCat || undefined, search || undefined, statusFilter || undefined, selectedService || undefined, selectedUnit || undefined),
        categoryService.getCategories('document'),
        serviceEngineService.getServices(),
        serviceEngineService.getUnits()
      ]);
      documents = docList;
      categories = catList;
      services = serviceList;
      units = unitList;
    } catch (e) {
      console.error(e);
      toastStore.showToast('Gagal memuat dokumen publik', 'error');
    } finally {
      loading = false;
    }
  }

  $effect(() => {
    loadData();
  });

  // Load version history for expanded document
  async function handleToggleExpand(doc: DocumentEntity) {
    if (expandedDocId === doc.id) {
      expandedDocId = null;
    } else {
      expandedDocId = doc.id;
      try {
        const history = await documentService.getDocumentHistory(doc.originalDocId || doc.id);
        versionHistories = {
          ...versionHistories,
          [doc.originalDocId || doc.id]: history
        };
      } catch {
        toastStore.showToast('Gagal memuat riwayat versi dokumen', 'error');
      }
    }
  }

  function handleOpenAdd() {
    isNewVersionMode = false;
    editingDoc = {
      title: '',
      description: '',
      category: categories[0]?.name || 'Formulir',
      fileUrl: 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf',
      fileName: '',
      mimeType: 'application/pdf',
      status: 'published',
      version: '1.0',
      isCurrentVersion: true,
      visibility: 'public',
      isForm: false,
      documentNumber: '',
      validFrom: new Date().toISOString().split('T')[0]
    };
    isModalOpen = true;
  }

  function handleOpenEdit(doc: DocumentEntity) {
    isNewVersionMode = false;
    editingDoc = { ...doc };
    isModalOpen = true;
  }

  function handleOpenNewVersion(doc: DocumentEntity) {
    isNewVersionMode = true;

    // Parse version to increment
    let nextVersion = '1.1';
    try {
      const currentVerNum = parseFloat(doc.version);
      if (!isNaN(currentVerNum)) {
        nextVersion = (currentVerNum + 0.1).toFixed(1);
      }
    } catch {}

    editingDoc = {
      title: doc.title,
      description: doc.description,
      category: doc.category,
      fileUrl: 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf', // default placeholder
      fileName: '',
      mimeType: doc.mimeType,
      status: 'draft', // draft by default for new version
      version: nextVersion,
      isCurrentVersion: true, // replace previous version as active
      visibility: doc.visibility,
      isForm: doc.isForm,
      documentNumber: doc.documentNumber,
      serviceId: doc.serviceId,
      serviceName: doc.serviceName,
      unitId: doc.unitId,
      unitName: doc.unitName,
      originalDocId: doc.originalDocId || doc.id,
      validFrom: new Date().toISOString().split('T')[0]
    };
    isModalOpen = true;
  }

  async function handleSave(e: SubmitEvent) {
    e.preventDefault();
    const user = authStore.user;
    if (!user || !editingDoc) return;

    if (!editingDoc.title?.trim() || !editingDoc.fileName?.trim()) {
      toastStore.showToast('Judul dan Nama File Berkas wajib diisi!', 'error');
      return;
    }

    // Lookup service name if serviceId is set
    let sName = editingDoc.serviceName;
    if (editingDoc.serviceId && !sName) {
      const foundS = services.find(s => s.id === editingDoc.serviceId);
      if (foundS) sName = foundS.name;
    }

    // Lookup unit name if unitId is set
    let uName = editingDoc.unitName;
    if (editingDoc.unitId && !uName) {
      const foundU = units.find(u => u.id === editingDoc.unitId);
      if (foundU) uName = foundU.name;
    }

    saving = true;
    try {
      const payload = {
        ...editingDoc,
        serviceName: sName,
        unitName: uName,
        isForm: editingDoc.isForm || editingDoc.category === 'Formulir'
      };

      if (editingDoc.id && !isNewVersionMode) {
        // Edit existing document metadata
        await documentService.updateDocument(editingDoc.id, payload, {
          id: user.uid,
          email: user.email,
          name: user.displayName
        });
        toastStore.showToast(`Dokumen "${editingDoc.title}" berhasil diperbarui.`);
      } else {
        // Add new document or save a new version
        await documentService.addDocument(payload, {
          id: user.uid,
          email: user.email,
          name: user.displayName
        });
        toastStore.showToast(`Dokumen/Versi baru "${editingDoc.title}" berhasil disimpan.`);
      }

      isModalOpen = false;
      editingDoc = null;
      loadData();
    } catch (err: any) {
      toastStore.showToast(err.message || 'Gagal menyimpan dokumen', 'error');
    } finally {
      saving = false;
    }
  }

  async function handleAddCategory(e: SubmitEvent) {
    e.preventDefault();
    if (!newCatName.trim()) {
      toastStore.showToast('Nama kategori wajib diisi', 'error');
      return;
    }

    saving = true;
    try {
      await categoryService.addCategory({
        name: newCatName,
        description: newCatDesc,
        type: 'document'
      });
      toastStore.showToast(`Kategori "${newCatName}" berhasil ditambahkan.`);
      newCatName = '';
      newCatDesc = '';
      isCategoryModalOpen = false;
      categories = await categoryService.getCategories('document');
    } catch {
      toastStore.showToast('Gagal menambahkan kategori', 'error');
    } finally {
      saving = false;
    }
  }

  async function handleDelete() {
    const user = authStore.user;
    if (!user || !docToDelete) return;
    saving = true;
    try {
      await documentService.deleteDocument(docToDelete.id, {
        id: user.uid,
        email: user.email,
        name: user.displayName
      });
      toastStore.showToast(`Dokumen "${docToDelete.title}" berhasil dihapus.`);
      deleteModalOpen = false;
      docToDelete = null;
      loadData();
    } catch (err: any) {
      toastStore.showToast(err.message || 'Gagal menghapus dokumen', 'error');
    } finally {
      saving = false;
    }
  }

  // Visibility toggle button helper
  async function handleToggleVisibility(doc: DocumentEntity) {
    const user = authStore.user;
    if (!user) return;
    const nextVis = doc.visibility === 'public' ? 'private' : 'public';
    try {
      await documentService.updateDocument(doc.id, { visibility: nextVis as any }, {
        id: user.uid,
        email: user.email,
        name: user.displayName
      });
      toastStore.showToast(`Akses dokumen diubah menjadi ${nextVis.toUpperCase()}`);
      loadData();
    } catch {
      toastStore.showToast('Gagal mengubah visibilitas dokumen', 'error');
    }
  }

  // Status toggle button helper
  async function handleToggleStatus(doc: DocumentEntity, nextStatus: any) {
    const user = authStore.user;
    if (!user) return;
    try {
      await documentService.updateDocument(doc.id, { status: nextStatus }, {
        id: user.uid,
        email: user.email,
        name: user.displayName
      });
      toastStore.showToast(`Status dokumen diubah menjadi ${nextStatus.toUpperCase()}`);
      loadData();
    } catch {
      toastStore.showToast('Gagal mengubah status dokumen', 'error');
    }
  }

  async function handleActivateVersion(hist: DocumentEntity) {
    const user = authStore.user;
    if (!user) return;
    try {
      await documentService.updateDocument(hist.id, { isCurrentVersion: true }, {
        id: user.uid,
        email: user.email,
        name: user.displayName
      });
      toastStore.showToast(`Versi ${hist.version} berhasil diatur menjadi versi aktif saat ini.`);
      loadData();
      expandedDocId = null;
    } catch {
      toastStore.showToast('Gagal memindahkan versi aktif', 'error');
    }
  }

  function categoryBadgeVariant(category: string): 'emerald' | 'amber' | 'zinc' {
    if (category === 'Formulir') return 'emerald';
    if (category === 'SOP') return 'amber';
    return 'zinc';
  }

  // Filter out non-current versions in primary table to reduce clutter, but show historical versions on expand!
  const mainDocuments = $derived(documents.filter(d => d.isCurrentVersion));
</script>

<!-- Search and Filters panel -->
<div class="bg-[var(--color-card)] border border-[var(--color-border)] p-5 rounded-3xl space-y-4">
  <div class="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
    <div class="relative flex-1">
      <Search class="w-4 h-4 text-[var(--color-muted-foreground)] absolute left-3/5 top-1/2 -translate-y-1/2" />
      <input
        type="text"
        placeholder="Cari berdasarkan judul, nomor dokumen, atau nama file..."
        bind:value={search}
        class="w-full bg-[var(--color-bg)] border border-[var(--color-border)] focus:border-[var(--color-primary)]/70 focus:outline-none rounded-2xl pl-10 pr-4 py-2.5 text-xs text-[var(--color-text)] placeholder-zinc-600"
      />
    </div>

    <div class="flex flex-wrap items-center gap-2">
      {#if authStore.hasPermission('publish_documents')}
        <Button onclick={() => (isCategoryModalOpen = true)} variant="secondary" size="sm">
          <Layers class="w-3.5 h-3.5" />
          Kelola Kategori
        </Button>
      {/if}

      {#if authStore.hasPermission('manage_documents')}
        <Button onclick={handleOpenAdd} variant="primary" size="sm">
          <UploadCloud class="w-3.5 h-3.5" />
          Unggah Dokumen Baru
        </Button>
      {/if}
    </div>
  </div>

  <!-- Detailed Dropdown Filters -->
  <div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-3 pt-2 border-t border-[var(--color-border)]/50">
    <div>
      <label class="block text-[10px] text-[var(--color-muted-foreground)] uppercase font-bold mb-1">Kategori</label>
      <Select
        bind:value={selectedCat}
        options={[
          { value: '', label: 'Semua Kategori' },
          ...categories.map(c => ({ value: c.name, label: c.name }))
        ]}
      />
    </div>

    <div>
      <label class="block text-[10px] text-[var(--color-muted-foreground)] uppercase font-bold mb-1">Layanan Terkait</label>
      <Select
        bind:value={selectedService}
        options={[
          { value: '', label: 'Semua Layanan' },
          ...services.map(s => ({ value: s.id, label: s.name }))
        ]}
      />
    </div>

    <div>
      <label class="block text-[10px] text-[var(--color-muted-foreground)] uppercase font-bold mb-1">Unit Pelaksana</label>
      <Select
        bind:value={selectedUnit}
        options={[
          { value: '', label: 'Semua Ruang/Unit' },
          ...units.map(u => ({ value: u.id, label: u.name }))
        ]}
      />
    </div>

    <div>
      <label class="block text-[10px] text-[var(--color-muted-foreground)] uppercase font-bold mb-1">Status Publikasi</label>
      <Select
        bind:value={statusFilter}
        options={[
          { value: '', label: 'Semua Status' },
          { value: 'published', label: 'Diterbitkan (Published)' },
          { value: 'draft', label: 'Konsep (Draft)' },
          { value: 'archived', label: 'Diarsipkan (Archived)' }
        ]}
      />
    </div>

    <div>
      <label class="block text-[10px] text-[var(--color-muted-foreground)] uppercase font-bold mb-1">Hak Akses Publik</label>
      <Select
        bind:value={visibilityFilter}
        options={[
          { value: '', label: 'Semua Akses' },
          { value: 'public', label: 'Publik (Bisa Diunduh)' },
          { value: 'private', label: 'Privat (Hanya Admin)' }
        ]}
      />
    </div>
  </div>
</div>

<!-- Main Table view -->
<Card class="p-0 overflow-hidden">
  <div class="overflow-x-auto">
  <table class="w-full text-xs text-left text-[var(--color-text)]">
    <thead class="bg-[var(--color-bg)] text-[10px] font-bold uppercase text-[var(--color-muted-foreground)] border-b border-[var(--color-border)]">
      <tr>
        <th class="p-4 w-8"></th>
        <th class="p-4">Dokumen & Identitas</th>
        <th class="p-4">Kategori & Layanan</th>
        <th class="p-4">Hubungan Unit</th>
        <th class="p-4">Status & Akses</th>
        <th class="p-4 text-right">Tindakan</th>
      </tr>
    </thead>
    <tbody class="divide-y divide-[var(--color-border)]">
      {#if loading}
        <tr><td colspan={6} class="p-8 text-center text-[var(--color-muted-foreground)] font-mono">Memuat database dokumen pelayanan...</td></tr>
      {:else if mainDocuments.length === 0}
        <tr><td colspan={6} class="p-8 text-center text-[var(--color-muted-foreground)]">Tidak ada berkas dokumen ditemukan. Silakan tambahkan dokumen baru.</td></tr>
      {:else}
        {#each mainDocuments as doc (doc.id)}
          {@const isExpanded = expandedDocId === doc.id}
          {@const history = versionHistories[doc.originalDocId || doc.id] || []}
          <tr class="hover:bg-[var(--color-card)]/40 transition {isExpanded ? 'bg-[var(--color-card)]/30' : ''}">
            <td class="p-4 text-center">
              <button
                onclick={() => handleToggleExpand(doc)}
                class="p-1 rounded hover:bg-[var(--color-bg)] text-[var(--color-muted-foreground)] hover:text-[var(--color-text)]"
                title="Lihat Riwayat Versi"
              >
                <History class="w-4 h-4 transition {isExpanded ? 'text-[var(--color-primary)] rotate-180' : ''}" />
              </button>
            </td>
            <td class="p-4">
              <div class="flex items-start gap-2.5">
                <FileText class="w-5 h-5 text-[var(--color-primary)] shrink-0 mt-0.5" />
                <div>
                  <div class="font-bold text-[var(--color-text)] text-sm hover:text-[var(--color-primary)] transition cursor-pointer" onclick={() => handleToggleExpand(doc)}>
                    {doc.title}
                  </div>
                  <div class="flex items-center gap-2 mt-1">
                    {#if doc.documentNumber}
                      <span class="text-[10px] bg-[var(--color-card)] px-1.5 py-0.5 rounded text-[var(--color-muted-foreground)] font-mono">No: {doc.documentNumber}</span>
                    {/if}
                    <span class="text-[10px] bg-[var(--color-card)] px-1.5 py-0.5 rounded text-[var(--color-primary)] font-semibold">v{doc.version}</span>
                    <span class="text-[10px] text-[var(--color-muted-foreground)] font-mono">{doc.fileName} ({(doc.fileSize / 1024 / 1024).toFixed(2)} MB)</span>
                  </div>
                </div>
              </div>
            </td>
            <td class="p-4">
              <div class="space-y-1">
                <Badge variant={categoryBadgeVariant(doc.category)}>{doc.category}</Badge>
                {#if doc.serviceName}
                  <div class="text-[11px] text-[var(--color-muted-foreground)] font-semibold">{doc.serviceName}</div>
                {:else}
                  <div class="text-[10px] text-[var(--color-muted-foreground)] italic">Umum (Lintas Layanan)</div>
                {/if}
              </div>
            </td>
            <td class="p-4">
              <span class="text-[var(--color-text)] font-mono text-[11px]">{doc.unitName || 'Lintas Ruangan'}</span>
              <div class="text-[10px] text-[var(--color-muted-foreground)]">Masa Berlaku: {doc.validFrom ? new Date(doc.validFrom).toLocaleDateString('id-ID') : 'Tidak ditentukan'}</div>
            </td>
            <td class="p-4">
              <div class="flex flex-col gap-1.5">
                <div class="flex items-center gap-1.5">
                  {#if doc.status === 'published'}
                    <span class="w-2 h-2 rounded-full bg-[var(--color-primary)]"></span>
                  {:else if doc.status === 'draft'}
                    <span class="w-2 h-2 rounded-full bg-[var(--color-primary)]"></span>
                  {:else}
                    <span class="w-2 h-2 rounded-full bg-[var(--color-card)]0"></span>
                  {/if}
                  <span class="font-semibold text-[11px] uppercase text-[var(--color-text)]">{doc.status}</span>
                </div>

                <div class="flex items-center gap-1">
                  {#if doc.visibility === 'public'}
                    <Eye class="w-3 h-3 text-[var(--color-primary)]" />
                  {:else}
                    <EyeOff class="w-3 h-3 text-red-400" />
                  {/if}
                  <span class="text-[10px] text-[var(--color-muted-foreground)]">{doc.visibility === 'public' ? 'Publik' : 'Privat'}</span>
                </div>

                {#if doc.isForm}
                  <span class="text-[9px] px-1 bg-[var(--color-primary)]/10 text-[var(--color-primary)] border border-[var(--color-primary)]/20 rounded w-max">Formulir Pelayanan</span>
                {/if}
              </div>
            </td>
            <td class="p-4 text-right space-x-1.5">
              <div class="inline-flex items-center gap-1 bg-[var(--color-bg)] p-1 rounded-xl border border-[var(--color-border)]">
                <a
                  href={doc.fileUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  class="p-1.5 rounded-lg text-[var(--color-muted-foreground)] hover:text-[var(--color-text)] hover:bg-[var(--color-surface)] transition"
                  title="Buka Berkas"
                >
                  <Download class="w-3.5 h-3.5" />
                </a>

                {#if authStore.hasPermission('manage_documents')}
                  <button
                    onclick={() => handleOpenNewVersion(doc)}
                    class="p-1.5 rounded-lg text-[var(--color-primary)] hover:text-[var(--color-primary)] hover:bg-[var(--color-surface)] transition"
                    title="Buat Versi Baru (Baru)"
                  >
                    <History class="w-3.5 h-3.5" />
                  </button>

                  <button
                    onclick={() => handleOpenEdit(doc)}
                    class="p-1.5 rounded-lg text-[var(--color-muted-foreground)] hover:text-[var(--color-text)] hover:bg-[var(--color-surface)] transition"
                    title="Edit Metadata"
                  >
                    <Edit2 class="w-3.5 h-3.5" />
                  </button>

                  <button
                    onclick={() => handleToggleVisibility(doc)}
                    class="p-1.5 rounded-lg text-[var(--color-muted-foreground)] hover:text-[var(--color-text)] hover:bg-[var(--color-surface)] transition"
                    title={doc.visibility === 'public' ? 'Sembunyikan' : 'Publikasikan'}
                  >
                    {#if doc.visibility === 'public'}
                      <EyeOff class="w-3.5 h-3.5" />
                    {:else}
                      <Eye class="w-3.5 h-3.5" />
                    {/if}
                  </button>
                {/if}

                {#if authStore.hasPermission('publish_documents')}
                  <button
                    onclick={() => handleToggleStatus(doc, doc.status === 'published' ? 'draft' : 'published')}
                    class={`p-1.5 rounded-lg transition ${doc.status === 'published' ? 'text-[var(--color-primary)]' : 'text-[var(--color-muted-foreground)] hover:text-[var(--color-text)]'}`}
                    title={doc.status === 'published' ? 'Kembalikan ke Konsep' : 'Terbitkan'}
                  >
                    <Check class="w-3.5 h-3.5" />
                  </button>
                {/if}

                {#if authStore.hasPermission('manage_documents')}
                  <button
                    onclick={() => {
                      docToDelete = doc;
                      deleteModalOpen = true;
                    }}
                    class="p-1.5 rounded-lg text-red-500 hover:text-red-400 hover:bg-red-500/10 transition"
                    title="Hapus"
                  >
                    <Trash2 class="w-3.5 h-3.5" />
                  </button>
                {/if}
              </div>
            </td>
          </tr>

          <!-- Historical versions expanded area -->
          {#if isExpanded}
            <tr class="bg-[var(--color-bg)] border-l-2 border-[var(--color-primary)]/40">
              <td colspan={6} class="p-4 pl-12">
                <div class="space-y-3">
                  <div class="flex items-center justify-between border-b border-[var(--color-border)] pb-2">
                    <span class="text-xs font-bold text-[var(--color-muted-foreground)] tracking-wider uppercase flex items-center gap-2">
                      <History class="w-3.5 h-3.5 text-[var(--color-primary)]" />
                      Riwayat Versi & Log Kontrol Dokumen
                    </span>
                    <span class="text-[10px] text-[var(--color-muted-foreground)]">Mencegah kerusakan riwayat data publik</span>
                  </div>

                  <div class="space-y-2">
                    {#each history as hist (hist.id)}
                      <div class="flex items-center justify-between bg-[var(--color-card)]/40 p-3 rounded-2xl border border-[var(--color-border)]/70">
                        <div class="flex items-center gap-3">
                          <span class={`px-2 py-0.5 rounded text-[10px] font-bold ${hist.isCurrentVersion ? 'bg-[var(--color-primary)]/10 text-[var(--color-primary)] border border-[var(--color-primary)]/20' : 'bg-[var(--color-surface)] text-[var(--color-muted-foreground)]'}`}>
                            Versi {hist.version} {hist.isCurrentVersion && ' (Aktif)'}
                          </span>
                          <div>
                            <div class="text-xs font-semibold text-[var(--color-text)] flex items-center gap-2">
                              {hist.title}
                              <span class="text-[10px] text-[var(--color-muted-foreground)] font-mono">({hist.fileName})</span>
                            </div>
                            <div class="text-[10px] text-[var(--color-muted-foreground)] mt-0.5">
                              Diunggah oleh: <span class="text-[var(--color-muted-foreground)]">{hist.createdBy?.name || 'Staf Puskesmas'}</span> • {new Date(hist.createdAt).toLocaleString('id-ID')}
                            </div>
                          </div>
                        </div>

                        <div class="flex items-center gap-2 text-xs">
                          <span class="text-[var(--color-muted-foreground)]">{hist.downloadCount || 0}x unduh</span>
                          <a
                            href={hist.fileUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            class="px-2.5 py-1 bg-[var(--color-bg)] border border-[var(--color-border)] hover:text-[var(--color-text)] rounded-lg text-[var(--color-muted-foreground)] flex items-center gap-1 transition"
                          >
                            <Download class="w-3 h-3" />
                            Unduh
                          </a>

                          {#if !hist.isCurrentVersion && authStore.hasPermission('manage_documents')}
                            <button
                              onclick={() => handleActivateVersion(hist)}
                              class="px-2.5 py-1 bg-[var(--color-primary)] text-[var(--color-primary-foreground)] font-semibold rounded-lg hover:bg-[var(--color-primary)] flex items-center gap-1 transition text-[11px]"
                            >
                              Aktifkan
                            </button>
                          {/if}
                        </div>
                      </div>
                    {/each}
                  </div>
                </div>
              </td>
            </tr>
          {/if}
        {/each}
      {/if}
    </tbody>
  </table>
  </div>
</Card>

<!-- Upload/Add/Edit Metadata Modal -->
<Modal
  isOpen={isModalOpen}
  onClose={() => (isModalOpen = false)}
  title={editingDoc?.id && !isNewVersionMode ? "Ubah Informasi Dokumen" : isNewVersionMode ? `Buat Versi Dokumen Baru — Dari Versi ${editingDoc?.version}` : "Unggah Dokumen Publik Baru"}
>
  {#snippet footer()}
    <Button variant="secondary" onclick={() => (isModalOpen = false)}>Batal</Button>
    <Button variant="primary" onclick={handleSave} isLoading={saving}>Simpan Berkas</Button>
  {/snippet}
  {#if editingDoc}
    <form onsubmit={handleSave} class="space-y-4">
      {#if isNewVersionMode}
        <div class="bg-[var(--color-primary)]/10 border border-[var(--color-primary)]/20 p-3 rounded-2xl flex items-start gap-2 text-xs text-[var(--color-primary)]">
          <AlertCircle class="w-4 h-4 mt-0.5 shrink-0" />
          <span>Anda sedang mengunggah <strong>versi baru</strong> dari dokumen ini. Sistem akan mengarsipkan versi sebelumnya secara aman dan melacak riwayat unduhannya secara terpisah.</span>
        </div>
      {/if}

      <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Input
          label="Judul Dokumen Publik *"
          placeholder="Contoh: SOP Pelayanan Poli Umum Kesehatan Lansia"
          bind:value={editingDoc.title}
          required
        />

        <Input
          label="Nomor Dokumen (Optional)"
          placeholder="024/SK-KAPUS/X/2026"
          bind:value={editingDoc.documentNumber}
        />
      </div>

      <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <Select
            label="Kategori Dokumen *"
            bind:value={editingDoc.category}
            options={categories.map(c => ({ value: c.name, label: c.name }))}
          />
        </div>

        <Input
          label="Nomor Versi *"
          placeholder="1.0 atau 2.0..."
          bind:value={editingDoc.version}
          required
        />

        <Input
          label="Tanggal Mulai Berlaku"
          type="date"
          bind:value={editingDoc.validFrom}
        />
      </div>

      <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <Select
            label="Layanan Terkait"
            bind:value={editingDoc.serviceId}
            options={[
              { value: '', label: 'Lintas Pelayanan (Umum)' },
              ...services.map(s => ({ value: s.id, label: s.name }))
            ]}
          />
        </div>

        <div>
          <Select
            label="Unit/Ruangan Pelaksana"
            bind:value={editingDoc.unitId}
            options={[
              { value: '', label: 'Lintas Unit/Ruangan' },
              ...units.map(u => ({ value: u.id, label: u.name }))
            ]}
          />
        </div>
      </div>

      <div class="grid grid-cols-1 md:grid-cols-2 gap-4 border-t border-[var(--color-border)] pt-4">
        <Input
          label="Nama Berkas Lengkap (File Name) *"
          placeholder="SOP_Pendaftaran_Puskesmas.pdf"
          bind:value={editingDoc.fileName}
          required
        />

        <Select
          label="Tipe MIME Berkas *"
          bind:value={editingDoc.mimeType}
          options={[
            { value: 'application/pdf', label: 'PDF Document (application/pdf)' },
            { value: 'application/msword', label: 'DOC Word File (application/msword)' },
            { value: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', label: 'DOCX Word File' },
            { value: 'application/vnd.ms-excel', label: 'XLS Spreadsheet (application/vnd.ms-excel)' },
            { value: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', label: 'XLSX Spreadsheet' },
            { value: 'image/jpeg', label: 'JPEG Image (image/jpeg)' },
            { value: 'image/png', label: 'PNG Image (image/png)' }
          ]}
        />
      </div>

      <Input
        label="URL Tautan Langsung Berkas (Direct Link)"
        placeholder="https://..."
        bind:value={editingDoc.fileUrl}
      />

      <div class="space-y-2">
        <label class="block text-xs font-semibold text-[var(--color-muted-foreground)]">Deskripsi Dokumen</label>
        <textarea
          placeholder="Penjelasan ringkas isi dokumen..."
          bind:value={editingDoc.description}
          class="w-full bg-[var(--color-bg)] border border-[var(--color-border)] focus:border-[var(--color-primary)]/70 focus:outline-none rounded-2xl px-4 py-2.5 text-xs text-[var(--color-text)] placeholder-zinc-600 h-20"
        ></textarea>
      </div>

      <div class="flex flex-col sm:flex-row gap-4 pt-2">
        <div class="flex items-center gap-2">
          <input
            type="checkbox"
            id="chk-current-version"
            checked={editingDoc.isCurrentVersion || false}
            onchange={(e) => { editingDoc.isCurrentVersion = e.currentTarget.checked; }}
            class="rounded border-[var(--color-border)] bg-[var(--color-bg)] text-[var(--color-primary)] focus:ring-[var(--color-primary)]"
          />
          <label for="chk-current-version" class="text-xs text-[var(--color-text)] font-semibold cursor-pointer">Set sebagai Versi Terbitan Aktif Utama</label>
        </div>

        <div class="flex items-center gap-2">
          <input
            type="checkbox"
            id="chk-is-form"
            checked={editingDoc.isForm || false}
            onchange={(e) => { editingDoc.isForm = e.currentTarget.checked; }}
            class="rounded border-[var(--color-border)] bg-[var(--color-bg)] text-[var(--color-primary)] focus:ring-[var(--color-primary)]"
          />
          <label for="chk-is-form" class="text-xs text-[var(--color-text)] font-semibold cursor-pointer">Sertakan sebagai Formulir Layanan Pasien</label>
        </div>
      </div>

      <div class="grid grid-cols-1 md:grid-cols-2 gap-4 border-t border-[var(--color-border)] pt-4">
        <div>
          <Select
            label="Hak Akses Publik *"
            bind:value={editingDoc.visibility}
            options={[
              { value: 'public', label: 'Publik (Bisa Diakses Umum)' },
              { value: 'private', label: 'Privat (Hanya Manajemen & Admin)' }
            ]}
          />
        </div>

        <div>
          <Select
            label="Status Kontrol *"
            bind:value={editingDoc.status}
            options={[
              { value: 'published', label: 'Diterbitkan (Published)' },
              { value: 'draft', label: 'Konsep (Draft)' },
              { value: 'archived', label: 'Diarsipkan (Archived)' }
            ]}
          />
        </div>
      </div>
    </form>
  {/if}
</Modal>

<!-- Category Management Modal -->
<Modal
  isOpen={isCategoryModalOpen}
  onClose={() => (isCategoryModalOpen = false)}
  title="Tambah Kategori Dokumen Baru"
>
  {#snippet footer()}
    <Button variant="secondary" onclick={() => (isCategoryModalOpen = false)}>Batal</Button>
    <Button variant="primary" onclick={handleAddCategory} isLoading={saving}>Simpan Kategori</Button>
  {/snippet}
  <form onsubmit={handleAddCategory} class="space-y-4">
    <Input
      label="Nama Kategori *"
      placeholder="Contoh: Maklumat Pelayanan, SOP..."
      bind:value={newCatName}
      required
    />

    <div class="space-y-2">
      <label class="block text-xs font-semibold text-[var(--color-muted-foreground)]">Deskripsi Kategori</label>
      <textarea
        placeholder="Penjelasan ringkas fungsi kategori..."
        bind:value={newCatDesc}
        class="w-full bg-[var(--color-bg)] border border-[var(--color-border)] focus:border-[var(--color-primary)]/70 focus:outline-none rounded-2xl px-4 py-2.5 text-xs text-[var(--color-text)] placeholder-zinc-600 h-20"
      ></textarea>
    </div>
  </form>
</Modal>

<!-- Delete Confirmation -->
<ConfirmModal
  isOpen={deleteModalOpen}
  onClose={() => (deleteModalOpen = false)}
  onConfirm={handleDelete}
  isLoading={saving}
  title="Hapus Dokumen"
  message={`Hapus dokumen "${docToDelete?.title}" Versi ${docToDelete?.version}? Tindakan ini bersifat permanen.`}
/>
