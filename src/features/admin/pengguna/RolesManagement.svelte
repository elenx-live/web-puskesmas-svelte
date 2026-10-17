<!-- @component Peran & Hak Akses (RBAC) — mengatur matriks peran dan izin akses granular. -->
<script lang="ts">
  import { Shield, Plus, Edit, CheckSquare, Square } from 'lucide-svelte';
  import Card from '../../../shared/ui/Card.svelte';
  import Button from '../../../shared/ui/Button.svelte';
  import Input from '../../../shared/ui/Input.svelte';
  import Badge from '../../../shared/ui/Badge.svelte';
  import Modal from '../../../shared/ui/Modal.svelte';
  import { authStore } from '../../../shared/stores/auth.svelte.js';
  import { toastStore } from '../../../shared/stores/toast.svelte.js';
  import { roleService } from '../../../shared/services/roleService.js';
  import type { UserRole, UserPermission } from '../../../shared/types/index.js';

  let roles = $state<UserRole[]>([]);
  let permissions = $state<UserPermission[]>([]);
  let loading = $state(true);

  // Modal State
  let isModalOpen = $state(false);
  let selectedRole = $state<UserRole | null>(null);

  // Form State
  let roleName = $state('');
  let roleDesc = $state('');
  let selectedPermissions = $state<string[]>([]);
  let formLoading = $state(false);

  async function loadData() {
    loading = true;
    try {
      const [rList, pList] = await Promise.all([
        roleService.getRoles(),
        roleService.getAllPermissions()
      ]);
      roles = rList;
      permissions = pList;
    } catch (err: any) {
      toastStore.showToast('Gagal memuat data peran & izin', 'error');
    } finally {
      loading = false;
    }
  }

  $effect(() => {
    void loadData();
  });

  function handleOpenModal(role?: UserRole) {
    if (role) {
      selectedRole = role;
      roleName = role.name;
      roleDesc = role.description;
      selectedPermissions = [...role.permissions];
    } else {
      selectedRole = null;
      roleName = '';
      roleDesc = '';
      selectedPermissions = [];
    }
    isModalOpen = true;
  }

  function togglePermission(code: string) {
    if (selectedPermissions.includes(code)) {
      selectedPermissions = selectedPermissions.filter(p => p !== code);
    } else {
      selectedPermissions = [...selectedPermissions, code];
    }
  }

  async function handleSaveRole(e: Event) {
    e.preventDefault();
    const currentUser = authStore.user;
    if (!currentUser) return;
    formLoading = true;

    try {
      if (selectedRole) {
        await roleService.updateRole(
          selectedRole.id,
          {
            name: roleName,
            description: roleDesc,
            permissions: selectedPermissions
          },
          {
            id: currentUser.uid,
            email: currentUser.email,
            name: currentUser.displayName
          }
        );
        toastStore.showToast(`Peran ${roleName} berhasil diperbarui.`);
      } else {
        await roleService.createRole(
          {
            name: roleName,
            description: roleDesc,
            permissions: selectedPermissions
          },
          {
            id: currentUser.uid,
            email: currentUser.email,
            name: currentUser.displayName
          }
        );
        toastStore.showToast(`Peran baru ${roleName} berhasil dibuat.`);
      }

      isModalOpen = false;
      void loadData();
    } catch (err: any) {
      toastStore.showToast(err.message || 'Gagal menyimpan peran', 'error');
    } finally {
      formLoading = false;
    }
  }

  // Group permissions by module
  const groupedPermissions = $derived(
    permissions.reduce<Record<string, UserPermission[]>>((acc, p) => {
      if (!acc[p.module]) acc[p.module] = [];
      acc[p.module].push(p);
      return acc;
    }, {})
  );
</script>

<!-- Header Controls -->
<div class="flex items-center justify-between bg-[var(--color-card)] border border-[var(--color-border)] p-4 rounded-3xl">
  <div class="flex items-center gap-3">
    <div class="w-10 h-10 rounded-2xl bg-[var(--color-primary)]/10 border border-[var(--color-primary)]/20 flex items-center justify-center text-[var(--color-primary)]">
      <Shield class="w-5 h-5" />
    </div>
    <div>
      <h3 class="text-sm font-bold text-[var(--color-text)] uppercase tracking-wider">Matriks Role & Permission</h3>
      <p class="text-[11px] text-[var(--color-muted-foreground)]">Total {permissions.length} kode izin sistem terdaftar</p>
    </div>
  </div>

  <Button onclick={() => handleOpenModal()} variant="primary">
    <Plus class="w-4 h-4" />
    Tambah Peran Baru
  </Button>
</div>

<!-- Roles Cards Grid -->
<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
  {#each roles as role (role.id)}
    <Card class="flex flex-col justify-between space-y-4">
      <div class="space-y-3">
        <div class="flex items-center justify-between">
          <Badge variant={role.isSystemRole ? 'amber' : 'blue'}>
            {role.isSystemRole ? 'Peran Sistem' : 'Kustom'}
          </Badge>
          <span class="text-[10px] text-[var(--color-muted-foreground)]">
            {role.permissions.length} Izin
          </span>
        </div>

        <h3 class="text-base font-bold text-[var(--color-text)]">{role.name}</h3>
        <p class="text-xs text-[var(--color-muted-foreground)] leading-relaxed min-h-[3rem]">
          {role.description}
        </p>
      </div>

      <div class="pt-4 border-t border-[var(--color-border)] flex items-center justify-between">
        <span class="text-[10px] text-[var(--color-muted-foreground)]">
          Update: {new Date(role.updatedAt || Date.now()).toLocaleDateString('id-ID')}
        </span>

        <Button
          onclick={() => handleOpenModal(role)}
          variant="secondary"
          size="sm"
        >
          <Edit class="w-3.5 h-3.5" />
          Edit Izin
        </Button>
      </div>
    </Card>
  {/each}
</div>

<!-- Role Edit Modal -->
<Modal
  isOpen={isModalOpen}
  onClose={() => isModalOpen = false}
  title={selectedRole ? `Edit Peran — ${selectedRole.name}` : 'Buat Peran Baru'}
>
  {#snippet footer()}
    <Button variant="secondary" onclick={() => isModalOpen = false}>
      Batal
    </Button>
    <Button variant="primary" onclick={handleSaveRole} isLoading={formLoading}>
      Simpan Peran & Izin
    </Button>
  {/snippet}
  <form onsubmit={handleSaveRole} class="space-y-6">
    <Input
      label="Nama Peran"
      placeholder="Contoh: Editor Klaster KIA"
      bind:value={roleName}
      required
    />

    <div class="flex flex-col gap-1.5">
      <label class="text-[10px] uppercase font-bold tracking-widest text-[var(--color-muted-foreground)]">
        Deskripsi Peran
      </label>
      <textarea
        rows={2}
        bind:value={roleDesc}
        placeholder="Jelaskan cakupan tanggung jawab peran ini..."
        class="bg-[var(--color-bg)] border border-[var(--color-border)] focus:border-[var(--color-primary)]/70 focus:outline-none rounded-2xl p-3 text-xs text-[var(--color-text)] placeholder-zinc-600 resize-none"
      ></textarea>
    </div>

    <div class="space-y-4">
      <label class="text-[10px] uppercase font-bold tracking-widest text-[var(--color-primary)] block">
        Pilih Izin Granular ({selectedPermissions.length} Terpilih)
      </label>

      {#each Object.entries(groupedPermissions) as [moduleName, permList]}
        <div class="bg-[var(--color-bg)] border border-[var(--color-border)] rounded-2xl p-4 space-y-2">
          <div class="text-[10px] font-bold uppercase tracking-wider text-[var(--color-muted-foreground)] mb-2">
            Modul: {moduleName}
          </div>

          <div class="space-y-2">
            {#each permList as p (p.code)}
              {@const checked = selectedPermissions.includes(p.code)}
              <div
                onclick={() => togglePermission(p.code)}
                onkeydown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); togglePermission(p.code); } }}
                role="button"
                tabindex="0"
                class={`flex items-start gap-3 p-2.5 rounded-xl border cursor-pointer transition select-none ${
                  checked
                    ? 'bg-[var(--color-primary)]/10 border-[var(--color-primary)]/40 text-[var(--color-primary)]'
                    : 'bg-[var(--color-card)] border-[var(--color-border)] text-[var(--color-muted-foreground)] hover:border-[var(--color-border)]'
                }`}
              >
                {#if checked}
                  <CheckSquare class="w-4 h-4 text-[var(--color-primary)] shrink-0 mt-0.5" />
                {:else}
                  <Square class="w-4 h-4 text-zinc-600 shrink-0 mt-0.5" />
                {/if}
                <div>
                  <div class="text-xs font-bold text-[var(--color-text)]">{p.name} <code class="text-[10px] text-[var(--color-primary)]/80 font-mono">({p.code})</code></div>
                  <div class="text-[10px] text-[var(--color-muted-foreground)]">{p.description}</div>
                </div>
              </div>
            {/each}
          </div>
        </div>
      {/each}
    </div>
  </form>
</Modal>
