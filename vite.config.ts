import tailwindcss from '@tailwindcss/vite';
import { svelte } from '@sveltejs/vite-plugin-svelte';
import path from 'path';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [svelte(), tailwindcss()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  build: {
    chunkSizeWarningLimit: 600,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules')) {
            // Firebase SDK — chunk sendiri
            if (id.includes('@firebase') || id.includes('firebase')) {
              return 'vendor-firebase';
            }
            // Lucide Svelte Icon library
            if (id.includes('lucide-svelte')) {
              return 'vendor-icons';
            }
          }
        },
      },
    },
  },
});
