/**
 * Debounce: tunda eksekusi `fn` hingga `wait` ms berlalu tanpa pemanggilan baru.
 * Cocok untuk search input — cegah request jaringan per keystroke.
 *
 * Mengembalikan fungsi debounced dengan method `.cancel()` untuk membersihkan
 * timer yang tertunda (mis. saat komponen di-unmount).
 *
 * Pola pakai di Svelte 5:
 * ```ts
 * let searchDebounced = $state('');
 * const applySearch = debounce((v: string) => { searchDebounced = v; }, 300);
 * $effect(() => {
 *   applySearch(search);          // dijadwalkan ulang tiap keystroke
 *   return () => applySearch.cancel(); // batalkan jadwal sebelumnya
 * });
 * $effect(() => {
 *   loadData(searchDebounced);     // hanya jalan 300ms setelah berhenti mengetik
 * });
 * ```
 */
export function debounce<T extends (...args: never[]) => void>(fn: T, wait = 300) {
  let t: ReturnType<typeof setTimeout> | null = null;

  const debounced = (...args: Parameters<T>) => {
    if (t) clearTimeout(t);
    t = setTimeout(() => {
      t = null;
      fn(...args);
    }, wait);
  };

  debounced.cancel = () => {
    if (t) {
      clearTimeout(t);
      t = null;
    }
  };

  return debounced;
}
