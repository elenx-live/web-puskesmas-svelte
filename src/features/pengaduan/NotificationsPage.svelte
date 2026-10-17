<!-- @component Pusat Notifikasi & Aktivitas: notifikasi in-app, riwayat aktivitas, dan preferensi saluran (dari NotificationsPage). -->
<script lang="ts">
  import { notificationService } from '../../shared/services/notificationService.js';
  import { authStore } from '../../shared/stores/auth.svelte.js';
  import type { NotificationEntity, NotificationPreference } from '../../shared/types/index.js';
  import NotificationCard from './NotificationCard.svelte';
  import Button from '../../shared/ui/Button.svelte';
  import Card from '../../shared/ui/Card.svelte';
  import Badge from '../../shared/ui/Badge.svelte';
  import {
    Bell, CheckCircle2, Activity, Settings, ShieldAlert, Clock
  } from 'lucide-svelte';

  let activeTab = $state<'notifications' | 'activity' | 'preferences'>('notifications');
  let notifications = $state<NotificationEntity[]>([]);
  let activityLogs = $state<any[]>([]);
  let preferences = $state<NotificationPreference>({ userId: '', inAppEnabled: true });

  // Filters for notifications
  let typeFilter = $state('all');
  let statusFilter = $state('all'); // all, unread, important

  const user = $derived(authStore.user);
  const recipientId = $derived(user?.uid || 'guest');

  function loadData() {
    if (!user || document.hidden) return;
    try {
      notifications = notificationService.getUserNotifications(recipientId);
      activityLogs = notificationService.getUserActivityLogs(recipientId);
      preferences = notificationService.getPreference(recipientId);
    } catch (e) {
      console.error('Failed to load notifications page data:', e);
    }
  }

  $effect(() => {
    // re-subscribe ke recipientId agar reload saat user berubah
    void recipientId;
    loadData();
    const interval = setInterval(loadData, 10000);
    return () => clearInterval(interval);
  });

  const unreadCount = $derived(notifications.filter(n => n.status === 'unread').length);

  function handleMarkAsRead(id: string) {
    try {
      notificationService.markAsRead(id, recipientId);
      loadData();
    } catch (e) {
      console.error(e);
    }
  }

  function handleMarkAsUnread(id: string) {
    try {
      notificationService.markAsUnread(id, recipientId);
      loadData();
    } catch (e) {
      console.error(e);
    }
  }

  function handleDeleteNotification(id: string) {
    try {
      notificationService.deleteNotification(id, recipientId);
      loadData();
    } catch (e) {
      console.error(e);
    }
  }

  function handleMarkAllAsRead() {
    try {
      notificationService.markAllAsRead(recipientId);
      loadData();
    } catch (e) {
      console.error(e);
    }
  }

  function handleSavePreferences(e: SubmitEvent) {
    e.preventDefault();
    if (!user) return;
    try {
      const actor = { id: user.uid, email: user.email, name: user.displayName };
      notificationService.updatePreferences(recipientId, preferences, actor);
      alert('Preferensi notifikasi berhasil disimpan.');
    } catch (err: any) {
      alert(err.message || 'Gagal menyimpan preferensi.');
    }
  }

  // Filter and Group notifications
  const filteredNotifications = $derived(notifications.filter(n => {
    if (statusFilter === 'unread' && n.status !== 'unread') return false;
    if (statusFilter === 'important' && n.priority !== 'Important' && n.priority !== 'Urgent') return false;
    if (typeFilter !== 'all' && n.type !== typeFilter) return false;
    return true;
  }));

  // Group by date (Hari Ini, Kemarin, Minggu Ini, Lebih Lama)
  const grouped = $derived((() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    const weekAgo = new Date(today);
    weekAgo.setDate(weekAgo.getDate() - 7);

    const groups: { today: NotificationEntity[]; yesterday: NotificationEntity[]; thisWeek: NotificationEntity[]; older: NotificationEntity[] } = {
      today: [],
      yesterday: [],
      thisWeek: [],
      older: []
    };

    filteredNotifications.forEach(item => {
      const d = new Date(item.createdAt);
      if (d >= today) {
        groups.today.push(item);
      } else if (d >= yesterday) {
        groups.yesterday.push(item);
      } else if (d >= weekAgo) {
        groups.thisWeek.push(item);
      } else {
        groups.older.push(item);
      }
    });

    return groups;
  })());

  const statusTabs = [
    { id: 'all', label: 'Semua' },
    { id: 'unread', label: 'Belum Dibaca' },
    { id: 'important', label: 'Penting / Urgent' }
  ];
</script>

<div class="py-12 px-6 max-w-5xl mx-auto space-y-8">

  <!-- Header Title -->
  <div class="bg-[var(--color-card)] border border-[var(--color-border)] rounded-3xl p-6 md:p-8 flex flex-col md:flex-row md:items-center justify-between gap-6 shadow-xl">
    <div class="space-y-2">
      <div class="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[var(--color-primary)]/10 text-[var(--color-primary)] text-xs font-bold">
        <Bell class="w-3.5 h-3.5" />
        <span>Pusat Notifikasi & Aktivitas Terpadu</span>
      </div>
      <h1 class="text-2xl md:text-3xl font-light text-[var(--color-text)] tracking-tight">Pusat Pemberitahuan Anda</h1>
      <p class="text-xs text-[var(--color-muted-foreground)]">Pantau seluruh status layanan, pendaftaran, riwayat aktivitas, dan atur saluran komunikasi Anda secara aman.</p>
    </div>

    <div class="flex items-center gap-3">
      <div class="bg-[var(--color-bg)] border border-[var(--color-border)] px-4 py-3 rounded-2xl text-center">
        <span class="text-[10px] text-[var(--color-muted-foreground)] uppercase font-mono block">Belum Dibaca</span>
        <span class="text-lg font-black text-[var(--color-primary)]">
          {unreadCount > 99 ? '99+' : unreadCount}
        </span>
      </div>
      {#if unreadCount > 0}
        <Button
          onclick={handleMarkAllAsRead}
          variant="primary"
          size="sm"
          class="flex items-center gap-2 h-14 px-4 text-xs font-bold"
        >
          <CheckCircle2 class="w-4 h-4" />
          <span>Tandai Semua Dibaca</span>
        </Button>
      {/if}
    </div>
  </div>

  <!-- Navigation Tabs -->
  <div class="flex border-b border-[var(--color-border)] gap-2 pb-px">
    <button
      onclick={() => activeTab = 'notifications'}
      class={`px-5 py-3 text-xs font-bold rounded-t-2xl transition-all border-b-2 flex items-center gap-2 ${
        activeTab === 'notifications'
          ? 'border-[var(--color-primary)] text-[var(--color-primary)] bg-[var(--color-primary)]/5'
          : 'border-transparent text-[var(--color-muted-foreground)] hover:text-[var(--color-text)] hover:bg-[var(--color-surface)]/10'
      }`}
    >
      <Bell class="w-4 h-4" />
      <span>Notifikasi In-App</span>
      {#if unreadCount > 0}
        <span class="px-1.5 py-0.5 rounded-full bg-red-500 text-[var(--color-text)] text-[10px] font-mono">
          {unreadCount > 99 ? '99+' : unreadCount}
        </span>
      {/if}
    </button>
    <button
      onclick={() => activeTab = 'activity'}
      class={`px-5 py-3 text-xs font-bold rounded-t-2xl transition-all border-b-2 flex items-center gap-2 ${
        activeTab === 'activity'
          ? 'border-[var(--color-primary)] text-[var(--color-primary)] bg-[var(--color-primary)]/5'
          : 'border-transparent text-[var(--color-muted-foreground)] hover:text-[var(--color-text)] hover:bg-[var(--color-surface)]/10'
      }`}
    >
      <Activity class="w-4 h-4" />
      <span>Aktivitas Saya</span>
      <span class="px-1.5 py-0.5 rounded-full bg-[var(--color-card)] text-[var(--color-text)] text-[10px] font-mono">
        {activityLogs.length}
      </span>
    </button>
    <button
      onclick={() => activeTab = 'preferences'}
      class={`px-5 py-3 text-xs font-bold rounded-t-2xl transition-all border-b-2 flex items-center gap-2 ${
        activeTab === 'preferences'
          ? 'border-[var(--color-primary)] text-[var(--color-primary)] bg-[var(--color-primary)]/5'
          : 'border-transparent text-[var(--color-muted-foreground)] hover:text-[var(--color-text)] hover:bg-[var(--color-surface)]/10'
      }`}
    >
      <Settings class="w-4 h-4" />
      <span>Pengaturan & Preferensi</span>
    </button>
  </div>

  <!-- TAB 1: NOTIFICATIONS -->
  {#if activeTab === 'notifications'}
    <div class="space-y-6">
      <!-- Filters Bar -->
      <Card class="p-4 border-[var(--color-border)] bg-[var(--color-card)] flex flex-col md:flex-row items-center justify-between gap-4">
        <div class="flex items-center gap-2 overflow-x-auto w-full md:w-auto pb-2 md:pb-0">
          {#each statusTabs as tab (tab.id)}
            <button
              onclick={() => statusFilter = tab.id}
              class={`px-3.5 py-2 rounded-xl text-xs font-bold transition shrink-0 ${
                statusFilter === tab.id
                  ? 'bg-[var(--color-primary)] text-[var(--color-primary-foreground)] shadow-md'
                  : 'bg-[var(--color-bg)] text-[var(--color-muted-foreground)] border border-[var(--color-border)] hover:text-[var(--color-text)]'
              }`}
            >
              {tab.label}
            </button>
          {/each}
        </div>

        <div class="flex items-center gap-2 w-full md:w-auto">
          <span class="text-xs text-[var(--color-muted-foreground)] font-mono shrink-0">Tipe:</span>
          <select
            value={typeFilter}
            onchange={(e) => typeFilter = e.currentTarget.value}
            class="bg-[var(--color-bg)] border border-[var(--color-border)] text-[var(--color-text)] text-xs rounded-xl px-3 py-2 focus:outline-none focus:border-[var(--color-primary)] w-full md:w-auto"
          >
            <option value="all">Semua Jenis</option>
            <option value="registration">Pendaftaran</option>
            <option value="queue">Antrean</option>
            <option value="complaint">Pengaduan</option>
            <option value="survey">Survei</option>
            <option value="document">Dokumen</option>
            <option value="facility">Fasilitas</option>
            <option value="content">Konten</option>
            <option value="system">Sistem</option>
          </select>
        </div>
      </Card>

      <!-- Notification Lists Grouped by Date -->
      <div class="space-y-6">
        {#if filteredNotifications.length === 0}
          <Card class="p-16 text-center space-y-4 border-[var(--color-border)] bg-[var(--color-card)] text-[var(--color-muted-foreground)]">
            <Bell class="w-12 h-12 text-zinc-700 mx-auto" />
            <div class="max-w-xs mx-auto space-y-1">
              <h3 class="text-base font-bold text-[var(--color-text)]">Tidak Ada Notifikasi</h3>
              <p class="text-xs text-[var(--color-muted-foreground)]">Anda tidak memiliki pemberitahuan yang sesuai dengan filter saat ini.</p>
            </div>
          </Card>
        {:else}
          <!-- Hari Ini -->
          {#if grouped.today.length > 0}
            <div class="space-y-3">
              <h3 class="text-xs font-bold uppercase tracking-wider text-[var(--color-primary)] font-mono flex items-center gap-2">
                <Clock class="w-3.5 h-3.5" />
                <span>Hari Ini ({grouped.today.length})</span>
              </h3>
              <div class="space-y-2.5">
                {#each grouped.today as notif (notif.id)}
                  <NotificationCard
                    {notif}
                    onMarkRead={handleMarkAsRead}
                    onMarkUnread={handleMarkAsUnread}
                    onDelete={handleDeleteNotification}
                  />
                {/each}
              </div>
            </div>
          {/if}

          <!-- Kemarin -->
          {#if grouped.yesterday.length > 0}
            <div class="space-y-3">
              <h3 class="text-xs font-bold uppercase tracking-wider text-[var(--color-muted-foreground)] font-mono flex items-center gap-2">
                <Clock class="w-3.5 h-3.5" />
                <span>Kemarin ({grouped.yesterday.length})</span>
              </h3>
              <div class="space-y-2.5">
                {#each grouped.yesterday as notif (notif.id)}
                  <NotificationCard
                    {notif}
                    onMarkRead={handleMarkAsRead}
                    onMarkUnread={handleMarkAsUnread}
                    onDelete={handleDeleteNotification}
                  />
                {/each}
              </div>
            </div>
          {/if}

          <!-- Minggu Ini -->
          {#if grouped.thisWeek.length > 0}
            <div class="space-y-3">
              <h3 class="text-xs font-bold uppercase tracking-wider text-[var(--color-muted-foreground)] font-mono flex items-center gap-2">
                <Clock class="w-3.5 h-3.5" />
                <span>Minggu Ini ({grouped.thisWeek.length})</span>
              </h3>
              <div class="space-y-2.5">
                {#each grouped.thisWeek as notif (notif.id)}
                  <NotificationCard
                    {notif}
                    onMarkRead={handleMarkAsRead}
                    onMarkUnread={handleMarkAsUnread}
                    onDelete={handleDeleteNotification}
                  />
                {/each}
              </div>
            </div>
          {/if}

          <!-- Lebih Lama -->
          {#if grouped.older.length > 0}
            <div class="space-y-3">
              <h3 class="text-xs font-bold uppercase tracking-wider text-[var(--color-muted-foreground)] font-mono flex items-center gap-2">
                <Clock class="w-3.5 h-3.5" />
                <span>Lebih Lama ({grouped.older.length})</span>
              </h3>
              <div class="space-y-2.5">
                {#each grouped.older as notif (notif.id)}
                  <NotificationCard
                    {notif}
                    onMarkRead={handleMarkAsRead}
                    onMarkUnread={handleMarkAsUnread}
                    onDelete={handleDeleteNotification}
                  />
                {/each}
              </div>
            </div>
          {/if}
        {/if}
      </div>
    </div>
  {/if}

  <!-- TAB 2: ACTIVITY CENTER ("AKTIVITAS SAYA") -->
  {#if activeTab === 'activity'}
    <div class="space-y-4">
      <div class="bg-[var(--color-card)] border border-[var(--color-border)] p-5 rounded-3xl space-y-1">
        <h3 class="text-sm font-bold text-[var(--color-text)] flex items-center gap-2">
          <Activity class="w-4 h-4 text-[var(--color-primary)]" />
          <span>Riwayat Aktivitas Pengguna (Activity Center)</span>
        </h3>
        <p class="text-xs text-[var(--color-muted-foreground)]">
          Log aktivitas operasional yang tercatat dari interaksi akun Anda (pembuatan pendaftaran, pengiriman pengaduan, perubahan data).
        </p>
      </div>

      <Card class="border-[var(--color-border)] bg-[var(--color-card)] overflow-hidden">
        <div class="divide-y divide-[var(--color-border)]">
          {#if activityLogs.length > 0}
            {#each activityLogs as log (log.id)}
              <div class="p-4 flex items-start gap-4 hover:bg-[var(--color-surface)]/10 transition">
                <div class="w-9 h-9 rounded-2xl bg-[var(--color-bg)] border border-[var(--color-border)] flex items-center justify-center shrink-0 mt-0.5">
                  <Activity class="w-4 h-4 text-[var(--color-primary)]" />
                </div>
                <div class="flex-1 space-y-1">
                  <div class="flex items-center justify-between">
                    <span class="text-xs font-bold text-[var(--color-text)]">{log.targetName}</span>
                    <span class="text-[10px] text-[var(--color-muted-foreground)] font-mono">
                      {new Date(log.createdAt).toLocaleString('id-ID')}
                    </span>
                  </div>
                  <p class="text-xs text-[var(--color-text)] leading-relaxed">{log.description}</p>
                  <div class="flex items-center gap-2 pt-1">
                    <Badge variant="zinc" size="sm">Modul: {log.module}</Badge>
                    <Badge variant="amber" size="sm">Aksi: {log.action}</Badge>
                  </div>
                </div>
              </div>
            {/each}
          {:else}
            <div class="p-16 text-center text-[var(--color-muted-foreground)] space-y-2">
              <Activity class="w-8 h-8 text-zinc-700 mx-auto" />
              <div class="text-xs font-semibold">Belum ada riwayat aktivitas</div>
              <p class="text-[10px] text-zinc-600 max-w-xs mx-auto">Aktivitas pendaftaran atau pengaduan Anda akan tercatat secara otomatis di sini.</p>
            </div>
          {/if}
        </div>
      </Card>
    </div>
  {/if}

  <!-- TAB 3: PREFERENCES & NOTIFICATION SETTINGS -->
  {#if activeTab === 'preferences'}
    <form onsubmit={handleSavePreferences} class="space-y-6">
      <Card class="p-6 border-[var(--color-border)] bg-[var(--color-card)] space-y-6">
        <div>
          <h3 class="text-base font-bold text-[var(--color-text)] flex items-center gap-2">
            <Settings class="w-4 h-4 text-[var(--color-primary)]" />
            <span>Pengaturan Saluran Komunikasi</span>
          </h3>
          <p class="text-xs text-[var(--color-muted-foreground)] mt-1">
            Atur saluran pemberitahuan yang Anda inginkan untuk menerima informasi dari Puskesmas.
          </p>
        </div>

        <div class="space-y-4 divide-y divide-[var(--color-border)]">
          <div class="flex items-center justify-between pt-4">
            <div class="space-y-0.5">
              <label class="text-xs font-bold text-[var(--color-text)] block">Notifikasi In-App</label>
              <p class="text-[11px] text-[var(--color-muted-foreground)]">Terima pemberitahuan langsung di dalam aplikasi web Puskesmas.</p>
            </div>
            <input
              type="checkbox"
              checked={preferences.inAppEnabled}
              onchange={(e) => preferences = { ...preferences, inAppEnabled: e.currentTarget.checked }}
              class="w-5 h-5 accent-amber-500 rounded cursor-pointer"
            />
          </div>

          <div class="flex items-center justify-between pt-4">
            <div class="space-y-0.5">
              <label class="text-xs font-bold text-[var(--color-text)] block">Notifikasi Email (Deferred)</label>
              <p class="text-[11px] text-[var(--color-muted-foreground)]">Kirim salinan pemberitahuan penting ke alamat email terdaftar.</p>
            </div>
            <input
              type="checkbox"
              checked={preferences.emailEnabled ?? true}
              onchange={(e) => preferences = { ...preferences, emailEnabled: e.currentTarget.checked }}
              class="w-5 h-5 accent-amber-500 rounded cursor-pointer"
            />
          </div>

          <div class="flex items-center justify-between pt-4">
            <div class="space-y-0.5">
              <label class="text-xs font-bold text-[var(--color-text)] block">Notifikasi WhatsApp Cloud API</label>
              <p class="text-[11px] text-[var(--color-muted-foreground)]">Kirim pesan WhatsApp otomatis untuk pendaftaran dan nomor antrean.</p>
            </div>
            <input
              type="checkbox"
              checked={preferences.whatsappEnabled ?? true}
              onchange={(e) => preferences = { ...preferences, whatsappEnabled: e.currentTarget.checked }}
              class="w-5 h-5 accent-amber-500 rounded cursor-pointer"
            />
          </div>
        </div>

        <!-- Security notice -->
        <div class="bg-[var(--color-bg)] border border-[var(--color-border)] rounded-2xl p-4 flex items-start gap-3 text-xs text-[var(--color-muted-foreground)]">
          <ShieldAlert class="w-4 h-4 text-[var(--color-primary)] mt-0.5 shrink-0" />
          <p>
            Pemberitahuan keamanan akun dan event operasional penting (Security & Critical Operational) akan tetap dikirim secara In-App demi keamanan dan keselamatan data Anda.
          </p>
        </div>

        <div class="flex justify-end pt-2">
          <Button
            type="submit"
            variant="primary"
            size="sm"
            class="px-6 py-3 font-bold text-xs"
          >
            Simpan Preferensi
          </Button>
        </div>
      </Card>
    </form>
  {/if}

</div>
