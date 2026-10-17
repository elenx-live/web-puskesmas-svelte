<!-- @component Halaman login administrator — form email/kata sandi + Google OAuth, layar penuh tanpa layout. -->
<script lang="ts">
  import { AlertCircle, ArrowLeft, ShieldCheck, Lock, Mail, Eye, EyeOff, ArrowRight } from 'lucide-svelte';
  import { authStore } from '../../shared/stores/auth.svelte.js';
  import { siteSettingsService } from '../../shared/services/siteSettingsService.js';
  import { navigate } from '../../app/router.svelte.js';
  import { renderGoogleButton } from '../../shared/lib/gis.js';
  import type { SiteSettings } from '../../shared/types/index.js';

  let gisContainer: HTMLElement | null = $state(null);
  let gisReady = $state(false);
  let gisError = $state('');

  $effect(() => {
    if (!gisContainer || gisReady) return;
    renderGoogleButton(
      gisContainer,
      async (credential) => {
        error = '';
        loading = true;
        try {
          await authStore.loginWithGoogleCredential(credential);
          navigate('/admin');
        } catch (err: any) {
          error = err.message || 'Gagal login dengan Google.';
        } finally {
          loading = false;
        }
      },
      (err) => {
        gisError = err.message;
      }
    ).then(() => { gisReady = true; }).catch((e) => { gisError = e.message; });
  });

  let email = $state('');
  let password = $state('');
  let showPassword = $state(false);
  let error = $state('');
  let loading = $state(false);
  let settings = $state<SiteSettings>(siteSettingsService.getCachedSettings());

  $effect(() => {
    siteSettingsService.getSettings().then((res) => {
      if (res) settings = res;
    });
  });

  const siteName = $derived(settings?.siteName || settings?.shortName || 'Puskesmas Manding');
  const shortName = $derived(settings?.shortName || siteName);
  const logoUrl = $derived(settings?.logoUrl || '/logo.png');

  $effect(() => {
    document.title = `Login Administrator - ${siteName}`;
  });

  // Alihkan ke panel admin bila sudah login
  $effect(() => {
    if (authStore.user) {
      navigate('/admin');
    }
  });

  async function handleGoogleLogin() {
    error = '';
    loading = true;
    try {
      await authStore.loginWithGoogle();
      navigate('/admin');
    } catch (err: any) {
      console.warn('Google OAuth login error:', err);
      error = err.message || 'Gagal login dengan Google OAuth. Jika domain baru belum terdaftar di Google Cloud Console, Anda dapat masuk menggunakan formulir Email & Kata Sandi di bawah.';
    } finally {
      loading = false;
    }
  }

  async function handleCredentialsLogin(e: SubmitEvent) {
    e.preventDefault();
    if (!email.trim()) {
      error = 'Silakan masukkan alamat email yang terdaftar.';
      return;
    }
    if (!password) {
      error = 'Silakan masukkan kata sandi akun Anda.';
      return;
    }

    error = '';
    loading = true;
    try {
      await authStore.login(email, password);
      navigate('/admin');
    } catch (err: any) {
      console.warn('Credentials login error:', err);
      error = err.message || 'Kombinasi email atau kata sandi tidak sesuai. Silakan periksa kembali.';
    } finally {
      loading = false;
    }
  }
</script>

<div class="min-h-screen bg-[#f0f4f9] text-[#1f1f1f] flex flex-col justify-between items-center p-4 sm:p-6 font-sans">
  <!-- Top Navigation -->
  <div class="w-full max-w-[460px] pt-4 sm:pt-6 flex items-center justify-between">
    <a
      href="#/"
      class="inline-flex items-center gap-1.5 text-xs text-zinc-600 hover:text-zinc-900 transition font-medium"
    >
      <ArrowLeft class="w-4 h-4" />
      <span>Kembali ke Beranda {shortName}</span>
    </a>
  </div>

  <!-- Login Card -->
  <div class="w-full max-w-[460px] bg-white rounded-[28px] p-7 sm:p-9 shadow-sm border border-[#dadce0] my-auto">
    <!-- Institution Logo & Google Identity Header -->
    <div class="flex flex-col items-center justify-center mb-4">
      <div class="w-14 h-14 rounded-2xl bg-white border border-zinc-200 shadow-xs flex items-center justify-center p-2 mb-3">
        <img
          src={logoUrl}
          alt={siteName}
          class="w-full h-full object-contain"
          onerror={(e) => {
            const img = e.currentTarget as HTMLImageElement;
            img.onerror = null;
            img.src = '/logo.png';
          }}
        />
      </div>
    </div>

    <div class="text-center mb-6">
      <h1 class="text-2xl font-semibold text-[#1f1f1f] tracking-tight">
        Portal Admin {shortName}
      </h1>
      <p class="text-xs text-[#5e5e5e] mt-1.5 leading-relaxed">
        Masuk ke sistem manajemen <strong class="text-[#1f1f1f] font-semibold">{siteName}</strong>
      </p>
      {#if settings?.tagline}
        <p class="text-[11px] text-zinc-400 mt-1 italic line-clamp-1">
          "{settings.tagline}"
        </p>
      {/if}
    </div>

    <!-- Error Alert Display -->
    {#if error}
      <div class="mb-5 p-3.5 rounded-2xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-start gap-3 animate-in fade-in">
        <AlertCircle class="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
        <div class="space-y-1 text-left">
          <p class="font-semibold text-red-800">Akses Masuk Ditolak</p>
          <p class="leading-relaxed text-[11px] text-red-600">{error}</p>
        </div>
      </div>
    {/if}

    <!-- Option 1: Google OAuth Login Button (GIS resmi) -->
    <div class="space-y-4">
      <div bind:this={gisContainer} class="w-full flex justify-center min-h-[44px]">
        {#if !gisReady && !gisError}
          <div class="w-full py-3.5 px-5 rounded-full border border-[#dadce0] bg-white text-[#1f1f1f] font-semibold text-xs sm:text-sm flex items-center justify-center gap-3 opacity-60">
            <span>Memuat tombol Google...</span>
          </div>
        {/if}
      </div>
      {#if gisError}
        <p class="text-xs text-red-600 text-center">{gisError}</p>
      {/if}

      <!-- Divider -->
      <div class="relative flex py-2 items-center">
        <div class="flex-grow border-t border-zinc-200"></div>
        <span class="shrink mx-3 text-[11px] font-medium text-zinc-400 uppercase tracking-wider">
          atau masuk dengan email & kata sandi
        </span>
        <div class="flex-grow border-t border-zinc-200"></div>
      </div>

      <!-- Option 2: Email & Password Form -->
      <form onsubmit={handleCredentialsLogin} class="space-y-3.5 text-left">
        <div>
          <label class="block text-[11px] font-semibold text-zinc-700 mb-1" for="login-email">
            Alamat Email Administrator
          </label>
          <div class="relative">
            <div class="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-zinc-400">
              <Mail class="w-4 h-4" />
            </div>
            <input
              id="login-email"
              type="email"
              bind:value={email}
              placeholder="nama@email.com"
              autocomplete="email"
              disabled={loading}
              class="w-full pl-10 pr-3.5 py-2.5 bg-zinc-50 border border-zinc-300 rounded-xl text-xs text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 transition"
            />
          </div>
        </div>

        <div>
          <label class="block text-[11px] font-semibold text-zinc-700 mb-1" for="login-password">
            Kata Sandi
          </label>
          <div class="relative">
            <div class="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-zinc-400">
              <Lock class="w-4 h-4" />
            </div>
            <input
              id="login-password"
              type={showPassword ? 'text' : 'password'}
              bind:value={password}
              placeholder="••••••••••••"
              autocomplete="current-password"
              disabled={loading}
              class="w-full pl-10 pr-10 py-2.5 bg-zinc-50 border border-zinc-300 rounded-xl text-xs text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 transition"
            />
            <button
              type="button"
              onclick={() => (showPassword = !showPassword)}
              class="absolute inset-y-0 right-0 pr-3.5 flex items-center text-zinc-400 hover:text-zinc-600 focus:outline-none"
            >
              {#if showPassword}
                <EyeOff class="w-4 h-4" />
              {:else}
                <Eye class="w-4 h-4" />
              {/if}
            </button>
          </div>
        </div>

        <button
          type="submit"
          disabled={loading}
          class="w-full py-3 px-5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs flex items-center justify-center gap-2 transition-all shadow-sm cursor-pointer disabled:opacity-60 active:scale-[0.99] mt-2"
        >
          <span>{loading ? 'Memverifikasi...' : 'Masuk ke Panel Admin'}</span>
          <ArrowRight class="w-4 h-4" />
        </button>
      </form>

      <!-- Security Notice -->
      <div class="pt-4 border-t border-[#f1f3f4] space-y-1.5 text-left">
        <div class="flex items-center gap-2 text-xs font-semibold text-emerald-800 bg-emerald-50 px-3 py-2 rounded-xl border border-emerald-200/80">
          <ShieldCheck class="w-4 h-4 text-emerald-600 shrink-0" />
          <span>Proteksi Keamanan Sistem & RBAC</span>
        </div>
        <p class="text-[10.5px] text-[#5e5e5e] leading-relaxed px-1">
          Sistem memvalidasi setiap kredensial masuk secara aman terhadap basis data pengguna Puskesmas untuk memastikan hanya akun resmi yang dapat mengakses data administratif.
        </p>
      </div>
    </div>
  </div>

  <!-- Google Standard Footer -->
  <div class="w-full max-w-[460px] pb-4 sm:pb-6 flex items-center justify-between text-xs text-[#5e5e5e]">
    <div>
      <span>Bahasa Indonesia</span>
    </div>
    <div class="flex items-center gap-6">
      <a href="#login" onclick={(e) => e.preventDefault()} class="hover:text-[#1f1f1f] transition">Bantuan</a>
      <a href="#login" onclick={(e) => e.preventDefault()} class="hover:text-[#1f1f1f] transition">Privasi</a>
      <a href="#login" onclick={(e) => e.preventDefault()} class="hover:text-[#1f1f1f] transition">Persyaratan</a>
    </div>
  </div>
</div>
