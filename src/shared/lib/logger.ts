/**
 * Logger minimal untuk kode client (src/).
 *
 * - `debug` hanya aktif saat `import.meta.env.DEV` (build produksi: no-op).
 * - `info`/`warn`/`error` selalu diteruskan ke console dengan prefix `[puskesmas]`.
 *
 * Dipakai menggantikan `console.log` langsung agar log debug tidak bocor ke produksi.
 */

type LogArgs = unknown[];

const PREFIX = '[puskesmas]';

function formatArgs(args: LogArgs): LogArgs {
  return [PREFIX, ...args];
}

export const logger = {
  debug(...args: LogArgs): void {
    if (import.meta.env.DEV) {
      console.debug(...formatArgs(args));
    }
  },
  info(...args: LogArgs): void {
    console.info(...formatArgs(args));
  },
  warn(...args: LogArgs): void {
    console.warn(...formatArgs(args));
  },
  error(...args: LogArgs): void {
    console.error(...formatArgs(args));
  },
};

/**
 * Ambil pesan dari `unknown` error — pengganti pola `catch (err: any)` + `err.message`.
 * Perilaku identik dengan `err.message || fallback` untuk semua kasus realistis.
 */
export function errorMessage(err: unknown, fallback = ''): string {
  const m =
    err instanceof Error
      ? err.message
      : (err as { message?: unknown } | null | undefined)?.message;
  return (typeof m === 'string' && m ? m : '') || fallback;
}
