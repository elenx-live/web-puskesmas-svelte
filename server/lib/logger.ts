/**
 * Logger minimal untuk kode server (server/).
 *
 * - `debug` hanya aktif saat `NODE_ENV !== 'production'`.
 * - `info`/`warn`/`error` selalu ditulis dengan prefix `[puskesmas-server]`
 *   plus timestamp ISO agar mudah dilacak di log VPS.
 */

type LogArgs = unknown[];

const PREFIX = '[puskesmas-server]';

function ts(): string {
  return new Date().toISOString();
}

export const logger = {
  debug(...args: LogArgs): void {
    if (process.env.NODE_ENV !== 'production') {
      console.debug(PREFIX, ts(), ...args);
    }
  },
  info(...args: LogArgs): void {
    console.info(PREFIX, ts(), ...args);
  },
  warn(...args: LogArgs): void {
    console.warn(PREFIX, ts(), ...args);
  },
  error(...args: LogArgs): void {
    console.error(PREFIX, ts(), ...args);
  },
};
