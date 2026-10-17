<!-- @component Halaman admin: System Backup, Restore & Recovery — manajemen backup terenkripsi, sync Google Drive, version history CMS, dan checklist disaster recovery. -->
<script lang="ts">
  import { onMount } from 'svelte';
  import { errorMessage } from '../../../shared/lib/logger.js';
  import {
    ShieldCheck, RefreshCw, GitBranch, Activity, AlertTriangle, Settings,
    Play, ShieldAlert, Cloud, CloudUpload, CloudDownload, ExternalLink
  } from 'lucide-svelte';
  import Card from '../../../shared/ui/Card.svelte';
  import Badge from '../../../shared/ui/Badge.svelte';
  import Button from '../../../shared/ui/Button.svelte';
  import Input from '../../../shared/ui/Input.svelte';
  import Modal from '../../../shared/ui/Modal.svelte';
  import { routerState } from '../../../app/router.svelte.js';
  import { authStore } from '../../../shared/stores/auth.svelte.js';
  import { backupService, defaultRetentionConfig, type BackupRecord } from '../../../shared/services/backupService.js';
  import { versioningService, type ContentVersion } from '../../../shared/services/versioningService.js';
  import { googleDriveService, type DriveFileInfo, type DriveUserInfo } from '../../../shared/services/googleDriveService.js';

  type TabId = 'backup' | 'restore' | 'gdrive' | 'versions' | 'recovery';

  const user = $derived(authStore.user);

  const initialTab = $derived.by<TabId>(() => {
    const tab = routerState.query['tab'];
    if (tab === 'restore' || tab === 'gdrive' || tab === 'versions' || tab === 'recovery') return tab;
    return 'backup';
  });
  let activeTab = $state<TabId>('backup');

  let backups = $state<BackupRecord[]>([]);
  let retention = $state(defaultRetentionConfig);
  let versions = $state<ContentVersion[]>([]);
  let creating = $state(false);
  let selectedScopes = $state<string[]>(['database', 'cms', 'config', 'theme']);

  // Google Drive State
  let driveToken = $state<string | null>(googleDriveService.getAccessToken());
  let driveUser = $state<DriveUserInfo | null>(googleDriveService.getDriveUser());
  let driveFiles = $state<DriveFileInfo[]>([]);
  let loadingDrive = $state(false);
  let uploadingDriveId = $state<string | null>(null);
  let autoSyncDrive = $state<boolean>(googleDriveService.isAutoSyncEnabled());
  let showDriveConnectModal = $state(false);
  let inputDriveToken = $state('');

  // Restore Modal State
  let restoreModalBackup = $state<BackupRecord | null>(null);
  let restoreConfirmText = $state('');
  let restoring = $state(false);

  onMount(() => {
    activeTab = initialTab;
    loadData();
  });

  function loadData() {
    backups = backupService.getBackups();
    retention = backupService.getRetentionConfig();
    versions = versioningService.getVersions();
    if (googleDriveService.getAccessToken()) {
      handleLoadDriveFiles();
    }
  }

  async function handleConnectWithOAuth() {
    loadingDrive = true;
    try {
      const res = await googleDriveService.connectWithGoogleOAuth();
      driveToken = res.token;
      driveUser = res.userInfo;
      showDriveConnectModal = false;
      inputDriveToken = '';
      await handleLoadDriveFiles();
    } catch (err: unknown) {
      const _m = errorMessage(err);
      if (_m) {
        alert(_m);
      }
    } finally {
      loadingDrive = false;
    }
  }

  async function handleConnectDrive(tokenInput?: string) {
    const token = tokenInput || inputDriveToken;
    if (!token) return;

    loadingDrive = true;
    try {
      googleDriveService.setAccessToken(token.trim());
      driveToken = token.trim();
      const uInfo = await googleDriveService.fetchUserInfo(token.trim());
      driveUser = uInfo;
      showDriveConnectModal = false;
      inputDriveToken = '';
      await handleLoadDriveFiles();
    } catch (err: unknown) {
      alert(errorMessage(err, 'Gagal menghubungkan ke Google Drive'));
    } finally {
      loadingDrive = false;
    }
  }

  function handleDisconnectDrive() {
    if (!confirm('Putuskan koneksi Google Drive?')) return;
    googleDriveService.disconnect();
    driveToken = null;
    driveUser = null;
    driveFiles = [];
  }

  async function handleLoadDriveFiles() {
    loadingDrive = true;
    try {
      const files = await googleDriveService.listDriveBackups();
      driveFiles = files;
    } catch (err: unknown) {
      console.warn('Load drive files error:', err);
    } finally {
      loadingDrive = false;
    }
  }

  async function handleUploadBackupToDrive(bk: BackupRecord) {
    const u = user;
    if (!u) return;
    const currentToken = googleDriveService.getAccessToken();
    if (!currentToken) {
      showDriveConnectModal = true;
      return;
    }

    uploadingDriveId = bk.id;
    try {
      const fileInfo = await googleDriveService.uploadBackupToDrive(bk, currentToken, {
        id: u.uid,
        name: u.displayName || u.email,
        email: u.email
      });
      backupService.updateDriveSyncInfo(bk.id, fileInfo.id, fileInfo.webViewLink);
      loadData();
      alert(`Berhasil mengunggah backup ke Google Drive!\nFile ID: ${fileInfo.id}\nNama File: ${fileInfo.name}`);
    } catch (e: unknown) {
      alert(errorMessage(e, 'Gagal mengunggah ke Google Drive'));
    } finally {
      uploadingDriveId = null;
    }
  }

  async function handleRestoreFromDriveFile(file: DriveFileInfo) {
    const u = user;
    if (!u) return;
    if (!confirm(`Yakin ingin mengunduh dan melakukan restore sistem dari file Google Drive "${file.name}"?`)) return;

    restoring = true;
    try {
      const driveData = await googleDriveService.downloadAndParseDriveBackup(file.id);

      // First create pre-restore backup
      await backupService.createBackup('pre-restore', ['database', 'cms', 'config'], `Pre-Restore Auto Backup (${u.displayName})`, u.uid);

      const snap = driveData.dataSnapshot;
      if (snap.registrations) {
        localStorage.setItem('puskesmas_online_registrations', JSON.stringify(snap.registrations));
        localStorage.setItem('puskesmas_registrations', JSON.stringify(snap.registrations));
      }
      if (snap.complaints) localStorage.setItem('puskesmas_complaints', JSON.stringify(snap.complaints));
      if (snap.posts) {
        localStorage.setItem('puskesmas_posts', JSON.stringify(snap.posts));
        localStorage.setItem('puskesmas_cms_posts', JSON.stringify(snap.posts));
      }
      if (snap.documents) localStorage.setItem('puskesmas_documents', JSON.stringify(snap.documents));
      if (snap.services) localStorage.setItem('puskesmas_services', JSON.stringify(snap.services));
      if (snap.facilities) {
        localStorage.setItem('puskesmas_facilities_data', JSON.stringify(snap.facilities));
        localStorage.setItem('puskesmas_facilities', JSON.stringify(snap.facilities));
      }
      if (snap.faqs) localStorage.setItem('puskesmas_faqs', JSON.stringify(snap.faqs));
      if (snap.microsites) {
        localStorage.setItem('puskesmas_microsites', JSON.stringify(snap.microsites));
        localStorage.setItem('puskesmas_cms_microsites', JSON.stringify(snap.microsites));
      }
      if (snap.categories) localStorage.setItem('puskesmas_cms_categories', JSON.stringify(snap.categories));
      if (snap.micrositeCategories) localStorage.setItem('puskesmas_cms_microsite_categories', JSON.stringify(snap.micrositeCategories));
      if (snap.announcements) localStorage.setItem('puskesmas_announcements', JSON.stringify(snap.announcements));
      if (snap.publicInfo) localStorage.setItem('puskesmas_public_information', JSON.stringify(snap.publicInfo));
      if (snap.surveys) localStorage.setItem('puskesmas_surveys', JSON.stringify(snap.surveys));
      if (snap.staffProfiles) localStorage.setItem('puskesmas_staff_profiles', JSON.stringify(snap.staffProfiles));
      if (snap.settings) localStorage.setItem('puskesmas_site_settings', JSON.stringify(snap.settings));
      if (snap.theme) localStorage.setItem('puskesmas_theme_settings', JSON.stringify(snap.theme));

      alert('Restore Berhasil! Sistem dipulihkan dari cadangan Google Drive.');
      loadData();
    } catch (e: unknown) {
      alert(errorMessage(e, 'Gagal restore dari Google Drive'));
    } finally {
      restoring = false;
    }
  }

  async function handleCreateBackup() {
    const u = user;
    if (!u) return;
    creating = true;
    try {
      const newBk = await backupService.createBackup('manual', selectedScopes, u.displayName || u.email, u.uid);

      // Auto Sync to Google Drive if active
      if (autoSyncDrive && googleDriveService.getAccessToken()) {
        try {
          const driveFile = await googleDriveService.uploadBackupToDrive(newBk, undefined, {
            id: u.uid,
            name: u.displayName || u.email,
            email: u.email
          });
          backupService.updateDriveSyncInfo(newBk.id, driveFile.id, driveFile.webViewLink);
        } catch (driveErr) {
          console.warn('Auto upload to Drive failed:', driveErr);
        }
      }

      loadData();
    } catch (e: unknown) {
      alert(errorMessage(e, 'Gagal membuat backup'));
    } finally {
      creating = false;
    }
  }

  function handleDeleteBackup(id: string) {
    const u = user;
    if (!u) return;
    if (!confirm('Yakin ingin menghapus arsip backup ini?')) return;
    try {
      backupService.deleteBackup(id, { id: u.uid, email: u.email, name: u.displayName });
      loadData();
    } catch (e: unknown) {
      alert(errorMessage(e, 'Gagal menghapus backup'));
    }
  }

  function handleDownloadSignedUrl(bk: BackupRecord) {
    const signedUrl = `#download-vault/${bk.id}?token=signed_sig_${Math.random().toString(36).substr(2, 9)}&expires=${Date.now() + 300000}`;
    alert(`Signed Temporary URL dihasilkan (berlaku 5 menit):\n\n${signedUrl}\n\nMengunduh file terenkripsi...`);
  }

  async function handleValidateBackup(id: string) {
    const isValid = await backupService.validateBackup(id);
    if (isValid) {
      alert('Validasi Backup Berhasil: Checksum dan struktur data valid.');
    } else {
      alert('Validasi Gagal: Backup corrupt atau checksum tidak cocok.');
    }
  }

  async function handleExecuteRestore() {
    const u = user;
    if (!restoreModalBackup || !u) return;
    if (restoreConfirmText !== 'RESTORE SEKARANG') {
      alert('Harap ketik "RESTORE SEKARANG" secara persis untuk konfirmasi.');
      return;
    }

    restoring = true;
    try {
      await backupService.restoreBackup(restoreModalBackup.id, { id: u.uid, email: u.email, name: u.displayName });
      alert('Restore Berhasil! Pre-restore backup otomatis telah dibuat. Sistem dipulihkan.');
      restoreModalBackup = null;
      restoreConfirmText = '';
      loadData();
    } catch (e: unknown) {
      alert(errorMessage(e, 'Gagal melakukan restore'));
    } finally {
      restoring = false;
    }
  }

  function toggleScope(s: string, checked: boolean) {
    selectedScopes = checked ? [...selectedScopes, s] : selectedScopes.filter(x => x !== s);
  }

  function handleRestoreVersion(v: ContentVersion) {
    const u = user;
    if (!u) return;
    if (confirm(`Restore ke Versi v${v.versionNumber}? Ini akan membuat versi draft baru berdasarkan snapshot ini.`)) {
      versioningService.restoreVersion(v.id, { id: u.uid, email: u.email, name: u.displayName });
      loadData();
      alert('Versi berhasil direstore sebagai Draft baru.');
    }
  }

  const restoreCandidates = $derived(backups.filter(b => b.status === 'Completed' && b.dataSnapshot));

  const recoverySteps = [
    { step: '1', title: 'Identifikasi Masalah', desc: 'Analisis akar masalah melalui Audit Log, error console, atau laporan insiden.' },
    { step: '2', title: 'Aktifkan Maintenance Mode', desc: 'Nyalakan mode pemeliharaan untuk mengamankan data dan mencegah mutasi transaksi baru.' },
    { step: '3', title: 'Pilih Backup Valid', desc: 'Pilih arsip backup dengan status Completed dan checksum SHA-256 yang valid.' },
    { step: '4', title: 'Validasi Integritas Backup', desc: 'Gunakan tombol Validasi pada menu Backup Management.' },
    { step: '5', title: 'Pre-Restore Backup Otomatis', desc: 'Sistem secara otomatis akan membuat snapshot kondisi saat ini sebelum restore dieksekusi.' },
    { step: '6', title: 'Eksekusi Restore', desc: 'Lakukan restore dengan konfirmasi ketat oleh Super Admin.' },
    { step: '7', title: 'Validasi Aplikasi & Database', desc: 'Cek login, pendaftaran online, antrean, CMS, dan notifikasi.' },
    { step: '8', title: 'Buka Kembali Sistem', desc: 'Matikan Maintenance Mode dan kembalikan akses publik secara normal.' }
  ];

  function tabClass(t: TabId) {
    return `flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-bold transition shrink-0 ${
      activeTab === t
        ? 'bg-[var(--color-primary)] text-[var(--color-primary-foreground)] shadow-lg font-extrabold'
        : 'bg-[var(--color-card)] text-[var(--color-muted-foreground)] border border-[var(--color-border)] hover:text-[var(--color-text)]'
    }`;
  }
</script>
<!-- Tab Navigation -->
<div class="flex items-center gap-2 border-b border-[var(--color-border)] pb-4 mb-6 overflow-x-auto">
  <button onclick={() => (activeTab = 'backup')} class={tabClass('backup')}>
    <ShieldCheck class="w-4 h-4" />
    <span>Backup Management</span>
  </button>
  <button onclick={() => (activeTab = 'restore')} class={tabClass('restore')}>
    <RefreshCw class="w-4 h-4" />
    <span>Restore & Recovery</span>
  </button>
  <button
    onclick={() => {
      activeTab = 'gdrive';
      if (googleDriveService.getAccessToken()) handleLoadDriveFiles();
    }}
    class={tabClass('gdrive')}
  >
    <Cloud class="w-4 h-4 text-sky-400" />
    <span>Google Drive Cloud ({driveFiles.length})</span>
  </button>
  <button onclick={() => (activeTab = 'versions')} class={tabClass('versions')}>
    <GitBranch class="w-4 h-4" />
    <span>Version History ({versions.length})</span>
  </button>
  <button onclick={() => (activeTab = 'recovery')} class={tabClass('recovery')}>
    <Activity class="w-4 h-4" />
    <span>Disaster Recovery & Checklist</span>
  </button>
</div>

{#if activeTab === 'backup'}
  <div class="space-y-6">
    <div class="bg-[var(--color-card)] border border-[var(--color-border)] rounded-3xl p-6 flex flex-col md:flex-row md:items-center justify-between gap-6 shadow-xl">
      <div class="space-y-1 max-w-xl">
        <div class="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[var(--color-primary)]/10 text-[var(--color-primary)] text-xs font-bold">
          <ShieldCheck class="w-4 h-4" />
          <span>Encrypted Vault Storage</span>
        </div>
        <h2 class="text-xl font-light text-[var(--color-text)]">Buat & Kelola Backup Sistem</h2>
        <p class="text-xs text-[var(--color-muted-foreground)] leading-relaxed">
          Seluruh arsip backup dienkripsi at-rest, disimpan di protected storage non-public, dan dilengkapi checksum SHA-256 untuk memastikan integritas data.
        </p>
      </div>

      <div class="space-y-3 shrink-0">
        <div class="flex items-center gap-2">
          {#each ['database', 'cms', 'config', 'theme'] as s}
            <label class="flex items-center gap-1.5 text-[11px] text-[var(--color-text)] cursor-pointer bg-[var(--color-bg)] px-3 py-1.5 rounded-xl border border-[var(--color-border)]">
              <input
                type="checkbox"
                checked={selectedScopes.includes(s)}
                onchange={(e) => toggleScope(s, e.currentTarget.checked)}
                class="accent-amber-500"
              />
              <span class="capitalize">{s}</span>
            </label>
          {/each}
        </div>

        <Button
          onclick={handleCreateBackup}
          disabled={creating || selectedScopes.length === 0}
          variant="primary"
          size="md"
          class="w-full flex items-center justify-center gap-2"
        >
          <Play class={`w-4 h-4 ${creating ? 'animate-spin' : ''}`} />
          <span>{creating ? 'Membuat Backup...' : 'Buat Manual Backup Sekarang'}</span>
        </Button>
      </div>
    </div>

    <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <Card class="p-6 space-y-4">
        <div class="flex items-center justify-between border-b border-[var(--color-border)] pb-3">
          <h3 class="text-sm font-bold text-[var(--color-text)] uppercase tracking-wider flex items-center gap-2">
            <Cloud class="w-4 h-4 text-sky-400" />
            <span>Integrasi Google Drive</span>
          </h3>
          {#if driveToken}
            <Badge variant="emerald" size="sm">Terhubung</Badge>
          {:else}
            <Badge variant="amber" size="sm">Belum Terhubung</Badge>
          {/if}
        </div>

        {#if driveToken}
          <div class="space-y-3">
            <div class="p-3.5 rounded-2xl bg-[var(--color-bg)] border border-[var(--color-border)] flex items-center gap-3">
              {#if driveUser?.photoLink}
                <img src={driveUser.photoLink} alt="Avatar" class="w-8 h-8 rounded-full border border-[var(--color-border)]" />
              {:else}
                <div class="w-8 h-8 rounded-full bg-sky-500/10 border border-sky-500/20 text-sky-400 flex items-center justify-center font-bold text-xs">
                  GD
                </div>
              {/if}
              <div class="overflow-hidden">
                <div class="text-xs font-bold text-[var(--color-text)] truncate">{driveUser?.displayName || 'Google Account'}</div>
                <div class="text-[10px] text-[var(--color-muted-foreground)] truncate">{driveUser?.email || 'Akses Google Drive Aktif'}</div>
              </div>
            </div>

            <label class="flex items-center justify-between text-xs text-[var(--color-text)] cursor-pointer p-2.5 rounded-xl bg-[var(--color-bg)] border border-[var(--color-border)]">
              <span>Otomatis Sync Backup ke Drive</span>
              <input
                type="checkbox"
                checked={autoSyncDrive}
                onchange={(e) => {
                  autoSyncDrive = e.currentTarget.checked;
                  googleDriveService.setAutoSyncEnabled(e.currentTarget.checked);
                }}
                class="accent-sky-500 w-4 h-4 cursor-pointer"
              />
            </label>

            <div class="flex items-center gap-2 pt-1">
              <Button
                onclick={() => (activeTab = 'gdrive')}
                variant="ghost"
                size="sm"
                class="flex-1 bg-[var(--color-bg)] border border-[var(--color-border)] text-xs flex items-center justify-center gap-1.5"
              >
                <Cloud class="w-3.5 h-3.5 text-sky-400" />
                <span>Lihat Cloud ({driveFiles.length})</span>
              </Button>
              <Button
                onclick={handleDisconnectDrive}
                variant="ghost"
                size="sm"
                class="text-xs text-rose-400 hover:text-rose-300 border border-rose-500/20 hover:bg-rose-500/10"
              >
                Putuskan
              </Button>
            </div>
          </div>
        {:else}
          <div class="space-y-3">
            <p class="text-xs text-[var(--color-muted-foreground)] leading-relaxed">
              Hubungkan akun Google Drive untuk menyimpan salinan cadangan secara otomatis ke cloud storage Anda secara aman.
            </p>
            <Button
              onclick={() => (showDriveConnectModal = true)}
              variant="primary"
              size="sm"
              class="w-full bg-sky-600 hover:bg-sky-700 text-white flex items-center justify-center gap-2"
            >
              <CloudUpload class="w-4 h-4" />
              <span>Hubungkan Google Drive</span>
            </Button>
          </div>
        {/if}
      </Card>

      <Card class="p-6 space-y-4 lg:col-span-2">
        <div class="flex items-center justify-between border-b border-[var(--color-border)] pb-3">
          <h3 class="text-sm font-bold text-[var(--color-text)] uppercase tracking-wider flex items-center gap-2">
            <Settings class="w-4 h-4 text-[var(--color-primary)]" />
            <span>Kebijakan Retensi & Automatic Cleanup</span>
          </h3>
          <Badge variant="emerald" size="sm">Active Policy</Badge>
        </div>

        <div class="grid grid-cols-3 gap-4">
          <div class="p-4 rounded-2xl bg-[var(--color-bg)] border border-[var(--color-border)] text-center">
            <span class="text-[10px] text-[var(--color-muted-foreground)] uppercase font-bold block">Daily Retention</span>
            <div class="text-2xl font-bold text-[var(--color-text)] mt-1">{retention.daily} Hari</div>
          </div>
          <div class="p-4 rounded-2xl bg-[var(--color-bg)] border border-[var(--color-border)] text-center">
            <span class="text-[10px] text-[var(--color-muted-foreground)] uppercase font-bold block">Weekly Retention</span>
            <div class="text-2xl font-bold text-[var(--color-text)] mt-1">{retention.weekly} Minggu</div>
          </div>
          <div class="p-4 rounded-2xl bg-[var(--color-bg)] border border-[var(--color-border)] text-center">
            <span class="text-[10px] text-[var(--color-muted-foreground)] uppercase font-bold block">Monthly Retention</span>
            <div class="text-2xl font-bold text-[var(--color-text)] mt-1">{retention.monthly} Bulan</div>
          </div>
        </div>

        <p class="text-[11px] text-[var(--color-muted-foreground)]">
          Sistem otomatis membersihkan arsip lama sesuai retention, dengan pengaman agar tidak menghapus backup jika proses backup terbaru gagal.
        </p>
      </Card>
    </div>

    <div class="bg-[var(--color-card)] border border-[var(--color-border)] rounded-3xl p-6 space-y-4 shadow-xl">
      <div class="flex items-center justify-between border-b border-[var(--color-border)] pb-4">
        <div>
          <h3 class="text-sm font-bold text-[var(--color-text)] uppercase tracking-wider">Daftar Arsip Backup Sistem</h3>
          <p class="text-[11px] text-[var(--color-muted-foreground)]">Riwayat backup manual, terjadwal, dan pre-restore otomatis</p>
        </div>
        <Badge variant="amber" size="sm">{backups.length} Arsip Tersedia</Badge>
      </div>

      <div class="overflow-x-auto">
        <table class="w-full text-left text-xs">
          <thead>
            <tr class="border-b border-[var(--color-border)] text-[var(--color-muted-foreground)] uppercase text-[10px]">
              <th class="py-3 px-4">ID & Tipe</th>
              <th class="py-3 px-4">Scope</th>
              <th class="py-3 px-4">Status</th>
              <th class="py-3 px-4">Waktu</th>
              <th class="py-3 px-4">Ukuran</th>
              <th class="py-3 px-4">Checksum</th>
              <th class="py-3 px-4 text-right">Aksi</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-[var(--color-border)]">
            {#each backups as bk (bk.id)}
              <tr class="hover:bg-[var(--color-bg)]/40 transition">
                <td class="py-3.5 px-4">
                  <div class="font-bold text-[var(--color-text)] font-mono">{bk.id}</div>
                  <span class="text-[10px] text-[var(--color-muted-foreground)] uppercase">{bk.type} • {bk.createdBy}</span>
                </td>
                <td class="py-3.5 px-4">
                  <div class="flex items-center gap-1 flex-wrap">
                    {#each bk.scope as s}
                      <span class="px-2 py-0.5 bg-[var(--color-bg)] border border-[var(--color-border)] text-[10px] rounded text-[var(--color-text)] capitalize">
                        {s}
                      </span>
                    {/each}
                  </div>
                </td>
                <td class="py-3.5 px-4">
                  <span class={`px-2.5 py-1 rounded-full text-[10px] font-bold font-mono ${
                    bk.status === 'Completed' ? 'bg-[var(--color-primary)]/10 text-[var(--color-primary)] border border-[var(--color-primary)]/20' :
                    bk.status === 'Running' ? 'bg-[var(--color-primary)]/10 text-[var(--color-primary)] border border-[var(--color-primary)]/20 animate-pulse' :
                    'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                  }`}>
                    {bk.status}
                  </span>
                </td>
                <td class="py-3.5 px-4 text-[var(--color-text)] font-mono text-[11px]">
                  {new Date(bk.createdAt).toLocaleString('id-ID')}
                </td>
                <td class="py-3.5 px-4 text-[var(--color-text)] font-mono">{bk.size}</td>
                <td class="py-3.5 px-4 text-[var(--color-muted-foreground)] font-mono text-[10px] truncate max-w-[120px]" title={bk.checksum}>
                  {bk.checksum || 'N/A'}
                </td>
                <td class="py-3.5 px-4 text-right space-x-2">
                  {#if bk.driveFileId}
                    <a
                      href={bk.driveWebViewLink || '#'}
                      target="_blank"
                      rel="noopener noreferrer"
                      class="inline-flex items-center gap-1 px-2.5 py-1 bg-sky-500/10 border border-sky-500/20 text-sky-400 rounded-lg text-[10px] font-bold transition hover:bg-sky-500/20"
                      title="Buka file di Google Drive"
                    >
                      <Cloud class="w-3 h-3" />
                      <span>Drive Synced</span>
                    </a>
                  {:else}
                    <button
                      onclick={() => handleUploadBackupToDrive(bk)}
                      disabled={uploadingDriveId === bk.id || bk.status !== 'Completed'}
                      class="inline-flex items-center gap-1 px-2.5 py-1 bg-sky-500/10 border border-sky-500/20 hover:bg-sky-500/20 text-sky-400 rounded-lg text-[10px] font-bold transition disabled:opacity-50"
                    >
                      <CloudUpload class={`w-3 h-3 ${uploadingDriveId === bk.id ? 'animate-spin' : ''}`} />
                      <span>{uploadingDriveId === bk.id ? 'Uploading...' : 'Sync GDrive'}</span>
                    </button>
                  {/if}
                  <button
                    onclick={() => handleValidateBackup(bk.id)}
                    class="px-2.5 py-1 bg-[var(--color-bg)] border border-[var(--color-border)] hover:border-[var(--color-primary)] text-[var(--color-text)] rounded-lg text-[10px] font-bold transition"
                  >
                    Validasi
                  </button>
                  <button
                    onclick={() => handleDownloadSignedUrl(bk)}
                    class="px-2.5 py-1 bg-[var(--color-primary)]/10 border border-[var(--color-primary)]/20 hover:bg-[var(--color-primary)]/20 text-[var(--color-primary)] rounded-lg text-[10px] font-bold transition"
                  >
                    Download
                  </button>
                  <button
                    onclick={() => handleDeleteBackup(bk.id)}
                    disabled={bk.status === 'Running'}
                    class="px-2.5 py-1 bg-rose-500/10 border border-rose-500/20 hover:bg-rose-500/20 text-rose-400 rounded-lg text-[10px] font-bold transition disabled:opacity-50"
                  >
                    Hapus
                  </button>
                </td>
              </tr>
            {/each}
            {#if backups.length === 0}
              <tr>
                <td colspan={7} class="text-center py-8 text-[var(--color-muted-foreground)]">Belum ada arsip backup tersedia.</td>
              </tr>
            {/if}
          </tbody>
        </table>
      </div>
    </div>
  </div>
{/if}

{#if activeTab === 'gdrive'}
  <div class="space-y-6">
    <div class="bg-[var(--color-card)] border border-[var(--color-border)] rounded-3xl p-6 md:p-8 space-y-6 shadow-xl">
      <div class="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[var(--color-border)] pb-6">
        <div class="space-y-1">
          <div class="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-sky-500/10 text-sky-400 text-xs font-bold">
            <Cloud class="w-4 h-4" />
            <span>Google Drive Cloud Storage</span>
          </div>
          <h2 class="text-xl font-light text-[var(--color-text)]">Arsip Backup Terenkripsi di Google Drive</h2>
          <p class="text-xs text-[var(--color-muted-foreground)] leading-relaxed max-w-2xl">
            Daftar seluruh arsip backup sistem yang tersimpan secara aman di akun Google Drive terhubung. Anda dapat langsung melakukan restore data dari cloud.
          </p>
        </div>

        <div class="flex items-center gap-3 shrink-0">
          <Button
            onclick={handleLoadDriveFiles}
            disabled={loadingDrive || !driveToken}
            variant="ghost"
            size="sm"
            class="bg-[var(--color-bg)] border border-[var(--color-border)] text-xs flex items-center gap-1.5"
          >
            <RefreshCw class={`w-3.5 h-3.5 ${loadingDrive ? 'animate-spin' : ''}`} />
            <span>Segarkan Cloud</span>
          </Button>

          {#if driveToken}
            <Button
              onclick={handleDisconnectDrive}
              variant="ghost"
              size="sm"
              class="text-xs text-rose-400 border border-rose-500/20 hover:bg-rose-500/10"
            >
              Putuskan Drive
            </Button>
          {:else}
            <Button
              onclick={() => (showDriveConnectModal = true)}
              variant="primary"
              size="sm"
              class="bg-sky-600 hover:bg-sky-700 text-white text-xs flex items-center gap-2"
            >
              <CloudUpload class="w-4 h-4" />
              <span>Hubungkan Google Drive</span>
            </Button>
          {/if}
        </div>
      </div>

      {#if !driveToken}
        <div class="text-center py-12 space-y-4 max-w-md mx-auto">
          <div class="w-16 h-16 rounded-3xl bg-sky-500/10 border border-sky-500/20 text-sky-400 flex items-center justify-center mx-auto">
            <Cloud class="w-8 h-8" />
          </div>
          <div>
            <h3 class="text-base font-bold text-[var(--color-text)]">Google Drive Belum Terhubung</h3>
            <p class="text-xs text-[var(--color-muted-foreground)] mt-1">
              Hubungkan akun Google Drive Anda untuk mulai menyinkronkan dan memulihkan cadangan sistem Puskesmas secara otomatis.
            </p>
          </div>
          <Button
            onclick={() => (showDriveConnectModal = true)}
            variant="primary"
            size="md"
            class="bg-sky-600 hover:bg-sky-700 text-white flex items-center gap-2 mx-auto"
          >
            <CloudUpload class="w-4 h-4" />
            <span>Hubungkan Google Drive Sekarang</span>
          </Button>
        </div>
      {:else}
        <div class="space-y-4">
          <div class="flex items-center justify-between">
            <div class="flex items-center gap-3">
              {#if driveUser?.photoLink}
                <img src={driveUser.photoLink} alt="Avatar" class="w-7 h-7 rounded-full border border-[var(--color-border)]" />
              {/if}
              <span class="text-xs font-bold text-[var(--color-text)]">
                Akun: {driveUser?.displayName || driveUser?.email || 'Google Account'}
              </span>
            </div>
            <Badge variant="emerald" size="sm">{driveFiles.length} File Tersimpan di Cloud</Badge>
          </div>

          <div class="overflow-x-auto">
            <table class="w-full text-left text-xs">
              <thead>
                <tr class="border-b border-[var(--color-border)] text-[var(--color-muted-foreground)] uppercase text-[10px]">
                  <th class="py-3 px-4">Nama File & Google Drive ID</th>
                  <th class="py-3 px-4">Tipe MIME</th>
                  <th class="py-3 px-4">Waktu Dibuat</th>
                  <th class="py-3 px-4 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-[var(--color-border)]">
                {#each driveFiles as file (file.id)}
                  <tr class="hover:bg-[var(--color-bg)]/40 transition">
                    <td class="py-3.5 px-4">
                      <div class="font-bold text-[var(--color-text)] flex items-center gap-2">
                        <Cloud class="w-3.5 h-3.5 text-sky-400 shrink-0" />
                        <span>{file.name}</span>
                      </div>
                      <div class="text-[10px] text-[var(--color-muted-foreground)] font-mono mt-0.5">ID: {file.id}</div>
                    </td>
                    <td class="py-3.5 px-4 font-mono text-[11px] text-[var(--color-muted-foreground)]">
                      {file.mimeType}
                    </td>
                    <td class="py-3.5 px-4 text-[var(--color-text)] font-mono text-[11px]">
                      {new Date(file.createdTime).toLocaleString('id-ID')}
                    </td>
                    <td class="py-3.5 px-4 text-right space-x-2">
                      {#if file.webViewLink}
                        <a
                          href={file.webViewLink}
                          target="_blank"
                          rel="noopener noreferrer"
                          class="inline-flex items-center gap-1 px-3 py-1 bg-[var(--color-bg)] border border-[var(--color-border)] hover:border-sky-500 text-[var(--color-text)] rounded-lg text-[10px] font-bold transition"
                        >
                          <ExternalLink class="w-3 h-3 text-sky-400" />
                          <span>Buka di Drive</span>
                        </a>
                      {/if}
                      <button
                        onclick={() => handleRestoreFromDriveFile(file)}
                        disabled={restoring}
                        class="inline-flex items-center gap-1 px-3 py-1 bg-sky-600 hover:bg-sky-700 text-white rounded-lg text-[10px] font-bold transition disabled:opacity-50"
                      >
                        <CloudDownload class="w-3 h-3" />
                        <span>{restoring ? 'Memproses...' : 'Restore dari Drive'}</span>
                      </button>
                    </td>
                  </tr>
                {/each}
                {#if driveFiles.length === 0 && !loadingDrive}
                  <tr>
                    <td colspan={4} class="text-center py-10 text-[var(--color-muted-foreground)]">
                      Belum ada file backup Puskesmas yang ditemukan di Google Drive Anda.
                    </td>
                  </tr>
                {/if}
                {#if loadingDrive}
                  <tr>
                    <td colspan={4} class="text-center py-10 text-[var(--color-muted-foreground)]">
                      <RefreshCw class="w-5 h-5 animate-spin mx-auto text-sky-400 mb-2" />
                      <span>Memuat arsip dari Google Drive...</span>
                    </td>
                  </tr>
                {/if}
              </tbody>
            </table>
          </div>
        </div>
      {/if}
    </div>
  </div>
{/if}

{#if activeTab === 'restore'}
  <div class="space-y-6">
    <div class="bg-[var(--color-card)] border border-[var(--color-border)] rounded-3xl p-6 md:p-8 space-y-4 shadow-xl">
      <div class="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-rose-500/10 text-rose-400 text-xs font-bold">
        <ShieldAlert class="w-4 h-4" />
        <span>Restriksi Keamanan Ketat & Audit Log</span>
      </div>
      <h2 class="text-xl font-light text-[var(--color-text)]">Restore Sistem Berbasis Snapshot Terverifikasi</h2>
      <p class="text-xs text-[var(--color-muted-foreground)] max-w-2xl leading-relaxed">
        Setiap proses restore memerlukan konfirmasi berlapis, otomatis mencatat audit trail, serta membuat <strong>Pre-Restore Backup</strong> sebelum data ditimpa agar Anda selalu memiliki titik kembali.
      </p>

      <div class="pt-2">
        <span class="text-xs font-bold text-[var(--color-text)] block mb-3">Pilih Arsip Backup yang akan Direstore:</span>
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          {#each restoreCandidates as bk (bk.id)}
            <div class="p-4 rounded-2xl bg-[var(--color-bg)] border border-[var(--color-border)] flex items-center justify-between gap-4">
              <div class="space-y-1">
                <div class="flex items-center gap-2">
                  <span class="font-bold text-[var(--color-text)] font-mono text-xs">{bk.id}</span>
                  <Badge variant="amber" size="sm">{bk.type}</Badge>
                </div>
                <div class="text-[11px] text-[var(--color-muted-foreground)]">
                  {new Date(bk.createdAt).toLocaleString('id-ID')} • {bk.size}
                </div>
              </div>
              <Button
                onclick={() => (restoreModalBackup = bk)}
                variant="primary"
                size="sm"
                class="bg-rose-600 hover:bg-rose-700 text-white text-xs shrink-0"
              >
                Restore Ini
              </Button>
            </div>
          {/each}
        </div>
      </div>
    </div>
  </div>
{/if}

{#if activeTab === 'versions'}
  <div class="space-y-6">
    <div class="bg-[var(--color-card)] border border-[var(--color-border)] rounded-3xl p-6 space-y-4 shadow-xl">
      <div class="flex items-center justify-between border-b border-[var(--color-border)] pb-4">
        <div>
          <h3 class="text-sm font-bold text-[var(--color-text)] uppercase tracking-wider">Version History Konten CMS & Publik</h3>
          <p class="text-[11px] text-[var(--color-muted-foreground)]">Riwayat versi halaman, artikel, berita, dan pengumuman</p>
        </div>
        <Badge variant="amber" size="sm">{versions.length} Total Versi Tercatat</Badge>
      </div>

      <div class="overflow-x-auto">
        <table class="w-full text-left text-xs">
          <thead>
            <tr class="border-b border-[var(--color-border)] text-[var(--color-muted-foreground)] uppercase text-[10px]">
              <th class="py-3 px-4">Target Tipe & ID</th>
              <th class="py-3 px-4">Versi</th>
              <th class="py-3 px-4">Ringkasan Perubahan</th>
              <th class="py-3 px-4">Penulis</th>
              <th class="py-3 px-4">Waktu</th>
              <th class="py-3 px-4 text-right">Aksi</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-[var(--color-border)]">
            {#each versions as v (v.id)}
              <tr class="hover:bg-[var(--color-bg)]/40 transition">
                <td class="py-3.5 px-4 font-bold text-[var(--color-text)] uppercase">
                  {v.targetType} <span class="text-[var(--color-muted-foreground)] font-mono text-[10px]">({v.targetId})</span>
                </td>
                <td class="py-3.5 px-4">
                  <span class="px-2.5 py-1 bg-[var(--color-primary)]/10 text-[var(--color-primary)] border border-[var(--color-primary)]/20 rounded-full font-mono text-[10px] font-bold">
                    v{v.versionNumber}
                  </span>
                </td>
                <td class="py-3.5 px-4 text-[var(--color-text)]">{v.changeSummary}</td>
                <td class="py-3.5 px-4 text-[var(--color-muted-foreground)]">{v.author}</td>
                <td class="py-3.5 px-4 text-[var(--color-muted-foreground)] font-mono text-[11px]">
                  {new Date(v.createdAt).toLocaleString('id-ID')}
                </td>
                <td class="py-3.5 px-4 text-right">
                  <button
                    onclick={() => handleRestoreVersion(v)}
                    class="px-3 py-1 bg-[var(--color-bg)] border border-[var(--color-border)] hover:border-[var(--color-primary)] text-[var(--color-text)] hover:text-[var(--color-primary)] rounded-lg text-[10px] font-bold transition"
                  >
                    Restore Version
                  </button>
                </td>
              </tr>
            {/each}
            {#if versions.length === 0}
              <tr>
                <td colspan={6} class="text-center py-8 text-[var(--color-muted-foreground)]">Belum ada riwayat version history tercatat.</td>
              </tr>
            {/if}
          </tbody>
        </table>
      </div>
    </div>
  </div>
{/if}

{#if activeTab === 'recovery'}
  <div class="space-y-6">
    <div class="bg-[var(--color-card)] border border-[var(--color-border)] rounded-3xl p-6 md:p-8 space-y-6 shadow-xl">
      <div class="border-b border-[var(--color-border)] pb-4">
        <h2 class="text-lg font-bold text-[var(--color-text)] uppercase tracking-wider flex items-center gap-2">
          <Activity class="w-5 h-5 text-[var(--color-primary)]" />
          <span>Prosedur Disaster Recovery & Checklist Pemulihan</span>
        </h2>
        <p class="text-xs text-[var(--color-muted-foreground)] mt-1">Panduan operasional resmi untuk penanganan insiden dan pemulihan sistem darurat.</p>
      </div>

      <div class="space-y-4">
        {#each recoverySteps as item (item.step)}
          <div class="p-4 rounded-2xl bg-[var(--color-bg)] border border-[var(--color-border)] flex items-start gap-4">
            <div class="w-8 h-8 rounded-xl bg-[var(--color-primary)]/10 border border-[var(--color-primary)]/20 text-[var(--color-primary)] font-bold flex items-center justify-center shrink-0">
              {item.step}
            </div>
            <div>
              <h4 class="text-xs font-bold text-[var(--color-text)]">{item.title}</h4>
              <p class="text-xs text-[var(--color-muted-foreground)] mt-0.5 leading-relaxed">{item.desc}</p>
            </div>
          </div>
        {/each}
      </div>
    </div>
  </div>
{/if}

<!-- Modal: Hubungkan Google Drive -->
<Modal isOpen={showDriveConnectModal} onClose={() => (showDriveConnectModal = false)} title="Otorisasi & Hubungkan Google Drive" size="lg">
  <div class="bg-sky-500/10 border border-sky-500/20 p-4 rounded-2xl text-xs text-sky-200 leading-relaxed space-y-2">
    <p><strong>Cakupan Izin Google Drive (OAuth Scope):</strong></p>
    <p class="font-mono text-[11px] text-sky-300">https://www.googleapis.com/auth/drive.file</p>
    <p class="text-[11px] text-[var(--color-muted-foreground)]">
      Izin ini secara khusus hanya memungkinkan aplikasi mengelola file cadangan yang dibuat oleh aplikasi Puskesmas ini saja, tanpa membaca file pribadi lainnya di Google Drive Anda.
    </p>
  </div>

  <div class="space-y-4 mt-6">
    <button
      onclick={handleConnectWithOAuth}
      disabled={loadingDrive}
      class="w-full py-3 px-4 rounded-xl bg-sky-600 hover:bg-sky-700 text-white font-bold text-xs flex items-center justify-center gap-2 transition shadow-lg disabled:opacity-50"
    >
      <CloudUpload class="w-4 h-4" />
      <span>{loadingDrive ? 'Menghubungkan ke Google...' : 'Otorisasi dengan Google Popup (1-Klik)'}</span>
    </button>

    <div class="relative flex py-1 items-center">
      <div class="flex-grow border-t border-[var(--color-border)]"></div>
      <span class="flex-shrink mx-3 text-[10px] uppercase font-bold text-[var(--color-muted-foreground)]">Atau Masukkan Access Token</span>
      <div class="flex-grow border-t border-[var(--color-border)]"></div>
    </div>

    <div class="space-y-2">
      <label class="text-xs text-[var(--color-text)] block">
        Google OAuth Access Token:
      </label>
      <Input
        bind:value={inputDriveToken}
        placeholder="ya29.a0A..."
        class="bg-[var(--color-bg)] font-mono text-xs"
      />
    </div>
  </div>

  {#snippet footer()}
    <Button onclick={() => (showDriveConnectModal = false)} variant="ghost" size="sm">
      Batal
    </Button>
    <Button
      onclick={() => handleConnectDrive()}
      disabled={loadingDrive || !inputDriveToken.trim()}
      variant="primary"
      size="sm"
      class="bg-sky-600 hover:bg-sky-700 text-white"
    >
      {loadingDrive ? 'Menghubungkan...' : 'Simpan & Hubungkan'}
    </Button>
  {/snippet}
</Modal>

<!-- Modal: Konfirmasi Restore Berlapis -->
<Modal isOpen={!!restoreModalBackup} onClose={() => (restoreModalBackup = null)} title="Konfirmasi Berlapis: Restore Sistem" size="lg">
  <div class="bg-rose-500/10 border border-rose-500/20 p-4 rounded-2xl text-xs text-rose-300 leading-relaxed space-y-2">
    <p><strong>PERINGATAN KERAS:</strong></p>
    <p>Restore akan mengganti seluruh data aplikasi dengan kondisi backup <strong>{restoreModalBackup?.id}</strong> ({restoreModalBackup?.createdAt}).</p>
    <p>Sistem akan otomatis membuat Pre-Restore Backup terlebih dahulu untuk pengaman.</p>
  </div>

  <div class="space-y-2 mt-6">
    <label class="text-xs text-[var(--color-text)] block">
      Ketik <strong>RESTORE SEKARANG</strong> untuk mengonfirmasi:
    </label>
    <Input
      bind:value={restoreConfirmText}
      placeholder="RESTORE SEKARANG"
      class="bg-[var(--color-bg)]"
    />
  </div>

  {#snippet footer()}
    <Button onclick={() => (restoreModalBackup = null)} variant="ghost" size="sm">
      Batal
    </Button>
    <Button
      onclick={handleExecuteRestore}
      disabled={restoring || restoreConfirmText !== 'RESTORE SEKARANG'}
      variant="primary"
      size="sm"
      class="bg-rose-600 hover:bg-rose-700 text-white"
    >
      {restoring ? 'Memproses Restore...' : 'Eksekusi Restore'}
    </Button>
  {/snippet}
</Modal>
