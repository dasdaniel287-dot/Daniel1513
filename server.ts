import 'dotenv/config';
import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { apiRouter } from './server/routes.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = Number(process.env.PORT) || 3000;
  const isProduction = process.env.NODE_ENV === 'production';

  // Request parsing with bounded safety limits
  app.use(express.json({ limit: '5mb' }));
  app.use(express.urlencoded({ extended: true, limit: '5mb' }));

  // Mount API router
  app.use('/api', apiRouter);

  // In production serve compiled Vite client; in development mount Vite middlewares
  if (isProduction) {
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.resolve(distPath, 'index.html'));
    });
  } else {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa'
    });
    app.use(vite.middlewares);
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[DDoS Shield AI 2.0] Defense engine operational on http://0.0.0.0:${PORT}`);
    console.log(`[DDoS Shield AI 2.0] Real-time telemetry streaming at /api/telemetry/stream`);
  });
}

startServer().catch((err) => {
  console.error('[DDoS Shield AI 2.0] Fatal startup error:', err);
  process.exit(1);
});
