<!-- @component Kelola kuesioner Survei Kepuasan Masyarakat (SKM): daftar survei, hasil & analisis, serta moderasi masukan. -->
<script lang="ts">
  import {
    ClipboardList, Plus, Edit2, Trash2, Copy, BarChart3, MessageSquare,
    CheckCircle2, AlertTriangle, EyeOff, Calendar,
    Download, Search, X, Check, ShieldAlert, CheckCircle
  } from 'lucide-svelte';
  import Card from '../../../shared/ui/Card.svelte';
  import Badge from '../../../shared/ui/Badge.svelte';
  import { surveyService, DEFAULT_SCALE_LABELS } from '../../../shared/services/surveyService.js';
  import { auditService } from '../../../shared/services/auditService.js';
  import { errorMessage } from '../../../shared/lib/logger.js';
  import { authStore } from '../../../shared/stores/auth.svelte.js';
  import type { SurveyEntity, SurveyResponse, SurveyQuestion, SurveyStatus, SurveyQuestionType } from '../../../shared/types/index.js';

  type BadgeTone = 'primary' | 'amber' | 'emerald' | 'red' | 'zinc' | 'blue' | 'rose' | 'sky' | 'slate' | 'purple';

  // Tabs: 'list' | 'results' | 'moderation'
  let activeTab = $state<'list' | 'results' | 'moderation'>('list');

  // Master Data
  let surveys = $state<SurveyEntity[]>([]);
  let responses = $state<SurveyResponse[]>([]);
  let services = $state<string[]>([]);
  let loading = $state(true);

  // Filter & Search States
  let surveyFilter = $state('all');
  let surveySearch = $state('');
  let selectedSurveyId = $state('');
  let modFilter = $state('all');
  let modSearch = $state('');

  // Form Modal States
  let isModalOpen = $state(false);
  let editingSurvey = $state<SurveyEntity | null>(null);
  let formTitle = $state('');
  let formDescription = $state('');
  let formSlug = $state('');
  let formStartDate = $state('');
  let formEndDate = $state('');
  let formLinkedReg = $state(false);
  let formQuestions = $state<SurveyQuestion[]>([]);
  let formError = $state<string | null>(null);

  // Stats Breakdown State
  let stats = $state<any>(null);

  const tabs = [
    { id: 'list', label: 'Kelola Kuesioner', icon: ClipboardList },
    { id: 'results', label: 'Hasil & Analisis', icon: BarChart3 },
    { id: 'moderation', label: 'Moderasi Masukan', icon: MessageSquare }
  ] as const;

  // Actor info for logs
  function buildActor() {
    const user = authStore.user;
    return {
      id: user?.uid || 'system',
      name: user?.displayName || 'Admin Petugas',
      email: user?.email || 'admin@puskesmas.go.id'
    };
  }

  $effect(() => {
    loadData();
  });

  async function loadData() {
    loading = true;
    try {
      const surveysList = await surveyService.getSurveys();
      const responsesList = await surveyService.getResponses();
      surveys = surveysList;
      responses = responsesList;

      // Pre-select first survey for stats if none selected
      if (surveysList.length > 0 && !selectedSurveyId) {
        selectedSurveyId = surveysList[0].id;
      }

      // Load clinic/services names for filters
      const regsStr = localStorage.getItem('puskesmas_online_registrations') || '[]';
      const regs = JSON.parse(regsStr);
      const uniques: string[] = Array.from(new Set(regs.map((r: { serviceName?: string }) => r.serviceName).filter((sn: unknown): sn is string => typeof sn === 'string' && sn.length > 0)));
      services = uniques;
    } catch (err) {
      console.error('Failed to load surveys data:', err);
    } finally {
      loading = false;
    }
  }

  // Re-calculate stats when selected survey or responses change
  $effect(() => {
    if (selectedSurveyId && surveys.length > 0) {
      const currentSurvey = surveys.find(s => s.id === selectedSurveyId);
      if (currentSurvey) {
        stats = surveyService.calculateStats(currentSurvey, responses);
      }
    } else {
      stats = null;
    }
  });

  // --- Survey Config Form Operations ---
  function handleOpenCreateModal() {
    editingSurvey = null;
    formTitle = '';
    formDescription = '';
    formSlug = '';
    formStartDate = new Date().toISOString().split('T')[0];
    formEndDate = new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0];
    formLinkedReg = false;
    // Add default questions
    formQuestions = [
      { id: 'q-1', type: 'rating', text: 'Kualitas pelayanan petugas kesehatan?', required: true, scaleLabels: DEFAULT_SCALE_LABELS },
      { id: 'q-2', type: 'rating', text: 'Kecepatan dan kepastian waktu tunggu pelayanan?', required: true, scaleLabels: DEFAULT_SCALE_LABELS },
      { id: 'q-3', type: 'text', text: 'Tuliskan masukan atau pengalaman Anda selama di Puskesmas:', required: false }
    ];
    formError = null;
    isModalOpen = true;
  }

  function handleOpenEditModal(survey: SurveyEntity) {
    editingSurvey = survey;
    formTitle = survey.title;
    formDescription = survey.description || '';
    formSlug = survey.slug;
    formStartDate = survey.startDate || '';
    formEndDate = survey.endDate || '';
    formLinkedReg = !!survey.isLinkedToRegistration;
    formQuestions = survey.questions;
    formError = null;
    isModalOpen = true;
  }

  function handleAddQuestion() {
    const newId = `q-${Date.now()}`;
    const newQ: SurveyQuestion = {
      id: newId,
      type: 'rating',
      text: '',
      required: true,
      scaleLabels: DEFAULT_SCALE_LABELS
    };
    formQuestions = [...formQuestions, newQ];
  }

  function handleRemoveQuestion(id: string) {
    formQuestions = formQuestions.filter(q => q.id !== id);
  }

  function handleQuestionChange(id: string, field: keyof SurveyQuestion, value: unknown) {
    formQuestions = formQuestions.map(q => {
      if (q.id === id) {
        const updated = { ...q, [field]: value } as SurveyQuestion;
        // Clean multiple_choice options if toggled
        if (field === 'type') {
          if (value === 'multiple_choice') {
            updated.options = ['Sangat Puas', 'Cukup Puas', 'Kurang Puas'];
            delete updated.scaleLabels;
          } else if (value === 'rating') {
            updated.scaleLabels = DEFAULT_SCALE_LABELS;
            delete updated.options;
          } else {
            delete updated.options;
            delete updated.scaleLabels;
          }
        }
        return updated;
      }
      return q;
    });
  }

  async function handleSaveSurvey(e: SubmitEvent) {
    e.preventDefault();
    formError = null;

    if (!formTitle.trim()) {
      formError = 'Judul survei kepuasan wajib diisi.';
      return;
    }
    if (!formSlug.trim()) {
      formError = 'URL Slug wajib diisi.';
      return;
    }
    if (formQuestions.length === 0) {
      formError = 'Harap tambahkan minimal satu pertanyaan kuesioner.';
      return;
    }
    if (formQuestions.some(q => !q.text.trim())) {
      formError = 'Teks pertanyaan tidak boleh kosong.';
      return;
    }

    const cleanSlug = formSlug.toLowerCase().trim().replace(/[^a-z0-9-]/g, '-');

    const surveyData: Omit<SurveyEntity, 'id' | 'version' | 'createdAt' | 'updatedAt'> = {
      title: formTitle.trim(),
      description: formDescription.trim(),
      slug: cleanSlug,
      startDate: formStartDate,
      endDate: formEndDate,
      isLinkedToRegistration: formLinkedReg,
      questions: formQuestions,
      status: editingSurvey ? editingSurvey.status : 'draft'
    };

    try {
      const actor = buildActor();
      if (editingSurvey) {
        await surveyService.updateSurvey(editingSurvey.id, surveyData, actor);
      } else {
        await surveyService.createSurvey(surveyData, actor);
      }
      isModalOpen = false;
      loadData();
    } catch (err: unknown) {
      formError = errorMessage(err, 'Gagal menyimpan konfigurasi survei.');
    }
  }

  async function handleStatusChange(id: string, newStatus: SurveyStatus) {
    try {
      await surveyService.updateSurveyStatus(id, newStatus, buildActor());
      loadData();
    } catch (err) {
      console.error(err);
    }
  }

  async function handleDeleteSurvey(id: string) {
    if (confirm('Apakah Anda yakin ingin menghapus kuesioner survei ini? Riwayat pengisian kuesioner tidak akan dihapus, namun URL kuesioner akan hilang.')) {
      try {
        await surveyService.deleteSurvey(id, buildActor());
        loadData();
      } catch (err) {
        console.error(err);
      }
    }
  }

  async function handleCloneSurvey(survey: SurveyEntity) {
    try {
      const clonedSlug = `${survey.slug}-v${survey.version + 1}`;
      const cloneData = {
        title: `${survey.title} (Revisi Baru)`,
        description: survey.description,
        slug: clonedSlug,
        startDate: new Date().toISOString().split('T')[0],
        endDate: survey.endDate,
        isLinkedToRegistration: survey.isLinkedToRegistration,
        questions: survey.questions,
        status: 'draft' as SurveyStatus
      };

      await surveyService.createSurvey(cloneData, buildActor());
      loadData();
      alert('Berhasil menyalin draf kuesioner survei baru.');
    } catch (err: unknown) {
      alert(errorMessage(err, 'Gagal menyalin survei.'));
    }
  }

  // --- Moderation Operations ---
  async function handleModerateComment(responseId: string, status: 'approved' | 'hidden' | 'flagged') {
    try {
      await surveyService.updateSaranStatus(responseId, status, buildActor());
      loadData();
    } catch (err) {
      console.error(err);
    }
  }

  // --- CSV Export Operations ---
  function handleExportCSV() {
    const currentSurvey = surveys.find(s => s.id === selectedSurveyId);
    if (!currentSurvey) return;

    const surveyResponses = responses.filter(r => r.surveyId === currentSurvey.id);
    if (surveyResponses.length === 0) {
      alert('Belum ada respons data untuk diekspor pada kuesioner ini.');
      return;
    }

    // CSV Header Builder
    const headers = [
      'ID RESPONDEN',
      'TANGGAL',
      'POLI/LAYANAN',
      'KODE REGISTRASI',
      'ANONIM'
    ];

    currentSurvey.questions.forEach((q, idx) => {
      headers.push(`P${idx + 1}: ${q.text.toUpperCase()}`);
    });
    headers.push('SARAN & MASUKAN');
    headers.push('STATUS MODERASI');

    // CSV Row Builder
    const rows = surveyResponses.map(resp => {
      const row = [
        resp.id,
        resp.createdAt.split('T')[0],
        resp.serviceName || 'Tidak Terkait',
        resp.registrationNumber || '-',
        resp.isAnonymous ? 'YA' : 'TIDAK'
      ];

      // Insert answers in question order
      currentSurvey.questions.forEach(q => {
        const ans = resp.answers.find(a => a.questionId === q.id);
        row.push(ans ? String(ans.answer) : '');
      });

      row.push(resp.saran || '');
      row.push(resp.saranStatus);

      // Clean CSV injection characters (=, +, -, @)
      return row.map(cell => {
        let safeCell = cell.replace(/"/g, '""');
        if (/^[=+\-@]/.test(safeCell)) {
          safeCell = `'${safeCell}`;
        }
        return `"${safeCell}"`;
      }).join(',');
    });

    const csvContent = '\uFEFF' + [headers.map(h => `"${h}"`).join(','), ...rows].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `SKM_RESPONSES_${currentSurvey.slug}_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    // Record Export Audit log
    const actor = buildActor();
    auditService.recordLog({
      userId: actor.id,
      userName: actor.name,
      userEmail: actor.email,
      action: 'EXPORT',
      module: 'SURVEYS',
      targetId: currentSurvey.id,
      targetName: currentSurvey.title,
      description: `Mengekspor data respons survei "${currentSurvey.title}" ke CSV (Jumlah: ${surveyResponses.length})`
    });
  }

  // Filters for survey lists
  const filteredSurveys = $derived(surveys.filter(s => {
    const matchesSearch = s.title.toLowerCase().includes(surveySearch.toLowerCase());
    const matchesStatus = surveyFilter === 'all' || s.status === surveyFilter;
    return matchesSearch && matchesStatus;
  }));

  // Filters for comments moderation
  const filteredComments = $derived(responses.filter(r => {
    // Matches selected survey
    if (selectedSurveyId && r.surveyId !== selectedSurveyId) return false;

    const matchesSearch = r.saran && r.saran.toLowerCase().includes(modSearch.toLowerCase());
    const matchesStatus = modFilter === 'all' || r.saranStatus === modFilter;
    return r.saran && matchesSearch && matchesStatus;
  }));

  function surveyStatusBadge(status: SurveyStatus): { variant: BadgeTone; label: string } {
    switch (status) {
      case 'draft': return { variant: 'zinc', label: 'Draf' };
      case 'published': return { variant: 'emerald', label: 'Dipublikasikan' };
      case 'closed': return { variant: 'red', label: 'Ditutup' };
      case 'archived': return { variant: 'zinc', label: 'Diarsipkan' };
      default: return { variant: 'zinc', label: status };
    }
  }

  function saranStatusBadge(status: string): { variant: BadgeTone; label: string } {
    switch (status) {
      case 'approved': return { variant: 'emerald', label: 'Approved' };
      case 'hidden': return { variant: 'zinc', label: 'Hidden' };
      case 'flagged': return { variant: 'amber', label: 'Flagged' };
      default: return { variant: 'zinc', label: status };
    }
  }
</script>

<div>
  <!-- Sub-Header Tabs & Quick Actions -->
  <div class="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 mb-6 pb-4 border-b border-[var(--color-border)]">
    <div class="flex items-center gap-1.5 p-1 bg-[var(--color-card)] rounded-2xl border border-[var(--color-border)] shrink-0">
      {#each tabs as tab (tab.id)}
        {@const Icon = tab.icon}
        <button
          onclick={() => (activeTab = tab.id)}
          class={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold transition ${
            activeTab === tab.id
              ? 'bg-[var(--color-primary)] text-[var(--color-primary-foreground)] shadow-md shadow-[var(--color-primary)]/20'
              : 'text-[var(--color-muted-foreground)] hover:text-[var(--color-text)]'
          }`}
        >
          <Icon class="w-3.5 h-3.5" />
          <span>{tab.label}</span>
        </button>
      {/each}
    </div>

    {#if activeTab === 'list'}
      <button
        onclick={handleOpenCreateModal}
        class="px-4 py-2 bg-[var(--color-primary)] hover:bg-amber-600 text-[var(--color-primary-foreground)] text-xs font-bold rounded-xl transition flex items-center gap-1.5 shadow-lg shadow-[var(--color-primary)]/20"
      >
        <Plus class="w-4 h-4" />
        <span>Buat Survei Baru</span>
      </button>
    {/if}

    {#if activeTab === 'results' && selectedSurveyId && stats?.totalRespondents > 0}
      <button
        onclick={handleExportCSV}
        class="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl transition flex items-center gap-1.5 shadow-lg shadow-emerald-500/10"
      >
        <Download class="w-4 h-4" />
        <span>Ekspor Data (CSV)</span>
      </button>
    {/if}
  </div>

  <!-- Loading state -->
  {#if loading}
    <div class="flex flex-col items-center justify-center py-20 space-y-4">
      <div class="w-10 h-10 border-4 border-[var(--color-primary)] border-t-transparent rounded-full animate-spin"></div>
      <span class="text-xs text-[var(--color-muted-foreground)]">Memuat data kuesioner dan respons...</span>
    </div>
  {:else}
    <!-- TAB 1: SURVEYS LISTING -->
    {#if activeTab === 'list'}
      <div class="space-y-6">

        <!-- Search & Filter bar -->
        <div class="flex flex-col sm:flex-row gap-3">
          <div class="relative flex-1">
            <Search class="w-4 h-4 text-[var(--color-muted-foreground)] absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Cari judul kuesioner..."
              bind:value={surveySearch}
              class="w-full bg-[var(--color-card)] border border-[var(--color-border)] focus:border-[var(--color-primary)]/70 focus:outline-none focus:ring-1 focus:ring-[var(--color-primary)] rounded-xl pl-9 pr-4 py-2 text-xs text-[var(--color-text)] placeholder-zinc-500"
            />
          </div>
          <select
            bind:value={surveyFilter}
            class="bg-[var(--color-card)] border border-[var(--color-border)] text-xs text-[var(--color-text)] rounded-xl px-3 py-2 focus:outline-none focus:ring-1 focus:ring-[var(--color-primary)]"
          >
            <option value="all">Semua Status</option>
            <option value="draft">Draf</option>
            <option value="published">Diterbitkan (Published)</option>
            <option value="closed">Ditutup (Closed)</option>
            <option value="archived">Diarsipkan (Archived)</option>
          </select>
        </div>

        <!-- Grid cards -->
        {#if filteredSurveys.length === 0}
          <Card class="text-center py-12 px-6 border-dashed space-y-3">
            <div class="w-12 h-12 bg-[var(--color-surface)]/50 text-[var(--color-muted-foreground)] rounded-xl flex items-center justify-center mx-auto">
              <ClipboardList class="w-6 h-6" />
            </div>
            <div>
              <h4 class="text-xs font-bold text-[var(--color-text)]">Tidak ada kuesioner</h4>
              <p class="text-[11px] text-[var(--color-muted-foreground)] mt-0.5">Buat kuesioner survei kepuasan masyarakat baru.</p>
            </div>
          </Card>
        {:else}
          <div class="grid grid-cols-1 gap-4">
            {#each filteredSurveys as survey (survey.id)}
              {@const badge = surveyStatusBadge(survey.status)}
              {@const surveyResponses = responses.filter(r => r.surveyId === survey.id)}
              {@const isDraft = survey.status === 'draft'}
              {@const isPublished = survey.status === 'published'}
              {@const isClosed = survey.status === 'closed'}
              <Card class="border border-[var(--color-border)] hover:border-[var(--color-border)] transition p-5 flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div class="space-y-2.5">
                  <div class="flex items-center gap-2 flex-wrap">
                    <Badge variant={badge.variant}>{badge.label}</Badge>

                    <span class="text-[10px] text-[var(--color-muted-foreground)] font-mono font-semibold">Versi {survey.version}</span>
                    {#if survey.isLinkedToRegistration}
                      <Badge variant="amber" size="sm">Wajib Kode Pendaftaran</Badge>
                    {/if}
                  </div>

                  <div class="space-y-1">
                    <h3 class="text-sm font-bold text-[var(--color-text)]">{survey.title}</h3>
                    <p class="text-xs text-[var(--color-muted-foreground)] line-clamp-1">{survey.description || '(Tidak ada deskripsi)'}</p>
                  </div>

                  <div class="flex items-center gap-4 text-[10px] text-[var(--color-muted-foreground)] flex-wrap">
                    <span class="flex items-center gap-1">
                      <Calendar class="w-3.5 h-3.5 text-[var(--color-primary)]" />
                      <span>{survey.startDate || '-'} s.d {survey.endDate || '-'}</span>
                    </span>
                    <span>•</span>
                    <span>{survey.questions.length} Pertanyaan</span>
                    <span>•</span>
                    <span class="text-[var(--color-primary)] font-bold">{surveyResponses.length} Responden</span>
                  </div>
                </div>

                <!-- Config Controls -->
                <div class="flex items-center gap-2 self-end md:self-center shrink-0">
                  <!-- Status Actions -->
                  {#if isDraft}
                    <button
                      onclick={() => handleStatusChange(survey.id, 'published')}
                      class="px-2.5 py-1.5 bg-emerald-600/10 text-[var(--color-primary)] hover:bg-emerald-600/20 text-[10px] font-bold rounded-lg transition"
                      title="Terbitkan"
                    >
                      Terbitkan
                    </button>
                  {/if}
                  {#if isPublished}
                    <button
                      onclick={() => handleStatusChange(survey.id, 'closed')}
                      class="px-2.5 py-1.5 bg-red-600/10 text-red-400 hover:bg-red-600/20 text-[10px] font-bold rounded-lg transition"
                      title="Tutup Pengisian"
                    >
                      Tutup
                    </button>
                  {/if}
                  {#if isClosed}
                    <button
                      onclick={() => handleStatusChange(survey.id, 'published')}
                      class="px-2.5 py-1.5 bg-emerald-600/10 text-[var(--color-primary)] hover:bg-emerald-600/20 text-[10px] font-bold rounded-lg transition"
                      title="Buka Kembali"
                    >
                      Buka
                    </button>
                  {/if}

                  <!-- Clone version -->
                  <button
                    onclick={() => handleCloneSurvey(survey)}
                    class="p-1.5 text-[var(--color-muted-foreground)] hover:text-[var(--color-text)] bg-[var(--color-bg)] border border-[var(--color-border)] rounded-lg transition"
                    title="Buat Versi Baru / Copy"
                  >
                    <Copy class="w-3.5 h-3.5" />
                  </button>

                  <!-- Edit / Config -->
                  <button
                    onclick={() => handleOpenEditModal(survey)}
                    class="p-1.5 text-[var(--color-muted-foreground)] hover:text-[var(--color-primary)] bg-[var(--color-bg)] border border-[var(--color-border)] rounded-lg transition"
                    title="Edit Konfigurasi"
                  >
                    <Edit2 class="w-3.5 h-3.5" />
                  </button>

                  <!-- Delete -->
                  <button
                    onclick={() => handleDeleteSurvey(survey.id)}
                    class="p-1.5 text-[var(--color-muted-foreground)] hover:text-red-400 bg-[var(--color-bg)] border border-[var(--color-border)] rounded-lg transition"
                    title="Hapus"
                  >
                    <Trash2 class="w-3.5 h-3.5" />
                  </button>
                </div>
              </Card>
            {/each}
          </div>
        {/if}

      </div>
    {/if}

    <!-- TAB 2: STATISTICS RESULTS VISUALIZER -->
    {#if activeTab === 'results'}
      <div class="space-y-6">

        <!-- Select Survey Filter -->
        <div class="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-[var(--color-card)] p-4 rounded-2xl border border-[var(--color-border)]">
          <div class="space-y-1">
            <span class="text-[9px] text-[var(--color-primary)] font-bold uppercase tracking-wider block">PILIH KUESIONER SURVEI</span>
            <select
              bind:value={selectedSurveyId}
              class="bg-[var(--color-bg)] border border-[var(--color-border)] text-xs text-[var(--color-text)] rounded-xl px-3 py-2 focus:outline-none focus:ring-1 focus:ring-[var(--color-primary)] min-w-[280px]"
            >
              {#each surveys as s (s.id)}
                <option value={s.id}>{s.title} (v{s.version})</option>
              {/each}
            </select>
          </div>

          {#if stats}
            <div class="text-[10px] text-[var(--color-muted-foreground)] flex items-center gap-1.5">
              <CheckCircle class="w-4 h-4 text-[var(--color-primary)]" />
              <span>Terakhir diisi kuesioner: {responses.length > 0 ? new Date(responses[0].createdAt).toLocaleDateString('id-ID') : '-'}</span>
            </div>
          {/if}
        </div>

        {#if !stats || stats.totalRespondents === 0}
          <Card class="text-center py-16 px-6 space-y-4">
            <div class="w-12 h-12 bg-[var(--color-surface)]/50 text-[var(--color-muted-foreground)] rounded-2xl flex items-center justify-center mx-auto">
              <BarChart3 class="w-6 h-6" />
            </div>
            <div>
              <h3 class="text-sm font-bold text-[var(--color-text)]">Belum Ada Tanggapan Masuk</h3>
              <p class="text-xs text-[var(--color-muted-foreground)] mt-1">Kuesioner ini belum memiliki data pengisian dari masyarakat.</p>
            </div>
          </Card>
        {:else}
          <div class="space-y-6">

            <!-- Executive Metric Cards -->
            <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card class="p-5 flex items-center justify-between">
                <div class="space-y-1">
                  <span class="text-[10px] text-[var(--color-muted-foreground)] font-bold uppercase block">Jumlah Responden</span>
                  <div class="text-2xl font-black text-[var(--color-text)]">{stats.totalRespondents}</div>
                </div>
                <div class="p-3 bg-[var(--color-primary)]/10 text-[var(--color-primary)] rounded-2xl">
                  <ClipboardList class="w-6 h-6" />
                </div>
              </Card>

              <Card class="p-5 flex items-center justify-between">
                <div class="space-y-1">
                  <span class="text-[10px] text-[var(--color-muted-foreground)] font-bold uppercase block">Nilai Rata-rata IKM</span>
                  <div class="text-2xl font-black text-[var(--color-text)] flex items-baseline gap-1">
                    <span>{stats.averageScore}</span>
                    <span class="text-xs text-[var(--color-muted-foreground)] font-medium">/ 4.00</span>
                  </div>
                </div>
                <div class="p-3 bg-[var(--color-primary)]/10 text-[var(--color-primary)] rounded-2xl">
                  <BarChart3 class="w-6 h-6" />
                </div>
              </Card>

              <Card class="p-5 flex items-center justify-between">
                <div class="space-y-1">
                  <span class="text-[10px] text-[var(--color-muted-foreground)] font-bold uppercase block">Mutu Pelayanan</span>
                  <div class="text-xl font-bold text-[var(--color-primary)]">
                    {stats.averageScore >= 3.25 ? 'A (Sangat Baik)' :
                     stats.averageScore >= 2.5 ? 'B (Baik)' :
                     stats.averageScore >= 1.75 ? 'C (Kurang Baik)' : 'D (Buruk)'}
                  </div>
                </div>
                <div class="p-3 bg-blue-500/10 text-blue-400 rounded-2xl">
                  <CheckCircle2 class="w-6 h-6" />
                </div>
              </Card>
            </div>

            <!-- Rating Distribution & Services Breakdown -->
            <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <!-- Hand-Crafted Premium Score Distribution Bar Graph -->
              <Card class="p-6 space-y-4">
                <h3 class="text-xs font-bold text-[var(--color-text)] uppercase tracking-wider">Distribusi Penilaian Skor</h3>

                <div class="space-y-3.5">
                  {#each [4, 3, 2, 1] as score (score)}
                    {@const count = stats.scoreDistribution[score] || 0}
                    {@const pct = stats.totalRespondents > 0 ? (count / (stats.totalRespondents * stats.questionsStats.filter((q: { type?: string }) => q.type === 'rating').length)) * 100 : 0}
                    {@const colors: Record<number, string> = {
                      4: 'bg-[var(--color-primary)]',
                      3: 'bg-yellow-500',
                      2: 'bg-orange-500',
                      1: 'bg-red-500'
                    }}
                    <div class="space-y-1">
                      <div class="flex justify-between text-xs text-[var(--color-muted-foreground)]">
                        <span class="font-semibold text-[var(--color-text)]">Skor {score} - {DEFAULT_SCALE_LABELS.find(l => l.score === score)?.label}</span>
                        <span class="font-mono">{count} ({pct.toFixed(1)}%)</span>
                      </div>
                      <div class="h-2 bg-[var(--color-bg)] rounded-full overflow-hidden border border-[var(--color-border)]">
                        <div
                          style={`width: ${pct}%`}
                          class={`h-full rounded-full ${colors[score]}`}
                        ></div>
                      </div>
                    </div>
                  {/each}
                </div>
              </Card>

              <!-- Breakdown by Healthcare Services / Poli -->
              <Card class="p-6 space-y-4">
                <h3 class="text-xs font-bold text-[var(--color-text)] uppercase tracking-wider">Indeks Kepuasan Per Poli / Unit</h3>

                {#if Object.keys(stats.serviceBreakdown).length === 0}
                  <p class="text-xs text-[var(--color-muted-foreground)] text-center py-10">Data unit/poli pendaftaran belum terekam di respon kuesioner.</p>
                {:else}
                  <div class="space-y-3">
                    {#each Object.entries(stats.serviceBreakdown) as [name, value] (name)}
                      {@const avgPct = (value.average / 4) * 100}
                      <div class="flex items-center justify-between gap-4 py-2 border-b border-[var(--color-border)] last:border-b-0">
                        <span class="text-xs font-semibold text-[var(--color-text)] truncate">{name}</span>
                        <div class="flex items-center gap-3 shrink-0">
                          <div class="w-24 h-1.5 bg-[var(--color-bg)] rounded-full overflow-hidden border border-[var(--color-border)]">
                            <div style={`width: ${avgPct}%`} class="h-full bg-[var(--color-primary)] rounded-full"></div>
                          </div>
                          <Badge variant={value.average >= 3.25 ? 'emerald' : value.average >= 2.5 ? 'amber' : 'red'}>
                            {value.average}
                          </Badge>
                        </div>
                      </div>
                    {/each}
                  </div>
                {/if}
              </Card>
            </div>

            <!-- Question Stats Breakdown Cards -->
            <div class="space-y-4">
              <h3 class="text-xs font-bold text-[var(--color-text)] uppercase tracking-wider">Metrik Detail Per Butir Pertanyaan</h3>

              <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                {#each stats.questionsStats as qStat, idx (qStat.questionId)}
                  <Card class="p-5 border border-[var(--color-border)] space-y-4">
                    <div class="flex items-start justify-between gap-3">
                      <div class="space-y-1">
                        <span class="text-[9px] text-[var(--color-primary)] font-mono font-bold block">BUTIR P{idx + 1} • {qStat.type.toUpperCase()}</span>
                        <h4 class="text-xs font-bold text-[var(--color-text)] leading-relaxed">{qStat.text}</h4>
                      </div>
                      {#if qStat.type === 'rating'}
                        <Badge variant={qStat.average >= 3.25 ? 'emerald' : qStat.average >= 2.5 ? 'amber' : 'red'}>
                          {qStat.average}
                        </Badge>
                      {/if}
                    </div>

                    <!-- Option Distribution Breakdown inside card -->
                    {#if qStat.type === 'rating'}
                      <div class="flex gap-2 text-[10px] text-[var(--color-muted-foreground)] font-semibold justify-between pt-2 border-t border-[var(--color-border)]/70">
                        {#each Object.entries(qStat.distribution) as [score, count] (score)}
                          <div class="text-center flex-1 border-r border-[var(--color-border)] last:border-0">
                            <div class="text-[11px] font-bold text-[var(--color-text)]">Skor {score}</div>
                            <div class="font-mono mt-0.5 text-[var(--color-muted-foreground)]">{count} Respon</div>
                          </div>
                        {/each}
                      </div>
                    {/if}

                    {#if qStat.type === 'multiple_choice'}
                      <div class="space-y-1.5 pt-2 border-t border-[var(--color-border)]/70">
                        {#each Object.entries(qStat.distribution) as [opt, count] (opt)}
                          {@const pct = qStat.total > 0 ? (count / qStat.total) * 100 : 0}
                          <div class="space-y-0.5">
                            <div class="flex justify-between text-[10px] text-[var(--color-muted-foreground)]">
                              <span class="truncate">{opt}</span>
                              <span>{count} ({pct.toFixed(0)}%)</span>
                            </div>
                            <div class="h-1 bg-[var(--color-bg)] rounded-full overflow-hidden">
                              <div style={`width: ${pct}%`} class="h-full bg-[var(--color-primary)]"></div>
                            </div>
                          </div>
                        {/each}
                      </div>
                    {/if}

                  </Card>
                {/each}
              </div>
            </div>

          </div>
        {/if}

      </div>
    {/if}

    <!-- TAB 3: COMMENTS SCREENING & MODERATION -->
    {#if activeTab === 'moderation'}
      <div class="space-y-6">

        <!-- Moderation filters bar -->
        <div class="flex flex-col sm:flex-row gap-3">
          <div class="relative flex-1">
            <Search class="w-4 h-4 text-[var(--color-muted-foreground)] absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Cari saran atau masukan terbuka..."
              bind:value={modSearch}
              class="w-full bg-[var(--color-card)] border border-[var(--color-border)] focus:border-[var(--color-primary)]/70 focus:outline-none focus:ring-1 focus:ring-[var(--color-primary)] rounded-xl pl-9 pr-4 py-2 text-xs text-[var(--color-text)] placeholder-zinc-500"
            />
          </div>
          <select
            bind:value={modFilter}
            class="bg-[var(--color-card)] border border-[var(--color-border)] text-xs text-[var(--color-text)] rounded-xl px-3 py-2 focus:outline-none focus:ring-1 focus:ring-[var(--color-primary)]"
          >
            <option value="all">Semua Status Moderasi</option>
            <option value="approved">Disetujui (Approved)</option>
            <option value="hidden">Disembunyikan (Hidden)</option>
            <option value="flagged">Ditandai (Flagged)</option>
          </select>
        </div>

        <!-- Comments list -->
        {#if filteredComments.length === 0}
          <Card class="text-center py-12 px-6 border-dashed space-y-3">
            <div class="w-12 h-12 bg-[var(--color-surface)]/50 text-[var(--color-muted-foreground)] rounded-xl flex items-center justify-center mx-auto">
              <MessageSquare class="w-6 h-6" />
            </div>
            <div>
              <h4 class="text-xs font-bold text-[var(--color-text)]">Tidak ada saran terbuka</h4>
              <p class="text-[11px] text-[var(--color-muted-foreground)] mt-0.5">Belum ada saran atau masukan terbuka yang sesuai kriteria filter.</p>
            </div>
          </Card>
        {:else}
          <div class="space-y-4">
            {#each filteredComments as cmt (cmt.id)}
              {@const hasLowScores = cmt.answers.some(a => Number(a.answer) <= 2)}
              {@const statusBadge = saranStatusBadge(cmt.saranStatus)}
              <Card class={`p-5 border transition-all ${
                hasLowScores ? 'border-red-500/20 bg-red-500/2' : 'border-[var(--color-border)]'
              }`}>
                <div class="space-y-3">
                  <div class="flex items-center justify-between flex-wrap gap-2 pb-2.5 border-b border-[var(--color-border)]/70">
                    <div class="flex items-center gap-2 text-[10px] text-[var(--color-muted-foreground)] font-semibold">
                      <span class="text-[var(--color-text)] font-bold">{cmt.isAnonymous ? 'Anonim (Pasien)' : 'Siti Aminah'}</span>
                      <span>•</span>
                      <span>{new Date(cmt.createdAt).toLocaleDateString('id-ID')}</span>
                      {#if cmt.registrationNumber}
                        <span>•</span>
                        <Badge variant="zinc">{cmt.registrationNumber}</Badge>
                      {/if}
                      {#if cmt.serviceName}
                        <span>•</span>
                        <span class="text-[var(--color-primary)] font-bold">{cmt.serviceName}</span>
                      {/if}
                    </div>

                    <div class="flex items-center gap-2">
                      <Badge variant={statusBadge.variant}>{statusBadge.label}</Badge>

                      {#if hasLowScores}
                        <Badge variant="red">
                          <span class="flex items-center gap-1">
                            <ShieldAlert class="w-3 h-3" />
                            <span>Penilaian Rendah</span>
                          </span>
                        </Badge>
                      {/if}
                    </div>
                  </div>

                  <div class="space-y-3">
                    <p class="text-xs text-[var(--color-text)] leading-relaxed font-medium italic">
                      "{cmt.saran}"
                    </p>

                    <!-- Micro score card helper inside feed -->
                    <div class="flex flex-wrap gap-3 pt-1">
                      {#each cmt.answers as ans, aIdx (ans.questionId)}
                        <div class="px-2 py-1 bg-[var(--color-bg)] border border-[var(--color-border)] rounded-lg text-[9px] text-[var(--color-muted-foreground)] font-medium">
                          P{aIdx + 1}: <span class={`font-bold ${Number(ans.answer) <= 2 ? 'text-red-400' : 'text-[var(--color-text)]'}`}>{ans.answer}</span>
                        </div>
                      {/each}
                    </div>
                  </div>

                  <!-- Action Moderation Controls -->
                  <div class="flex justify-end gap-2 pt-2 border-t border-[var(--color-border)]/30">
                    {#if cmt.saranStatus !== 'approved'}
                      <button
                        onclick={() => handleModerateComment(cmt.id, 'approved')}
                        class="px-2.5 py-1.5 bg-emerald-600/10 text-[var(--color-primary)] hover:bg-emerald-600/20 text-[10px] font-bold rounded-lg transition flex items-center gap-1"
                      >
                        <Check class="w-3.5 h-3.5" />
                        <span>Setujui</span>
                      </button>
                    {/if}
                    {#if cmt.saranStatus !== 'hidden'}
                      <button
                        onclick={() => handleModerateComment(cmt.id, 'hidden')}
                        class="px-2.5 py-1.5 bg-zinc-700/10 text-[var(--color-muted-foreground)] hover:bg-zinc-700/20 text-[10px] font-bold rounded-lg transition flex items-center gap-1"
                      >
                        <EyeOff class="w-3.5 h-3.5" />
                        <span>Sembunyikan</span>
                      </button>
                    {/if}
                    {#if cmt.saranStatus !== 'flagged'}
                      <button
                        onclick={() => handleModerateComment(cmt.id, 'flagged')}
                        class="px-2.5 py-1.5 bg-red-600/10 text-red-400 hover:bg-red-600/20 text-[10px] font-bold rounded-lg transition flex items-center gap-1"
                      >
                        <AlertTriangle class="w-3.5 h-3.5" />
                        <span>Tandai Flag</span>
                      </button>
                    {/if}
                  </div>

                </div>
              </Card>
            {/each}
          </div>
        {/if}

      </div>
    {/if}
  {/if}

</div>

<!-- SURVEY CONFIG MODAL DIALOG -->
{#if isModalOpen}
  <div class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm overflow-y-auto">
    <Card class="max-w-2xl w-full p-6 bg-[var(--color-card)] border border-[var(--color-border)] space-y-6 my-8 max-h-[90vh] overflow-y-auto rounded-3xl">
      <div class="flex justify-between items-center pb-4 border-b border-[var(--color-border)]">
        <h2 class="text-sm font-bold text-[var(--color-text)] uppercase tracking-wider flex items-center gap-2">
          <ClipboardList class="w-4 h-4 text-[var(--color-primary)]" />
          <span>{editingSurvey ? 'Edit Konfigurasi Kuesioner' : 'Buat Kuesioner Baru'}</span>
        </h2>
        <button
          onclick={() => (isModalOpen = false)}
          class="text-[var(--color-muted-foreground)] hover:text-[var(--color-text)] transition"
        >
          <X class="w-5 h-5" />
        </button>
      </div>

      {#if formError}
        <div class="p-3 bg-red-500/10 border border-red-500/20 text-red-400 rounded-xl flex items-center gap-2 text-xs font-semibold">
          <AlertTriangle class="w-4 h-4 shrink-0" />
          <span>{formError}</span>
        </div>
      {/if}

      <form onsubmit={handleSaveSurvey} class="space-y-5">

        <!-- Basic Details -->
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div class="space-y-1 sm:col-span-2">
            <label class="text-[10px] font-bold text-[var(--color-muted-foreground)] uppercase">Judul Survei Kepuasan *</label>
            <input
              type="text"
              required
              bind:value={formTitle}
              oninput={() => {
                // Auto-slugify on type if creating new
                if (!editingSurvey) {
                  formSlug = formTitle.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-');
                }
              }}
              placeholder="Contoh: Survei Kepuasan Triwulan III - 2026"
              class="w-full bg-[var(--color-bg)] border border-[var(--color-border)] focus:border-[var(--color-primary)]/70 focus:outline-none focus:ring-1 focus:ring-[var(--color-primary)] rounded-xl px-3 py-2 text-xs text-[var(--color-text)]"
            />
          </div>

          <div class="space-y-1 sm:col-span-2">
            <label class="text-[10px] font-bold text-[var(--color-muted-foreground)] uppercase">Deskripsi / Penjelasan Singkat</label>
            <textarea
              bind:value={formDescription}
              placeholder="Contoh: Pengisian kuesioner resmi Puskesmas..."
              rows={2}
              class="w-full bg-[var(--color-bg)] border border-[var(--color-border)] focus:border-[var(--color-primary)]/70 focus:outline-none focus:ring-1 focus:ring-[var(--color-primary)] rounded-xl px-3 py-2 text-xs text-[var(--color-text)]"
            ></textarea>
          </div>

          <div class="space-y-1">
            <label class="text-[10px] font-bold text-[var(--color-muted-foreground)] uppercase">URL Slug (Unik) *</label>
            <input
              type="text"
              required
              bind:value={formSlug}
              placeholder="kepuasan-triwulan-3"
              class="w-full bg-[var(--color-bg)] border border-[var(--color-border)] focus:border-[var(--color-primary)]/70 focus:outline-none focus:ring-1 focus:ring-[var(--color-primary)] rounded-xl px-3 py-2 text-xs text-[var(--color-text)]"
            />
          </div>

          <div class="space-y-1">
            <label class="text-[10px] font-bold text-[var(--color-muted-foreground)] uppercase">Koneksi Pendaftaran</label>
            <div class="flex items-center gap-2 h-9">
              <input
                type="checkbox"
                id="linked-reg-chk"
                bind:checked={formLinkedReg}
                class="rounded border-[var(--color-border)] bg-[var(--color-bg)] text-[var(--color-primary)] focus:ring-[var(--color-primary)]"
              />
              <label for="linked-reg-chk" class="text-xs text-[var(--color-text)] cursor-pointer">Wajib verifikasi kode pendaftaran</label>
            </div>
          </div>

          <div class="space-y-1">
            <label class="text-[10px] font-bold text-[var(--color-muted-foreground)] uppercase">Tanggal Mulai *</label>
            <input
              type="date"
              required
              bind:value={formStartDate}
              class="w-full bg-[var(--color-bg)] border border-[var(--color-border)] focus:border-[var(--color-primary)]/70 focus:outline-none focus:ring-1 focus:ring-[var(--color-primary)] rounded-xl px-3 py-2 text-xs text-[var(--color-text)]"
            />
          </div>

          <div class="space-y-1">
            <label class="text-[10px] font-bold text-[var(--color-muted-foreground)] uppercase">Tanggal Berakhir *</label>
            <input
              type="date"
              required
              bind:value={formEndDate}
              class="w-full bg-[var(--color-bg)] border border-[var(--color-border)] focus:border-[var(--color-primary)]/70 focus:outline-none focus:ring-1 focus:ring-[var(--color-primary)] rounded-xl px-3 py-2 text-xs text-[var(--color-text)]"
            />
          </div>
        </div>

        <!-- Questions List Editor -->
        <div class="space-y-4 pt-4 border-t border-[var(--color-border)]">
          <div class="flex items-center justify-between">
            <span class="text-[10px] font-bold text-[var(--color-muted-foreground)] uppercase">Daftar Butir Pertanyaan kuesioner ({formQuestions.length})</span>
            <button
              type="button"
              onclick={handleAddQuestion}
              class="px-2.5 py-1 bg-[var(--color-primary)]/10 text-[var(--color-primary)] hover:bg-[var(--color-primary)]/20 text-[10px] font-bold rounded-lg transition flex items-center gap-1"
            >
              <Plus class="w-3.5 h-3.5" />
              <span>Tambah Butir</span>
            </button>
          </div>

          <div class="space-y-3 max-h-[300px] overflow-y-auto pr-1">
            {#each formQuestions as q, qIdx (q.id)}
              <div class="p-4 bg-[var(--color-bg)] rounded-2xl border border-[var(--color-border)] space-y-3 relative group">
                <button
                  type="button"
                  onclick={() => handleRemoveQuestion(q.id)}
                  class="absolute top-4 right-4 text-[var(--color-muted-foreground)] hover:text-red-400 transition"
                  title="Hapus Butir"
                >
                  <X class="w-4 h-4" />
                </button>

                <div class="flex items-center gap-3">
                  <span class="text-[11px] font-mono font-bold text-[var(--color-primary)]">P{qIdx + 1}</span>
                  <select
                    value={q.type}
                    onchange={(e) => handleQuestionChange(q.id, 'type', e.currentTarget.value as SurveyQuestionType)}
                    class="bg-[var(--color-card)] border border-[var(--color-border)] text-[11px] text-[var(--color-text)] rounded-lg px-2 py-1 focus:outline-none focus:ring-1 focus:ring-[var(--color-primary)]"
                  >
                    <option value="rating">Rating (1-4)</option>
                    <option value="multiple_choice">Pilihan Ganda (MC)</option>
                    <option value="text">Teks Bebas</option>
                  </select>

                  <div class="flex items-center gap-1.5 ml-2">
                    <input
                      type="checkbox"
                      id={`req-chk-${q.id}`}
                      checked={q.required}
                      onchange={(e) => handleQuestionChange(q.id, 'required', e.currentTarget.checked)}
                      class="rounded border-[var(--color-border)] bg-[var(--color-card)] text-[var(--color-primary)] focus:ring-[var(--color-primary)]"
                    />
                    <label for={`req-chk-${q.id}`} class="text-[11px] text-[var(--color-muted-foreground)] cursor-pointer">Wajib</label>
                  </div>
                </div>

                <div class="space-y-1">
                  <input
                    type="text"
                    required
                    value={q.text}
                    oninput={(e) => handleQuestionChange(q.id, 'text', e.currentTarget.value)}
                    placeholder="Pertanyaan penilaian kuesioner..."
                    class="w-full bg-[var(--color-card)] border border-[var(--color-border)] focus:border-[var(--color-primary)]/70 focus:outline-none rounded-xl px-3 py-1.5 text-xs text-[var(--color-text)]"
                  />
                </div>

                {#if q.type === 'multiple_choice'}
                  <div class="space-y-1 pt-1">
                    <label class="text-[10px] text-[var(--color-muted-foreground)] block uppercase font-bold">Pilihan Jawaban (pisahkan dengan koma) *</label>
                    <input
                      type="text"
                      required
                      value={q.options ? q.options.join(', ') : ''}
                      oninput={(e) => handleQuestionChange(q.id, 'options', e.currentTarget.value.split(',').map(s => s.trim()).filter(Boolean))}
                      placeholder="Sangat Puas, Cukup, Kurang"
                      class="w-full bg-[var(--color-card)] border border-[var(--color-border)] focus:border-[var(--color-primary)]/70 focus:outline-none rounded-xl px-3 py-1.5 text-xs text-[var(--color-text)] font-mono"
                    />
                  </div>
                {/if}

              </div>
            {/each}
          </div>
        </div>

        <!-- Form Footer Action -->
        <div class="pt-4 border-t border-[var(--color-border)] flex justify-end gap-2.5">
          <button
            type="button"
            onclick={() => (isModalOpen = false)}
            class="px-4 py-2 bg-[var(--color-bg)] hover:bg-[var(--color-card)] text-[var(--color-text)] text-xs font-semibold rounded-xl border border-[var(--color-border)] transition"
          >
            Batal
          </button>
          <button
            type="submit"
            class="px-5 py-2 bg-[var(--color-primary)] hover:bg-amber-600 text-[var(--color-primary-foreground)] text-xs font-bold rounded-xl transition shadow-lg shadow-[var(--color-primary)]/20"
          >
            Simpan Konfigurasi
          </button>
        </div>

      </form>

    </Card>
  </div>
{/if}
