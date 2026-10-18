<!-- @component Tab kelola jadwal layanan: jadwal operasional mingguan per hari + jadwal khusus/pengecualian tanggal (libur & jam khusus). -->
<script lang="ts">
  import Button from '../../../../shared/ui/Button.svelte';
  import Card from '../../../../shared/ui/Card.svelte';
  import Badge from '../../../../shared/ui/Badge.svelte';
  import Modal from '../../../../shared/ui/Modal.svelte';
  import ConfirmModal from '../../../../shared/components/ConfirmModal.svelte';
  import {
    serviceEngineService,
    DEFAULT_DAYS,
    validateTimeRule
  } from '../../../../shared/services/serviceEngineService.js';
  import type {
    ServiceScheduleEntity,
    ServiceScheduleRuleEntity,
    ServiceScheduleExceptionEntity,
    ScheduleExceptionType,
    DayOfWeek
  } from '../../../../shared/types/index.js';
  import { authStore } from '../../../../shared/stores/auth.svelte.js';
  import { toastStore } from '../../../../shared/stores/toast.svelte.js';
  import {
    Clock, Calendar, AlertTriangle, Plus, Edit2, Trash2, CheckCircle2, RefreshCw, Info, CalendarDays
  } from 'lucide-svelte';

  interface Props {
    serviceId: string;
    serviceName: string;
  }

  let { serviceId, serviceName }: Props = $props();

  const user = $derived(authStore.user);

  let schedule = $state<ServiceScheduleEntity | null>(null);
  let rules = $state<ServiceScheduleRuleEntity[]>([]);
  let timezone = $state<string>('Asia/Jakarta');
  let exceptions = $state<ServiceScheduleExceptionEntity[]>([]);

  let loadingSchedule = $state(true);
  let savingSchedule = $state(false);
  let loadingExceptions = $state(true);

  let validationError = $state<string | null>(null);

  // Exception Filters & Modal State
  let exceptionFilter = $state<'all' | 'upcoming' | 'past'>('all');
  let isModalOpen = $state(false);
  let editingException = $state<ServiceScheduleExceptionEntity | null>(null);

  // Exception Form State
  interface ExceptionForm {
    date: string;
    type: ScheduleExceptionType;
    isOpen: boolean;
    openTime: string;
    closeTime: string;
    breakStart: string;
    breakEnd: string;
    reason: string;
  }

  const emptyExceptionForm = (): ExceptionForm => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowStr = tomorrow.toISOString().split('T')[0];
    return {
      date: tomorrowStr,
      type: 'closed',
      isOpen: false,
      openTime: '08:00',
      closeTime: '12:00',
      breakStart: '',
      breakEnd: '',
      reason: ''
    };
  };

  let formData = $state<ExceptionForm>(emptyExceptionForm());
  let modalError = $state<string | null>(null);
  let savingException = $state(false);

  // Delete Confirmation State
  let deletingExceptionId = $state<string | null>(null);
  let isDeleting = $state(false);

  $effect(() => {
    if (serviceId) {
      loadScheduleData();
      loadExceptions();
    }
  });

  async function loadScheduleData() {
    loadingSchedule = true;
    validationError = null;
    try {
      const data = await serviceEngineService.getServiceSchedule(serviceId);
      schedule = data;
      timezone = data.timezone || 'Asia/Jakarta';
      rules = data.rules || [];
    } catch (err: any) {
      toastStore.showToast(err.message || 'Gagal memuat jadwal pelayanan', 'error');
    } finally {
      loadingSchedule = false;
    }
  }

  async function loadExceptions() {
    loadingExceptions = true;
    try {
      const list = await serviceEngineService.getScheduleExceptionsByServiceId(serviceId, {
        includeArchived: false,
        includePast: true
      });
      exceptions = list;
    } catch (err: any) {
      toastStore.showToast(err.message || 'Gagal memuat jadwal khusus', 'error');
    } finally {
      loadingExceptions = false;
    }
  }

  function handleRuleToggle(day: DayOfWeek) {
    validationError = null;
    rules = rules.map((r) => {
      if (r.dayOfWeek === day) {
        const nextIsOpen = !r.isOpen;
        return {
          ...r,
          isOpen: nextIsOpen,
          openTime: nextIsOpen ? (r.openTime || '08:00') : undefined,
          closeTime: nextIsOpen ? (r.closeTime || '15:00') : undefined,
          breakStart: nextIsOpen ? (r.breakStart || '12:00') : undefined,
          breakEnd: nextIsOpen ? (r.breakEnd || '13:00') : undefined
        };
      }
      return r;
    });
  }

  function handleRuleTimeChange(
    day: DayOfWeek,
    field: 'openTime' | 'closeTime' | 'breakStart' | 'breakEnd',
    value: string
  ) {
    validationError = null;
    rules = rules.map((r) => {
      if (r.dayOfWeek === day) {
        return {
          ...r,
          [field]: value || undefined
        };
      }
      return r;
    });
  }

  async function handleSaveWeeklySchedule() {
    validationError = null;

    // Validate rules client-side first
    for (const rule of rules) {
      if (rule.isOpen) {
        const err = validateTimeRule(rule);
        if (err) {
          const dayObj = DEFAULT_DAYS.find((d) => d.day === rule.dayOfWeek);
          const errorMsg = `[${dayObj?.label || rule.dayOfWeek}] ${err}`;
          validationError = errorMsg;
          toastStore.showToast(errorMsg, 'error');
          return;
        }
      }
    }

    savingSchedule = true;
    try {
      const actor = {
        id: user?.uid || 'usr-admin',
        email: user?.email || 'admin@puskesmas.go.id',
        name: user?.displayName || 'Administrator'
      };

      await serviceEngineService.saveServiceSchedule(serviceId, rules, timezone, actor);
      toastStore.showToast('Jadwal pelayanan mingguan berhasil disimpan!', 'success');
      loadScheduleData();
    } catch (err: any) {
      validationError = err.message || 'Gagal menyimpan jadwal mingguan';
      toastStore.showToast(err.message || 'Gagal menyimpan jadwal mingguan', 'error');
    } finally {
      savingSchedule = false;
    }
  }

  // Open Modal for Create or Edit Exception
  function handleOpenModal(exceptionToEdit?: ServiceScheduleExceptionEntity) {
    modalError = null;
    if (exceptionToEdit) {
      editingException = exceptionToEdit;
      formData = {
        date: exceptionToEdit.date,
        type: exceptionToEdit.type,
        isOpen: exceptionToEdit.isOpen,
        openTime: exceptionToEdit.openTime || '08:00',
        closeTime: exceptionToEdit.closeTime || '12:00',
        breakStart: exceptionToEdit.breakStart || '',
        breakEnd: exceptionToEdit.breakEnd || '',
        reason: exceptionToEdit.reason || ''
      };
    } else {
      editingException = null;
      formData = emptyExceptionForm();
    }
    isModalOpen = true;
  }

  async function handleSaveException(e: Event) {
    e.preventDefault();
    modalError = null;

    if (!formData.date) {
      modalError = 'Tanggal jadwal khusus wajib dipilih.';
      return;
    }

    if (!formData.reason.trim()) {
      modalError = 'Alasan jadwal khusus wajib diisi.';
      return;
    }

    savingException = true;
    try {
      const actor = {
        id: user?.uid || 'usr-admin',
        email: user?.email || 'admin@puskesmas.go.id',
        name: user?.displayName || 'Administrator'
      };

      const payload = {
        date: formData.date,
        type: formData.type,
        isOpen: formData.type === 'closed' ? false : formData.isOpen,
        openTime: formData.isOpen ? formData.openTime : undefined,
        closeTime: formData.isOpen ? formData.closeTime : undefined,
        breakStart: formData.isOpen ? formData.breakStart : undefined,
        breakEnd: formData.isOpen ? formData.breakEnd : undefined,
        reason: formData.reason
      };

      if (editingException) {
        await serviceEngineService.updateScheduleException(editingException.id, payload, actor);
        toastStore.showToast('Jadwal khusus berhasil diperbarui!', 'success');
      } else {
        await serviceEngineService.createScheduleException(serviceId, payload, actor);
        toastStore.showToast('Jadwal khusus berhasil ditambahkan!', 'success');
      }

      isModalOpen = false;
      loadExceptions();
    } catch (err: any) {
      modalError = err.message || 'Gagal menyimpan jadwal khusus.';
    } finally {
      savingException = false;
    }
  }

  async function handleDeleteException() {
    if (!deletingExceptionId) return;
    isDeleting = true;
    try {
      const actor = {
        id: user?.uid || 'usr-admin',
        email: user?.email || 'admin@puskesmas.go.id',
        name: user?.displayName || 'Administrator'
      };

      await serviceEngineService.archiveScheduleException(deletingExceptionId, actor);
      toastStore.showToast('Jadwal khusus berhasil dihapus/diarsipkan.', 'success');
      deletingExceptionId = null;
      loadExceptions();
    } catch (err: any) {
      toastStore.showToast(err.message || 'Gagal menghapus jadwal khusus', 'error');
    } finally {
      isDeleting = false;
    }
  }

  // Filtered Exceptions
  const todayStr = new Date().toISOString().split('T')[0];
  const filteredExceptions = $derived(exceptions.filter((e) => {
    if (exceptionFilter === 'upcoming') return e.date >= todayStr;
    if (exceptionFilter === 'past') return e.date < todayStr;
    return true;
  }));

  function ruleForDay(day: DayOfWeek): ServiceScheduleRuleEntity {
    const found = rules.find((r) => r.dayOfWeek === day);
    if (found) return found;
    return {
      id: `rule-${serviceId}-${day}`,
      serviceId,
      dayOfWeek: day,
      isOpen: false,
      displayOrder: 1,
      status: 'active',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
  }

  const filterButtons = [
    { id: 'all', label: 'Semua Status' },
    { id: 'upcoming', label: 'Mendatang' },
    { id: 'past', label: 'Lampau' }
  ] as const;
</script>

<div class="space-y-8">
  <!-- SECTION 1: WEEKLY SCHEDULE -->
  <Card class="space-y-6">
    <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[var(--color-border)]">
      <div class="flex items-center gap-3">
        <div class="w-10 h-10 rounded-2xl bg-[var(--color-primary)]/10 border border-[var(--color-primary)]/20 flex items-center justify-center text-[var(--color-primary)]">
          <Clock class="w-5 h-5" />
        </div>
        <div>
          <h3 class="text-base font-bold text-[var(--color-text)]">Jadwal Operasional Mingguan</h3>
          <p class="text-xs text-[var(--color-muted-foreground)]">Atur hari dan jam pelayanan reguler untuk {serviceName}</p>
        </div>
      </div>

      <div class="flex items-center gap-3">
        <div class="flex items-center gap-2 bg-[var(--color-bg)] border border-[var(--color-border)] px-3 py-1.5 rounded-xl text-xs text-[var(--color-text)]">
          <span class="text-[var(--color-muted-foreground)]">Timezone:</span>
          <span class="font-semibold text-[var(--color-primary)]">{timezone}</span>
        </div>
        <Button
          onclick={handleSaveWeeklySchedule}
          variant="primary"
          disabled={savingSchedule || loadingSchedule}
        >
          {#if savingSchedule}
            <RefreshCw class="w-4 h-4 animate-spin" />
            Menyimpan...
          {:else}
            <CheckCircle2 class="w-4 h-4" />
            Simpan Jadwal
          {/if}
        </Button>
      </div>
    </div>

    {#if validationError}
      <div class="p-4 rounded-2xl bg-red-500/10 border border-red-500/30 text-red-400 text-xs flex items-center gap-3">
        <AlertTriangle class="w-5 h-5 shrink-0 text-red-400" />
        <span>{validationError}</span>
      </div>
    {/if}

    {#if loadingSchedule}
      <div class="p-8 text-center text-[var(--color-muted-foreground)] text-xs animate-pulse">
        Memuat jadwal operasional...
      </div>
    {:else}
      <div class="overflow-x-auto">
        <table class="w-full text-left text-xs border-collapse">
          <thead>
            <tr class="border-b border-[var(--color-border)] text-[var(--color-muted-foreground)] font-semibold bg-[var(--color-bg)]">
              <th class="py-3 px-4">Hari</th>
              <th class="py-3 px-4">Status</th>
              <th class="py-3 px-4">Jam Buka</th>
              <th class="py-3 px-4">Waktu Istirahat</th>
              <th class="py-3 px-4">Jam Tutup</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-[var(--color-border)]">
            {#each DEFAULT_DAYS as dayObj (dayObj.day)}
              {@const rule = ruleForDay(dayObj.day)}
              <tr class="hover:bg-[var(--color-card)] transition">
                <td class="py-3 px-4 font-semibold text-[var(--color-text)]">
                  {dayObj.label}
                </td>
                <td class="py-3 px-4">
                  <button
                    type="button"
                    onclick={() => handleRuleToggle(dayObj.day)}
                    class={`px-3 py-1 rounded-xl text-[11px] font-bold transition flex items-center gap-1.5 ${
                      rule.isOpen
                        ? 'bg-[var(--color-primary)]/10 text-[var(--color-primary)] border border-[var(--color-primary)]/30'
                        : 'bg-[var(--color-surface)] text-[var(--color-muted-foreground)] border border-[var(--color-border)]'
                    }`}
                  >
                    <span class={`w-2 h-2 rounded-full ${rule.isOpen ? 'bg-[var(--color-primary)]' : 'bg-[var(--color-card)]0'}`}></span>
                    {rule.isOpen ? 'Buka' : 'Tutup'}
                  </button>
                </td>
                <td class="py-3 px-4">
                  {#if rule.isOpen}
                    <input
                      type="time"
                      value={rule.openTime || '08:00'}
                      onchange={(e) => handleRuleTimeChange(dayObj.day, 'openTime', e.currentTarget.value)}
                      class="bg-[var(--color-bg)] border border-[var(--color-border)] rounded-xl px-3 py-1.5 text-xs text-[var(--color-text)] focus:outline-none focus:border-[var(--color-primary)]"
                    />
                  {:else}
                    <span class="text-zinc-600">—</span>
                  {/if}
                </td>
                <td class="py-3 px-4">
                  {#if rule.isOpen}
                    <div class="flex items-center gap-2">
                      <input
                        type="time"
                        value={rule.breakStart || ''}
                        onchange={(e) => handleRuleTimeChange(dayObj.day, 'breakStart', e.currentTarget.value)}
                        placeholder="Mulai"
                        class="bg-[var(--color-bg)] border border-[var(--color-border)] rounded-xl px-2.5 py-1.5 text-xs text-[var(--color-text)] focus:outline-none focus:border-[var(--color-primary)]"
                      />
                      <span class="text-[var(--color-muted-foreground)]">s.d</span>
                      <input
                        type="time"
                        value={rule.breakEnd || ''}
                        onchange={(e) => handleRuleTimeChange(dayObj.day, 'breakEnd', e.currentTarget.value)}
                        placeholder="Selesai"
                        class="bg-[var(--color-bg)] border border-[var(--color-border)] rounded-xl px-2.5 py-1.5 text-xs text-[var(--color-text)] focus:outline-none focus:border-[var(--color-primary)]"
                      />
                    </div>
                  {:else}
                    <span class="text-zinc-600">—</span>
                  {/if}
                </td>
                <td class="py-3 px-4">
                  {#if rule.isOpen}
                    <input
                      type="time"
                      value={rule.closeTime || '15:00'}
                      onchange={(e) => handleRuleTimeChange(dayObj.day, 'closeTime', e.currentTarget.value)}
                      class="bg-[var(--color-bg)] border border-[var(--color-border)] rounded-xl px-3 py-1.5 text-xs text-[var(--color-text)] focus:outline-none focus:border-[var(--color-primary)]"
                    />
                  {:else}
                    <span class="text-zinc-600">—</span>
                  {/if}
                </td>
              </tr>
            {/each}
          </tbody>
        </table>
      </div>
    {/if}
  </Card>

  <!-- SECTION 2: SPECIAL SCHEDULE & EXCEPTIONS -->
  <Card class="space-y-6">
    <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[var(--color-border)]">
      <div class="flex items-center gap-3">
        <div class="w-10 h-10 rounded-2xl bg-[var(--color-primary)]/10 border border-[var(--color-primary)]/20 flex items-center justify-center text-[var(--color-primary)]">
          <CalendarDays class="w-5 h-5" />
        </div>
        <div>
          <h3 class="text-base font-bold text-[var(--color-text)]">Jadwal Khusus & Tanggal Libur (Exceptions)</h3>
          <p class="text-xs text-[var(--color-muted-foreground)]">Atur tanggal tutup nasional, kegiatan internal, atau penyesuaian jam operasional sementara</p>
        </div>
      </div>

      <Button onclick={() => handleOpenModal()} variant="primary">
        <Plus class="w-4 h-4" />
        Tambah Jadwal Khusus
      </Button>
    </div>

    <!-- Priority Rule Info Banner -->
    <div class="p-4 rounded-2xl bg-[var(--color-primary)]/10 border border-[var(--color-primary)]/30 text-[var(--color-primary)] text-xs flex items-start gap-3">
      <Info class="w-5 h-5 shrink-0 text-[var(--color-primary)] mt-0.5" />
      <div>
        <p class="font-semibold">Aturan Prioritas Pengecualian (Exception Priority):</p>
        <p class="text-[var(--color-primary)]/80 text-[11px] mt-0.5">
          Setiap Jadwal Khusus yang aktif pada tanggal tertentu akan **secara otomatis menggantikan (override)** Jadwal Operasional Mingguan reguler pada hari tersebut.
        </p>
      </div>
    </div>

    <!-- Filters -->
    <div class="flex items-center gap-2">
      {#each filterButtons as f (f.id)}
        <button
          onclick={() => (exceptionFilter = f.id)}
          class={`px-3 py-1.5 rounded-xl text-xs font-semibold transition ${
            exceptionFilter === f.id
              ? 'bg-[var(--color-primary)]/20 text-[var(--color-primary)] border border-[var(--color-primary)]/30'
              : 'bg-[var(--color-bg)] text-[var(--color-muted-foreground)] border border-[var(--color-border)] hover:text-[var(--color-text)]'
          }`}
        >
          {f.label}
        </button>
      {/each}
    </div>

    <!-- Exceptions Table -->
    {#if loadingExceptions}
      <div class="p-8 text-center text-[var(--color-muted-foreground)] text-xs animate-pulse">
        Memuat daftar jadwal khusus...
      </div>
    {:else if filteredExceptions.length === 0}
      <div class="p-8 text-center border border-dashed border-[var(--color-border)] rounded-2xl space-y-2">
        <Calendar class="w-8 h-8 mx-auto text-zinc-600" />
        <p class="text-xs text-[var(--color-muted-foreground)]">Tidak ada jadwal khusus / pengecualian tanggal untuk layanan ini.</p>
      </div>
    {:else}
      <div class="overflow-x-auto">
        <table class="w-full text-left text-xs border-collapse">
          <thead>
            <tr class="border-b border-[var(--color-border)] text-[var(--color-muted-foreground)] font-semibold bg-[var(--color-bg)]">
              <th class="py-3 px-4">Tanggal</th>
              <th class="py-3 px-4">Status / Tipe</th>
              <th class="py-3 px-4">Jam Operasional</th>
              <th class="py-3 px-4">Alasan / Keterangan</th>
              <th class="py-3 px-4 text-right">Aksi</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-[var(--color-border)]">
            {#each filteredExceptions as item (item.id)}
              {@const isPast = item.date < todayStr}
              <tr class={`hover:bg-[var(--color-card)] transition ${isPast ? 'opacity-60' : ''}`}>
                <td class="py-3 px-4 font-mono font-semibold text-[var(--color-text)]">
                  <span class="flex items-center gap-2">
                    {item.date}
                    {#if isPast}<Badge variant="zinc">Lampau</Badge>{/if}
                  </span>
                </td>
                <td class="py-3 px-4">
                  {#if item.type === 'closed'}
                    <Badge variant="red">Tutup Total / Libur</Badge>
                  {:else if item.type === 'special_hours'}
                    <Badge variant="amber">Jam Khusus</Badge>
                  {:else}
                    <Badge variant="blue">Penyesuaian Jam</Badge>
                  {/if}
                </td>
                <td class="py-3 px-4 font-mono text-[var(--color-text)]">
                  {#if item.isOpen}
                    <div>
                      <div>{item.openTime} – {item.closeTime}</div>
                      {#if item.breakStart}
                        <div class="text-[10px] text-[var(--color-muted-foreground)]">
                          Istirahat: {item.breakStart} – {item.breakEnd}
                        </div>
                      {/if}
                    </div>
                  {:else}
                    <span class="text-red-400 font-semibold">Tutup (Tidak Beroperasi)</span>
                  {/if}
                </td>
                <td class="py-3 px-4 text-[var(--color-text)]">
                  {item.reason}
                </td>
                <td class="py-3 px-4 text-right">
                  <div class="flex items-center justify-end gap-2">
                    <button
                      onclick={() => handleOpenModal(item)}
                      class="p-1.5 rounded-lg hover:bg-[var(--color-surface)] text-[var(--color-muted-foreground)] hover:text-[var(--color-text)] transition"
                      title="Edit"
                    >
                      <Edit2 class="w-3.5 h-3.5" />
                    </button>
                    <button
                      onclick={() => (deletingExceptionId = item.id)}
                      class="p-1.5 rounded-lg hover:bg-red-500/20 text-[var(--color-muted-foreground)] hover:text-red-400 transition"
                      title="Hapus"
                    >
                      <Trash2 class="w-3.5 h-3.5" />
                    </button>
                  </div>
                </td>
              </tr>
            {/each}
          </tbody>
        </table>
      </div>
    {/if}
  </Card>

  <!-- MODAL ADD / EDIT EXCEPTION -->
  <Modal
    isOpen={isModalOpen}
    onClose={() => (isModalOpen = false)}
    title={editingException ? 'Edit Jadwal Khusus' : 'Tambah Jadwal Khusus / Tanggal Libur'}
  >
    {#key editingException?.id || 'new'}
    <form onsubmit={handleSaveException} class="space-y-4">
      {#if modalError}
        <div class="p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-xs flex items-center gap-2">
          <AlertTriangle class="w-4 h-4 shrink-0" />
          <span>{modalError}</span>
        </div>
      {/if}

      <div class="space-y-1">
        <label class="text-xs font-semibold text-[var(--color-text)] block">
          Tanggal Pelaksanaan <span class="text-red-400">*</span>
        </label>
        <input
          type="date"
          required
          value={formData.date}
          onchange={(e) => (formData = { ...formData, date: e.currentTarget.value })}
          class="w-full bg-[var(--color-bg)] border border-[var(--color-border)] rounded-xl px-3 py-2 text-xs text-[var(--color-text)] focus:outline-none focus:border-[var(--color-primary)]"
        />
      </div>

      <div class="space-y-1">
        <label class="text-xs font-semibold text-[var(--color-text)] block">
          Tipe Perubahan / Status <span class="text-red-400">*</span>
        </label>
        <select
          value={formData.type}
          onchange={(e) => {
            const newType = e.currentTarget.value as ScheduleExceptionType;
            formData = {
              ...formData,
              type: newType,
              isOpen: newType !== 'closed'
            };
          }}
          class="w-full bg-[var(--color-bg)] border border-[var(--color-border)] rounded-xl px-3 py-2 text-xs text-[var(--color-text)] focus:outline-none focus:border-[var(--color-primary)]"
        >
          <option value="closed">Tutup Total / Libur (Closed)</option>
          <option value="special_hours">Jam Khusus (Special Hours)</option>
          <option value="modified_hours">Penyesuaian Jam Operasional</option>
        </select>
      </div>

      {#if formData.type !== 'closed'}
        <div class="p-4 rounded-xl bg-[var(--color-bg)] border border-[var(--color-border)] space-y-3">
          <div class="flex items-center justify-between">
            <span class="text-xs font-semibold text-[var(--color-text)]">Status Layanan pada Tanggal Ini</span>
            <button
              type="button"
              onclick={() => (formData = { ...formData, isOpen: !formData.isOpen })}
              class={`px-3 py-1 rounded-xl text-xs font-bold transition ${
                formData.isOpen
                  ? 'bg-[var(--color-primary)]/20 text-[var(--color-primary)] border border-[var(--color-primary)]/30'
                  : 'bg-[var(--color-surface)] text-[var(--color-muted-foreground)] border border-[var(--color-border)]'
              }`}
            >
              {formData.isOpen ? 'Buka' : 'Tutup'}
            </button>
          </div>

          {#if formData.isOpen}
            <div class="grid grid-cols-2 gap-3 pt-2">
              <div class="space-y-1">
                <label class="text-[11px] font-semibold text-[var(--color-muted-foreground)] block">Jam Buka</label>
                <input
                  type="time"
                  required
                  value={formData.openTime}
                  onchange={(e) => (formData = { ...formData, openTime: e.currentTarget.value })}
                  class="w-full bg-[var(--color-card)] border border-[var(--color-border)] rounded-xl px-2.5 py-1.5 text-xs text-[var(--color-text)] focus:outline-none focus:border-[var(--color-primary)]"
                />
              </div>

              <div class="space-y-1">
                <label class="text-[11px] font-semibold text-[var(--color-muted-foreground)] block">Jam Tutup</label>
                <input
                  type="time"
                  required
                  value={formData.closeTime}
                  onchange={(e) => (formData = { ...formData, closeTime: e.currentTarget.value })}
                  class="w-full bg-[var(--color-card)] border border-[var(--color-border)] rounded-xl px-2.5 py-1.5 text-xs text-[var(--color-text)] focus:outline-none focus:border-[var(--color-primary)]"
                />
              </div>

              <div class="space-y-1">
                <label class="text-[11px] font-semibold text-[var(--color-muted-foreground)] block">Istirahat Mulai (Opsional)</label>
                <input
                  type="time"
                  value={formData.breakStart}
                  onchange={(e) => (formData = { ...formData, breakStart: e.currentTarget.value })}
                  class="w-full bg-[var(--color-card)] border border-[var(--color-border)] rounded-xl px-2.5 py-1.5 text-xs text-[var(--color-text)] focus:outline-none focus:border-[var(--color-primary)]"
                />
              </div>

              <div class="space-y-1">
                <label class="text-[11px] font-semibold text-[var(--color-muted-foreground)] block">Istirahat Selesai (Opsional)</label>
                <input
                  type="time"
                  value={formData.breakEnd}
                  onchange={(e) => (formData = { ...formData, breakEnd: e.currentTarget.value })}
                  class="w-full bg-[var(--color-card)] border border-[var(--color-border)] rounded-xl px-2.5 py-1.5 text-xs text-[var(--color-text)] focus:outline-none focus:border-[var(--color-primary)]"
                />
              </div>
            </div>
          {/if}
        </div>
      {/if}

      <div class="space-y-1">
        <label class="text-xs font-semibold text-[var(--color-text)] block">
          Alasan / Keterangan <span class="text-red-400">*</span>
        </label>
        <input
          type="text"
          required
          placeholder="Contoh: Hari Libur Nasional 17 Agustus, Pembersihan Sterilisasi Rutin"
          defaultValue={formData.reason}
          oninput={(e) => (formData = { ...formData, reason: e.currentTarget.value })}
          class="w-full bg-[var(--color-bg)] border border-[var(--color-border)] rounded-xl px-3 py-2 text-xs text-[var(--color-text)] focus:outline-none focus:border-[var(--color-primary)]"
        />
      </div>

      <div class="flex justify-end gap-2 pt-4 border-t border-[var(--color-border)]">
        <Button
          type="button"
          variant="secondary"
          onclick={() => (isModalOpen = false)}
        >
          Batal
        </Button>
        <Button
          type="submit"
          variant="primary"
          disabled={savingException}
        >
          {savingException ? 'Menyimpan...' : 'Simpan Schedule Exception'}
        </Button>
      </div>
    </form>
    {/key}
  </Modal>

  <!-- CONFIRMATION DIALOG FOR DELETE EXCEPTION -->
  <ConfirmModal
    isOpen={Boolean(deletingExceptionId)}
    onClose={() => (deletingExceptionId = null)}
    onConfirm={handleDeleteException}
    title="Hapus Jadwal Khusus"
    message="Apakah Anda yakin ingin menghapus/mengarsipkan jadwal khusus ini?"
    confirmLabel="Hapus"
    isLoading={isDeleting}
  />
</div>
