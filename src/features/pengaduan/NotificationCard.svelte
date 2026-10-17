<!-- @component Kartu notifikasi tunggal: ikon tipe, judul, pesan, dan aksi baca/hapus. -->
<script lang="ts">
  import type { NotificationEntity } from '../../shared/types/index.js';
  import { navigate } from '../../app/router.svelte.js';
  import Badge from '../../shared/ui/Badge.svelte';
  import {
    Bell, UserCheck, ListOrdered, MessageSquare, Sparkles,
    FileText, Building2, BookOpen, Calendar, Trash2
  } from 'lucide-svelte';

  interface Props {
    notif: NotificationEntity;
    onMarkRead: (id: string) => void;
    onMarkUnread: (id: string) => void;
    onDelete: (id: string) => void;
  }

  let { notif, onMarkRead, onMarkUnread, onDelete }: Props = $props();

  const isUnread = $derived(notif.status === 'unread');

  function handleClick() {
    if (isUnread) {
      onMarkRead(notif.id);
    }
    if (notif.actionUrl) {
      if (/^https?:\/\//i.test(notif.actionUrl)) {
        window.location.href = notif.actionUrl;
      } else {
        navigate(notif.actionUrl);
      }
    }
  }

  function stopPropagation(e: Event) {
    e.stopPropagation();
  }
</script>

<div
  onclick={handleClick}
  onkeydown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); handleClick(); } }}
  role="button"
  tabindex="0"
  class={`p-5 bg-[var(--color-card)] border rounded-3xl transition flex items-start gap-4 cursor-pointer group shadow-md ${
    isUnread ? 'border-[var(--color-primary)]/50 bg-[var(--color-primary)]/[0.02]' : 'border-[var(--color-border)] hover:border-[var(--color-border)]'
  }`}
>
  <div class="w-10 h-10 rounded-2xl bg-[var(--color-bg)] border border-[var(--color-border)] flex items-center justify-center shrink-0 mt-0.5">
    {#if notif.type === 'registration'}
      <UserCheck class="w-4 h-4 text-[var(--color-primary)]" />
    {:else if notif.type === 'queue'}
      <ListOrdered class="w-4 h-4 text-[var(--color-primary)]" />
    {:else if notif.type === 'complaint'}
      <MessageSquare class="w-4 h-4 text-indigo-400" />
    {:else if notif.type === 'survey'}
      <Sparkles class="w-4 h-4 text-purple-400" />
    {:else if notif.type === 'document'}
      <FileText class="w-4 h-4 text-blue-400" />
    {:else if notif.type === 'facility'}
      <Building2 class="w-4 h-4 text-teal-400" />
    {:else if notif.type === 'content' || notif.type === 'approval'}
      <BookOpen class="w-4 h-4 text-cyan-400" />
    {:else}
      <Bell class="w-4 h-4 text-[var(--color-primary)]" />
    {/if}
  </div>

  <div class="flex-1 space-y-1.5 min-w-0">
    <div class="flex items-center justify-between gap-2">
      <div class="flex items-center gap-2 truncate">
        <span class={`text-xs font-bold truncate ${isUnread ? 'text-[var(--color-text)]' : 'text-[var(--color-text)]'}`}>
          {notif.title}
        </span>
        {#if isUnread}<span class="w-2 h-2 rounded-full bg-[var(--color-primary)] shrink-0"></span>{/if}
        {#if notif.priority && notif.priority !== 'Normal'}
          <Badge variant={notif.priority === 'Urgent' ? 'red' : 'amber'} size="sm">
            {notif.priority}
          </Badge>
        {/if}
      </div>

      <div class="flex items-center gap-2" onclick={stopPropagation} onkeydown={stopPropagation} role="presentation">
        {#if isUnread}
          <button
            onclick={() => onMarkRead(notif.id)}
            class="text-[10px] text-[var(--color-primary)] hover:underline"
            title="Tandai Sudah Dibaca"
          >
            Tandai Dibaca
          </button>
        {:else}
          <button
            onclick={() => onMarkUnread(notif.id)}
            class="text-[10px] text-[var(--color-muted-foreground)] hover:underline"
            title="Tandai Belum Dibaca"
          >
            Tandai Belum Dibaca
          </button>
        {/if}
        <button
          onclick={() => onDelete(notif.id)}
          class="text-[var(--color-muted-foreground)] hover:text-red-400 p-1 transition"
          title="Hapus dari tampilan (Record sumber tetap aman)"
        >
          <Trash2 class="w-3.5 h-3.5" />
        </button>
      </div>
    </div>

    <p class="text-xs text-[var(--color-muted-foreground)] leading-relaxed">{notif.message}</p>

    <div class="flex items-center justify-between pt-1 text-[10px] text-[var(--color-muted-foreground)] font-mono">
      <span class="flex items-center gap-1">
        <Calendar class="w-3 h-3" />
        {new Date(notif.createdAt).toLocaleString('id-ID')}
      </span>
      {#if notif.actionUrl}
        <span class="text-[var(--color-primary)] group-hover:underline flex items-center gap-1 font-bold">
          Buka Detail →
        </span>
      {/if}
    </div>
  </div>
</div>
