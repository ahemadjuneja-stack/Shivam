import { defineConfig, Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

const buildVersion = Date.now();

function cacheBusterPlugin(): Plugin {
  return {
    name: 'html-cache-buster',
    transformIndexHtml(html: string) {
      // Append ?v=${buildVersion} to script imports and style/asset references
      return html
        .replace(/src="([^"]+\.(?:js|ts|tsx|jsx))"/g, `src="$1?v=${buildVersion}"`)
        .replace(/href="([^"]+\.(?:css|json|png|svg|ico))"/g, `href="$1?v=${buildVersion}"`);
    },
  };
}

export default defineConfig({
  plugins: [react(), tailwindcss(), cacheBusterPlugin()],
  server: {
    host: '0.0.0.0',
    port: 3000,
    allowedHosts: true,
  },
  preview: {
    host: '0.0.0.0',
    port: Number(process.env.PORT) || 3000,
    strictPort: true,
    allowedHosts: true,
  },
  build: {
    rollupOptions: {
      output: {
        entryFileNames: `assets/[name]-[hash]-v${buildVersion}.js`,
        chunkFileNames: `assets/[name]-[hash]-v${buildVersion}.js`,
        assetFileNames: `assets/[name]-[hash]-v${buildVersion}.[ext]`,
      },
    },
  },
});
