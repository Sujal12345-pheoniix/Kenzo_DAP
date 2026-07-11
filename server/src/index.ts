import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import path from 'path';
import jwt from 'jsonwebtoken';
import { v2 as cloudinary } from 'cloudinary';
import multer from 'multer';
import { CloudinaryStorage } from 'multer-storage-cloudinary';
import { bootstrapDb, pool } from './db/connection';

const app = express();
const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'kenzo_dap_jwt_secret_key_2026';

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// Configure Multer for Cloudinary uploads
const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: async (req: any, file: any) => {
    return {
      folder: 'kenzo-dap',
      allowed_formats: ['jpg', 'png', 'jpeg', 'gif', 'svg'],
      public_id: `${Date.now()}-${file.originalname.split('.')[0]}`,
    };
  },
});
const upload = multer({ storage });

// Enable CORS and JSON parsing
app.use(cors());
app.use(express.json());

// Serve the compiled SDK bundle statically (UMD version for classic script tags)
app.use('/sdk.js', express.static(path.join(__dirname, '../../dist/kenzo-sdk.umd.cjs')));
app.use('/sdk.js.map', express.static(path.join(__dirname, '../../dist/kenzo-sdk.umd.cjs.map')));

// Serve the dashboard files and sandbox files
app.use(express.static(path.join(__dirname, '../public')));
app.use(express.static(path.join(__dirname, '../public/dashboard')));


// --- Authentication Middleware ---
interface AuthenticatedRequest extends Request {
  projectId?: string;
  apiKey?: string;
}

function authenticateSdk(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({ message: '[Kenzo SDK API] Unauthorized: Missing token' });
    return;
  }

  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as { projectId: string; apiKey: string };
    req.projectId = decoded.projectId;
    req.apiKey = decoded.apiKey;
    next();
  } catch (err) {
    res.status(401).json({ message: '[Kenzo SDK API] Unauthorized: Invalid or expired token' });
    return;
  }
}

// Simple auth check for admin dashboard (accepts a header or query param)
function authenticateAdmin(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  // In a real product this would use session/cookies or admin token. 
  // For this prototype, we'll auto-resolve to the seeded development project 
  // or read the project ID from the headers/query params.
  const projectIdHeader = req.headers['x-project-id'] as string;
  const apiKeyHeader = req.headers['x-api-key'] as string;

  if (projectIdHeader) {
    req.projectId = projectIdHeader;
    next();
    return;
  }

  // fallback to looking up first project
  pool.query('SELECT id FROM projects ORDER BY created_at ASC LIMIT 1')
    .then((result) => {
      if (result.rows.length > 0) {
        req.projectId = result.rows[0].id;
        next();
      } else {
        res.status(500).json({ message: 'No project found. Bootstrap first.' });
      }
    })
    .catch((err) => {
      res.status(500).json({ message: 'Database connection failed', error: err.message });
    });
}

// --- SDK ROUTES ---

// 1. Authenticate SDK
app.post('/api/v1/auth/sdk', async (req: Request, res: Response) => {
  const { apiKey } = req.body;
  if (!apiKey) {
    res.status(400).json({ message: 'apiKey is required' });
    return;
  }

  try {
    const result = await pool.query('SELECT id, name FROM projects WHERE api_key = $1', [apiKey]);
    if (result.rows.length === 0) {
      res.status(401).json({ message: 'Invalid API Key' });
      return;
    }

    const project = result.rows[0];
    const token = jwt.sign(
      { projectId: project.id, apiKey },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.json({
      token,
      projectId: project.id,
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      features: ['walkthroughs', 'tooltips', 'spotlights', 'analytics']
    });
  } catch (err: any) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// 2. Fetch Published Flows for SDK
app.get('/api/v1/flows/published', authenticateSdk, async (req: AuthenticatedRequest, res: Response) => {
  try {
    // Load published flows
    const flowsResult = await pool.query(
      `SELECT id, name, description, version, status, url_rules as "urlRules", 
              conditions, priority, created_at as "createdAt", updated_at as "updatedAt"
       FROM flows 
       WHERE project_id = $1 AND status = 'published'
       ORDER BY priority DESC, created_at DESC`,
      [req.projectId]
    );

    const flows = flowsResult.rows;

    // Load steps for each flow
    for (const flow of flows) {
      const stepsResult = await pool.query(
        `SELECT id, order_index, title, content, selector, placement, 
                display_mode as "displayMode", buttons, auto_advance_delay as "autoAdvanceDelay", 
                auto_scroll as "autoScroll", block_interaction as "blockInteraction", 
                spotlight_padding as "spotlightPadding", css_class as "cssClass", conditions
         FROM steps 
         WHERE flow_id = $1 
         ORDER BY order_index ASC`,
        [flow.id]
      );
      // Map order_index to 1-based order expected by SDK
      flow.steps = stepsResult.rows.map((step, idx) => ({
        ...step,
        order: idx + 1
      }));
    }

    res.json({ flows });
  } catch (err: any) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// 3. Save SDK Analytics
app.post('/api/v1/analytics', authenticateSdk, async (req: AuthenticatedRequest, res: Response) => {
  const { type, flowId, stepId, sessionId, url, userAgent, properties } = req.body;
  try {
    await pool.query(
      `INSERT INTO analytics_events (project_id, flow_id, step_id, session_id, type, url, user_agent, properties) 
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [
        req.projectId,
        flowId || null,
        stepId || null,
        sessionId || 'anonymous',
        type,
        url || '',
        userAgent || '',
        JSON.stringify(properties || {})
      ]
    );
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// 4. Get/Update User Progress
app.get('/api/v1/progress/:flowId', authenticateSdk, async (req: AuthenticatedRequest, res: Response) => {
  const { flowId } = req.params;
  const userId = req.query.userId as string || 'anonymous';
  try {
    const result = await pool.query(
      `SELECT current_step_index as "currentStepIndex", completed_step_ids as "completedStepIds", 
              completed, dismissed, started_at as "startedAt", last_viewed_at as "lastViewedAt"
       FROM user_progress 
       WHERE user_id = $1 AND flow_id = $2`,
      [userId, flowId]
    );

    if (result.rows.length === 0) {
      res.json(null);
    } else {
      res.json(result.rows[0]);
    }
  } catch (err: any) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

app.post('/api/v1/progress/:flowId', authenticateSdk, async (req: AuthenticatedRequest, res: Response) => {
  const { flowId } = req.params;
  const { userId, currentStepIndex, completedStepIds, completed, dismissed } = req.body;
  const uid = userId || 'anonymous';

  try {
    await pool.query(
      `INSERT INTO user_progress (user_id, flow_id, current_step_index, completed_step_ids, completed, dismissed, last_viewed_at) 
       VALUES ($1, $2, $3, $4, $5, $6, NOW())
       ON CONFLICT (user_id, flow_id) 
       DO UPDATE SET current_step_index = EXCLUDED.current_step_index, 
                     completed_step_ids = EXCLUDED.completed_step_ids, 
                     completed = EXCLUDED.completed, 
                     dismissed = EXCLUDED.dismissed, 
                     last_viewed_at = NOW()`,
      [uid, flowId, currentStepIndex || 0, JSON.stringify(completedStepIds || []), !!completed, !!dismissed]
    );
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// --- ADMIN API ROUTES ---

// 1. List all flows (admin)
app.get('/api/v1/admin/flows', authenticateAdmin, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const flowsResult = await pool.query(
      `SELECT id, name, description, version, status, url_rules as "urlRules", 
              conditions, priority, created_at as "createdAt", updated_at as "updatedAt"
       FROM flows 
       WHERE project_id = $1
       ORDER BY created_at DESC`,
      [req.projectId]
    );

    const flows = flowsResult.rows;

    for (const flow of flows) {
      const stepsResult = await pool.query(
        'SELECT id, order_index FROM steps WHERE flow_id = $1',
        [flow.id]
      );
      flow.stepCount = stepsResult.rows.length;
    }

    res.json(flows);
  } catch (err: any) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// 2. Fetch full flow details (admin)
app.get('/api/v1/admin/flows/:flowId', authenticateAdmin, async (req: AuthenticatedRequest, res: Response) => {
  const { flowId } = req.params;
  try {
    const flowResult = await pool.query(
      `SELECT id, name, description, version, status, url_rules as "urlRules", 
              conditions, priority, created_at as "createdAt", updated_at as "updatedAt"
       FROM flows 
       WHERE id = $1 AND project_id = $2`,
      [flowId, req.projectId]
    );

    if (flowResult.rows.length === 0) {
      res.status(404).json({ message: 'Flow not found' });
      return;
    }

    const flow = flowResult.rows[0];

    const stepsResult = await pool.query(
      `SELECT id, order_index, title, content, selector, placement, 
              display_mode as "displayMode", buttons, auto_advance_delay as "autoAdvanceDelay", 
              auto_scroll as "autoScroll", block_interaction as "blockInteraction", 
              spotlight_padding as "spotlightPadding", css_class as "cssClass", conditions
       FROM steps 
       WHERE flow_id = $1 
       ORDER BY order_index ASC`,
      [flowId]
    );

    flow.steps = stepsResult.rows.map((step, idx) => ({
      ...step,
      order: idx + 1
    }));

    res.json(flow);
  } catch (err: any) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// 3. Create a flow (admin / builder)
app.post('/api/v1/admin/flows', authenticateAdmin, async (req: AuthenticatedRequest, res: Response) => {
  const { name, description, urlRules, conditions, status, priority } = req.body;
  try {
    const result = await pool.query(
      `INSERT INTO flows (project_id, name, description, url_rules, conditions, status, priority, version) 
       VALUES ($1, $2, $3, $4, $5, $6, $7, 1) 
       RETURNING id, name, description, version, status, url_rules as "urlRules", conditions, priority`,
      [
        req.projectId,
        name || 'New Onboarding Tour',
        description || '',
        JSON.stringify(urlRules || []),
        JSON.stringify(conditions || []),
        status || 'draft',
        priority || 0
      ]
    );
    res.json(result.rows[0]);
  } catch (err: any) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// 4. Update a flow (admin)
app.put('/api/v1/admin/flows/:flowId', authenticateAdmin, async (req: AuthenticatedRequest, res: Response) => {
  const { flowId } = req.params;
  const { name, description, urlRules, conditions, status, priority, version } = req.body;
  try {
    const result = await pool.query(
      `UPDATE flows 
       SET name = $1, description = $2, url_rules = $3, conditions = $4, status = $5, priority = $6, version = $7, updated_at = NOW()
       WHERE id = $8 AND project_id = $9
       RETURNING id, name, description, version, status, url_rules as "urlRules", conditions, priority`,
      [
        name,
        description,
        JSON.stringify(urlRules || []),
        JSON.stringify(conditions || []),
        status,
        priority || 0,
        version || 1,
        flowId,
        req.projectId
      ]
    );

    if (result.rows.length === 0) {
      res.status(404).json({ message: 'Flow not found' });
      return;
    }

    res.json(result.rows[0]);
  } catch (err: any) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// 5. Delete a flow (admin)
app.delete('/api/v1/admin/flows/:flowId', authenticateAdmin, async (req: AuthenticatedRequest, res: Response) => {
  const { flowId } = req.params;
  try {
    const result = await pool.query(
      'DELETE FROM flows WHERE id = $1 AND project_id = $2 RETURNING id',
      [flowId, req.projectId]
    );

    if (result.rows.length === 0) {
      res.status(404).json({ message: 'Flow not found' });
      return;
    }

    res.json({ success: true, deletedFlowId: flowId });
  } catch (err: any) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// 6. Save all steps at once (admin/builder helper - replaces steps list)
app.post('/api/v1/admin/flows/:flowId/steps/sync', authenticateAdmin, async (req: AuthenticatedRequest, res: Response) => {
  const { flowId } = req.params;
  const { steps } = req.body; // Array of steps
  if (!Array.isArray(steps)) {
    res.status(400).json({ message: 'steps array is required' });
    return;
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Verify flow belongs to project
    const flowCheck = await client.query(
      'SELECT id FROM flows WHERE id = $1 AND project_id = $2',
      [flowId, req.projectId]
    );
    if (flowCheck.rows.length === 0) {
      res.status(404).json({ message: 'Flow not found' });
      return;
    }

    // Delete existing steps
    await client.query('DELETE FROM steps WHERE flow_id = $1', [flowId]);

    // Insert new steps
    const insertedSteps = [];
    for (let idx = 0; idx < steps.length; idx++) {
      const step = steps[idx];
      const result = await client.query(
        `INSERT INTO steps (flow_id, order_index, title, content, selector, placement, display_mode, buttons, auto_advance_delay, auto_scroll, block_interaction, spotlight_padding, css_class, conditions) 
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14) 
         RETURNING id, order_index as "orderIndex", title, content, selector, placement, display_mode as "displayMode", buttons, auto_advance_delay as "autoAdvanceDelay", auto_scroll as "autoScroll", block_interaction as "blockInteraction", spotlight_padding as "spotlightPadding", css_class as "cssClass", conditions`,
        [
          flowId,
          idx, // order_index is 0-based in DB
          step.title || 'Step Title',
          step.content || '',
          JSON.stringify(step.selector),
          step.placement || 'auto',
          step.displayMode || 'tooltip',
          JSON.stringify(step.buttons || []),
          step.autoAdvanceDelay || 0,
          step.autoScroll !== false,
          !!step.blockInteraction,
          step.spotlightPadding || 8,
          step.cssClass || '',
          JSON.stringify(step.conditions || [])
        ]
      );
      insertedSteps.push(result.rows[0]);
    }

    // Increment flow version on sync
    await client.query(
      'UPDATE flows SET version = version + 1, updated_at = NOW() WHERE id = $1',
      [flowId]
    );

    await client.query('COMMIT');
    res.json(insertedSteps);
  } catch (err: any) {
    await client.query('ROLLBACK');
    res.status(500).json({ message: 'Server error during step synchronization', error: err.message });
  } finally {
    client.release();
  }
});

// 7. Get Analytics Aggregates (admin dashboard)
app.get('/api/v1/admin/analytics/summary', authenticateAdmin, async (req: AuthenticatedRequest, res: Response) => {
  try {
    // Total events count
    const totalEvents = await pool.query(
      'SELECT COUNT(*) FROM analytics_events WHERE project_id = $1',
      [req.projectId]
    );

    // Count by types
    const eventsByType = await pool.query(
      `SELECT type, COUNT(*) as count 
       FROM analytics_events 
       WHERE project_id = $1 
       GROUP BY type`,
      [req.projectId]
    );

    // Active tours views and completions
    const tourMetrics = await pool.query(
      `SELECT 
        f.id as "flowId", 
        f.name,
        COUNT(CASE WHEN ae.type = 'flow_started' THEN 1 END) as starts,
        COUNT(CASE WHEN ae.type = 'flow_completed' THEN 1 END) as completions,
        COUNT(CASE WHEN ae.type = 'flow_dismissed' THEN 1 END) as dismissals
       FROM flows f
       LEFT JOIN analytics_events ae ON ae.flow_id = f.id::varchar
       WHERE f.project_id = $1
       GROUP BY f.id, f.name`,
      [req.projectId]
    );

    // Step views dropoff analysis
    const stepMetrics = await pool.query(
      `SELECT 
        ae.flow_id as "flowId", 
        ae.step_id as "stepId", 
        (ae.properties->>'stepIndex')::integer as "stepIndex",
        COUNT(*) as views
       FROM analytics_events ae
       WHERE ae.project_id = $1 AND ae.type = 'step_viewed'
       GROUP BY ae.flow_id, ae.step_id, "stepIndex"
       ORDER BY ae.flow_id, "stepIndex" ASC`,
      [req.projectId]
    );

    res.json({
      totalEvents: parseInt(totalEvents.rows[0].count),
      eventsByType: eventsByType.rows,
      tourMetrics: tourMetrics.rows.map(row => ({
        ...row,
        starts: parseInt(row.starts || '0'),
        completions: parseInt(row.completions || '0'),
        dismissals: parseInt(row.dismissals || '0')
      })),
      stepMetrics: stepMetrics.rows.map(row => ({
        ...row,
        views: parseInt(row.views || '0')
      }))
    });
  } catch (err: any) {
    res.status(500).json({ message: 'Server error loading analytics summary', error: err.message });
  }
});

// 8. Upload media asset (admin)
app.post('/api/v1/admin/upload', authenticateAdmin, upload.single('image'), (req: any, res: Response) => {
  if (!req.file) {
    res.status(400).json({ message: 'No file uploaded' });
    return;
  }
  // Multer-storage-cloudinary provides the secure URL in path
  res.json({
    url: req.file.path,
    publicId: req.file.filename,
    originalName: req.file.originalname,
  });
});

// Fallback to serving index.html for dashboard single page app routes
app.get('*', (req: Request, res: Response) => {
  res.sendFile(path.join(__dirname, '../public/dashboard/index.html'));
});

// Bootstrap Database and Start Server
bootstrapDb()
  .then(() => {
    app.listen(PORT, () => {
      console.log(`[Server] Kenzo DAP API running on http://localhost:${PORT}`);
    });
  })
  .catch((err) => {
    console.error('[Server] CRITICAL: DB Bootstrap failed. Server exiting.', err);
    process.exit(1);
  });
