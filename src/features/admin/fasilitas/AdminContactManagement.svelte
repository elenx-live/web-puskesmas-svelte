<!-- @component Pusat informasi kontak & operasional: alamat, kanal kontak, jam operasional, dan info darurat IGD. -->
<script lang="ts">
import { memStore } from '../../../shared/lib/memStore';
  import { onMount } from 'svelte';
  import {
    Building2, Phone, MessageSquare, Mail, Globe, MapPin, Clock, ShieldAlert,
    Plus, Trash2, Save, CheckCircle2, AlertTriangle, Share2, Calendar
  } from 'lucide-svelte';
  import { contactService } from '../../../shared/services/contactService.js';
  import type { PuskesmasContactSettings, ContactChannelEntity, OperatingDayEntity } from '../../../shared/types/index.js';

  let settings = $state<PuskesmasContactSettings | null>(null);
  let loading = $state(true);
  let activeTab = $state<'profile' | 'channels' | 'hours' | 'emergency'>('profile');
  let saving = $state(false);
  let successMessage = $state('');
  let errorMessage = $state('');

  let newChannelLabel = $state('');
  let newChannelType = $state<ContactChannelEntity['type']>('Phone');
  let newChannelValue = $state('');
  let newChannelPrimary = $state(false);
  // Counter untuk me-remount input buffer agar ter-clear visual setelah tambah (uncontrolled).
  let bufKey = $state(0);

  let newSpecialDate = $state('');
  let newSpecialTitle = $state('');
  let newSpecialIsOpen = $state(false);
  let newSpecialOpenTime = $state('08:00');
  let newSpecialCloseTime = $state('12:00');
  let newSpecialNotes = $state('');

  function updateSettings(patch: Partial<PuskesmasContactSettings>) {
    if (settings) settings = { ...settings, ...patch };
  }

  onMount(() => {
    loadSettings();

    const handleSettingsUpdate = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      if (detail && settings) {
        settings = {
          ...settings,
          name: detail.siteName || settings.name,
          tagline: detail.tagline || settings.tagline
        };
      }
    };
    window.addEventListener('puskesmas_settings_updated', handleSettingsUpdate);
    return () => {
      window.removeEventListener('puskesmas_settings_updated', handleSettingsUpdate);
    };
  });

  async function loadSettings() {
    loading = true;
    try {
      const data = await contactService.getContactSettings();
      try {
        const storedSite = memStore.getItem('puskesmas_site_settings');
        if (storedSite) {
          const site = JSON.parse(storedSite);
          if (site.siteName) data.name = site.siteName;
          if (site.tagline) data.tagline = site.tagline;
        }
      } catch (err) {
        // ignore
      }
      settings = data;
    } catch (e) {
      console.error(e);
      errorMessage = 'Gagal memuat pengaturan kontak.';
    } finally {
      loading = false;
    }
  }

  async function handleSave() {
    if (!settings) return;
    saving = true;
    successMessage = '';
    errorMessage = '';
    try {
      await contactService.saveContactSettings(settings);
      successMessage = 'Pengaturan kontak & lokasi berhasil disimpan!';
      setTimeout(() => (successMessage = ''), 4000);
    } catch (e) {
      console.error(e);
      errorMessage = 'Gagal menyimpan pengaturan.';
    } finally {
      saving = false;
    }
  }

  function addChannel(e: Event) {
    e.preventDefault();
    if (!settings || !newChannelLabel || !newChannelValue) return;

    const newChannel: ContactChannelEntity = {
      id: `chn-${Date.now()}`,
      label: newChannelLabel,
      type: newChannelType,
      value: newChannelValue,
      isPrimary: newChannelPrimary,
      showOnWebsite: true,
      order: settings.channels.length + 1
    };

    let updatedChannels = [...settings.channels, newChannel];
    if (newChannelPrimary) {
      updatedChannels = updatedChannels.map((c) => (c.id === newChannel.id ? c : { ...c, isPrimary: false }));
    }

    settings = { ...settings, channels: updatedChannels };
    newChannelLabel = '';
    newChannelValue = '';
    newChannelPrimary = false;
    bufKey += 1;
  }

  function removeChannel(id: string) {
    if (!settings) return;
    settings = {
      ...settings,
      channels: settings.channels.filter((c) => c.id !== id)
    };
  }

  function toggleChannelVisibility(id: string) {
    if (!settings) return;
    settings = {
      ...settings,
      channels: settings.channels.map((c) => (c.id === id ? { ...c, showOnWebsite: !c.showOnWebsite } : c))
    };
  }

  function updateOperatingDay(dayIndex: number, field: keyof OperatingDayEntity, value: unknown) {
    if (!settings) return;
    const updated = [...settings.operatingHours];
    updated[dayIndex] = { ...updated[dayIndex], [field]: value };
    settings = { ...settings, operatingHours: updated };
  }

  function addSpecialHour(e: Event) {
    e.preventDefault();
    if (!settings || !newSpecialDate || !newSpecialTitle) return;

    const newItem = {
      id: `sp-${Date.now()}`,
      date: newSpecialDate,
      title: newSpecialTitle,
      isOpen: newSpecialIsOpen,
      openTime: newSpecialIsOpen ? newSpecialOpenTime : undefined,
      closeTime: newSpecialIsOpen ? newSpecialCloseTime : undefined,
      notes: newSpecialNotes
    };

    settings = {
      ...settings,
      specialHours: [...settings.specialHours, newItem]
    };
    newSpecialDate = '';
    newSpecialTitle = '';
    newSpecialNotes = '';
    bufKey += 1;
  }

  function removeSpecialHour(id: string) {
    if (!settings) return;
    settings = {
      ...settings,
      specialHours: settings.specialHours.filter((s) => s.id !== id)
    };
  }
</script>

{#if loading || !settings}
  <div class="py-20 text-center text-[var(--color-muted-foreground)]">Memuat konfigurasi kontak...</div>
{:else}
  {#key 'contact-settings'}
  <div class="space-y-6 max-w-6xl mx-auto pb-12">
    <!-- Header & Save Action -->
    <div class="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-[var(--color-card)] border border-[var(--color-border)] p-6 rounded-2xl shadow-sm">
      <div>
        <div class="flex items-center gap-2">
          <span class="px-3 py-1 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 rounded-full text-xs font-semibold uppercase tracking-wider">
            Single Source of Truth
          </span>
          <span class="text-xs text-[var(--color-muted-foreground)]">Timezone: {settings.timezone}</span>
        </div>
        <h1 class="text-xl md:text-2xl font-bold text-[var(--color-text)] mt-1">Pusat Informasi Kontak & Operasional</h1>
        <p class="text-sm text-[var(--color-muted-foreground)]">Kelola kontak resmi, jam buka, peta, dan informasi darurat untuk seluruh halaman publik.</p>
      </div>
      <button
        onclick={handleSave}
        disabled={saving}
        class="inline-flex items-center justify-center gap-2 px-6 py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-medium rounded-xl shadow-lg transition-all disabled:opacity-50 shrink-0"
      >
        <Save class="w-4 h-4" />
        {saving ? 'Menyimpan...' : 'Simpan Perubahan'}
      </button>
    </div>

    <!-- Success / Error Banners -->
    {#if successMessage}
      <div class="bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 px-4 py-3 rounded-xl text-sm flex items-center gap-2">
        <CheckCircle2 class="w-4 h-4 shrink-0" /> {successMessage}
      </div>
    {/if}
    {#if errorMessage}
      <div class="bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 px-4 py-3 rounded-xl text-sm flex items-center gap-2">
        <AlertTriangle class="w-4 h-4 shrink-0" /> {errorMessage}
      </div>
    {/if}

    <!-- Tabs -->
    <div class="flex items-center gap-2 border-b border-[var(--color-border)] pb-2 overflow-x-auto">
      <button
        onclick={() => (activeTab = 'profile')}
        class={`px-4 py-2.5 rounded-xl text-xs md:text-sm font-semibold whitespace-nowrap transition-all ${
          activeTab === 'profile' ? 'bg-emerald-600 text-white shadow-sm' : 'bg-[var(--color-muted)] text-[var(--color-text)] hover:opacity-80'
        }`}
      >
        📍 Alamat & Lokasi Peta
      </button>
      <button
        onclick={() => (activeTab = 'channels')}
        class={`px-4 py-2.5 rounded-xl text-xs md:text-sm font-semibold whitespace-nowrap transition-all ${
          activeTab === 'channels' ? 'bg-emerald-600 text-white shadow-sm' : 'bg-[var(--color-muted)] text-[var(--color-text)] hover:opacity-80'
        }`}
      >
        📞 Saluran Kontak ({settings.channels.length})
      </button>
      <button
        onclick={() => (activeTab = 'hours')}
        class={`px-4 py-2.5 rounded-xl text-xs md:text-sm font-semibold whitespace-nowrap transition-all ${
          activeTab === 'hours' ? 'bg-emerald-600 text-white shadow-sm' : 'bg-[var(--color-muted)] text-[var(--color-text)] hover:opacity-80'
        }`}
      >
        ⏰ Jam Operasional & Libur
      </button>
      <button
        onclick={() => (activeTab = 'emergency')}
        class={`px-4 py-2.5 rounded-xl text-xs md:text-sm font-semibold whitespace-nowrap transition-all ${
          activeTab === 'emergency' ? 'bg-emerald-600 text-white shadow-sm' : 'bg-[var(--color-muted)] text-[var(--color-text)] hover:opacity-80'
        }`}
      >
        🚨 Informasi Darurat & IGD
      </button>
    </div>

    <!-- TAB 1: Profile & Address -->
    {#if activeTab === 'profile'}
      <div class="bg-[var(--color-card)] border border-[var(--color-border)] p-6 md:p-8 rounded-2xl space-y-6 shadow-sm">
        <div class="border-b border-[var(--color-border)] pb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 class="text-lg font-bold text-[var(--color-text)] flex items-center gap-2">
              <MapPin class="w-5 h-5 text-emerald-600 dark:text-emerald-400" /> Alamat & Lokasi Fisik Puskesmas
            </h2>
            <p class="text-xs text-[var(--color-muted-foreground)] mt-1">Alamat jalan, kelurahan, kecamatan, kode pos, dan titik koordinat peta satelit.</p>
          </div>
        </div>

        <!-- Identitas Instansi Terhubung -->
        <div class="flex flex-col sm:flex-row sm:items-center justify-between p-4 rounded-xl bg-[var(--color-background)] border border-[var(--color-border)] gap-3">
          <div class="flex items-center gap-3">
            <div class="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold shrink-0">
              <Building2 class="w-5 h-5" />
            </div>
            <div>
              <div class="flex items-center gap-2 flex-wrap">
                <h3 class="text-sm font-bold text-[var(--color-text)]">{settings.name || 'Puskesmas Manding'}</h3>
                <span class="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-semibold border border-emerald-500/20">
                  Identitas Terverifikasi
                </span>
              </div>
              <p class="text-xs text-[var(--color-muted-foreground)] mt-0.5">{settings.tagline || 'Melayani dengan Sepenuh Hati'}</p>
            </div>
          </div>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div class="md:col-span-2">
            <label class="block text-xs font-semibold text-[var(--color-text)] uppercase mb-1.5">Alamat Jalan</label>
            <input
              type="text"
              defaultValue={settings.address}
              oninput={(e) => updateSettings({ address: e.currentTarget.value })}
              class="w-full bg-[var(--color-background)] border border-[var(--color-border)] rounded-xl px-4 py-2.5 text-[var(--color-text)] text-sm focus:outline-none focus:border-emerald-500"
              placeholder="Jl. Kesehatan Raya No. 12..."
            />
          </div>

          <div>
            <label class="block text-xs font-semibold text-[var(--color-text)] uppercase mb-1.5">Kelurahan / Desa</label>
            <input
              type="text"
              defaultValue={settings.village}
              oninput={(e) => updateSettings({ village: e.currentTarget.value })}
              class="w-full bg-[var(--color-background)] border border-[var(--color-border)] rounded-xl px-4 py-2.5 text-[var(--color-text)] text-sm focus:outline-none focus:border-emerald-500"
            />
          </div>

          <div>
            <label class="block text-xs font-semibold text-[var(--color-text)] uppercase mb-1.5">Kecamatan</label>
            <input
              type="text"
              defaultValue={settings.district}
              oninput={(e) => updateSettings({ district: e.currentTarget.value })}
              class="w-full bg-[var(--color-background)] border border-[var(--color-border)] rounded-xl px-4 py-2.5 text-[var(--color-text)] text-sm focus:outline-none focus:border-emerald-500"
            />
          </div>

          <div>
            <label class="block text-xs font-semibold text-[var(--color-text)] uppercase mb-1.5">Kabupaten / Kota</label>
            <input
              type="text"
              defaultValue={settings.regency}
              oninput={(e) => updateSettings({ regency: e.currentTarget.value })}
              class="w-full bg-[var(--color-background)] border border-[var(--color-border)] rounded-xl px-4 py-2.5 text-[var(--color-text)] text-sm focus:outline-none focus:border-emerald-500"
            />
          </div>

          <div>
            <label class="block text-xs font-semibold text-[var(--color-text)] uppercase mb-1.5">Provinsi</label>
            <input
              type="text"
              defaultValue={settings.province}
              oninput={(e) => updateSettings({ province: e.currentTarget.value })}
              class="w-full bg-[var(--color-background)] border border-[var(--color-border)] rounded-xl px-4 py-2.5 text-[var(--color-text)] text-sm focus:outline-none focus:border-emerald-500"
            />
          </div>

          <div>
            <label class="block text-xs font-semibold text-[var(--color-text)] uppercase mb-1.5">Kode Pos</label>
            <input
              type="text"
              defaultValue={settings.postalCode}
              oninput={(e) => updateSettings({ postalCode: e.currentTarget.value })}
              class="w-full bg-[var(--color-background)] border border-[var(--color-border)] rounded-xl px-4 py-2.5 text-[var(--color-text)] text-sm focus:outline-none focus:border-emerald-500"
            />
          </div>

          <div>
            <label class="block text-xs font-semibold text-[var(--color-text)] uppercase mb-1.5">Zona Waktu (Timezone)</label>
            <select
              value={settings.timezone}
              onchange={(e) => updateSettings({ timezone: e.currentTarget.value })}
              class="w-full bg-[var(--color-background)] border border-[var(--color-border)] rounded-xl px-4 py-2.5 text-[var(--color-text)] text-sm focus:outline-none focus:border-emerald-500"
            >
              <option value="Asia/Jakarta">Asia/Jakarta (WIB)</option>
              <option value="Asia/Makassar">Asia/Makassar (WITA)</option>
              <option value="Asia/Jayapura">Asia/Jayapura (WIT)</option>
            </select>
          </div>

          <div class="md:col-span-2 border-t border-[var(--color-border)] pt-6 mt-2">
            <h3 class="text-md font-bold text-[var(--color-text)] mb-4 flex items-center gap-2">
              <MapPin class="w-4 h-4 text-emerald-600 dark:text-emerald-400" /> Koordinat & Peta Lokasi
            </h3>
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label class="block text-xs font-semibold text-[var(--color-text)] uppercase mb-1.5">Latitude</label>
                <input
                  type="number"
                  step="any"
                  defaultValue={settings.latitude}
                  oninput={(e) => updateSettings({ latitude: parseFloat(e.currentTarget.value) || 0 })}
                  class="w-full bg-[var(--color-background)] border border-[var(--color-border)] rounded-xl px-4 py-2.5 text-[var(--color-text)] text-sm focus:outline-none focus:border-emerald-500"
                />
              </div>
              <div>
                <label class="block text-xs font-semibold text-[var(--color-text)] uppercase mb-1.5">Longitude</label>
                <input
                  type="number"
                  step="any"
                  defaultValue={settings.longitude}
                  oninput={(e) => updateSettings({ longitude: parseFloat(e.currentTarget.value) || 0 })}
                  class="w-full bg-[var(--color-background)] border border-[var(--color-border)] rounded-xl px-4 py-2.5 text-[var(--color-text)] text-sm focus:outline-none focus:border-emerald-500"
                />
              </div>
              <div class="md:col-span-2">
                <label class="block text-xs font-semibold text-[var(--color-text)] uppercase mb-1.5">Google Maps Embed URL</label>
                <input
                  type="text"
                  defaultValue={settings.mapEmbedUrl}
                  oninput={(e) => updateSettings({ mapEmbedUrl: e.currentTarget.value })}
                  class="w-full bg-[var(--color-background)] border border-[var(--color-border)] rounded-xl px-4 py-2.5 text-[var(--color-text)] text-sm focus:outline-none focus:border-emerald-500"
                />
              </div>
              <div class="md:col-span-2">
                <label class="block text-xs font-semibold text-[var(--color-text)] uppercase mb-1.5">External Map Link (Petunjuk Arah)</label>
                <input
                  type="text"
                  defaultValue={settings.externalMapUrl}
                  oninput={(e) => updateSettings({ externalMapUrl: e.currentTarget.value })}
                  class="w-full bg-[var(--color-background)] border border-[var(--color-border)] rounded-xl px-4 py-2.5 text-[var(--color-text)] text-sm focus:outline-none focus:border-emerald-500"
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    {/if}

    <!-- TAB 2: Channels -->
    {#if activeTab === 'channels'}
      <div class="space-y-6">
        <div class="bg-[var(--color-card)] border border-[var(--color-border)] p-6 rounded-2xl shadow-sm">
          <h2 class="text-lg font-bold text-[var(--color-text)] mb-2 flex items-center gap-2">
            <Share2 class="w-5 h-5 text-emerald-600 dark:text-emerald-400" /> Tambah Kanal Kontak Baru
          </h2>
          <form onsubmit={addChannel} class="grid grid-cols-1 md:grid-cols-4 gap-4 mt-4">
            <div>
              <label class="block text-xs font-semibold text-[var(--color-text)] uppercase mb-1">Label Publik</label>
              {#key bufKey}
                <input
                  type="text"
                  placeholder="Contoh: WhatsApp Pendaftaran"
                  defaultValue={newChannelLabel}
                  oninput={(e) => (newChannelLabel = e.currentTarget.value)}
                  required
                  class="w-full bg-[var(--color-background)] border border-[var(--color-border)] rounded-xl px-3 py-2 text-[var(--color-text)] text-sm"
                />
              {/key}
            </div>
            <div>
              <label class="block text-xs font-semibold text-[var(--color-text)] uppercase mb-1">Tipe Kanal</label>
              <select
                value={newChannelType}
                onchange={(e) => (newChannelType = e.currentTarget.value as ContactChannelEntity['type'])}
                class="w-full bg-[var(--color-background)] border border-[var(--color-border)] rounded-xl px-3 py-2 text-[var(--color-text)] text-sm"
              >
                <option value="Phone">Telepon (tel:)</option>
                <option value="WhatsApp">WhatsApp</option>
                <option value="Email">Email (mailto:)</option>
                <option value="Website">Website</option>
                <option value="Social Media">Social Media</option>
                <option value="Other">Lainnya</option>
              </select>
            </div>
            <div>
              <label class="block text-xs font-semibold text-[var(--color-text)] uppercase mb-1">Nilai / Nomor / URL</label>
              {#key bufKey}
                <input
                  type="text"
                  placeholder="+62... atau https://..."
                  defaultValue={newChannelValue}
                  oninput={(e) => (newChannelValue = e.currentTarget.value)}
                  required
                  class="w-full bg-[var(--color-background)] border border-[var(--color-border)] rounded-xl px-3 py-2 text-[var(--color-text)] text-sm"
                />
              {/key}
            </div>
            <div class="flex items-end">
              <button
                type="submit"
                class="w-full py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-medium rounded-xl text-sm transition-colors flex items-center justify-center gap-2 shadow-sm"
              >
                <Plus class="w-4 h-4" /> Tambah Kanal
              </button>
            </div>
          </form>
        </div>

        <div class="bg-[var(--color-card)] border border-[var(--color-border)] rounded-2xl overflow-hidden shadow-sm">
          <div class="p-6 border-b border-[var(--color-border)]">
            <h3 class="text-md font-bold text-[var(--color-text)]">Daftar Kanal Kontak Aktif</h3>
            <p class="text-xs text-[var(--color-muted-foreground)]">Atur visibilitas dan status utama kanal komunikasi publik.</p>
          </div>

          <div class="divide-y divide-[var(--color-border)]">
            {#each settings.channels as chn (chn.id)}
              <div class="p-4 md:p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:bg-[var(--color-muted)]/50 transition-colors">
                <div class="flex items-start gap-3">
                  <div class="w-10 h-10 rounded-xl bg-[var(--color-muted)] flex items-center justify-center text-emerald-600 dark:text-emerald-400 shrink-0">
                    {#if chn.type === 'Phone'}<Phone class="w-5 h-5" />{/if}
                    {#if chn.type === 'WhatsApp'}<MessageSquare class="w-5 h-5" />{/if}
                    {#if chn.type === 'Email'}<Mail class="w-5 h-5" />{/if}
                    {#if chn.type === 'Website'}<Globe class="w-5 h-5" />{/if}
                    {#if chn.type === 'Social Media'}<Share2 class="w-5 h-5" />{/if}
                    {#if chn.type === 'Other'}<Building2 class="w-5 h-5" />{/if}
                  </div>
                  <div>
                    <div class="flex items-center gap-2">
                      <h4 class="text-sm font-bold text-[var(--color-text)]">{chn.label}</h4>
                      {#if chn.isPrimary}
                        <span class="px-2 py-0.5 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 rounded-md text-[10px] font-bold uppercase">
                          Utama
                        </span>
                      {/if}
                    </div>
                    <p class="text-xs text-emerald-600 dark:text-emerald-400 font-mono mt-0.5">{chn.value}</p>
                    <span class="text-[10px] text-[var(--color-muted-foreground)] uppercase tracking-wider block mt-1">Tipe: {chn.type}</span>
                  </div>
                </div>

                <div class="flex items-center gap-3">
                  <label class="flex items-center gap-2 cursor-pointer bg-[var(--color-background)] px-3 py-1.5 rounded-lg border border-[var(--color-border)] text-xs text-[var(--color-text)]">
                    <input
                      type="checkbox"
                      checked={chn.showOnWebsite}
                      onchange={() => toggleChannelVisibility(chn.id)}
                      class="rounded text-emerald-600 focus:ring-emerald-500 bg-[var(--color-card)] border-[var(--color-border)]"
                    />
                    Tampil di Website
                  </label>
                  <button
                    onclick={() => removeChannel(chn.id)}
                    class="p-2 text-rose-500 hover:bg-rose-500/10 rounded-lg transition-colors"
                    title="Hapus Kanal"
                  >
                    <Trash2 class="w-4 h-4" />
                  </button>
                </div>
              </div>
            {/each}
          </div>
        </div>
      </div>
    {/if}

    <!-- TAB 3: Hours -->
    {#if activeTab === 'hours'}
      <div class="space-y-6">
        <div class="bg-[var(--color-card)] border border-[var(--color-border)] p-6 rounded-2xl shadow-sm">
          <h2 class="text-lg font-bold text-[var(--color-text)] mb-1 flex items-center gap-2">
            <Clock class="w-5 h-5 text-emerald-600 dark:text-emerald-400" /> Jam Operasional Harian Puskesmas
          </h2>
          <p class="text-xs text-[var(--color-muted-foreground)] mb-6">Menentukan status buka/tutup otomatis pada homepage dan halaman kontak.</p>

          <div class="space-y-3">
            {#each settings.operatingHours as oh, index (oh.day)}
              <div class="bg-[var(--color-background)] p-4 rounded-xl border border-[var(--color-border)] flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div class="flex items-center gap-3 min-w-[140px]">
                  <span class="text-sm font-bold text-[var(--color-text)] w-20">{oh.dayNameId}</span>
                  <label class="flex items-center gap-2 cursor-pointer text-xs font-semibold">
                    <input
                      type="checkbox"
                      checked={oh.isOpen}
                      onchange={(e) => updateOperatingDay(index, 'isOpen', e.currentTarget.checked)}
                      class="rounded text-emerald-600 focus:ring-emerald-500 bg-[var(--color-card)] border-[var(--color-border)] w-4 h-4"
                    />
                    <span class={oh.isOpen ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-500'}>
                      {oh.isOpen ? 'Buka' : 'Tutup'}
                    </span>
                  </label>
                </div>

                {#if oh.isOpen}
                  <div class="flex items-center gap-3 flex-1">
                    <div class="flex items-center gap-2">
                      <span class="text-xs text-[var(--color-muted-foreground)]">Buka:</span>
                      <input
                        type="time"
                        value={oh.openTime}
                        onchange={(e) => updateOperatingDay(index, 'openTime', e.currentTarget.value)}
                        class="bg-[var(--color-card)] border border-[var(--color-border)] rounded-lg px-3 py-1.5 text-[var(--color-text)] text-xs"
                      />
                    </div>
                    <div class="flex items-center gap-2">
                      <span class="text-xs text-[var(--color-muted-foreground)]">Tutup:</span>
                      <input
                        type="time"
                        value={oh.closeTime}
                        onchange={(e) => updateOperatingDay(index, 'closeTime', e.currentTarget.value)}
                        class="bg-[var(--color-card)] border border-[var(--color-border)] rounded-lg px-3 py-1.5 text-[var(--color-text)] text-xs"
                      />
                    </div>
                    <input
                      type="text"
                      placeholder="Catatan (misal: Istirahat sholat jumat)"
                      defaultValue={oh.notes || ''}
                      oninput={(e) => updateOperatingDay(index, 'notes', e.currentTarget.value)}
                      class="flex-1 bg-[var(--color-card)] border border-[var(--color-border)] rounded-lg px-3 py-1.5 text-[var(--color-text)] text-xs hidden md:block"
                    />
                  </div>
                {:else}
                  <div class="flex-1 text-xs text-[var(--color-muted-foreground)] italic">
                    {oh.notes || 'Tutup (Libur Operasional)'}
                  </div>
                {/if}
              </div>
            {/each}
          </div>
        </div>

        <!-- Special Hours -->
        <div class="bg-[var(--color-card)] border border-[var(--color-border)] p-6 rounded-2xl space-y-6 shadow-sm">
          <h3 class="text-md font-bold text-[var(--color-text)] flex items-center gap-2">
            <Calendar class="w-4 h-4 text-emerald-600 dark:text-emerald-400" /> Jam Khusus / Hari Libur Nasional (Special Hours)
          </h3>

          <form onsubmit={addSpecialHour} class="grid grid-cols-1 md:grid-cols-5 gap-3 bg-[var(--color-background)] p-4 rounded-xl border border-[var(--color-border)]">
            <div>
              <label class="block text-xs font-semibold text-[var(--color-text)] mb-1">Tanggal</label>
              <input
                type="date"
                value={newSpecialDate}
                oninput={(e) => (newSpecialDate = e.currentTarget.value)}
                required
                class="w-full bg-[var(--color-card)] border border-[var(--color-border)] rounded-lg px-3 py-1.5 text-[var(--color-text)] text-xs"
              />
            </div>
            <div class="md:col-span-2">
              <label class="block text-xs font-semibold text-[var(--color-text)] mb-1">Keterangan / Nama Libur</label>
              {#key bufKey}
                <input
                  type="text"
                  placeholder="Contoh: Libur Hari Kemerdekaan"
                  defaultValue={newSpecialTitle}
                  oninput={(e) => (newSpecialTitle = e.currentTarget.value)}
                  required
                  class="w-full bg-[var(--color-card)] border border-[var(--color-border)] rounded-lg px-3 py-1.5 text-[var(--color-text)] text-xs"
                />
              {/key}
            </div>
            <div>
              <label class="block text-xs font-semibold text-[var(--color-text)] mb-1">Status</label>
              <select
                value={newSpecialIsOpen ? 'open' : 'closed'}
                onchange={(e) => (newSpecialIsOpen = e.currentTarget.value === 'open')}
                class="w-full bg-[var(--color-card)] border border-[var(--color-border)] rounded-lg px-3 py-1.5 text-[var(--color-text)] text-xs"
              >
                <option value="closed">Tutup Total</option>
                <option value="open">Jam Khusus</option>
              </select>
            </div>
            <div class="flex items-end">
              <button
                type="submit"
                class="w-full py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-medium rounded-lg text-xs transition-colors shadow-sm"
              >
                Tambah Libur
              </button>
            </div>
          </form>

          <div class="divide-y divide-[var(--color-border)]">
            {#each settings.specialHours as sh (sh.id)}
              <div class="py-3 flex items-center justify-between text-sm">
                <div>
                  <div class="flex items-center gap-2">
                    <span class="font-bold text-[var(--color-text)]">{sh.title}</span>
                    <span class={`px-2 py-0.5 rounded text-[10px] font-bold ${sh.isOpen ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' : 'bg-rose-500/10 text-rose-500'}`}>
                      {sh.isOpen ? `Buka (${sh.openTime} - ${sh.closeTime})` : 'Tutup'}
                    </span>
                  </div>
                  <p class="text-xs text-[var(--color-muted-foreground)] mt-0.5">Tanggal: {sh.date} {sh.notes ? `• ${sh.notes}` : ''}</p>
                </div>
                <button
                  onclick={() => removeSpecialHour(sh.id)}
                  class="p-1.5 text-rose-500 hover:bg-rose-500/10 rounded-lg transition-colors"
                >
                  <Trash2 class="w-4 h-4" />
                </button>
              </div>
            {/each}
          </div>
        </div>
      </div>
    {/if}

    <!-- TAB 4: Emergency -->
    {#if activeTab === 'emergency'}
      <div class="bg-[var(--color-card)] border border-[var(--color-border)] p-6 md:p-8 rounded-2xl space-y-6 shadow-sm">
        <div class="border-b border-[var(--color-border)] pb-4">
          <h2 class="text-lg font-bold text-[var(--color-text)] flex items-center gap-2">
            <ShieldAlert class="w-5 h-5 text-rose-500" /> Informasi Darurat & IGD Puskesmas
          </h2>
          <p class="text-xs text-[var(--color-muted-foreground)] mt-1">Pengaturan blok siaga darurat yang dapat disematkan di homepage, halaman kontak, dan layanan.</p>
        </div>

        <div class="space-y-4">
          <div>
            <label class="block text-xs font-semibold text-[var(--color-text)] uppercase mb-1.5">Judul Informasi Darurat</label>
            <input
              type="text"
              defaultValue={settings.emergencyInfo.title}
              oninput={(e) => updateSettings({ emergencyInfo: { ...settings!.emergencyInfo, title: e.currentTarget.value } })}
              class="w-full bg-[var(--color-background)] border border-[var(--color-border)] rounded-xl px-4 py-2.5 text-[var(--color-text)] text-sm focus:outline-none focus:border-emerald-500"
            />
          </div>

          <div>
            <label class="block text-xs font-semibold text-[var(--color-text)] uppercase mb-1.5">Deskripsi & Petunjuk</label>
            <textarea
              rows={3}
              oninput={(e) => updateSettings({ emergencyInfo: { ...settings!.emergencyInfo, description: e.currentTarget.value } })}
              class="w-full bg-[var(--color-background)] border border-[var(--color-border)] rounded-xl px-4 py-2.5 text-[var(--color-text)] text-sm focus:outline-none focus:border-emerald-500"
            >{settings.emergencyInfo.description}</textarea>
          </div>

          <div>
            <label class="block text-xs font-semibold text-[var(--color-text)] uppercase mb-1.5">Catatan Lokasi IGD</label>
            <input
              type="text"
              defaultValue={settings.emergencyInfo.locationNote}
              oninput={(e) => updateSettings({ emergencyInfo: { ...settings!.emergencyInfo, locationNote: e.currentTarget.value } })}
              class="w-full bg-[var(--color-background)] border border-[var(--color-border)] rounded-xl px-4 py-2.5 text-[var(--color-text)] text-sm focus:outline-none focus:border-emerald-500"
            />
          </div>

          <div class="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4 border-t border-[var(--color-border)]">
            <label class="flex items-center gap-3 bg-[var(--color-background)] p-4 rounded-xl border border-[var(--color-border)] cursor-pointer">
              <input
                type="checkbox"
                checked={settings.emergencyInfo.showOnHomepage}
                onchange={(e) => updateSettings({ emergencyInfo: { ...settings!.emergencyInfo, showOnHomepage: e.currentTarget.checked } })}
                class="rounded text-emerald-600 focus:ring-emerald-500 bg-[var(--color-card)] border-[var(--color-border)] w-4 h-4"
              />
              <span class="text-xs font-semibold text-[var(--color-text)]">Tampilkan di Homepage (Banner Darurat)</span>
            </label>

            <label class="flex items-center gap-3 bg-[var(--color-background)] p-4 rounded-xl border border-[var(--color-border)] cursor-pointer">
              <input
                type="checkbox"
                checked={settings.emergencyInfo.showOnContactPage}
                onchange={(e) => updateSettings({ emergencyInfo: { ...settings!.emergencyInfo, showOnContactPage: e.currentTarget.checked } })}
                class="rounded text-emerald-600 focus:ring-emerald-500 bg-[var(--color-card)] border-[var(--color-border)] w-4 h-4"
              />
              <span class="text-xs font-semibold text-[var(--color-text)]">Tampilkan di Halaman Kontak</span>
            </label>

            <label class="flex items-center gap-3 bg-[var(--color-background)] p-4 rounded-xl border border-[var(--color-border)] cursor-pointer">
              <input
                type="checkbox"
                checked={settings.emergencyInfo.showOnServicePages}
                onchange={(e) => updateSettings({ emergencyInfo: { ...settings!.emergencyInfo, showOnServicePages: e.currentTarget.checked } })}
                class="rounded text-emerald-600 focus:ring-emerald-500 bg-[var(--color-card)] border-[var(--color-border)] w-4 h-4"
              />
              <span class="text-xs font-semibold text-[var(--color-text)]">Tampilkan di Halaman Layanan</span>
            </label>
          </div>
        </div>
      </div>
    {/if}
  </div>
  {/key}
{/if}
