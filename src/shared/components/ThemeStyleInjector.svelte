<!--
  @component Menyuntikkan CSS variabel tema + kelas helper (theme-radius,
  theme-button-radius, override warna) ke <head> berdasarkan tema terbit.
-->
<script lang="ts">
  import { themeService } from '../../shared/services/themeService.js';
  import type { GlobalThemeConfig } from '../../shared/types/index.js';

  interface Props {
    /** Tema pratinjau (mengabaikan tema terbit). */
    previewTheme?: GlobalThemeConfig | null;
  }

  const { previewTheme = null }: Props = $props();

  let theme = $state<GlobalThemeConfig | null>(previewTheme);

  function buildCss(t: GlobalThemeConfig): string {
    const radiusValue = t.radius === 'sharp' ? '0px' : t.radius === 'pill' ? '24px' : '16px';
    const buttonRadiusValue = t.buttonStyle === 'sharp' ? '0px' : t.buttonStyle === 'pill' ? '9999px' : '12px';

    return `
    :root {
      --color-primary: ${t.colorPrimary};
      --color-primary-foreground: ${t.colorPrimaryForeground || '#FFFFFF'};
      --color-secondary: ${t.colorSecondary};
      --color-secondary-foreground: ${t.colorSecondaryForeground || '#145A3B'};
      --color-accent: ${t.colorAccent};
      --color-accent-foreground: ${t.colorAccentForeground || '#FFFFFF'};
      --color-bg: ${t.colorBg};
      --color-text: ${t.colorText};
      --color-card: ${t.colorCard};
      --color-surface: ${t.colorSurface || t.colorCard};
      --color-surface-foreground: ${t.colorSurfaceForeground || t.colorText};
      --color-muted: ${t.colorMuted || '#EEF6F2'};
      --color-muted-foreground: ${t.colorMutedForeground || '#60756C'};
      --color-border: ${t.colorBorder};
      --color-input: ${t.colorInput || t.colorBorder};
      --color-ring: ${t.colorRing || t.colorPrimary};
      --color-success: ${t.colorSuccess || '#16A34A'};
      --color-warning: ${t.colorWarning || '#D97706'};
      --color-danger: ${t.colorDanger || '#DC2626'};
      --color-info: ${t.colorInfo || '#0284C7'};
      --theme-radius: ${radiusValue};
      --button-radius: ${buttonRadiusValue};
    }

    /* Custom overrides based on theme */
    .theme-bg {
      background-color: var(--color-bg) !important;
    }
    .theme-text {
      color: var(--color-text) !important;
    }
    .theme-border {
      border-color: var(--color-border) !important;
    }
    .theme-bg-card {
      background-color: var(--color-card) !important;
    }

    .theme-bg-primary {
      background-color: var(--color-primary) !important;
    }
    .theme-text-primary {
      color: var(--color-primary) !important;
    }
    .theme-border-primary {
      border-color: var(--color-primary) !important;
    }

    .theme-bg-secondary {
      background-color: var(--color-secondary) !important;
    }
    .theme-text-secondary {
      color: var(--color-secondary) !important;
    }
    .theme-border-secondary {
      border-color: var(--color-secondary) !important;
    }

    .theme-bg-accent {
      background-color: var(--color-accent) !important;
    }
    .theme-text-accent {
      color: var(--color-accent) !important;
    }
    .theme-border-accent {
      border-color: var(--color-accent) !important;
    }

    .theme-radius {
      border-radius: var(--theme-radius) !important;
    }
    .theme-button-radius {
      border-radius: var(--button-radius, 12px) !important;
    }

    /* Style overrides for common components based on custom properties */
    .btn-theme-primary {
      background-color: var(--color-primary) !important;
      color: '#FFFFFF' !important;
      border-radius: var(--button-radius) !important;
      transition: all 0.2s ease-in-out;
    }
    .btn-theme-primary:hover {
      filter: brightness(1.1);
      transform: translateY(-1px);
    }

    .btn-theme-secondary {
      background-color: transparent !important;
      color: var(--color-primary) !important;
      border: 1px solid var(--color-primary) !important;
      border-radius: var(--button-radius) !important;
      transition: all 0.2s ease-in-out;
    }
    .btn-theme-secondary:hover {
      background-color: rgba(16, 185, 129, 0.05) !important;
      transform: translateY(-1px);
    }

    /* Globally override hardcoded admin dark colors to adapt to the active theme */
    .bg-\\[\\#16191F\\], .bg-\\[\\#1A1E26\\], .bg-\\[\\#1a1f29\\], .bg-\\[\\#1C2027\\],
    .bg-\\[\\#1C2028\\], .bg-\\[\\#1C2029\\], .bg-\\[\\#1C212B\\], .bg-\\[\\#1E232B\\],
    .bg-\\[\\#1F242D\\], .bg-[var(--color-card)], .bg-[var(--color-surface)],
    .bg-\\[\\#16191F\\]\\/90, .bg-\\[\\#16191F\\]\\/60, .bg-\\[\\#16191F\\]\\/50, .bg-\\[\\#16191F\\]\\/40, .bg-\\[\\#16191F\\]\\/30,
    .bg-\\[\\#1C2027\\]\\/20, .bg-\\[\\#1C2027\\]\\/30, .bg-\\[\\#1C2029\\]\\/50, .bg-\\[\\#1C212B\\]\\/50,
    .bg-\\[\\#1E232B\\]\\/20, .bg-\\[\\#1E232B\\]\\/50,
    .bg-\\[\\#22262E\\], .bg-\\[\\#2C313A\\] {
      background-color: var(--color-card) !important;
    }

    .bg-\\[\\#090A0D\\], .bg-\\[\\#0B0D11\\], .bg-\\[\\#0E1116\\], .bg-\\[\\#101216\\],
    .bg-\\[\\#111317\\], .bg-\\[\\#12141A\\], .bg-\\[\\#12151B\\], .bg-\\[\\#14161B\\],
    .bg-\\[\\#000\\], .bg-[var(--color-bg)], .bg-\\[\\#0B0D11\\]\\/90, .bg-\\[\\#0B0D11\\]\\/60,
    .bg-\\[\\#0B0D11\\]\\/50, .bg-\\[\\#0B0D11\\]\\/40, .bg-\\[\\#0B0D11\\]\\/30,
    .bg-\\[\\#000\\]\\/70, .bg-\\[\\#000\\]\\/95 {
      background-color: var(--color-bg) !important;
    }

    .border-\\[\\#1A1D24\\], .border-\\[\\#1A1D25\\], .border-\\[\\#22262E\\],
    .border-\\[\\#2E3440\\], .border-\\[\\#333A47\\], .border-[var(--color-border)],
    .border-[var(--color-border)], .border-slate-800, .border-\\[\\#22262E\\]\\/60,
    .border-\\[\\#22262E\\]\\/80, .border-\\[\\#22262E\\]\\/70, .border-\\[\\#22262E\\]\\/50,
    .border-\\[\\#22262E\\]\\/40, .border-\\[\\#22262E\\]\\/30 {
      border-color: var(--color-border) !important;
    }

    .text-\\[\\#E0E0E0\\], .text-[var(--color-text)] {
      color: var(--color-text) !important;
    }
    .text-[var(--color-muted-foreground)], .text-slate-400 {
      color: var(--color-text) !important;
      opacity: 0.7;
    }

    /* Hover background overrides */
    .hover\\:bg-\\[\\#1E232B\\]:hover, .hover\\:bg-[var(--color-surface)]:hover, .hover\\:bg-[var(--color-surface)]\\/50:hover,
    .hover\\:bg-\\[\\#16191F\\]:hover, .hover\\:bg-\\[\\#0B0D11\\]:hover,
    .hover\\:bg-\\[\\#1A1E26\\]:hover, .hover\\:bg-\\[\\#1a1f29\\]:hover,
    .hover\\:bg-\\[\\#1C2027\\]:hover, .hover\\:bg-\\[\\#1C2028\\]:hover,
    .hover\\:bg-\\[\\#1C2029\\]:hover, .hover\\:bg-\\[\\#1C212B\\]:hover,
    .hover\\:bg-\\[\\#22262E\\]:hover, .hover\\:bg-\\[\\#2C313A\\]:hover {
      background-color: var(--color-border) !important;
    }

    .hover\\:border-\\[\\#333A47\\]:hover {
      border-color: var(--color-primary) !important;
    }

    /* Preserve white text for buttons and badges */
    button.text-[var(--color-text)],
    button .text-[var(--color-text)],
    .btn-theme-primary,
    .bg-\\[var\\(--color-primary\\)\\] .text-[var(--color-text)],
    .bg-[var(--color-primary)] .text-[var(--color-text)],
    .bg-[var(--color-primary)] .text-[var(--color-text)],
    .bg-blue-500 .text-[var(--color-text)],
    .bg-red-500 .text-[var(--color-text)] {
       color: #ffffff !important;
       opacity: 1 !important;
    }

    /* Override hardcoded brand colors to primary */
    .text-[var(--color-primary)], .text-[var(--color-primary)], .hover\\:text-[var(--color-primary)]:hover, .hover\\:text-[var(--color-primary)]:hover {
       color: var(--color-primary) !important;
    }

    .bg-[var(--color-primary)], .bg-[var(--color-primary)], .hover\\:bg-[var(--color-primary)]:hover, .hover\\:bg-[var(--color-primary)]:hover {
       background-color: var(--color-primary) !important;
    }

    .border-[var(--color-primary)], .border-[var(--color-primary)], .border-[var(--color-primary)]\\/30, .border-[var(--color-primary)]\\/50, .focus\\:border-[var(--color-primary)]:focus, .focus\\:border-[var(--color-primary)]\\/70:focus {
       border-color: var(--color-primary) !important;
    }

    .bg-[var(--color-primary)]\\/10 {
       background-color: color-mix(in srgb, var(--color-primary) 10%, transparent) !important;
    }

    .focus\\:ring-[var(--color-primary)]:focus, .focus\\:ring-[var(--color-primary)]\\/40:focus {
       --tw-ring-color: var(--color-primary) !important;
    }

    /* Paksa tombol & elemen interaktif mengikuti radius tema */
    button.rounded-xl, button.rounded-lg, button.rounded-md,
    a.rounded-xl, a.rounded-lg, a.rounded-md {
       border-radius: var(--button-radius, 12px) !important;
    }
  `;
  }

  $effect(() => {
    if (previewTheme) {
      theme = previewTheme;
      return;
    }
    const styleEl = document.createElement('style');
    styleEl.id = 'puskesmas-theme-injector';
    document.head.appendChild(styleEl);

    const loadTheme = () => {
      themeService.getPublishedConfig().then((t) => {
        theme = t;
        styleEl.textContent = buildCss(t);
      });
    };
    loadTheme();

    const handleStorage = () => loadTheme();
    const handleCustom = () => loadTheme();
    const handleFocus = () => loadTheme();

    window.addEventListener('storage', handleStorage);
    window.addEventListener('puskesmas_theme_updated', handleCustom);
    window.addEventListener('focus', handleFocus);

    const interval = setInterval(loadTheme, 30000);

    return () => {
      window.removeEventListener('storage', handleStorage);
      window.removeEventListener('puskesmas_theme_updated', handleCustom);
      window.removeEventListener('focus', handleFocus);
      clearInterval(interval);
      styleEl.remove();
    };
  });

  // Terapkan tema pratinjau ke style element
  $effect(() => {
    if (!previewTheme) return;
    const existing = document.getElementById('puskesmas-theme-injector');
    if (existing) existing.textContent = buildCss(previewTheme);
  });
</script>
