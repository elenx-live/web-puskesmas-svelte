<!-- @component Lonceng notifikasi in-app — dropdown pusat notifikasi dengan tandai baca & arsip. -->
<script lang="ts">
  import { Bell, CheckCircle2, Archive, ExternalLink, Calendar, MessageSquare, UserCheck, ListOrdered } from 'lucide-svelte';
  import { notificationService } from '../../shared/services/notificationService.js';
  import type { NotificationEntity } from '../../shared/types/index.js';
  import { authStore } from '../../shared/stores/auth.svelte.js';
  import { navigate } from '../../app/router.svelte.js';
  import Badge from '../../shared/ui/Badge.svelte';

  let isOpen = $state(false);
  let notifications = $state<NotificationEntity[]>([]);
  let dropdownRef = $state<HTMLDivElement>();

  const recipientId = $derived(authStore.user?.uid || 'guest');

  function loadNotifications() {
    if (!authStore.user || document.hidden) return;
    try {
      notifications = notificationService.getUserNotifications(recipientId);
    } catch (e) {
      console.error('Failed to load bell notifications:', e);
    }
  }

  // Muat berkala + saat window fokus; muat ulang bila pengguna berganti
  $effect(() => {
    loadNotifications();

    const interval = setInterval(loadNotifications, 10000);
    window.addEventListener('focus', loadNotifications);

    return () => {
      clearInterval(interval);
      window.removeEventListener('focus', loadNotifications);
    };
  });

  // Tutup saat klik di luar dropdown
  $effect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef && !dropdownRef.contains(event.target as Node)) {
        isOpen = false;
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  });

  const unreadCount = $derived(notifications.filter((n) => n.status === 'unread').length);

  function handleMarkAllRead() {
    if (!authStore.user) return;
    try {
      notificationService.markAllAsRead(recipientId);
      loadNotifications();
    } catch (e) {
      console.error(e);
    }
  }

  function handleNotificationClick(notif: NotificationEntity) {
    if (!authStore.user) return;
    try {
      notificationService.markAsRead(notif.id, recipientId);
      loadNotifications();
      isOpen = false;
      if (notif.actionUrl) {
        navigate(notif.actionUrl);
      }
    } catch (e) {
      console.error(e);
    }
  }

  function handleArchiveClick(e: MouseEvent, id: string) {
    e.stopPropagation();
    if (!authStore.user) return;
    try {
      notificationService.archiveNotification(id, recipientId);
      loadNotifications();
    } catch (e) {
      console.error(e);
    }
  }
</script>

<div class="relative" bind:this={dropdownRef}>
  <!-- Bell Button -->
  <button
    onclick={() => (isOpen = !isOpen)}
    class="relative p-2 rounded-2xl bg-[var(--color-bg)] border border-[var(--color-border)] hover:border-[var(--color-primary)]/40 text-[var(--color-text)] hover:text-[var(--color-text)] transition"
    aria-label="Notification Center"
  >
    <Bell class="w-4 h-4" />
    {#if unreadCount > 0}
      <span class="absolute -top-1 -right-1 bg-red-500 text-[var(--color-text)] text-[9px] font-bold px-1.5 py-0.5 rounded-full animate-bounce">
        {unreadCount}
      </span>
    {/if}
  </button>

  <!-- Notification Dropdown Container -->
  {#if isOpen}
    <div class="absolute right-0 mt-3 w-80 sm:w-96 bg-[var(--color-card)] border border-[var(--color-border)] rounded-3xl shadow-2xl overflow-hidden z-50">
      <!-- Header -->
      <div class="p-4 border-b border-[var(--color-border)] flex items-center justify-between bg-[var(--color-bg)]">
        <div>
          <h4 class="text-xs font-bold text-[var(--color-text)] flex items-center gap-2">
            <span>Pusat Notifikasi</span>
            {#if unreadCount > 0}
              <Badge variant="red" size="sm">
                {unreadCount} Baru
              </Badge>
            {/if}
          </h4>
          <p class="text-[10px] text-[var(--color-muted-foreground)]">Pemberitahuan terkini pelayanan Puskesmas</p>
        </div>
        {#if unreadCount > 0}
          <button
            onclick={handleMarkAllRead}
            class="text-[10px] text-[var(--color-primary)] hover:text-[var(--color-primary)] font-bold flex items-center gap-1"
          >
            <CheckCircle2 class="w-3 h-3" />
            <span>Baca Semua</span>
          </button>
        {/if}
      </div>

      <!-- List -->
      <div class="max-h-96 overflow-y-auto divide-y divide-[var(--color-border)]">
        {#if notifications.length > 0}
          {#each notifications as notif (notif.id)}
            <div
              onclick={() => handleNotificationClick(notif)}
              onkeydown={(e) => e.key === 'Enter' && handleNotificationClick(notif)}
              role="button"
              tabindex="0"
              class={`p-4 flex gap-3 hover:bg-[var(--color-surface)]/10 cursor-pointer transition ${
                notif.status === 'unread' ? 'bg-[var(--color-primary)]/[0.02]' : ''
              }`}
            >
              <div class="w-8 h-8 rounded-xl bg-[var(--color-bg)] border border-[var(--color-border)] flex items-center justify-center shrink-0">
                {#if notif.type === 'registration'}
                  <UserCheck class="w-4 h-4 text-[var(--color-primary)]" />
                {:else if notif.type === 'queue'}
                  <ListOrdered class="w-4 h-4 text-[var(--color-primary)]" />
                {:else if notif.type === 'complaint'}
                  <MessageSquare class="w-4 h-4 text-indigo-500" />
                {:else}
                  <Bell class="w-4 h-4 text-blue-500" />
                {/if}
              </div>

              <div class="flex-1 space-y-1 text-left min-w-0">
                <div class="flex items-start justify-between gap-2">
                  <span class="text-[11px] font-bold block truncate text-[var(--color-text)]">
                    {notif.title}
                  </span>
                  {#if notif.status === 'unread'}
                    <span class="w-1.5 h-1.5 rounded-full bg-[var(--color-primary)] shrink-0 mt-1"></span>
                  {/if}
                </div>
                <p class="text-[10px] text-[var(--color-muted-foreground)] leading-relaxed break-words">
                  {notif.message}
                </p>
                <div class="flex items-center justify-between gap-2 pt-1 text-[9px] text-[var(--color-muted-foreground)]">
                  <span class="flex items-center gap-1">
                    <Calendar class="w-2.5 h-2.5" />
                    {new Date(notif.createdAt).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}
                  </span>
                  <div class="flex items-center gap-1.5">
                    <button
                      onclick={(e) => handleArchiveClick(e, notif.id)}
                      class="hover:text-red-400 transition"
                      title="Arsipkan"
                    >
                      <Archive class="w-3 h-3" />
                    </button>
                    {#if notif.actionUrl}
                      <ExternalLink class="w-2.5 h-2.5 text-[var(--color-muted-foreground)]" />
                    {/if}
                  </div>
                </div>
              </div>
            </div>
          {/each}
        {:else}
          <div class="p-12 text-center text-[var(--color-muted-foreground)] space-y-2">
            <Bell class="w-8 h-8 text-zinc-700 mx-auto" />
            <div class="text-xs font-semibold">Tidak ada notifikasi</div>
            <p class="text-[10px] text-zinc-600 max-w-xs mx-auto">Anda akan menerima pemberitahuan in-app saat status layanan atau pendaftaran diperbarui.</p>
          </div>
        {/if}
      </div>

      <!-- Footer -->
      <div class="p-3 border-t border-[var(--color-border)] bg-[var(--color-bg)] text-center">
        <button
          onclick={() => {
            isOpen = false;
            navigate('/admin/notifications');
          }}
          class="text-[10px] font-bold text-[var(--color-muted-foreground)] hover:text-[var(--color-text)] transition"
        >
          Kelola Preferensi & Lihat Semua
        </button>
      </div>
    </div>
  {/if}
</div>
