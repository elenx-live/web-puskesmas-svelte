<!-- @component Halaman publik Pusat Bantuan: FAQ + Panduan & Prosedur (dari PublicFaqPage). -->
<script lang="ts">
  import { faqService } from '../../shared/services/faqService.js';
  import { debounce } from '../../shared/utils/debounce.js';
  import type { FaqEntity, GuideEntity, FaqCategory, GuideCategory } from '../../shared/types/index.js';
  import {
    HelpCircle, Search, ChevronDown, ThumbsUp, ThumbsDown, BookOpen,
    Building2, FileText, MessageSquare, ArrowRight, CheckCircle2
  } from 'lucide-svelte';

  let faqs = $state<FaqEntity[]>([]);
  let guides = $state<GuideEntity[]>([]);
  let faqCategories = $state<FaqCategory[]>([]);
  let guideCategories = $state<GuideCategory[]>([]);
  let loading = $state(true);

  // Search & Filter
  let searchQuery = $state('');
  let selectedCategory = $state('ALL');
  let activeTab = $state<'faq' | 'guides'>('faq');

  // Search di-debounce 300ms: filter lokal hanya jalan setelah pengguna berhenti mengetik.
  let searchDebounced = $state('');
  const applySearchDebounced = debounce((v: string) => { searchDebounced = v; }, 300);
  $effect(() => {
    applySearchDebounced(searchQuery);
    return () => applySearchDebounced.cancel();
  });

  // Expanded FAQ IDs
  let expandedFaqId = $state<string | null>(null);

  // Voted FAQ IDs tracker
  let votedFaqs = $state<{ [id: string]: boolean }>({});
  let voteMsg = $state('');

  const filteredFaqs = $derived(faqs.filter(faq => {
    const query = searchDebounced.toLowerCase();
    const matchesSearch =
      faq.question.toLowerCase().includes(query) ||
      faq.answer.toLowerCase().includes(query) ||
      faq.tags.some(t => t.toLowerCase().includes(query));
    const matchesCategory = selectedCategory === 'ALL' || faq.category === selectedCategory;
    return matchesSearch && matchesCategory;
  }));

  const filteredGuides = $derived(guides.filter(guide => {
    const query = searchDebounced.toLowerCase();
    const matchesSearch =
      guide.title.toLowerCase().includes(query) ||
      guide.summary.toLowerCase().includes(query);
    const matchesCategory = selectedCategory === 'ALL' || guide.category === selectedCategory;
    return matchesSearch && matchesCategory;
  }));

  $effect(() => {
    let cancelled = false;
    async function load() {
      loading = true;
      try {
        const [fData, gData, fcData, gcData] = await Promise.all([
          faqService.getFaqs(),
          faqService.getGuides(),
          faqService.getFaqCategories(),
          faqService.getGuideCategories()
        ]);
        if (cancelled) return;
        faqs = fData.filter(f => f.status === 'Published');
        guides = gData.filter(g => g.status === 'Published');
        faqCategories = fcData;
        guideCategories = gcData;
      } catch (e) {
        console.error(e);
      } finally {
        if (!cancelled) loading = false;
      }
    }
    load();
    return () => { cancelled = true; };
  });

  async function handleVote(id: string, isHelpful: boolean) {
    if (votedFaqs[id]) return;
    try {
      const updatedCounts = await faqService.voteFaq(id, isHelpful);
      faqs = faqs.map(f => f.id === id ? { ...f, ...updatedCounts } : f);
      votedFaqs = { ...votedFaqs, [id]: true };
      voteMsg = 'Terima kasih atas feedback Anda!';
      setTimeout(() => voteMsg = '', 3000);
    } catch (e) {
      console.error(e);
    }
  }
</script>

{#if loading}
  <div class="min-h-screen bg-slate-50 flex items-center justify-center text-slate-500">
    Memuat Pusat Bantuan & FAQ Masyarakat...
  </div>
{:else}
  <div class="min-h-screen bg-slate-50 text-slate-900 pb-20">
    <!-- Hero Header -->
    <div class="bg-gradient-to-r from-teal-800 to-teal-950 text-[var(--color-text)] py-16 px-4 relative overflow-hidden">
      <div class="absolute inset-0 opacity-10 bg-[radial-gradient(var(--color-text)_1px,transparent_1px)] opacity-[0.05] [background-size:16px_16px]"></div>
      <div class="max-w-4xl mx-auto text-center relative z-10 space-y-6">
        <div class="inline-flex items-center gap-2 px-3.5 py-1.5 bg-teal-700/60 text-teal-100 rounded-full text-xs font-semibold uppercase tracking-wider backdrop-blur-xs">
          <HelpCircle class="w-4 h-4" /> Pusat Bantuan & Knowledge Base
        </div>
        <h1 class="text-3xl md:text-5xl font-extrabold tracking-tight">
          Bagaimana Kami Dapat Membantu Anda?
        </h1>
        <p class="text-teal-100 text-base md:text-lg max-w-2xl mx-auto">
          Temukan jawaban cepat seputar prosedur pendaftaran, jadwal layanan, persyaratan, dan panduan kesehatan Puskesmas.
        </p>

        <!-- Search Bar -->
        <div class="relative max-w-2xl mx-auto pt-2">
          <Search class="w-5 h-5 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2" />
          <input aria-label="Cari pertanyaan, layanan, atau panduan (Contoh: BPJS, Poli Umum, Jam Buka)..."
            type="text"
            placeholder="Cari pertanyaan, layanan, atau panduan (Contoh: BPJS, Poli Umum, Jam Buka)..."
            value={searchQuery}
            oninput={(e) => searchQuery = e.currentTarget.value}
            class="w-full pl-12 pr-4 py-4 bg-white text-slate-900 rounded-2xl shadow-lg border-0 text-sm md:text-base focus:outline-none focus:ring-4 focus:ring-teal-500/30"
          />
        </div>
      </div>
    </div>

    <div class="max-w-7xl mx-auto px-4 mt-8 space-y-8">
      {#if voteMsg}
        <div class="p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-2xl flex items-center gap-3 shadow-xs max-w-xl mx-auto">
          <CheckCircle2 class="w-5 h-5 text-emerald-600 shrink-0" />
          <span class="text-sm font-semibold">{voteMsg}</span>
        </div>
      {/if}

      <!-- Navigation & Mode Toggle -->
      <div class="flex flex-col md:flex-row items-center justify-between gap-4 border-b border-slate-200 pb-4">
        <div class="flex gap-4">
          <button
            onclick={() => activeTab = 'faq'}
            class={`px-5 py-2.5 rounded-2xl font-bold text-sm transition-all flex items-center gap-2 ${
              activeTab === 'faq' ? 'bg-teal-600 text-[var(--color-text)] shadow-md' : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
            }`}
          >
            <HelpCircle class="w-4 h-4" /> Tanya Jawab (FAQ)
          </button>
          <button
            onclick={() => activeTab = 'guides'}
            class={`px-5 py-2.5 rounded-2xl font-bold text-sm transition-all flex items-center gap-2 ${
              activeTab === 'guides' ? 'bg-teal-600 text-[var(--color-text)] shadow-md' : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
            }`}
          >
            <BookOpen class="w-4 h-4" /> Panduan & Prosedur (Guides)
          </button>
        </div>

        <!-- Category Filter Pills -->
        <div class="flex items-center gap-2 overflow-x-auto w-full md:w-auto pb-2 md:pb-0">
          <button
            onclick={() => selectedCategory = 'ALL'}
            class={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 ${
              selectedCategory === 'ALL' ? 'bg-teal-800 text-[var(--color-text)]' : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
            }`}
          >
            Semua Kategori
          </button>
          {#each (activeTab === 'faq' ? faqCategories : guideCategories) as cat (cat.id)}
            <button
              onclick={() => selectedCategory = cat.name}
              class={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 ${
                selectedCategory === cat.name ? 'bg-teal-800 text-[var(--color-text)]' : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
              }`}
            >
              {cat.name}
            </button>
          {/each}
        </div>
      </div>

      <!-- TAB CONTENT: FAQ -->
      {#if activeTab === 'faq'}
        <div class="space-y-4 max-w-4xl mx-auto">
          {#each filteredFaqs as faq (faq.id)}
            {@const isExpanded = expandedFaqId === faq.id}
            <div
              class="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden transition-all hover:border-teal-500"
            >
              <button
                onclick={() => expandedFaqId = isExpanded ? null : faq.id}
                class="w-full p-6 text-left flex items-center justify-between gap-4 focus:outline-none"
              >
                <div class="space-y-1">
                  <span class="inline-block px-2.5 py-0.5 bg-teal-50 text-teal-700 text-[10px] font-bold uppercase tracking-wider rounded-md">
                    {faq.category}
                  </span>
                  <h3 class="text-base md:text-lg font-bold text-slate-900">{faq.question}</h3>
                </div>
                <div class={`w-8 h-8 rounded-full bg-slate-50 flex items-center justify-center text-slate-500 shrink-0 transition-transform ${
                  isExpanded ? 'rotate-180 bg-teal-50 text-teal-700' : ''
                }`}>
                  <ChevronDown class="w-5 h-5" />
                </div>
              </button>

              {#if isExpanded}
                <div class="px-6 pb-6 pt-0 border-t border-slate-100 space-y-6">
                  <div class="text-slate-700 text-sm md:text-base leading-relaxed pt-4">
                    {faq.answer}
                  </div>

                  <!-- Related links / Service / Contact source of truth -->
                  <div class="flex flex-wrap items-center gap-3 pt-2">
                    {#if faq.category === 'Jadwal'}
                      <a
                        href="#/kontak"
                        class="inline-flex items-center gap-1.5 px-4 py-2 bg-teal-50 text-teal-700 hover:bg-teal-100 rounded-xl text-xs font-bold transition-colors"
                      >
                        <Building2 class="w-4 h-4" /> Lihat Jam Operasional Resmi <ArrowRight class="w-3.5 h-3.5" />
                      </a>
                    {/if}
                    {#if faq.category === 'Pengaduan'}
                      <a
                        href="#/pengaduan"
                        class="inline-flex items-center gap-1.5 px-4 py-2 bg-rose-50 text-rose-700 hover:bg-rose-100 rounded-xl text-xs font-bold transition-colors"
                      >
                        <MessageSquare class="w-4 h-4" /> Buka Halaman Pengaduan <ArrowRight class="w-3.5 h-3.5" />
                      </a>
                    {/if}
                    {#if faq.category === 'Pendaftaran'}
                      <a
                        href="#/pendaftaran"
                        class="inline-flex items-center gap-1.5 px-4 py-2 bg-blue-50 text-blue-700 hover:bg-blue-100 rounded-xl text-xs font-bold transition-colors"
                      >
                        <FileText class="w-4 h-4" /> Menu Pendaftaran Online <ArrowRight class="w-3.5 h-3.5" />
                      </a>
                    {/if}
                  </div>

                  <!-- Feedback section -->
                  <div class="pt-4 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs">
                    <span class="font-semibold text-slate-500">Apakah jawaban ini membantu?</span>
                    <div class="flex items-center gap-3">
                      <button
                        onclick={() => handleVote(faq.id, true)}
                        disabled={votedFaqs[faq.id]}
                        class="inline-flex items-center gap-1.5 px-4 py-2 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 font-bold rounded-xl transition-colors disabled:opacity-50"
                      >
                        <ThumbsUp class="w-4 h-4" /> Ya ({faq.helpfulCount})
                      </button>
                      <button
                        onclick={() => handleVote(faq.id, false)}
                        disabled={votedFaqs[faq.id]}
                        class="inline-flex items-center gap-1.5 px-4 py-2 bg-rose-50 text-rose-700 hover:bg-rose-100 font-bold rounded-xl transition-colors disabled:opacity-50"
                      >
                        <ThumbsDown class="w-4 h-4" /> Tidak ({faq.notHelpfulCount})
                      </button>
                    </div>
                  </div>
                </div>
              {/if}
            </div>
          {/each}
          {#if filteredFaqs.length === 0}
            <div class="text-center py-16 bg-white rounded-3xl border border-slate-200 space-y-3">
              <HelpCircle class="w-12 h-12 text-slate-300 mx-auto" />
              <h3 class="text-base font-bold text-slate-700">Tidak ada pertanyaan yang sesuai</h3>
              <p class="text-xs text-slate-500">Coba gunakan kata kunci lain atau hubungi layanan kontak resmi kami.</p>
            </div>
          {/if}
        </div>
      {/if}

      <!-- TAB CONTENT: GUIDES -->
      {#if activeTab === 'guides'}
        <div class="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-6xl mx-auto">
          {#each filteredGuides as guide (guide.id)}
            <div class="bg-white p-8 rounded-3xl border border-slate-200 shadow-xs space-y-6 flex flex-col justify-between">
              <div class="space-y-4">
                <div class="flex items-center justify-between">
                  <span class="px-3 py-1 bg-teal-50 text-teal-700 rounded-lg text-xs font-bold">{guide.category}</span>
                  <span class="text-xs font-semibold text-slate-400">📋 {guide.steps.length} Langkah</span>
                </div>
                <div>
                  <h3 class="text-xl font-extrabold text-slate-900">{guide.title}</h3>
                  <p class="text-slate-600 text-sm mt-2 leading-relaxed">{guide.summary}</p>
                </div>

                <!-- Step List -->
                <div class="space-y-3 pt-4 border-t border-slate-100">
                  {#each guide.steps as step (step.id)}
                    <div class="flex items-start gap-3 p-3 bg-slate-50 rounded-2xl border border-slate-200/60">
                      <div class="w-6 h-6 rounded-full bg-teal-600 text-[var(--color-text)] flex items-center justify-center text-xs font-bold shrink-0 mt-0.5">
                        {step.stepNumber}
                      </div>
                      <div class="space-y-0.5">
                        <h4 class="text-xs font-bold text-slate-900">{step.title}</h4>
                        <p class="text-xs text-slate-600 leading-relaxed">{step.description}</p>
                      </div>
                    </div>
                  {/each}
                </div>
              </div>

              <div class="pt-4 border-t border-slate-100 flex items-center justify-between">
                <span class="text-[10px] text-slate-400">Puskesmas Knowledge Base</span>
                <a
                  href="#/kontak"
                  class="inline-flex items-center gap-1.5 text-xs font-bold text-teal-700 hover:text-teal-800"
                >
                  Butuh Bantuan? Hubungi Kami <ArrowRight class="w-3.5 h-3.5" />
                </a>
              </div>
            </div>
          {/each}
          {#if filteredGuides.length === 0}
            <div class="col-span-2 text-center py-16 bg-white rounded-3xl border border-slate-200 space-y-3">
              <BookOpen class="w-12 h-12 text-slate-300 mx-auto" />
              <h3 class="text-base font-bold text-slate-700">Tidak ada panduan yang ditemukan</h3>
            </div>
          {/if}
        </div>
      {/if}
    </div>
  </div>
{/if}
