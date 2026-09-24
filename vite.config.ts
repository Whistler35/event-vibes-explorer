import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
  },
  plugins: [
    react(),
    mode === 'development' &&
    componentTagger(),
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  // NOTE: don't add build.rollupOptions.output.manualChunks for vendor
  // splitting — tried it (2026-09-24), it causes a white-screen crash on
  // load ("Cannot read properties of undefined (reading 'forwardRef')"),
  // a chunk-execution-order issue between the Radix/React vendor chunks.
  // Route-level lazy() already splits per-page code, which is the change
  // that actually matters for this Capacitor app (locally bundled, so the
  // network-caching benefit of vendor splitting barely applies anyway).
}));
