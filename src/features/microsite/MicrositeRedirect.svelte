<!--
  @component Pengalihan halaman publik microsite ke aplikasi mandiri.

  Sejak 21 Okt 2026 halaman publik microsite tinggal di
  https://microsite.puskesmasmanding.com (aplikasi terpisah). Rute publik
  lama di web utama (#/microsites, #/m, #/m/:slug, #/microsite/:slug) hanya
  mengalihkan ke sana, dengan query dipertahankan (mis. ?preview=true untuk
  pratinjau draf dari admin). Modul admin TIDAK pindah dan tidak berubah.
-->
<script lang="ts">
  import { onMount } from 'svelte';

  const NEW_ORIGIN = 'https://microsite.puskesmasmanding.com';

  onMount(() => {
    try {
      const hash = window.location.hash.replace(/^#/, '');
      const [rawPath, rawQuery] = hash.split('?');
      const clean = (rawPath || '').replace(/^\/+|\/+$/g, '');
      const parts = clean.split('/').filter(Boolean);
      let targetPath = '/';
      if (parts.length === 2 && (parts[0] === 'm' || parts[0] === 'microsite') && parts[1]) {
        targetPath = '/' + encodeURIComponent(decodeURIComponent(parts[1]));
      }
      const target = NEW_ORIGIN + targetPath + (rawQuery ? '?' + rawQuery : '');
      window.location.replace(target);
    } catch {
      window.location.replace(NEW_ORIGIN + '/');
    }
  });
</script>

<div style="min-height:60vh;display:flex;align-items:center;justify-content:center;font-family:Inter,system-ui,sans-serif;color:#60756C">
  <p>Mengalihkan ke microsite…</p>
</div>
