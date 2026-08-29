import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

// Plugin dev server para roteamento de APIs locais (/api/gerar-plano)
function apiDevPlugin(env) {
  return {
    name: 'api-dev-server',
    configureServer(server) {
      server.middlewares.use('/api/gerar-plano', async (req, res, next) => {
        if (req.method === 'POST') {
          let bodyStr = '';
          req.on('data', (chunk) => {
            bodyStr += chunk;
          });
          req.on('end', async () => {
            try {
              const body = bodyStr ? JSON.parse(bodyStr) : {};
              const { dadosPaciente } = body;
              const apiKey = env.GOOGLE_API_KEY || process.env.GOOGLE_API_KEY;

              if (!apiKey) {
                res.statusCode = 500;
                res.setHeader('Content-Type', 'application/json');
                return res.end(
                  JSON.stringify({ error: 'GOOGLE_API_KEY não configurada no arquivo .env' })
                );
              }

              const { generateMealPlan } = await import('./api/gerar-plano.js');
              const plano = await generateMealPlan(dadosPaciente, apiKey);

              res.statusCode = 200;
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify(plano));
            } catch (err) {
              console.error('Erro na API /api/gerar-plano:', err);
              res.statusCode = 500;
              res.setHeader('Content-Type', 'application/json');
              res.end(
                JSON.stringify({
                  error: 'Falha ao gerar plano com IA.',
                  details: err.message || 'Erro no servidor',
                })
              );
            }
          });
        } else {
          next();
        }
      });
    },
  };
}

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');

  return {
    plugins: [
      react(),
      apiDevPlugin(env),
      VitePWA({
        registerType: 'autoUpdate',
        includeAssets: ['favicon.svg', 'pwa-192x192.png', 'pwa-512x512.png'],
        manifest: {
          name: 'AndradeNutri',
          short_name: 'AndradeNutri',
          description: 'Sistema de gestão para nutricionistas — AndradeNutri',
          theme_color: '#000080',
          background_color: '#ffffff',
          display: 'standalone',
          orientation: 'portrait',
          scope: '/',
          start_url: '/',
          lang: 'pt-BR',
          icons: [
            {
              src: '/pwa-192x192.png',
              sizes: '192x192',
              type: 'image/png',
              purpose: 'any maskable',
            },
            {
              src: '/pwa-512x512.png',
              sizes: '512x512',
              type: 'image/png',
              purpose: 'any maskable',
            },
          ],
        },
        workbox: {
          runtimeCaching: [
            {
              urlPattern: /^https:\/\/.*\.neon\.tech\/.*/i,
              handler: 'NetworkFirst',
              options: {
                cacheName: 'neon-api-cache',
                expiration: {
                  maxEntries: 50,
                  maxAgeSeconds: 60 * 60, // 1 hora
                },
              },
            },
          ],
          globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
        },
        devOptions: {
          enabled: true,
        },
      }),
    ],
  };
});
