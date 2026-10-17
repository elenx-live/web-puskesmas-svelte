<!-- @component Manajemen Pengguna — kelola akun pengguna, peran (role), dan status aktif/non-aktif. -->
<script lang="ts">
  import { untrack } from 'svelte';
  import { Search, Plus, Edit, RefreshCw } from 'lucide-svelte';
  import Card from '../../../shared/ui/Card.svelte';
  import Button from '../../../shared/ui/Button.svelte';
  import Input from '../../../shared/ui/Input.svelte';
  import Select from '../../../shared/ui/Select.svelte';
  import Badge from '../../../shared/ui/Badge.svelte';
  import Modal from '../../../shared/ui/Modal.svelte';
  import ConfirmModal from '../../../shared/components/ConfirmModal.svelte';
  import { authStore } from '../../../shared/stores/auth.svelte.js';
  import { toastStore } from '../../../shared/stores/toast.svelte.js';
  import { userService } from '../../../shared/services/userService.js';
  import { roleService } from '../../../shared/services/roleService.js';
  import type { AppUser, UserRole, UserStatus } from '../../../shared/types/index.js';

  let users = $state<AppUser[]>([]);
  let roles = $state<UserRole[]>([]);
  let search = $state('');
  let roleFilter = $state('');
  let loading = $state(true);

  // Modal states
  let isAddModalOpen = $state(false);
  let isRoleModalOpen = $state(false);
  let selectedUser = $state<AppUser | null>(null);

  // Form states
  let newEmail = $state('');
  let newName = $state('');
  let newRoleId = $state('');
  let formLoading = $state(false);

  // Confirm Status Change
  let confirmModalOpen = $state(false);
  let targetUserForStatus = $state<AppUser | null>(null);

  async function loadData() {
    loading = true;
    try {
      const [uList, rList] = await Promise.all([
        userService.getUsers(search, roleFilter),
        roleService.getRoles()
      ]);
      users = uList;
      roles = rList;
      untrack(() => {
        if (rList.length > 0 && !newRoleId) newRoleId = rList[0].id;
      });
    } catch (err: any) {
      toastStore.showToast(err.message || 'Gagal memuat data pengguna', 'error');
    } finally {
      loading = false;
    }
  }

  $effect(() => {
    search;
    roleFilter;
    void loadData();
  });

  async function handleCreateUser(e: Event) {
    e.preventDefault();
    const currentUser = authStore.user;
    if (!currentUser) return;
    formLoading = true;

    try {
      await userService.createUser(
        {
          email: newEmail,
          displayName: newName,
          roleId: newRoleId,
          status: 'active'
        },
        {
          id: currentUser.uid,
          email: currentUser.email,
          name: currentUser.displayName
        }
      );

      toastStore.showToast(`Pengguna ${newName} berhasil ditambahkan.`);
      isAddModalOpen = false;
      newEmail = '';
      newName = '';
      void loadData();
    } catch (err: any) {
      toastStore.showToast(err.message || 'Gagal menambahkan pengguna', 'error');
    } finally {
      formLoading = false;
    }
  }

  async function handleUpdateRole(e: Event) {
    e.preventDefault();
    const currentUser = authStore.user;
    if (!currentUser || !selectedUser) return;
    formLoading = true;

    try {
      await userService.updateUserRole(
        selectedUser.uid,
        newRoleId,
        {
          id: currentUser.uid,
          email: currentUser.email,
          name: currentUser.displayName
        }
      );

      toastStore.showToast(`Peran pengguna ${selectedUser.displayName} berhasil diperbarui.`);
      isRoleModalOpen = false;
      selectedUser = null;
      void loadData();
    } catch (err: any) {
      toastStore.showToast(err.message || 'Gagal memperbarui peran', 'error');
    } finally {
      formLoading = false;
    }
  }

  async function handleToggleStatus() {
    const currentUser = authStore.user;
    if (!currentUser || !targetUserForStatus) return;
    formLoading = true;

    const newStatus: UserStatus = targetUserForStatus.status === 'active' ? 'inactive' : 'active';

    try {
      await userService.updateUserStatus(
        targetUserForStatus.uid,
        newStatus,
        {
          id: currentUser.uid,
          email: currentUser.email,
          name: currentUser.displayName
        }
      );

      toastStore.showToast(`Status akun ${targetUserForStatus.displayName} diubah menjadi ${newStatus.toUpperCase()}`);
      confirmModalOpen = false;
      targetUserForStatus = null;
      void loadData();
    } catch (err: any) {
      toastStore.showToast(err.message || 'Gagal mengubah status akun', 'error');
    } finally {
      formLoading = false;
    }
  }
</script>

<!-- Top Controls Bar -->
<div class="flex flex-col sm:flex-row items-center justify-between gap-4 bg-[var(--color-card)] border border-[var(--color-border)] p-4 rounded-3xl">
  <div class="flex items-center gap-3 w-full sm:w-auto flex-1">
    <div class="relative w-full max-w-xs">
      <Search class="w-4 h-4 text-[var(--color-muted-foreground)] absolute left-3 top-1/2 -translate-y-1/2" />
      <input
        type="text"
        placeholder="Cari nama / email..."
        bind:value={search}
        class="w-full bg-[var(--color-bg)] border border-[var(--color-border)] focus:border-[var(--color-primary)]/70 focus:outline-none rounded-2xl pl-9 pr-4 py-2 text-xs text-[var(--color-text)] placeholder-zinc-600"
      />
    </div>

    <div class="w-48">
      <Select
        bind:value={roleFilter}
        options={[
          { value: '', label: 'Semua Peran' },
          ...roles.map(r => ({ value: r.id, label: r.name }))
        ]}
      />
    </div>
  </div>

  <Button onclick={() => isAddModalOpen = true} variant="primary">
    <Plus class="w-4 h-4" />
    Tambah Pengguna Baru
  </Button>
</div>

<!-- Users Table -->
<Card class="p-0 overflow-hidden">
  <div class="overflow-x-auto">
    <table class="w-full text-left text-xs text-[var(--color-text)]">
      <thead class="bg-[var(--color-bg)]/60 text-[10px] font-bold uppercase tracking-widest text-[var(--color-muted-foreground)] border-b border-[var(--color-border)]">
        <tr>
          <th class="p-4 pl-6">Pengguna</th>
          <th class="p-4">Peran (Role)</th>
          <th class="p-4">Status</th>
          <th class="p-4">Terdaftar</th>
          <th class="p-4 pr-6 text-right">Tindakan</th>
        </tr>
      </thead>

      <tbody class="divide-y divide-[var(--color-border)]">
        {#if loading}
          <tr>
            <td colspan={5} class="p-8 text-center text-[var(--color-muted-foreground)]">
              Memuat daftar pengguna...
            </td>
          </tr>
        {:else if users.length === 0}
          <tr>
            <td colspan={5} class="p-8 text-center text-[var(--color-muted-foreground)]">
              Tidak ada pengguna ditemukan.
            </td>
          </tr>
        {:else}
          {#each users as u (u.uid)}
            <tr class="hover:bg-[var(--color-card)]/50 transition">
              <td class="p-4 pl-6">
                <div class="flex items-center gap-3">
                  <img
                    src={u.photoURL || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=100'}
                    alt={u.displayName}
                    class="w-9 h-9 rounded-xl object-cover border border-[var(--color-border)]"
                  />
                  <div>
                    <div class="font-bold text-[var(--color-text)]">{u.displayName}</div>
                    <div class="text-[11px] text-[var(--color-muted-foreground)]">{u.email}</div>
                  </div>
                </div>
              </td>

              <td class="p-4">
                <Badge variant={u.roleId === 'role-superadmin' ? 'amber' : 'blue'}>
                  {u.roleName}
                </Badge>
              </td>

              <td class="p-4">
                <Badge variant={u.status === 'active' ? 'emerald' : 'red'}>
                  {u.status === 'active' ? 'Aktif' : 'Non-Aktif'}
                </Badge>
              </td>

              <td class="p-4 text-[var(--color-muted-foreground)] text-[11px]">
                {new Date(u.createdAt).toLocaleDateString('id-ID')}
              </td>

              <td class="p-4 pr-6 text-right space-x-2">
                {#if u.email.toLowerCase() === 'elengemail@gmail.com'}
                  <span class="text-[11px] text-[var(--color-muted-foreground)] italic px-2 py-1 bg-[var(--color-bg)] rounded-lg border border-[var(--color-border)]">
                    Akun Utama
                  </span>
                {:else}
                  <button
                    onclick={() => {
                      selectedUser = u;
                      newRoleId = u.roleId;
                      isRoleModalOpen = true;
                    }}
                    title="Ubah Peran"
                    class="px-2.5 py-1.5 rounded-xl bg-[var(--color-bg)] border border-[var(--color-border)] hover:border-[var(--color-primary)]/50 text-[11px] text-[var(--color-primary)] font-semibold transition"
                  >
                    Ubah Peran
                  </button>

                  <button
                    onclick={() => {
                      targetUserForStatus = u;
                      confirmModalOpen = true;
                    }}
                    title="Ubah Status"
                    class={`px-2.5 py-1.5 rounded-xl border text-[11px] font-semibold transition ${
                      u.status === 'active'
                        ? 'bg-red-500/10 border-red-500/20 text-red-400 hover:bg-red-500/20'
                        : 'bg-[var(--color-primary)]/10 border-[var(--color-primary)]/20 text-[var(--color-primary)] hover:bg-[var(--color-primary)]/20'
                    }`}
                  >
                    {u.status === 'active' ? 'Nonaktifkan' : 'Aktifkan'}
                  </button>
                {/if}
              </td>
            </tr>
          {/each}
        {/if}
      </tbody>
    </table>
  </div>
</Card>

<!-- Add User Modal -->
<Modal
  isOpen={isAddModalOpen}
  onClose={() => isAddModalOpen = false}
  title="Tambah Pengguna Baru"
>
  {#snippet footer()}
    <Button variant="secondary" onclick={() => isAddModalOpen = false}>
      Batal
    </Button>
    <Button variant="primary" onclick={handleCreateUser} isLoading={formLoading}>
      Simpan Pengguna
    </Button>
  {/snippet}
  <form onsubmit={handleCreateUser} class="space-y-4">
    <Input
      label="Nama Lengkap"
      placeholder="Pengguna Baru"
      bind:value={newName}
      required
    />
    <Input
      label="Alamat Email"
      type="email"
      placeholder="nama@puskesmas.go.id"
      bind:value={newEmail}
      required
    />
    <Select
      label="Peran (Role)"
      bind:value={newRoleId}
      options={roles.map(r => ({ value: r.id, label: `${r.name} — ${r.description.substring(0, 40)}...` }))}
    />
  </form>
</Modal>

<!-- Change Role Modal -->
<Modal
  isOpen={isRoleModalOpen}
  onClose={() => isRoleModalOpen = false}
  title={`Ubah Peran — ${selectedUser?.displayName}`}
>
  {#snippet footer()}
    <Button variant="secondary" onclick={() => isRoleModalOpen = false}>
      Batal
    </Button>
    <Button variant="primary" onclick={handleUpdateRole} isLoading={formLoading}>
      Simpan Peran Baru
    </Button>
  {/snippet}
  <form onsubmit={handleUpdateRole} class="space-y-4">
    <p class="text-xs text-[var(--color-muted-foreground)] leading-relaxed">
      Pilih peran baru untuk pengguna ini. Perubahan peran akan memperbarui seluruh izin (permissions) yang dimiliki pengguna secara langsung.
    </p>
    <Select
      label="Peran Baru"
      bind:value={newRoleId}
      options={roles.map(r => ({ value: r.id, label: `${r.name} — ${r.description}` }))}
    />
  </form>
</Modal>

<!-- Toggle Status Confirmation Modal -->
<ConfirmModal
  isOpen={confirmModalOpen}
  onClose={() => confirmModalOpen = false}
  onConfirm={handleToggleStatus}
  isLoading={formLoading}
  title="Konfirmasi Status Akun"
  message={`Apakah Anda yakin ingin ${
    targetUserForStatus?.status === 'active' ? 'MENONAKTIFKAN' : 'MENGAKTIFKAN'
  } akun pengguna "${targetUserForStatus?.displayName}"?`}
/>
