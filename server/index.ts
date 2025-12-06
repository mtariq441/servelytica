// Main Express server entry point
import './env';
import { createServer as createViteServer } from 'vite';
import express from 'express';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import { setupCors, setupBodyParser, setupErrorHandler, setupHealthCheck } from './middleware';
import { setupApiRoutes } from './api';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const PORT = process.env.PORT || 5000;
const isDev = process.env.NODE_ENV !== 'production';

async function createApp() {
  const app: express.Express = express();

  // Setup middleware
  setupCors(app);
  setupBodyParser(app);
  setupHealthCheck(app);

  // Setup API routes
  setupApiRoutes(app);
  // Chunked upload route
  app.use('/api', (await import('./chunkUpload')).default);

  // Serve uploaded files statically
  const path = await import('path');
  const uploadsDir = path.resolve(__dirname, 'uploads');
  app.use('/uploads', express.static(uploadsDir));

  // In development, integrate Vite
  if (isDev) {
    const vite = await createViteServer({
      server: { middlewareMode: true },
    });

    app.use(vite.middlewares);
  }

  // Error handler (must be last)
  setupErrorHandler(app);

  return app;
}

async function startServer() {
  try {
    const app = await createApp();

    app.listen(PORT, '0.0.0.0', () => {
      console.log(`✓ Server running at http://localhost:${PORT}`);
      console.log(`✓ API routes available at http://localhost:${PORT}/api/*`);
      console.log(`✓ Health check: http://localhost:${PORT}/health`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  startServer();
}

export { createApp };
