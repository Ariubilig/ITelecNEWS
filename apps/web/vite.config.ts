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
        manualChunks: {
          // Heavy, rarely-changing deps in their own chunks so returning
          // visitors keep them cached across app deploys.
          gsap: ['gsap', 'gsap/ScrollTrigger', 'gsap/ScrollSmoother'],
          supabase: ['@supabase/supabase-js'],
          react: ['react', 'react-dom', 'react-router-dom'],
        },
      },
    },
  },
})
