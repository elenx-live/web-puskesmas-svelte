<!-- @component Kelola FAQ, panduan knowledge base, kategori, dan analitik feedback pusat bantuan. -->
<script lang="ts">
  import { onMount } from 'svelte';
  import {
    HelpCircle, BookOpen, Layers, BarChart3, Plus, Search, Edit3, Trash2,
    CheckCircle2, AlertTriangle, Eye, EyeOff, Star,
    ThumbsUp, ThumbsDown, X
  } from 'lucide-svelte';
  import Modal from '../../../shared/ui/Modal.svelte';
  import ConfirmModal from '../../../shared/components/ConfirmModal.svelte';
  import { faqService } from '../../../shared/services/faqService.js';
  import type { FaqEntity, GuideEntity, FaqCategory, GuideCategory, ContentStatus, GuideStep } from '../../../shared/types/index.js';
  import { toastStore } from '../../../shared/stores/toast.svelte.js';

  let activeTab = $state<'faqs' | 'guides' | 'categories' | 'analytics'>('faqs');
  let faqs = $state<FaqEntity[]>([]);
  let guides = $state<GuideEntity[]>([]);
  let faqCategories = $state<FaqCategory[]>([]);
  let guideCategories = $state<GuideCategory[]>([]);
  let analytics = $state<any>(null);
  let loading = $state(true);

  let searchQuery = $state('');
  let selectedCategory = $state('ALL');
  let selectedStatus = $state('ALL');

  let isFaqModalOpen = $state(false);
  let editingFaq = $state<Partial<FaqEntity> | null>(null);

  let isGuideModalOpen = $state(false);
  let editingGuide = $state<Partial<GuideEntity> | null>(null);

  let notification = $state('');
  let confirmState = $state<{ title: string; message: string; action: () => Promise<void> } | null>(null);

  onMount(() => {
    loadData();
  });

  async function loadData() {
    loading = true;
    try {
      const [fData, gData, fcData, gcData, anData] = await Promise.all([
        faqService.getFaqs(),
        faqService.getGuides(),
        faqService.getFaqCategories(),
        faqService.getGuideCategories(),
        faqService.getFaqAnalytics()
      ]);
      faqs = fData;
      guides = gData;
      faqCategories = fcData;
      guideCategories = gcData;
      analytics = anData;
    } catch (e) {
      console.error(e);
    } finally {
      loading = false;
    }
  }

  function showNotification(msg: string) {
    notification = msg;
    setTimeout(() => (notification = ''), 4000);
  }

  function updateFaq(patch: Partial<FaqEntity>) {
    if (editingFaq) editingFaq = { ...editingFaq, ...patch };
  }

  function updateGuide(patch: Partial<GuideEntity>) {
    if (editingGuide) editingGuide = { ...editingGuide, ...patch };
  }

  function updateGuideStep(idx: number, patch: Partial<GuideStep>) {
    if (!editingGuide) return;
    const steps = [...(editingGuide.steps || [])];
    steps[idx] = { ...steps[idx], ...patch };
    editingGuide = { ...editingGuide, steps };
  }

  function addGuideStep() {
    if (!editingGuide) return;
    const steps = editingGuide.steps || [];
    editingGuide = {
      ...editingGuide,
      steps: [...steps, { id: `step-${Date.now()}`, stepNumber: steps.length + 1, title: '', description: '' }]
    };
  }

  function removeGuideStep(idx: number) {
    if (!editingGuide) return;
    const steps = [...(editingGuide.steps || [])];
    steps.splice(idx, 1);
    editingGuide = { ...editingGuide, steps };
  }

  async function handleSaveFaq(e: Event) {
    e.preventDefault();
    if (!editingFaq?.question || !editingFaq?.answer) {
      toastStore.showToast('Pertanyaan dan jawaban wajib diisi', 'error');
      return;
    }

    const payload: FaqEntity = {
      id: editingFaq.id || `faq-${Date.now()}`,
      question: editingFaq.question,
      answer: editingFaq.answer,
      category: editingFaq.category || 'Pendaftaran',
      serviceId: editingFaq.serviceId || '',
      documentId: editingFaq.documentId || '',
      tags: editingFaq.tags || [],
      status: (editingFaq.status as ContentStatus) || 'Published',
      order: editingFaq.order || faqs.length + 1,
      featured: editingFaq.featured || false,
      helpfulCount: editingFaq.helpfulCount || 0,
      notHelpfulCount: editingFaq.notHelpfulCount || 0,
      needsReview: editingFaq.needsReview || false,
      slug: (editingFaq.question || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, ''),
      createdAt: editingFaq.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    await faqService.saveFaq(payload);
    isFaqModalOpen = false;
    editingFaq = null;
    showNotification('FAQ berhasil disimpan.');
    loadData();
  }

  function askDeleteFaq(id: string) {
    confirmState = {
      title: 'Hapus FAQ',
      message: 'Yakin ingin menghapus FAQ ini?',
      action: async () => {
        await faqService.deleteFaq(id);
        showNotification('FAQ berhasil dihapus.');
        loadData();
      }
    };
  }

  async function handleTogglePublishFaq(faq: FaqEntity) {
    const nextStatus: ContentStatus = faq.status === 'Published' ? 'Unpublished' : 'Published';
    await faqService.setFaqStatus(faq.id, nextStatus);
    showNotification(`Status FAQ diubah menjadi ${nextStatus}.`);
    loadData();
  }

  async function handleSaveGuide(e: Event) {
    e.preventDefault();
    if (!editingGuide?.title || !editingGuide?.summary) {
      toastStore.showToast('Judul dan ringkasan panduan wajib diisi', 'error');
      return;
    }

    const payload: GuideEntity = {
      id: editingGuide.id || `guide-${Date.now()}`,
      title: editingGuide.title,
      summary: editingGuide.summary,
      content: editingGuide.content || '',
      category: editingGuide.category || 'Pendaftaran',
      relatedServiceId: editingGuide.relatedServiceId || '',
      relatedDocumentId: editingGuide.relatedDocumentId || '',
      steps: editingGuide.steps || [],
      status: (editingGuide.status as ContentStatus) || 'Published',
      slug: (editingGuide.title || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, ''),
      createdAt: editingGuide.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    await faqService.saveGuide(payload);
    isGuideModalOpen = false;
    editingGuide = null;
    showNotification('Panduan berhasil disimpan.');
    loadData();
  }

  function askDeleteGuide(id: string) {
    confirmState = {
      title: 'Hapus Panduan',
      message: 'Yakin ingin menghapus panduan ini?',
      action: async () => {
        await faqService.deleteGuide(id);
        showNotification('Panduan berhasil dihapus.');
        loadData();
      }
    };
  }

  function confirmAction() {
    const s = confirmState;
    confirmState = null;
    s?.action();
  }

  const filteredFaqs = $derived(
    faqs.filter((faq) => {
      const matchesSearch =
        faq.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
        faq.answer.toLowerCase().includes(searchQuery.toLowerCase()) ||
        faq.tags.some((t) => t.toLowerCase().includes(searchQuery.toLowerCase()));
      const matchesCat = selectedCategory === 'ALL' || faq.category === selectedCategory;
      const matchesStatus = selectedStatus === 'ALL' || faq.status === selectedStatus;
      return matchesSearch && matchesCat && matchesStatus;
    })
  );
</script>

<div class="space-y-6">
  {#if notification}
    <div class="p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-2xl flex items-center gap-3 shadow-xs">
      <CheckCircle2 class="w-5 h-5 text-emerald-600 shrink-0" />
      <span class="text-sm font-semibold">{notification}</span>
    </div>
  {/if}

  <!-- Top Header & Analytics Summary -->
  {#if analytics}
    <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      <div class="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between">
        <div>
          <span class="text-xs font-bold uppercase tracking-wider text-slate-400">Total FAQ</span>
          <h3 class="text-2xl font-extrabold text-slate-900 mt-1">{analytics.totalFaqs}</h3>
          <span class="text-xs text-emerald-600 font-medium">{analytics.publishedCount} Dipublikasikan</span>
        </div>
        <div class="w-12 h-12 rounded-xl bg-teal-50 text-teal-600 flex items-center justify-center">
          <HelpCircle class="w-6 h-6" />
        </div>
      </div>

      <div class="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between">
        <div>
          <span class="text-xs font-bold uppercase tracking-wider text-slate-400">Total Panduan</span>
          <h3 class="text-2xl font-extrabold text-slate-900 mt-1">{guides.length}</h3>
          <span class="text-xs text-blue-600 font-medium">Knowledge Base Aktif</span>
        </div>
        <div class="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
          <BookOpen class="w-6 h-6" />
        </div>
      </div>

      <div class="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between">
        <div>
          <span class="text-xs font-bold uppercase tracking-wider text-slate-400">Perlu Review (Feedback)</span>
          <h3 class="text-2xl font-extrabold text-slate-900 mt-1">{analytics.needsReviewCount}</h3>
          <span class="text-xs text-rose-600 font-medium">Rating Negatif Tinggi</span>
        </div>
        <div class="w-12 h-12 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center">
          <AlertTriangle class="w-6 h-6" />
        </div>
      </div>

      <div class="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between">
        <div>
          <span class="text-xs font-bold uppercase tracking-wider text-slate-400">Featured FAQ</span>
          <h3 class="text-2xl font-extrabold text-slate-900 mt-1">{analytics.featuredFaqs.length}</h3>
          <span class="text-xs text-amber-600 font-medium">Tampil di Beranda</span>
        </div>
        <div class="w-12 h-12 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
          <Star class="w-6 h-6" />
        </div>
      </div>
    </div>
  {/if}

  <!-- Navigation Tabs -->
  <div class="flex border-b border-slate-200 gap-8 overflow-x-auto">
    <button
      onclick={() => (activeTab = 'faqs')}
      class={`pb-4 font-bold text-sm flex items-center gap-2 border-b-2 transition-colors whitespace-nowrap ${
        activeTab === 'faqs' ? 'border-teal-600 text-teal-700' : 'border-transparent text-slate-500 hover:text-slate-800'
      }`}
    >
      <HelpCircle class="w-4 h-4" /> Kelola FAQ ({faqs.length})
    </button>
    <button
      onclick={() => (activeTab = 'guides')}
      class={`pb-4 font-bold text-sm flex items-center gap-2 border-b-2 transition-colors whitespace-nowrap ${
        activeTab === 'guides' ? 'border-teal-600 text-teal-700' : 'border-transparent text-slate-500 hover:text-slate-800'
      }`}
    >
      <BookOpen class="w-4 h-4" /> Panduan & Knowledge Base ({guides.length})
    </button>
    <button
      onclick={() => (activeTab = 'categories')}
      class={`pb-4 font-bold text-sm flex items-center gap-2 border-b-2 transition-colors whitespace-nowrap ${
        activeTab === 'categories' ? 'border-teal-600 text-teal-700' : 'border-transparent text-slate-500 hover:text-slate-800'
      }`}
    >
      <Layers class="w-4 h-4" /> Kategori & Pengaturan
    </button>
    <button
      onclick={() => (activeTab = 'analytics')}
      class={`pb-4 font-bold text-sm flex items-center gap-2 border-b-2 transition-colors whitespace-nowrap ${
        activeTab === 'analytics' ? 'border-teal-600 text-teal-700' : 'border-transparent text-slate-500 hover:text-slate-800'
      }`}
    >
      <BarChart3 class="w-4 h-4" /> Analitik & Feedback
    </button>
  </div>

  <!-- TAB 1: FAQS -->
  {#if activeTab === 'faqs'}
    <div class="bg-white rounded-3xl border border-slate-200 shadow-xs p-6 space-y-6">
      <div class="flex flex-col md:flex-row items-center justify-between gap-4">
        <div class="flex items-center gap-3 w-full md:w-auto">
          <div class="relative flex-1 md:w-80">
            <Search class="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Cari pertanyaan, jawaban, atau tag..."
              value={searchQuery}
              oninput={(e) => (searchQuery = e.currentTarget.value)}
              class="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-teal-500"
            />
          </div>
          <select
            value={selectedCategory}
            onchange={(e) => (selectedCategory = e.currentTarget.value)}
            class="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-teal-500"
          >
            <option value="ALL">Semua Kategori</option>
            {#each faqCategories as c (c.id)}
              <option value={c.name}>{c.name}</option>
            {/each}
          </select>
          <select
            value={selectedStatus}
            onchange={(e) => (selectedStatus = e.currentTarget.value)}
            class="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-teal-500"
          >
            <option value="ALL">Semua Status</option>
            <option value="Published">Published</option>
            <option value="Unpublished">Unpublished</option>
          </select>
        </div>

        <button
          onclick={() => {
            editingFaq = { category: 'Pendaftaran', status: 'Published', tags: [], order: faqs.length + 1 };
            isFaqModalOpen = true;
          }}
          class="inline-flex items-center gap-2 px-5 py-2.5 bg-teal-600 text-[var(--color-text)] font-bold text-sm rounded-xl hover:bg-teal-700 transition-colors shadow-sm shrink-0"
        >
          <Plus class="w-4 h-4" /> Tambah FAQ Baru
        </button>
      </div>

      <!-- FAQ Table -->
      <div class="overflow-x-auto">
        <table class="w-full text-left border-collapse">
          <thead>
            <tr class="border-b border-slate-200 text-xs font-bold uppercase tracking-wider text-slate-400">
              <th class="py-3 px-4">Pertanyaan & Kategori</th>
              <th class="py-3 px-4">Status & Fitur</th>
              <th class="py-3 px-4">Helpful / Feedback</th>
              <th class="py-3 px-4 text-right">Aksi</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-100 text-sm">
            {#each filteredFaqs as faq (faq.id)}
              <tr class="hover:bg-slate-50/80 transition-colors">
                <td class="py-4 px-4 space-y-1">
                  <div class="flex items-center gap-2">
                    <span class="font-bold text-slate-900">{faq.question}</span>
                    {#if faq.needsReview}
                      <span class="px-2 py-0.5 bg-rose-100 text-rose-700 text-[10px] font-bold rounded-md flex items-center gap-1">
                        <AlertTriangle class="w-3 h-3" /> Needs Review
                      </span>
                    {/if}
                    {#if faq.featured}
                      <span class="px-2 py-0.5 bg-amber-100 text-amber-700 text-[10px] font-bold rounded-md flex items-center gap-1">
                        <Star class="w-3 h-3" /> Featured
                      </span>
                    {/if}
                  </div>
                  <div class="flex items-center gap-3 text-xs text-slate-500">
                    <span class="px-2 py-0.5 bg-teal-50 text-teal-700 rounded-md font-semibold">{faq.category}</span>
                    {#each faq.tags as t (t)}
                      <span class="text-slate-400">#{t}</span>
                    {/each}
                  </div>
                </td>
                <td class="py-4 px-4">
                  <span class={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold ${
                    faq.status === 'Published' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-slate-100 text-slate-600'
                  }`}>
                    {#if faq.status === 'Published'}
                      <Eye class="w-3.5 h-3.5" />
                    {:else}
                      <EyeOff class="w-3.5 h-3.5" />
                    {/if}
                    {faq.status}
                  </span>
                </td>
                <td class="py-4 px-4">
                  <div class="flex items-center gap-4 text-xs font-semibold">
                    <span class="text-emerald-600 flex items-center gap-1"><ThumbsUp class="w-3.5 h-3.5" /> {faq.helpfulCount}</span>
                    <span class="text-rose-600 flex items-center gap-1"><ThumbsDown class="w-3.5 h-3.5" /> {faq.notHelpfulCount}</span>
                  </div>
                </td>
                <td class="py-4 px-4 text-right space-x-2">
                  <button
                    onclick={() => handleTogglePublishFaq(faq)}
                    class="p-2 text-slate-600 hover:text-teal-600 hover:bg-teal-50 rounded-xl transition-colors"
                    title={faq.status === 'Published' ? 'Unpublish' : 'Publish'}
                  >
                    {#if faq.status === 'Published'}
                      <EyeOff class="w-4 h-4" />
                    {:else}
                      <Eye class="w-4 h-4" />
                    {/if}
                  </button>
                  <button
                    onclick={() => {
                      editingFaq = faq;
                      isFaqModalOpen = true;
                    }}
                    class="p-2 text-slate-600 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-colors"
                    title="Edit"
                  >
                    <Edit3 class="w-4 h-4" />
                  </button>
                  <button
                    onclick={() => askDeleteFaq(faq.id)}
                    class="p-2 text-slate-600 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-colors"
                    title="Hapus"
                  >
                    <Trash2 class="w-4 h-4" />
                  </button>
                </td>
              </tr>
            {/each}
            {#if filteredFaqs.length === 0}
              <tr>
                <td colspan={4} class="py-8 text-center text-slate-400">Tidak ada FAQ yang ditemukan.</td>
              </tr>
            {/if}
          </tbody>
        </table>
      </div>
    </div>
  {/if}

  <!-- TAB 2: GUIDES -->
  {#if activeTab === 'guides'}
    <div class="bg-white rounded-3xl border border-slate-200 shadow-xs p-6 space-y-6">
      <div class="flex items-center justify-between">
        <div>
          <h3 class="text-lg font-extrabold text-slate-900">Panduan & Knowledge Base Langkah Demi Langkah</h3>
          <p class="text-xs text-slate-500">Panduan prosedural untuk masyarakat sebelum dan saat berkunjung</p>
        </div>
        <button
          onclick={() => {
            editingGuide = { category: 'Pendaftaran', status: 'Published', steps: [] };
            isGuideModalOpen = true;
          }}
          class="inline-flex items-center gap-2 px-5 py-2.5 bg-teal-600 text-[var(--color-text)] font-bold text-sm rounded-xl hover:bg-teal-700 transition-colors shadow-sm"
        >
          <Plus class="w-4 h-4" /> Tambah Panduan Baru
        </button>
      </div>

      <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
        {#each guides as guide (guide.id)}
          <div class="p-6 rounded-2xl border border-slate-200 bg-slate-50/50 space-y-4 flex flex-col justify-between">
            <div class="space-y-2">
              <div class="flex items-center justify-between">
                <span class="px-2.5 py-1 bg-teal-50 text-teal-700 rounded-lg text-xs font-bold">{guide.category}</span>
                <span class="text-xs font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full">{guide.status}</span>
              </div>
              <h4 class="text-base font-extrabold text-slate-900">{guide.title}</h4>
              <p class="text-xs text-slate-600 line-clamp-2">{guide.summary}</p>
              <div class="text-xs font-semibold text-slate-500 pt-2">
                📋 {guide.steps.length} Langkah Prosedur
              </div>
            </div>
            <div class="flex items-center justify-end gap-2 pt-4 border-t border-slate-200">
              <button
                onclick={() => {
                  editingGuide = guide;
                  isGuideModalOpen = true;
                }}
                class="px-3 py-1.5 bg-white border border-slate-200 text-slate-700 hover:bg-teal-600 hover:text-[var(--color-text)] rounded-xl text-xs font-medium transition-colors shadow-xs"
              >
                Edit Panduan
              </button>
              <button
                onclick={() => askDeleteGuide(guide.id)}
                class="p-1.5 bg-white border border-slate-200 text-rose-600 hover:bg-rose-50 rounded-xl transition-colors shadow-xs"
              >
                <Trash2 class="w-4 h-4" />
              </button>
            </div>
          </div>
        {/each}
      </div>
    </div>
  {/if}

  <!-- TAB 3: CATEGORIES -->
  {#if activeTab === 'categories'}
    <div class="bg-white rounded-3xl border border-slate-200 shadow-xs p-6 space-y-8">
      <div>
        <h3 class="text-lg font-extrabold text-slate-900">Kategori FAQ & Knowledge Base</h3>
        <p class="text-xs text-slate-500">Daftar kategori yang digunakan untuk mengelompokkan pertanyaan dan panduan</p>
      </div>

      <div class="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div class="space-y-4">
          <h4 class="text-sm font-bold text-slate-800 uppercase tracking-wider">Kategori FAQ</h4>
          <div class="space-y-2">
            {#each faqCategories as cat (cat.id)}
              <div class="p-3.5 rounded-xl border border-slate-200 bg-slate-50 flex items-center justify-between">
                <div>
                  <span class="text-sm font-bold text-slate-900 block">{cat.name}</span>
                  <span class="text-xs text-slate-500">{cat.description}</span>
                </div>
                <span class="text-xs font-mono font-semibold text-teal-700 bg-teal-50 px-2.5 py-1 rounded-lg">Urutan: {cat.order}</span>
              </div>
            {/each}
          </div>
        </div>

        <div class="space-y-4">
          <h4 class="text-sm font-bold text-slate-800 uppercase tracking-wider">Kategori Panduan (Knowledge Base)</h4>
          <div class="space-y-2">
            {#each guideCategories as cat (cat.id)}
              <div class="p-3.5 rounded-xl border border-slate-200 bg-slate-50 flex items-center justify-between">
                <div>
                  <span class="text-sm font-bold text-slate-900 block">{cat.name}</span>
                  <span class="text-xs text-slate-500">{cat.description}</span>
                </div>
                <span class="text-xs font-mono font-semibold text-blue-700 bg-blue-50 px-2.5 py-1 rounded-lg">Urutan: {cat.order}</span>
              </div>
            {/each}
          </div>
        </div>
      </div>
    </div>
  {/if}

  <!-- TAB 4: ANALYTICS & FEEDBACK -->
  {#if activeTab === 'analytics' && analytics}
    <div class="space-y-6">
      <div class="bg-white rounded-3xl border border-slate-200 shadow-xs p-6 space-y-6">
        <h3 class="text-lg font-extrabold text-slate-900">Analitik & Evaluasi Pusat Bantuan</h3>

        <div class="grid grid-cols-1 md:grid-cols-2 gap-8">
          <!-- Most Helpful -->
          <div class="space-y-4">
            <h4 class="text-sm font-bold text-emerald-700 flex items-center gap-2">
              <ThumbsUp class="w-4 h-4" /> FAQ Paling Membantu (Helpful Tertinggi)
            </h4>
            <div class="space-y-3">
              {#each analytics.mostHelpful as faq (faq.id)}
                <div class="p-4 rounded-xl border border-slate-200 bg-slate-50/50 flex items-center justify-between gap-4">
                  <div>
                    <span class="text-xs font-semibold text-teal-700">{faq.category}</span>
                    <h5 class="text-sm font-bold text-slate-900">{faq.question}</h5>
                  </div>
                  <span class="px-3 py-1 bg-emerald-100 text-emerald-800 text-xs font-bold rounded-lg shrink-0">
                    👍 {faq.helpfulCount}
                  </span>
                </div>
              {/each}
            </div>
          </div>

          <!-- Most Not Helpful / Needs Review -->
          <div class="space-y-4">
            <h4 class="text-sm font-bold text-rose-700 flex items-center gap-2">
              <AlertTriangle class="w-4 h-4" /> FAQ Perlu Review (Rating "Tidak Membantu" Tinggi)
            </h4>
            <div class="space-y-3">
              {#each analytics.mostNotHelpful.filter((f: FaqEntity) => f.notHelpfulCount > 0) as faq (faq.id)}
                <div class="p-4 rounded-xl border border-rose-200 bg-rose-50/40 flex items-center justify-between gap-4">
                  <div>
                    <div class="flex items-center gap-2">
                      <span class="text-xs font-semibold text-rose-700">{faq.category}</span>
                      {#if faq.needsReview}
                        <span class="px-2 py-0.5 bg-rose-200 text-rose-800 text-[10px] font-bold rounded">Needs Review</span>
                      {/if}
                    </div>
                    <h5 class="text-sm font-bold text-slate-900">{faq.question}</h5>
                  </div>
                  <span class="px-3 py-1 bg-rose-100 text-rose-800 text-xs font-bold rounded-lg shrink-0">
                    👎 {faq.notHelpfulCount}
                  </span>
                </div>
              {/each}
              {#if analytics.mostNotHelpful.filter((f: FaqEntity) => f.notHelpfulCount > 0).length === 0}
                <p class="text-sm text-slate-400 p-4 bg-slate-50 rounded-xl text-center">Belum ada laporan tidak membantu.</p>
              {/if}
            </div>
          </div>
        </div>
      </div>
    </div>
  {/if}
</div>

<!-- FAQ EDIT / CREATE MODAL -->
<Modal
  isOpen={isFaqModalOpen && editingFaq !== null}
  onClose={() => (isFaqModalOpen = false)}
  title={editingFaq?.id ? 'Edit FAQ' : 'Tambah FAQ Baru'}
  size="lg"
>
  {#snippet footer()}
    <button
      type="button"
      onclick={() => (isFaqModalOpen = false)}
      class="px-6 py-2.5 bg-slate-100 text-slate-700 font-bold text-sm rounded-xl hover:bg-slate-200 transition-colors"
    >
      Batal
    </button>
    <button
      type="submit"
      form="faq-form"
      class="px-6 py-2.5 bg-teal-600 text-[var(--color-text)] font-bold text-sm rounded-xl hover:bg-teal-700 transition-colors shadow-sm"
    >
      Simpan FAQ
    </button>
  {/snippet}

  {#if editingFaq}
    <form id="faq-form" onsubmit={handleSaveFaq} class="space-y-4">
      <div>
        <label class="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">Pertanyaan</label>
        <input
          type="text"
          required
          value={editingFaq.question ?? ''}
          oninput={(e) => updateFaq({ question: e.currentTarget.value })}
          placeholder="Contoh: Bagaimana cara mendaftar poli?"
          class="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-teal-500"
        />
      </div>

      <div>
        <label class="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">Jawaban</label>
        <textarea
          rows={4}
          required
          value={editingFaq.answer ?? ''}
          oninput={(e) => updateFaq({ answer: e.currentTarget.value })}
          placeholder="Tuliskan jawaban singkat dan jelas..."
          class="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-teal-500"
        ></textarea>
      </div>

      <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label class="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">Kategori</label>
          <select
            value={editingFaq.category ?? 'Pendaftaran'}
            onchange={(e) => updateFaq({ category: e.currentTarget.value })}
            class="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-teal-500"
          >
            {#each faqCategories as c (c.id)}
              <option value={c.name}>{c.name}</option>
            {/each}
          </select>
        </div>

        <div>
          <label class="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">Status</label>
          <select
            value={editingFaq.status ?? 'Published'}
            onchange={(e) => updateFaq({ status: e.currentTarget.value as ContentStatus })}
            class="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-teal-500"
          >
            <option value="Published">Published</option>
            <option value="Unpublished">Unpublished</option>
            <option value="Draft">Draft</option>
          </select>
        </div>
      </div>

      <div>
        <label class="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">Tag (pisahkan dengan koma)</label>
        <input
          type="text"
          value={editingFaq.tags ? editingFaq.tags.join(', ') : ''}
          oninput={(e) => updateFaq({ tags: e.currentTarget.value.split(',').map((s) => s.trim()).filter(Boolean) })}
          placeholder="pendaftaran, bpjs, poli"
          class="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-teal-500"
        />
      </div>

      <div class="flex items-center gap-6 pt-2">
        <label class="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={editingFaq.featured || false}
            onchange={(e) => updateFaq({ featured: e.currentTarget.checked })}
            class="w-4 h-4 text-teal-600 rounded border-slate-300 focus:ring-teal-500"
          />
          <span class="text-sm font-semibold text-slate-700">Tampilkan sebagai Featured (Beranda)</span>
        </label>
      </div>
    </form>
  {/if}
</Modal>

<!-- GUIDE EDIT / CREATE MODAL -->
<Modal
  isOpen={isGuideModalOpen && editingGuide !== null}
  onClose={() => (isGuideModalOpen = false)}
  title={editingGuide?.id ? 'Edit Panduan Knowledge Base' : 'Tambah Panduan Baru'}
  size="lg"
>
  {#snippet footer()}
    <button
      type="button"
      onclick={() => (isGuideModalOpen = false)}
      class="px-6 py-2.5 bg-slate-100 text-slate-700 font-bold text-sm rounded-xl hover:bg-slate-200 transition-colors"
    >
      Batal
    </button>
    <button
      type="submit"
      form="guide-form"
      class="px-6 py-2.5 bg-teal-600 text-[var(--color-text)] font-bold text-sm rounded-xl hover:bg-teal-700 transition-colors shadow-sm"
    >
      Simpan Panduan
    </button>
  {/snippet}

  {#if editingGuide}
    <form id="guide-form" onsubmit={handleSaveGuide} class="space-y-4">
      <div>
        <label class="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">Judul Panduan</label>
        <input
          type="text"
          required
          value={editingGuide.title ?? ''}
          oninput={(e) => updateGuide({ title: e.currentTarget.value })}
          placeholder="Contoh: Panduan Pendaftaran Antrean Online"
          class="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-teal-500"
        />
      </div>

      <div>
        <label class="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">Ringkasan</label>
        <textarea
          rows={2}
          required
          value={editingGuide.summary ?? ''}
          oninput={(e) => updateGuide({ summary: e.currentTarget.value })}
          placeholder="Ringkasan singkat panduan..."
          class="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-teal-500"
        ></textarea>
      </div>

      <div>
        <label class="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">Kategori</label>
        <select
          value={editingGuide.category ?? 'Pendaftaran'}
          onchange={(e) => updateGuide({ category: e.currentTarget.value })}
          class="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-teal-500"
        >
          {#each guideCategories as c (c.id)}
            <option value={c.name}>{c.name}</option>
          {/each}
        </select>
      </div>

      <!-- Steps builder -->
      <div class="space-y-3 pt-2">
        <div class="flex items-center justify-between">
          <label class="text-xs font-bold uppercase tracking-wider text-slate-500">Langkah-langkah (Step-by-Step)</label>
          <button
            type="button"
            onclick={addGuideStep}
            class="px-3 py-1 bg-teal-50 text-teal-700 text-xs font-bold rounded-lg hover:bg-teal-100 transition-colors"
          >
            + Tambah Step
          </button>
        </div>

        <div class="space-y-3">
          {#each editingGuide.steps || [] as step, idx (step.id || idx)}
            <div class="p-4 rounded-xl border border-slate-200 bg-slate-50 space-y-3 relative">
              <div class="flex items-center justify-between">
                <span class="text-xs font-bold text-teal-700">Langkah #{idx + 1}</span>
                <button
                  type="button"
                  onclick={() => removeGuideStep(idx)}
                  class="text-rose-600 hover:text-rose-800 text-xs font-semibold"
                >
                  Hapus Step
                </button>
              </div>
              <input
                type="text"
                placeholder="Judul Langkah (Contoh: Buka Menu Pendaftaran)"
                value={step.title}
                oninput={(e) => updateGuideStep(idx, { title: e.currentTarget.value })}
                class="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs"
              />
              <textarea
                rows={2}
                placeholder="Deskripsi langkah..."
                value={step.description}
                oninput={(e) => updateGuideStep(idx, { description: e.currentTarget.value })}
                class="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs"
              ></textarea>
            </div>
          {/each}
        </div>
      </div>
    </form>
  {/if}
</Modal>

<ConfirmModal
  isOpen={confirmState !== null}
  onClose={() => (confirmState = null)}
  onConfirm={confirmAction}
  title={confirmState?.title ?? 'Konfirmasi'}
  message={confirmState?.message ?? ''}
  confirmLabel="Ya, Hapus"
/>
