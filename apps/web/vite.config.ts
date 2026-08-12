import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react-swc'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  optimizeDeps: {
    // Workspace packages ship raw TS source (the "internal packages" pattern).
    // Excluding them keeps Vite transforming the source directly, so `import.meta.env`
    // replacement and HMR work inside the packages instead of them being pre-bundled.
    exclude: ['@itelecnews/env', '@itelecnews/shared'],
  },
  build: {
    rollupOptions: {
      output: {
        // Heavy, rarely-changing deps in their own chunks so returning visitors
        // keep them cached across app deploys. Matched by module path rather
        // than by package name: a name list only catches the exact entry point,
        // so deep imports like `react-dom/client` (and its ~130 kB of runtime)
        // silently fell back into the app chunk and were re-downloaded on every
        // deploy.
        manualChunks(id) {
          if (!id.includes('node_modules')) return;
          if (id.includes('gsap')) return 'gsap';
          if (id.includes('@supabase')) return 'supabase';
          if (/[\\/]node_modules[\\/](react|react-dom|react-router|react-router-dom|scheduler)[\\/]/.test(id)) {
            return 'react';
          }
        },
      },
    },
  },
})
