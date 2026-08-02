import path from 'node:path'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig, loadEnv, type Plugin } from 'vite'

/** Ask the local PocketBase to ensure the /events/test seed exists (the
 * /api/dev-seed route only exists on DEV_AUTH=true instances, so this is a
 * no-op 404 against anything else). */
function devSeed(pocketbaseUrl: string | undefined): Plugin {
  return {
    name: 'dev-seed',
    apply: 'serve',
    configureServer(server) {
      if (!pocketbaseUrl) {
        server.config.logger.warn(
          '[dev-seed] VITE_POCKETBASE_URL is not set (no .env?) — the app ' +
            'will look for a backend on the Vite origin and find nothing. ' +
            'See .env.example.',
        )
        return
      }
      server.httpServer?.once('listening', () => {
        fetch(`${pocketbaseUrl}/api/dev-seed`, { method: 'POST' })
          .then(async (res) => {
            if (!res.ok) return // not a DEV_AUTH instance — nothing to seed
            const { created } = (await res.json()) as { created: boolean }
            if (created) {
              server.config.logger.info('[dev-seed] created /events/test')
            }
          })
          .catch(() => {
            // backend not running yet — the PocketBase cron covers it
          })
      })
    },
  }
}

export default defineConfig(({ mode }) => ({
  plugins: [
    react(),
    tailwindcss(),
    devSeed(loadEnv(mode, process.cwd(), '').VITE_POCKETBASE_URL),
  ],
  resolve: {
    alias: { '@': path.resolve(import.meta.dirname, 'src') },
  },
  build: {
    // PocketBase serves pb_public/ directly on your instance URL.
    outDir: 'pb_public',
    emptyOutDir: true,
  },
}))
