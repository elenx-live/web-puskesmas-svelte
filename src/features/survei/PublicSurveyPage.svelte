<!-- @component Kuesioner survei publik — menerima prop `id` (slug survei dari rute /survei/:id); mendukung verifikasi kode registrasi, rating/multiple_choice/teks, dan privasi anonim. -->
<script lang="ts">
  import { surveyService } from '../../shared/services/surveyService.js';
  import type { SurveyEntity, SurveyAnswer } from '../../shared/types/index.js';
  import Card from '../../shared/ui/Card.svelte';
  import Badge from '../../shared/ui/Badge.svelte';
  import { ArrowLeft, Send, CheckCircle2, AlertCircle, User } from 'lucide-svelte';

  interface Props {
    /** Slug survei dari rute /survei/:id. */
    id: string;
  }

  const { id = '' }: Props = $props();

  let survey = $state<SurveyEntity | null>(null);
  let loading = $state(true);
  let error = $state<string | null>(null);

  // Form States
  let answers = $state<SurveyAnswer[]>([]);
  let saran = $state('');
  let isAnonymous = $state(true);
  let registrationCode = $state('');
  let isRegVerified = $state(false);
  let verifyingReg = $state(false);
  let regError = $state<string | null>(null);

  // Submission States
  let submitting = $state(false);
  let success = $state(false);

  $effect(() => {
    const slug = id;
    if (!slug) {
      error = 'Tautan survei tidak lengkap atau tidak valid.';
      loading = false;
      return;
    }

    loading = true;
    error = null;

    surveyService
      .getSurveyBySlug(slug)
      .then((data) => {
        if (!data) {
          error = 'Kuesioner survei kepuasan tidak ditemukan atau sudah tidak aktif.';
        } else {
          survey = data;
          // Initialize empty answers
          answers = data.questions.map((q) => ({ questionId: q.id, answer: '' }));
        }
        loading = false;
      })
      .catch((err) => {
        console.error('Gagal memuat detail kuesioner:', err);
        error = 'Terjadi kesalahan koneksi sistem saat memuat survei.';
        loading = false;
      });
  });

  function handleSelectRating(qId: string, value: number) {
    answers = answers.map((ans) => (ans.questionId === qId ? { ...ans, answer: value } : ans));
  }

  function handleSelectChoice(qId: string, value: string) {
    answers = answers.map((ans) => (ans.questionId === qId ? { ...ans, answer: value } : ans));
  }

  function handleTextChange(qId: string, value: string) {
    answers = answers.map((ans) => (ans.questionId === qId ? { ...ans, answer: value } : ans));
  }

  async function verifyRegistration() {
    if (!registrationCode.trim()) {
      regError = 'Masukkan kode registrasi pelayanan Anda.';
      return;
    }

    verifyingReg = true;
    regError = null;

    try {
      // Direct call to registrationService or checking local registrations via API mock pattern
      const dataStr = localStorage.getItem('puskesmas_online_registrations');
      const registrations = dataStr ? JSON.parse(dataStr) : [];
      const matched = registrations.find(
        (r: { registrationNumber: string }) => r.registrationNumber === registrationCode.trim().toUpperCase(),
      );

      if (matched) {
        isRegVerified = true;
        // Pre-fill anonymity context preference if they want
        isAnonymous = false; // Default false if code verified, they can still toggle it
      } else {
        regError = 'Kode registrasi tidak terdaftar di database pelayanan Puskesmas.';
      }
    } catch {
      regError = 'Gagal memverifikasi kode. Silakan coba lagi.';
    } finally {
      verifyingReg = false;
    }
  }

  async function handleSubmit(e: SubmitEvent) {
    e.preventDefault();
    if (!survey) return;

    submitting = true;
    error = null;

    // Validate if registration binding is mandatory
    if (survey.isLinkedToRegistration && !isRegVerified) {
      error = 'Kuesioner ini mewajibkan verifikasi kode pendaftaran pelayanan.';
      submitting = false;
      return;
    }

    try {
      // Filter out empty optional answers so service doesn't complain
      const cleanAnswers = answers.filter((ans) => ans.answer !== '');

      await surveyService.submitResponse({
        surveyId: survey.id,
        answers: cleanAnswers,
        saran: saran.trim(),
        isAnonymous,
        registrationCode: survey.isLinkedToRegistration ? registrationCode.toUpperCase().trim() : undefined,
      });

      success = true;
    } catch (err) {
      console.error(err);
      error = (err as Error).message || 'Terjadi kegagalan saat mengirim tanggapan Anda.';
    } finally {
      submitting = false;
    }
  }

  const ratingColors: Record<number, string> = {
    1: 'hover:bg-red-500/10 hover:text-red-400 border-red-500/20 text-[var(--color-muted-foreground)] bg-[var(--color-bg)]',
    2: 'hover:bg-orange-500/10 hover:text-orange-400 border-orange-500/20 text-[var(--color-muted-foreground)] bg-[var(--color-bg)]',
    3: 'hover:bg-yellow-500/10 hover:text-yellow-400 border-yellow-500/20 text-[var(--color-muted-foreground)] bg-[var(--color-bg)]',
    4: 'hover:bg-[var(--color-primary)]/10 hover:text-[var(--color-primary)] border-[var(--color-primary)]/20 text-[var(--color-muted-foreground)] bg-[var(--color-bg)]',
  };

  const ratingActiveColors: Record<number, string> = {
    1: 'bg-red-500 text-[var(--color-primary-foreground)] border-red-500 scale-105 shadow-lg shadow-red-500/10',
    2: 'bg-orange-500 text-[var(--color-primary-foreground)] border-orange-500 scale-105 shadow-lg shadow-orange-500/10',
    3: 'bg-yellow-500 text-[var(--color-primary-foreground)] border-yellow-500 scale-105 shadow-lg shadow-yellow-500/10',
    4: 'bg-[var(--color-primary)] text-[var(--color-primary-foreground)] border-[var(--color-primary)] scale-105 shadow-lg shadow-emerald-500/10',
  };
</script>

{#if loading}
  <div class="flex flex-col items-center justify-center py-40 space-y-4">
    <div class="w-12 h-12 border-4 border-[var(--color-primary)] border-t-transparent rounded-full animate-spin"></div>
    <span class="text-sm text-[var(--color-muted-foreground)]">Menyiapkan kuesioner kuesioner...</span>
  </div>
{:else if error && !survey}
  <div class="py-20 px-6 max-w-md mx-auto text-center space-y-6">
    <div class="w-16 h-16 bg-red-500/10 text-red-500 rounded-2xl flex items-center justify-center mx-auto">
      <AlertCircle class="w-8 h-8" />
    </div>
    <div>
      <h1 class="text-xl font-bold text-[var(--color-text)]">Terjadi Kendala</h1>
      <p class="text-xs text-[var(--color-muted-foreground)] mt-2">{error}</p>
    </div>
    <a
      href="#/survei"
      class="inline-flex items-center gap-1.5 px-4 py-2.5 bg-[var(--color-card)] hover:bg-[var(--color-card)] text-[var(--color-text)] text-xs font-semibold rounded-xl border border-[var(--color-border)] transition"
    >
      <ArrowLeft class="w-4 h-4" />
      <span>Kembali ke Daftar Survei</span>
    </a>
  </div>
{:else if success && survey}
  <div class="py-20 px-6 max-w-lg mx-auto text-center space-y-8">
    <div class="w-20 h-20 bg-[var(--color-primary)]/10 text-[var(--color-primary)] rounded-3xl flex items-center justify-center mx-auto border border-[var(--color-primary)]/20 shadow-lg shadow-emerald-500/5 animate-pulse">
      <CheckCircle2 class="w-10 h-10" />
    </div>
    <div class="space-y-3">
      <h1 class="text-2xl font-bold text-[var(--color-text)]">Tanggapan Berhasil Dikirim!</h1>
      <p class="text-xs text-[var(--color-muted-foreground)] leading-relaxed max-w-sm mx-auto">
        Terima kasih banyak atas partisipasi Anda dalam survei <span class="text-[var(--color-text)] font-bold">{survey.title}</span>. Masukan Anda langsung kami catat untuk bahan rapat perbaikan kualitas layanan Puskesmas.
      </p>
    </div>
    <div class="flex justify-center gap-3">
      <a
        href="#/survei"
        class="px-5 py-2.5 bg-[var(--color-card)] hover:bg-[var(--color-card)] text-[var(--color-text)] text-xs font-bold rounded-xl border border-[var(--color-border)] transition"
      >
        Lihat Survei Lain
      </a>
      <a
        href="#/"
        class="px-5 py-2.5 bg-[var(--color-primary)] hover:bg-amber-600 text-[var(--color-primary-foreground)] text-xs font-bold rounded-xl transition"
      >
        Kembali ke Beranda
      </a>
    </div>
  </div>
{:else}
  <div class="py-12 px-6 max-w-3xl mx-auto w-full flex-1">

    <!-- Navigation Breadcrumb -->
    <div class="mb-8">
      <a
        href="#/survei"
        class="inline-flex items-center gap-1.5 text-[var(--color-muted-foreground)] hover:text-[var(--color-primary)] text-xs font-semibold transition"
      >
        <ArrowLeft class="w-4 h-4" />
        <span>Daftar Survei Kepuasan</span>
      </a>
    </div>

    <!-- Survey Introduction Card -->
    <div class="space-y-6 mb-8">
      <div class="space-y-3">
        <div class="flex items-center gap-2 flex-wrap">
          <Badge variant="amber">Kuesioner Resmi</Badge>
          <Badge variant="zinc">Versi {survey?.version}</Badge>
        </div>
        <h1 class="text-2xl md:text-3xl font-bold text-[var(--color-text)] tracking-tight">
          {survey?.title}
        </h1>
        <p class="text-xs text-[var(--color-muted-foreground)] leading-relaxed">
          {survey?.description}
        </p>
      </div>
    </div>

    <!-- Error Alert inside form context -->
    {#if error}
      <div class="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-2xl flex items-start gap-3 text-red-400">
        <AlertCircle class="w-5 h-5 shrink-0 mt-0.5" />
        <div class="text-xs font-semibold">{error}</div>
      </div>
    {/if}

    <!-- Main Questionnaire Form -->
    <form onsubmit={handleSubmit} class="space-y-6">

      <!-- Section 1: Registration Code Requirement -->
      {#if survey?.isLinkedToRegistration}
        <Card class="p-6 border border-[var(--color-primary)]/20 bg-[var(--color-primary)]/5 space-y-4 rounded-3xl">
          <div class="flex items-start gap-3">
            <div class="p-2 bg-[var(--color-primary)]/10 text-[var(--color-primary)] rounded-xl">
              <User class="w-5 h-5" />
            </div>
            <div>
              <h3 class="text-sm font-bold text-[var(--color-text)]">Koneksi Pendaftaran Pelayanan</h3>
              <p class="text-[11px] text-[var(--color-muted-foreground)] mt-1">Kuesioner ini memerlukan kode verifikasi pelayanan untuk menjamin validitas dan mencegah manipulasi pengisian massal.</p>
            </div>
          </div>

          <div class="flex gap-2">
            <div class="relative flex-1">
              <input
                type="text"
                disabled={isRegVerified}
                placeholder="Contoh: PSM-2026-000001"
                value={registrationCode}
                oninput={(e) => { registrationCode = (e.currentTarget as HTMLInputElement).value; }}
                class="w-full uppercase bg-[var(--color-bg)] border border-[var(--color-border)] focus:border-[var(--color-primary)]/70 focus:outline-none focus:ring-1 focus:ring-[var(--color-primary)] rounded-xl px-4 py-2.5 text-xs text-[var(--color-text)] uppercase placeholder-zinc-600 disabled:opacity-60"
              />
            </div>
            {#if !isRegVerified}
              <button
                type="button"
                onclick={verifyRegistration}
                disabled={verifyingReg}
                class="px-4 py-2.5 bg-[var(--color-primary)] hover:bg-amber-600 disabled:opacity-50 text-[var(--color-primary-foreground)] text-xs font-bold rounded-xl transition shrink-0"
              >
                {verifyingReg ? 'Memeriksa...' : 'Verifikasi'}
              </button>
            {:else}
              <Badge variant="emerald">
                <span class="flex items-center gap-1">
                  <CheckCircle2 class="w-3.5 h-3.5" />
                  <span>Terverifikasi</span>
                </span>
              </Badge>
            {/if}
          </div>

          {#if regError}
            <p class="text-[11px] text-red-400 font-semibold">{regError}</p>
          {/if}
        </Card>
      {/if}

      <!-- Survey Questions -->
      {#if !survey?.isLinkedToRegistration || isRegVerified}
        <div class="space-y-6">

          <!-- Question list -->
          {#each survey?.questions ?? [] as q, qIdx (q.id)}
            {@const currentAns = answers.find((a) => a.questionId === q.id)}
            {@const isAnswered = currentAns && currentAns.answer !== ''}
            <Card class={`p-6 border transition-all rounded-3xl ${
              isAnswered ? 'border-[var(--color-border)] bg-[var(--color-card)]/30' : 'border-[var(--color-border)]'
            }`}>
              <div class="space-y-4">
                <!-- Question Label -->
                <div class="flex items-start justify-between gap-4">
                  <div class="space-y-1">
                    <span class="text-[10px] text-[var(--color-primary)] font-mono font-bold uppercase tracking-wider block">Pertanyaan {qIdx + 1}</span>
                    <h3 class="text-sm font-bold text-[var(--color-text)] leading-relaxed">{q.text}</h3>
                  </div>
                  {#if q.required}
                    <Badge variant="amber" size="sm">Wajib</Badge>
                  {/if}
                </div>

                <!-- Answer Choices Router -->
                {#if q.type === 'rating'}
                  <div class="space-y-3">
                    <!-- Rating Circles 1 - 4 -->
                    <div class="flex items-center justify-between max-w-md mx-auto py-2">
                      {#each [1, 2, 3, 4] as num (num)}
                        {@const isSelected = currentAns?.answer === num}
                        <button
                          type="button"
                          onclick={() => handleSelectRating(q.id, num)}
                          class={`w-12 h-12 rounded-2xl border text-base font-extrabold transition flex items-center justify-center ${
                            isSelected ? ratingActiveColors[num] : ratingColors[num]
                          }`}
                        >
                          {num}
                        </button>
                      {/each}
                    </div>

                    <!-- Scale Labels description -->
                    <div class="flex justify-between text-[10px] text-[var(--color-muted-foreground)] font-medium px-1">
                      <span>1 - Sangat Tidak Puas</span>
                      <span>4 - Sangat Puas</span>
                    </div>
                  </div>
                {/if}

                {#if q.type === 'multiple_choice' && q.options}
                  <div class="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {#each q.options as opt (opt)}
                      {@const isSelected = currentAns?.answer === opt}
                      <button
                        type="button"
                        onclick={() => handleSelectChoice(q.id, opt)}
                        class={`text-left px-4 py-3 rounded-xl border text-xs font-semibold transition ${
                          isSelected
                            ? 'bg-[var(--color-primary)]/10 border-[var(--color-primary)] text-[var(--color-primary)] shadow-md shadow-[var(--color-primary)]/20'
                            : 'bg-[var(--color-bg)] border-[var(--color-border)] text-[var(--color-text)] hover:border-[var(--color-border)]'
                        }`}
                      >
                        {opt}
                      </button>
                    {/each}
                  </div>
                {/if}

                {#if q.type === 'text'}
                  <textarea
                    placeholder="Masukkan rincian penjelasan Anda di sini..."
                    value={String(currentAns?.answer || '')}
                    oninput={(e) => handleTextChange(q.id, (e.currentTarget as HTMLTextAreaElement).value)}
                    maxlength={500}
                    rows={3}
                    class="w-full bg-[var(--color-bg)] border border-[var(--color-border)] focus:border-[var(--color-primary)]/70 focus:outline-none focus:ring-1 focus:ring-[var(--color-primary)] rounded-xl px-4 py-3 text-xs text-[var(--color-text)] placeholder-zinc-600"
                  ></textarea>
                {/if}

              </div>
            </Card>
          {/each}

          <!-- Saran dan Masukan Terbuka -->
          <Card class="p-6 border border-[var(--color-border)] rounded-3xl space-y-4">
            <div class="space-y-1">
              <div class="flex items-center justify-between">
                <span class="text-[10px] text-[var(--color-primary)] font-mono font-bold uppercase tracking-wider block">Bagian Akhir</span>
                <Badge variant="zinc" size="sm">Opsional</Badge>
              </div>
              <h3 class="text-sm font-bold text-[var(--color-text)]">Saran, Masukan, atau Apresiasi Terbuka</h3>
              <p class="text-[11px] text-[var(--color-muted-foreground)]">Tuliskan kritik konstruktif, keluhan spesifik, atau apresiasi pelayanan Anda di sini secara rinci.</p>
            </div>

            <textarea
              placeholder="Tuliskan masukan berharga Anda..."
              value={saran}
              oninput={(e) => { saran = (e.currentTarget as HTMLTextAreaElement).value; }}
              maxlength={1000}
              rows={4}
              class="w-full bg-[var(--color-bg)] border border-[var(--color-border)] focus:border-[var(--color-primary)]/70 focus:outline-none focus:ring-1 focus:ring-[var(--color-primary)] rounded-xl px-4 py-3 text-xs text-[var(--color-text)] placeholder-zinc-600"
            ></textarea>
          </Card>

          <!-- Privacy Preference Toggle -->
          <Card class="p-5 border border-[var(--color-border)] bg-[var(--color-card)]/30 rounded-3xl flex items-center justify-between gap-4">
            <div class="space-y-1">
              <h4 class="text-xs font-bold text-[var(--color-text)]">Privasi Tanggapan</h4>
              <p class="text-[10px] text-[var(--color-muted-foreground)]">Ingin identitas Anda disembunyikan dari pelaporan publik?</p>
            </div>
            <button
              type="button"
              onclick={() => { isAnonymous = !isAnonymous; }}
              class={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                isAnonymous ? 'bg-[var(--color-primary)]' : 'bg-[var(--color-surface)]'
              }`}
            >
              <span
                class={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-black shadow ring-0 transition duration-200 ease-in-out ${
                  isAnonymous ? 'translate-x-5' : 'translate-x-0'
                }`}
              />
            </button>
          </Card>

          <!-- Form Actions -->
          <div class="pt-4 flex items-center justify-between">
            <span class="text-[10px] text-[var(--color-muted-foreground)] font-semibold italic">* Seluruh jawaban dilindungi UU Keterbukaan Informasi Publik.</span>
            <button
              type="submit"
              disabled={submitting}
              class="px-6 py-3 bg-[var(--color-primary)] hover:bg-amber-600 text-[var(--color-primary-foreground)] text-xs font-bold rounded-xl transition shadow-lg shadow-[var(--color-primary)]/20 flex items-center gap-1.5 shrink-0"
            >
              {#if submitting}
                <div class="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin"></div>
                <span>Mengirim...</span>
              {:else}
                <Send class="w-3.5 h-3.5" />
                <span>Kirim Tanggapan</span>
              {/if}
            </button>
          </div>

        </div>
      {/if}

    </form>

  </div>
{/if}
