import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import path from 'path';
import jwt from 'jsonwebtoken';
import https from 'https';
import http from 'http';
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

// 3b. Save SDK Analytics Batch (Bypasses adblockers by using a generic path /api/v1/data/sync)
app.post('/api/v1/data/sync', authenticateSdk, async (req: AuthenticatedRequest, res: Response) => {
  const { events } = req.body;
  if (!Array.isArray(events)) {
    res.status(400).json({ message: 'events array is required' });
    return;
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    for (const event of events) {
      const { type, flowId, stepId, sessionId, url, userAgent, properties } = event;
      await client.query(
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
    }
    await client.query('COMMIT');
    res.json({ success: true });
  } catch (err: any) {
    await client.query('ROLLBACK');
    res.status(500).json({ message: 'Server error', error: err.message });
  } finally {
    client.release();
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

// 0a. List all projects
app.get('/api/v1/admin/projects', async (req: Request, res: Response) => {
  try {
    const result = await pool.query('SELECT id, name, api_key as "apiKey", created_at as "createdAt" FROM projects ORDER BY created_at DESC');
    res.json(result.rows);
  } catch (err: any) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// Helper to request URL contents asynchronously using Node's standard libraries
function fetchHtml(urlStr: string): Promise<string> {
  return new Promise((resolve) => {
    try {
      const client = urlStr.startsWith('https') ? https : http;
      const req = client.get(urlStr, { timeout: 3000 }, (res) => {
        let data = '';
        res.on('data', (chunk) => { data += chunk; });
        res.on('end', () => { resolve(data); });
      });
      req.on('error', () => { resolve(''); });
      req.on('timeout', () => { req.destroy(); resolve(''); });
    } catch (e) {
      resolve('');
    }
  });
}

// Helper to seed template flows and steps for newly registered projects (with smart HTML scanning)
async function seedProjectData(projectId: string, projectName: string, websiteUrl?: string) {
  let targetPattern = '/';
  let html = '';
  
  if (websiteUrl && websiteUrl.trim()) {
    try {
      const targetUrl = websiteUrl.startsWith('http') ? websiteUrl : `https://${websiteUrl}`;
      const parsedUrl = new URL(targetUrl);
      targetPattern = parsedUrl.pathname || '/';
      html = await fetchHtml(targetUrl);
      console.log(`[Database] Scanned website URL ${targetUrl}. Length: ${html.length} bytes.`);
    } catch (e) {
      console.warn('[Database] Failed to parse/fetch website URL:', websiteUrl, e);
    }
  }

  // Parse HTML tags using regex
  let parsedLinks: Array<{ href: string; text: string }> = [];
  let parsedButtons: string[] = [];
  let hasInput = false;

  if (html) {
    try {
      // Extract links
      const linkMatches = [...html.matchAll(/<a\s+[^>]*href=["']([^"']+)["'][^>]*>(.*?)<\/a>/gi)];
      parsedLinks = linkMatches
        .map(m => ({
          href: m[1],
          text: m[2].replace(/<[^>]*>/g, '').trim()
        }))
        .filter(l => l.text.length > 2 && !l.href.startsWith('#') && !l.href.startsWith('javascript:'))
        .slice(0, 5); // Take top 5 links

      // Extract buttons
      const buttonMatches = [...html.matchAll(/<button\s*[^>]*>(.*?)<\/button>/gi)];
      parsedButtons = buttonMatches
        .map(m => m[1].replace(/<[^>]*>/g, '').trim())
        .filter(b => b.length > 2)
        .slice(0, 5);

      // Check for inputs
      hasInput = html.includes('<input');
    } catch (e) {
      console.error('[Database] Error parsing HTML regex:', e);
    }
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // 1. CREATE ONBOARDING FLOW
    const flow1Result = await client.query(`
      INSERT INTO flows (project_id, name, description, status, version, url_rules, priority)
      VALUES ($1, $2, $3, $4, 1, $5, 10)
      RETURNING id
    `, [
      projectId, 
      `Welcome to ${projectName}!`, 
      `Interactive onboarding guide dynamically built by scanning ${websiteUrl || 'your website'}.`, 
      'published', 
      JSON.stringify([{ type: 'contains', pattern: targetPattern }])
    ]);
    
    const flow1Id = flow1Result.rows[0].id;
    let orderIndex = 0;

    // Step 1: Welcome Overlay (Body Modal)
    await client.query(`
      INSERT INTO steps (flow_id, order_index, title, content, selector, placement, display_mode, buttons)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
    `, [
      flow1Id,
      orderIndex++,
      `Explore ${projectName}`,
      `Welcome! This interactive guide will take you through the core highlights of our application. Click Start to begin.`,
      JSON.stringify({ type: 'css', value: 'body' }),
      'center',
      'modal',
      JSON.stringify([{ text: 'Start Tour', action: 'next', style: 'primary' }])
    ]);

    // Step 2: Header Navigation / Logo
    await client.query(`
      INSERT INTO steps (flow_id, order_index, title, content, selector, placement, display_mode, buttons)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
    `, [
      flow1Id,
      orderIndex++,
      'Branding & Menu',
      'Use this header section to check the website logo, access quick links, and toggle navigation menus.',
      JSON.stringify({ type: 'css', value: 'header, nav, .header, #header, .logo-container, .logo' }),
      'bottom',
      'tooltip',
      JSON.stringify([
        { text: 'Back', action: 'prev', style: 'secondary' },
        { text: 'Next', action: 'next', style: 'primary' }
      ])
    ]);

    // Step 3 (Dynamic Link Onboarding): Add steps for scanned links if available
    let linkStepCreated = false;
    for (const link of parsedLinks) {
      if (link.text.toLowerCase().includes('about') || 
          link.text.toLowerCase().includes('service') || 
          link.text.toLowerCase().includes('contact') || 
          link.text.toLowerCase().includes('appoin') || 
          link.text.toLowerCase().includes('dashboard') ||
          link.text.toLowerCase().includes('doctor') ||
          link.text.toLowerCase().includes('patient')) {
        
        await client.query(`
          INSERT INTO steps (flow_id, order_index, title, content, selector, placement, display_mode, buttons)
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        `, [
          flow1Id,
          orderIndex++,
          link.text,
          `Click this menu link to navigate directly to the ${link.text} section.`,
          JSON.stringify({ type: 'css', value: `a[href*="${link.href}"], a` }),
          'bottom',
          'tooltip',
          JSON.stringify([
            { text: 'Back', action: 'prev', style: 'secondary' },
            { text: 'Next', action: 'next', style: 'primary' }
          ])
        ]);
        linkStepCreated = true;
        break; // Seed at most 1 dynamic link step in the main tour
      }
    }

    // Fallback if no specific link matched
    if (!linkStepCreated) {
      await client.query(`
        INSERT INTO steps (flow_id, order_index, title, content, selector, placement, display_mode, buttons)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      `, [
        flow1Id,
        orderIndex++,
        'Navigation Controls',
        'Use these main page links to explore different pages, profiles, and dashboard services.',
        JSON.stringify({ type: 'css', value: 'a, nav a, .nav-item' }),
        'bottom',
        'tooltip',
        JSON.stringify([
          { text: 'Back', action: 'prev', style: 'secondary' },
          { text: 'Next', action: 'next', style: 'primary' }
        ])
      ]);
    }

    // Step 4: Content Area / Actions
    await client.query(`
      INSERT INTO steps (flow_id, order_index, title, content, selector, placement, display_mode, buttons)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
    `, [
      flow1Id,
      orderIndex++,
      'Work Area Overview',
      'This main viewport houses all reports, forms, and tools. Check details and fill information here.',
      JSON.stringify({ type: 'css', value: 'main, .main, #main, .content, #kpi-grid, body' }),
      'top',
      'tooltip',
      JSON.stringify([
        { text: 'Back', action: 'prev', style: 'secondary' },
        { text: 'Finish Onboarding', action: 'close', style: 'primary' }
      ])
    ]);

    // 2. CREATE SECOND FLOW: INTERACTION GUIDE
    const flow2Result = await client.query(`
      INSERT INTO flows (project_id, name, description, status, version, url_rules, priority)
      VALUES ($1, $2, $3, $4, 1, $5, 5)
      RETURNING id
    `, [
      projectId,
      'Actions & Forms Guide',
      `Walks users through buttons, inputs, and form controls found on ${projectName}.`,
      'published',
      JSON.stringify([{ type: 'contains', pattern: targetPattern }])
    ]);

    const flow2Id = flow2Result.rows[0].id;
    let orderIndex2 = 0;

    // Step 1: Dynamic Buttons
    let buttonSelector = 'button, .btn, a.btn, input[type="submit"]';
    let buttonStepTitle = 'Buttons & Actions';
    let buttonStepContent = 'Click buttons, submit inputs, or log details using these primary action controls.';
    
    if (parsedButtons.length > 0) {
      const bestBtn = parsedButtons[0];
      buttonStepTitle = `Action: ${bestBtn}`;
      buttonStepContent = `Trigger events, submit fields, or proceed by clicking the "${bestBtn}" button.`;
      buttonSelector = `button`; // Target standard button
    }

    await client.query(`
      INSERT INTO steps (flow_id, order_index, title, content, selector, placement, display_mode, buttons)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
    `, [
      flow2Id,
      orderIndex2++,
      buttonStepTitle,
      buttonStepContent,
      JSON.stringify({ type: 'css', value: buttonSelector }),
      'bottom',
      'tooltip',
      JSON.stringify([{ text: 'Got it', action: 'next', style: 'primary' }])
    ]);

    // Step 2: Inputs if found
    if (hasInput) {
      await client.query(`
        INSERT INTO steps (flow_id, order_index, title, content, selector, placement, display_mode, buttons)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      `, [
        flow2Id,
        orderIndex2++,
        'Form Fields & Input',
        'Enter email address, search keywords, or patient details directly inside this text field.',
        JSON.stringify({ type: 'css', value: 'input[type="text"], input[type="email"], input' }),
        'bottom',
        'tooltip',
        JSON.stringify([
          { text: 'Back', action: 'prev', style: 'secondary' },
          { text: 'Next', action: 'next', style: 'primary' }
        ])
      ]);
    }

    // Step 3: Footer / Support info
    await client.query(`
      INSERT INTO steps (flow_id, order_index, title, content, selector, placement, display_mode, buttons)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
    `, [
      flow2Id,
      orderIndex2++,
      'Footer & Documentation',
      'Find support links, privacy policies, and copyright details at the bottom of the page.',
      JSON.stringify({ type: 'css', value: 'footer, .footer, #footer' }),
      'top',
      'tooltip',
      JSON.stringify([
        { text: 'Back', action: 'prev', style: 'secondary' },
        { text: 'Finish Guide', action: 'close', style: 'primary' }
      ])
    ]);

    await client.query('COMMIT');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('[Database] Failed to seed project data:', err);
    throw err;
  } finally {
    client.release();
  }
}

// 0b. Create a project (website)
app.post('/api/v1/admin/projects', async (req: Request, res: Response) => {
  const { name, url } = req.body;
  if (!name) {
    res.status(400).json({ message: 'Project name is required' });
    return;
  }
  try {
    const apiKey = `kenzo_project_${Date.now()}_key_${Math.random().toString(36).substring(2, 7)}`;
    const result = await pool.query(
      'INSERT INTO projects (name, api_key) VALUES ($1, $2) RETURNING id, name, api_key as "apiKey", created_at as "createdAt"',
      [name, apiKey]
    );
    const newProject = result.rows[0];

    // Seed default campaign flows and walkthrough steps automatically
    await seedProjectData(newProject.id, name, url);

    res.json(newProject);
  } catch (err: any) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// 0c. Delete a project (website)
app.delete('/api/v1/admin/projects/:id', async (req: Request, res: Response) => {
  const { id } = req.params;
  try {
    const result = await pool.query(
      'DELETE FROM projects WHERE id = $1 RETURNING id, name',
      [id]
    );
    if (result.rows.length === 0) {
      res.status(404).json({ message: 'Website project not found' });
      return;
    }
    res.json({ success: true, deleted: result.rows[0] });
  } catch (err: any) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

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
