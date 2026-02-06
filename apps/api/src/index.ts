import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';
import type { Env, Variables } from './types.js';
import { dbMiddleware } from './middleware/db.js';

import agentRoutes from './routes/agents.js';
import taskRoutes from './routes/tasks.js';
import entityRoutes from './routes/entities.js';
import documentRoutes from './routes/documents.js';
import searchRoutes from './routes/search.js';
import statsRoutes from './routes/stats.js';
import discoverRoutes from './routes/discover.js';

const app = new Hono<{ Bindings: Env; Variables: Variables }>();

// Global middleware
app.use('*', cors());
app.use('*', logger());
app.use('*', dbMiddleware);

// Health check
app.get('/health', (c) => {
  return c.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    environment: c.env.ENVIRONMENT,
  });
});

// API routes
app.route('/api/v1/agents', agentRoutes);
app.route('/api/v1/tasks', taskRoutes);
app.route('/api/v1/entities', entityRoutes);
app.route('/api/v1/documents', documentRoutes);
app.route('/api/v1/search', searchRoutes);
app.route('/api/v1/stats', statsRoutes);
app.route('/api/v1/discover', discoverRoutes);

// 404 handler
app.notFound((c) => {
  return c.json({ error: 'Not found' }, 404);
});

// Error handler
app.onError((err, c) => {
  console.error('Unhandled error:', err);
  return c.json(
    {
      error: 'Internal server error',
      message: c.env.ENVIRONMENT === 'development' ? err.message : undefined,
    },
    500
  );
});

export default app;
