<!-- @component Provider AI & Integrasi — konfigurasi mesin AI, daftar model, dan integrasi penulisan edukasi kesehatan. -->
<script lang="ts">
  import AIProviderSettingsCard from '../components/AIProviderSettingsCard.svelte';
  import Card from '../../../shared/ui/Card.svelte';
  import { Sparkles, Bot, ShieldCheck, ArrowRight, DownloadCloud } from 'lucide-svelte';
</script>

<div class="space-y-6 max-w-5xl">
  <!-- Intro Guidance Banner -->
  <div class="p-4 bg-gradient-to-r from-[var(--color-primary)]/15 via-[var(--color-primary)]/5 to-transparent border border-[var(--color-primary)]/30 rounded-3xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
    <div class="flex items-start gap-3">
      <div class="p-2.5 rounded-2xl bg-[var(--color-primary)] text-white shadow-md">
        <Sparkles class="w-5 h-5" />
      </div>
      <div>
        <h2 class="text-sm font-bold text-[var(--color-text)]">
          Pengaturan Mesin Kecerdasan Buatan (AI Engine)
        </h2>
        <p class="text-xs text-[var(--color-muted-foreground)] mt-0.5 max-w-2xl leading-relaxed">
          Puskesmas mendukung koneksi ke berbagai penyedia AI kelas dunia (Google Gemini, Groq, DeepSeek, OpenAI, OpenRouter) serta server mandiri lokal (Ollama, LM Studio, vLLM). AI digunakan untuk menyusun draf berita komprehensif dari web resmi dan edukasi masyarakat.
        </p>
      </div>
    </div>

    <div class="flex items-center gap-2 shrink-0">
      <a
        href="#/admin/posts"
        class="px-3.5 py-2 bg-[var(--color-surface)] hover:bg-[var(--color-bg)] border border-[var(--color-border)] text-xs font-semibold rounded-2xl text-[var(--color-text)] flex items-center gap-1.5 transition"
      >
        <DownloadCloud class="w-4 h-4 text-[var(--color-primary)]" />
        <span>Buka Impor Berita</span>
        <ArrowRight class="w-3.5 h-3.5 text-[var(--color-muted-foreground)]" />
      </a>
    </div>
  </div>

  <!-- Main Settings Card -->
  <AIProviderSettingsCard />

  <!-- Informational Guidance Cards -->
  <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
    <Card class="p-5 space-y-3">
      <div class="flex items-center gap-2 text-[var(--color-primary)]">
        <Bot class="w-4 h-4" />
        <h3 class="text-xs font-bold text-[var(--color-text)]">
          Dukungan Custom Provider (Ollama / Local LLM)
        </h3>
      </div>
      <p class="text-xs text-[var(--color-muted-foreground)] leading-relaxed">
        Jika Anda menjalankan server AI mandiri di jaringan internal Puskesmas (seperti Ollama pada <code class="font-mono bg-[var(--color-bg)] px-1 py-0.5 rounded text-[11px]">http://localhost:11434/v1</code>), sistem dapat secara otomatis mendeteksi model yang telah diunduh melalui tombol <strong>"Tarik Model"</strong> tanpa perlu mengetik manual.
      </p>
    </Card>

    <Card class="p-5 space-y-3">
      <div class="flex items-center gap-2 text-emerald-500">
        <ShieldCheck class="w-4 h-4" />
        <h3 class="text-xs font-bold text-[var(--color-text)]">
          Kepatuhan Hak Cipta & Keaslian Artikel
        </h3>
      </div>
      <p class="text-xs text-[var(--color-muted-foreground)] leading-relaxed">
        Seluruh proses saduran berita wajib mencantumkan kotak atribusi resmi ke penerbit asli secara transparan. Hal ini menjamin kredibilitas informasi kesehatan Puskesmas dan mematuhi asas <em>Fair Use</em> edukasi publik non-komersial.
      </p>
    </Card>
  </div>
</div>
