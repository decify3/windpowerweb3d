import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
export default defineConfig({
  // The application is served by Nginx below this prefix in production.
  // VITE_BASE allows deployment targets to override it, e.g.
  //   GitHub Pages project site: VITE_BASE=/{repo-name}/
  //   Cloudflare Pages / site root: VITE_BASE=/
  base: process.env.VITE_BASE ?? '/windpowerweb3d/',
  plugins: [vue()],
  build: { rollupOptions: { output: { manualChunks(id) { if(id.includes('/three/')) return 'three'; if(id.includes('/gsap/')) return 'motion'; } } } },
});
