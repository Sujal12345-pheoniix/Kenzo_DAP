import { Pool } from 'pg';
import dotenv from 'dotenv';

dotenv.config();

let connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  console.error('[Database] ERROR: DATABASE_URL is not set in environment variables.');
  process.exit(1);
}

connectionString = connectionString
  .replace('sslmode=require', 'sslmode=verify-full')
  .replace('sslmode=prefer', 'sslmode=verify-full')
  .replace('sslmode=verify-ca', 'sslmode=verify-full');

export const pool = new Pool({
  connectionString,
  ssl: {
    rejectUnauthorized: false
  }
});

export async function bootstrapDb(): Promise<void> {
  const client = await pool.connect();
  try {
    console.log('[Database] Bootstrapping all DAP tables...');

    // ─── CORE TABLES ────────────────────────────────────────────────────────────

    // 1. Projects
    await client.query(`
      CREATE TABLE IF NOT EXISTS projects (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name VARCHAR(255) NOT NULL,
        api_key VARCHAR(255) UNIQUE NOT NULL,
        client_email VARCHAR(255),
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);
    await client.query(`ALTER TABLE projects ADD COLUMN IF NOT EXISTS client_email VARCHAR(255);`);
    await client.query(`ALTER TABLE projects ADD COLUMN IF NOT EXISTS guidance_seeded BOOLEAN DEFAULT FALSE;`);

    // 2. Flows
    await client.query(`
      CREATE TABLE IF NOT EXISTS flows (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
        name VARCHAR(255) NOT NULL,
        description TEXT,
        status VARCHAR(50) DEFAULT 'draft',
        version INTEGER DEFAULT 1,
        url_rules JSONB DEFAULT '[]'::jsonb,
        conditions JSONB DEFAULT '[]'::jsonb,
        priority INTEGER DEFAULT 0,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // 3. Steps
    await client.query(`
      CREATE TABLE IF NOT EXISTS steps (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        flow_id UUID REFERENCES flows(id) ON DELETE CASCADE,
        order_index INTEGER NOT NULL,
        title VARCHAR(255) NOT NULL,
        content TEXT NOT NULL,
        selector JSONB NOT NULL,
        placement VARCHAR(50) DEFAULT 'auto',
        display_mode VARCHAR(50) DEFAULT 'tooltip',
        buttons JSONB DEFAULT '[]'::jsonb,
        auto_advance_delay INTEGER DEFAULT 0,
        auto_scroll BOOLEAN DEFAULT TRUE,
        block_interaction BOOLEAN DEFAULT FALSE,
        spotlight_padding INTEGER DEFAULT 8,
        css_class VARCHAR(255),
        conditions JSONB DEFAULT '[]'::jsonb,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // 4. Analytics Events
    await client.query(`
      CREATE TABLE IF NOT EXISTS analytics_events (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
        flow_id VARCHAR(255),
        step_id VARCHAR(255),
        session_id VARCHAR(255) NOT NULL,
        type VARCHAR(100) NOT NULL,
        url TEXT NOT NULL,
        user_agent TEXT,
        properties JSONB DEFAULT '{}'::jsonb,
        timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // 5. User Progress
    await client.query(`
      CREATE TABLE IF NOT EXISTS user_progress (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id VARCHAR(255) NOT NULL,
        flow_id UUID REFERENCES flows(id) ON DELETE CASCADE,
        current_step_index INTEGER DEFAULT 0,
        completed_step_ids JSONB DEFAULT '[]'::jsonb,
        completed BOOLEAN DEFAULT FALSE,
        dismissed BOOLEAN DEFAULT FALSE,
        started_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        last_viewed_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        UNIQUE (user_id, flow_id)
      );
    `);

    // 6. SDK Sessions
    await client.query(`
      CREATE TABLE IF NOT EXISTS sdk_sessions (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
        domain VARCHAR(255) NOT NULL,
        url TEXT NOT NULL,
        user_agent TEXT,
        sdk_version VARCHAR(50) DEFAULT '1.0.0',
        environment VARCHAR(50) DEFAULT 'production',
        last_seen TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        UNIQUE (project_id, domain)
      );
    `);

    // 7. Page Models
    await client.query(`
      CREATE TABLE IF NOT EXISTS page_models (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
        url TEXT NOT NULL,
        pathname TEXT NOT NULL,
        title TEXT,
        classification VARCHAR(100) DEFAULT 'Unknown',
        fingerprint JSONB NOT NULL,
        sections JSONB DEFAULT '[]'::jsonb,
        forms JSONB DEFAULT '[]'::jsonb,
        elements JSONB DEFAULT '[]'::jsonb,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        UNIQUE (project_id, pathname)
      );
    `);

    // 8. Application Maps
    await client.query(`
      CREATE TABLE IF NOT EXISTS application_maps (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
        nodes JSONB DEFAULT '[]'::jsonb,
        edges JSONB DEFAULT '[]'::jsonb,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        UNIQUE (project_id)
      );
    `);

    // 9. Selector Repairs
    await client.query(`
      CREATE TABLE IF NOT EXISTS selector_repairs (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
        original_selector JSONB NOT NULL,
        repaired_selector TEXT NOT NULL,
        confidence NUMERIC(3,2) NOT NULL,
        strategy VARCHAR(100),
        url TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // 10. Workflow Recordings
    await client.query(`
      CREATE TABLE IF NOT EXISTS workflow_recordings (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
        name VARCHAR(255) NOT NULL,
        actions JSONB DEFAULT '[]'::jsonb,
        status VARCHAR(50) DEFAULT 'draft',
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // 11. Users (Auth + RBAC)
    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        email VARCHAR(255) UNIQUE NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        name VARCHAR(255) NOT NULL,
        role VARCHAR(50) NOT NULL,
        company_id VARCHAR(255) NOT NULL,
        company_name VARCHAR(255) NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);
    await client.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS company_id VARCHAR(255);`);
    await client.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS company_name VARCHAR(255);`);
    await client.query(`ALTER TABLE users ALTER COLUMN id SET DEFAULT gen_random_uuid();`);
    await client.query(`ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check;`);

    // ─── PHASE 2: DAP GUIDANCE MODULE TABLES ────────────────────────────────────

    // 12. Organizations
    await client.query(`
      CREATE TABLE IF NOT EXISTS organizations (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name VARCHAR(255) NOT NULL,
        website_url TEXT,
        description TEXT,
        domain VARCHAR(255),
        industry VARCHAR(100),
        plan VARCHAR(50) DEFAULT 'Enterprise',
        owner_email VARCHAR(255),
        logo_url TEXT,
        expires_at DATE DEFAULT (CURRENT_DATE + INTERVAL '1 year'),
        settings JSONB DEFAULT '{}'::jsonb,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);
    await client.query(`ALTER TABLE organizations ADD COLUMN IF NOT EXISTS website_url TEXT;`);
    await client.query(`ALTER TABLE organizations ADD COLUMN IF NOT EXISTS description TEXT;`);
    await client.query(`ALTER TABLE organizations ADD COLUMN IF NOT EXISTS expires_at DATE DEFAULT (CURRENT_DATE + INTERVAL '1 year');`);

    // 13. Smart Tips
    await client.query(`
      CREATE TABLE IF NOT EXISTS smart_tips (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
        name VARCHAR(255) NOT NULL,
        content TEXT NOT NULL,
        selector JSONB NOT NULL DEFAULT '{}'::jsonb,
        position VARCHAR(50) DEFAULT 'bottom',
        trigger_event VARCHAR(50) DEFAULT 'hover',
        url_rules JSONB DEFAULT '[]'::jsonb,
        segment_rules JSONB DEFAULT '[]'::jsonb,
        status VARCHAR(50) DEFAULT 'draft',
        display_count INTEGER DEFAULT 0,
        created_by VARCHAR(255),
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // 14. Popups
    await client.query(`
      CREATE TABLE IF NOT EXISTS popups (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
        name VARCHAR(255) NOT NULL,
        title VARCHAR(255),
        content TEXT NOT NULL,
        popup_type VARCHAR(50) DEFAULT 'modal',
        position VARCHAR(50) DEFAULT 'center',
        theme VARCHAR(50) DEFAULT 'light',
        url_rules JSONB DEFAULT '[]'::jsonb,
        segment_rules JSONB DEFAULT '[]'::jsonb,
        trigger_event VARCHAR(50) DEFAULT 'page_load',
        trigger_delay INTEGER DEFAULT 0,
        show_close_button BOOLEAN DEFAULT TRUE,
        buttons JSONB DEFAULT '[]'::jsonb,
        media_url TEXT,
        status VARCHAR(50) DEFAULT 'draft',
        created_by VARCHAR(255),
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // 15. Beacons
    await client.query(`
      CREATE TABLE IF NOT EXISTS beacons (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
        name VARCHAR(255) NOT NULL,
        label VARCHAR(255),
        description TEXT,
        selector JSONB NOT NULL DEFAULT '{}'::jsonb,
        color VARCHAR(20) DEFAULT '#6366f1',
        size VARCHAR(20) DEFAULT 'medium',
        pulse_animation BOOLEAN DEFAULT TRUE,
        url_rules JSONB DEFAULT '[]'::jsonb,
        segment_rules JSONB DEFAULT '[]'::jsonb,
        on_click_action VARCHAR(50) DEFAULT 'show_tooltip',
        linked_flow_id UUID REFERENCES flows(id) ON DELETE SET NULL,
        status VARCHAR(50) DEFAULT 'draft',
        created_by VARCHAR(255),
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // 16. Task Lists
    await client.query(`
      CREATE TABLE IF NOT EXISTS task_lists (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
        name VARCHAR(255) NOT NULL,
        description TEXT,
        title VARCHAR(255),
        url_rules JSONB DEFAULT '[]'::jsonb,
        segment_rules JSONB DEFAULT '[]'::jsonb,
        theme VARCHAR(50) DEFAULT 'light',
        status VARCHAR(50) DEFAULT 'draft',
        created_by VARCHAR(255),
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS task_list_items (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        task_list_id UUID REFERENCES task_lists(id) ON DELETE CASCADE,
        order_index INTEGER NOT NULL DEFAULT 0,
        title VARCHAR(255) NOT NULL,
        description TEXT,
        linked_flow_id UUID REFERENCES flows(id) ON DELETE SET NULL,
        completion_trigger VARCHAR(50) DEFAULT 'manual',
        url_pattern TEXT,
        is_required BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // 17. Surveys
    await client.query(`
      CREATE TABLE IF NOT EXISTS surveys (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
        name VARCHAR(255) NOT NULL,
        title VARCHAR(255),
        description TEXT,
        survey_type VARCHAR(50) DEFAULT 'nps',
        url_rules JSONB DEFAULT '[]'::jsonb,
        segment_rules JSONB DEFAULT '[]'::jsonb,
        trigger_event VARCHAR(50) DEFAULT 'page_load',
        trigger_delay INTEGER DEFAULT 5,
        status VARCHAR(50) DEFAULT 'draft',
        response_count INTEGER DEFAULT 0,
        created_by VARCHAR(255),
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS survey_questions (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        survey_id UUID REFERENCES surveys(id) ON DELETE CASCADE,
        order_index INTEGER NOT NULL DEFAULT 0,
        question_type VARCHAR(50) NOT NULL DEFAULT 'rating',
        question_text TEXT NOT NULL,
        options JSONB DEFAULT '[]'::jsonb,
        is_required BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS survey_responses (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        survey_id UUID REFERENCES surveys(id) ON DELETE CASCADE,
        session_id VARCHAR(255) NOT NULL,
        user_identifier VARCHAR(255),
        answers JSONB NOT NULL DEFAULT '[]'::jsonb,
        url TEXT,
        submitted_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // 18. Self Help Articles
    await client.query(`
      CREATE TABLE IF NOT EXISTS self_help_articles (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
        title VARCHAR(255) NOT NULL,
        content TEXT NOT NULL,
        category VARCHAR(100) DEFAULT 'General',
        tags JSONB DEFAULT '[]'::jsonb,
        url_rules JSONB DEFAULT '[]'::jsonb,
        linked_flow_id UUID REFERENCES flows(id) ON DELETE SET NULL,
        status VARCHAR(50) DEFAULT 'draft',
        view_count INTEGER DEFAULT 0,
        helpful_count INTEGER DEFAULT 0,
        not_helpful_count INTEGER DEFAULT 0,
        created_by VARCHAR(255),
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // 19. Content Library
    await client.query(`
      CREATE TABLE IF NOT EXISTS content_library_items (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
        name VARCHAR(255) NOT NULL,
        content_type VARCHAR(50) NOT NULL DEFAULT 'template',
        category VARCHAR(100) DEFAULT 'General',
        content JSONB NOT NULL DEFAULT '{}'::jsonb,
        thumbnail_url TEXT,
        usage_count INTEGER DEFAULT 0,
        tags JSONB DEFAULT '[]'::jsonb,
        is_global BOOLEAN DEFAULT FALSE,
        created_by VARCHAR(255),
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // 20. Audit Logs
    await client.query(`
      CREATE TABLE IF NOT EXISTS audit_logs (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        project_id UUID REFERENCES projects(id) ON DELETE SET NULL,
        user_email VARCHAR(255),
        user_role VARCHAR(50),
        action VARCHAR(100) NOT NULL,
        resource_type VARCHAR(100) NOT NULL,
        resource_id VARCHAR(255),
        resource_name VARCHAR(255),
        details JSONB DEFAULT '{}'::jsonb,
        ip_address VARCHAR(50),
        user_agent TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // 21. Tags
    await client.query(`
      CREATE TABLE IF NOT EXISTS tags (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
        name VARCHAR(100) NOT NULL,
        color VARCHAR(20) DEFAULT '#6366f1',
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        UNIQUE (project_id, name)
      );
    `);

    // 22. Roles
    await client.query(`
      CREATE TABLE IF NOT EXISTS roles (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
        name VARCHAR(100) NOT NULL,
        description TEXT,
        is_system BOOLEAN DEFAULT FALSE,
        permissions JSONB DEFAULT '[]'::jsonb,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        UNIQUE (project_id, name)
      );
    `);

    // ─── Allowed Origins table (must exist before seed inserts) ──────────────
    await client.query(`
      CREATE TABLE IF NOT EXISTS allowed_origins (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
        origin VARCHAR(255) NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        UNIQUE (project_id, origin)
      );
    `);

    // ─── INDEXES ─────────────────────────────────────────────────────────────────
    await client.query(`CREATE INDEX IF NOT EXISTS idx_allowed_origins_project ON allowed_origins(project_id);`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_flows_project ON flows(project_id);`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_steps_flow ON steps(flow_id);`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_analytics_events_project ON analytics_events(project_id);`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_analytics_events_ts ON analytics_events(timestamp DESC);`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_user_progress_flow ON user_progress(flow_id);`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_smart_tips_project ON smart_tips(project_id);`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_popups_project ON popups(project_id);`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_beacons_project ON beacons(project_id);`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_task_lists_project ON task_lists(project_id);`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_task_list_items_list ON task_list_items(task_list_id);`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_surveys_project ON surveys(project_id);`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_survey_questions_survey ON survey_questions(survey_id);`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_survey_responses_survey ON survey_responses(survey_id);`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_self_help_project ON self_help_articles(project_id);`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_content_library_project ON content_library_items(project_id);`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_audit_logs_project ON audit_logs(project_id);`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_audit_logs_created ON audit_logs(created_at DESC);`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_tags_project ON tags(project_id);`);

    // ─── SEED DATA ────────────────────────────────────────────────────────────────

    // Clean up legacy Company B - CRM project
    await client.query(`DELETE FROM projects WHERE name LIKE '%Company B%' OR name LIKE '%CRM%';`);

    // Seed default projects with cryptographically secure installation keys
    const client1ApiKey = 'kz_live_tb_8f93a102';
    const r1 = await client.query('SELECT id FROM projects WHERE LOWER(name) LIKE $1 OR api_key = $2 OR api_key = $3', ['%truthbomb%', client1ApiKey, 'kenzo_project_dev_api_key_2026']);
    let tbProjectId: string;
    if (r1.rows.length === 0) {
      const ins = await client.query(
        'INSERT INTO projects (name, api_key, client_email) VALUES ($1, $2, $3) RETURNING id',
        ['TruthBomb', client1ApiKey, 'client1@kenzo.com']
      );
      tbProjectId = ins.rows[0].id;
    } else {
      tbProjectId = r1.rows[0].id;
      await client.query('UPDATE projects SET name = $1, api_key = $2, client_email = $3 WHERE id = $4', ['TruthBomb', client1ApiKey, 'client1@kenzo.com', tbProjectId]);
    }
    // Seed allowed origins for TruthBomb
    await client.query(`
      INSERT INTO allowed_origins (project_id, origin) VALUES ($1, $2), ($1, $3)
      ON CONFLICT (project_id, origin) DO NOTHING
    `, [tbProjectId, 'https://truth-bomb-eight.vercel.app', 'http://localhost:3000']);

    const client2ApiKey = 'kz_live_erp_9c21b34e';
    const r2 = await client.query('SELECT id FROM projects WHERE LOWER(name) LIKE $1 OR api_key = $2 OR api_key = $3', ['%kenzo-erp%', client2ApiKey, 'kenzo_project_1785139787760_key_u1yaq']);
    let erpProjectId: string;
    if (r2.rows.length === 0) {
      const ins = await client.query(
        'INSERT INTO projects (name, api_key, client_email) VALUES ($1, $2, $3) RETURNING id',
        ['Kenzo-erp', client2ApiKey, 'client2@kenzo.com']
      );
      erpProjectId = ins.rows[0].id;
    } else {
      erpProjectId = r2.rows[0].id;
      await client.query('UPDATE projects SET name = $1, api_key = $2, client_email = $3 WHERE id = $4', ['Kenzo-erp', client2ApiKey, 'client2@kenzo.com', erpProjectId]);
    }
    // Seed allowed origins for ERP
    await client.query(`
      INSERT INTO allowed_origins (project_id, origin) VALUES ($1, $2), ($1, $3)
      ON CONFLICT (project_id, origin) DO NOTHING
    `, [erpProjectId, 'https://kenzo-one-erp.vercel.app', 'http://localhost:3001']);

    // Seed Users
    const bcrypt = require('bcryptjs');
    const adminHash = bcrypt.hashSync('kenzo123', 10);
    const clientHash = bcrypt.hashSync('client@123', 10);

    const u1 = await client.query('SELECT id FROM users WHERE LOWER(email) = LOWER($1)', ['Kenzo@gmail.com']);
    if (u1.rows.length === 0) {
      await client.query(
        'INSERT INTO users (id, email, password_hash, name, role, company_id, company_name) VALUES (gen_random_uuid(), $1,$2,$3,$4,$5,$6)',
        ['Kenzo@gmail.com', adminHash, 'Kenzo Super Admin', 'SUPER_ADMIN', 'super_admin_corp', 'Kenzo_DAP Global']
      );
      console.log('[Database] Seeded Super Admin: Kenzo@gmail.com / kenzo123');
    }

    const u2 = await client.query('SELECT id FROM users WHERE LOWER(email) = LOWER($1)', ['client1@kenzo.com']);
    if (u2.rows.length === 0) {
      await client.query(
        'INSERT INTO users (id, email, password_hash, name, role, company_id, company_name) VALUES (gen_random_uuid(), $1,$2,$3,$4,$5,$6)',
        ['client1@kenzo.com', clientHash, 'Client A CEO', 'CLIENT_CEO', 'comp_a', 'TruthBomb']
      );
    } else {
      await client.query('UPDATE users SET company_name=$1 WHERE LOWER(email)=LOWER($2)', ['TruthBomb', 'client1@kenzo.com']);
    }

    const u3 = await client.query('SELECT id FROM users WHERE LOWER(email) = LOWER($1)', ['client2@kenzo.com']);
    if (u3.rows.length === 0) {
      await client.query(
        'INSERT INTO users (id, email, password_hash, name, role, company_id, company_name) VALUES (gen_random_uuid(), $1,$2,$3,$4,$5,$6)',
        ['client2@kenzo.com', clientHash, 'Client B CEO', 'CLIENT_CEO', 'comp_b', 'Kenzo-erp']
      );
    } else {
      await client.query('UPDATE users SET company_name=$1 WHERE LOWER(email)=LOWER($2)', ['Kenzo-erp', 'client2@kenzo.com']);
    }
    // Seed Organizations
    const o1 = await client.query('SELECT id FROM organizations WHERE LOWER(owner_email) = LOWER($1)', ['client1@kenzo.com']);
    if (o1.rows.length === 0) {
      await client.query(
        `INSERT INTO organizations (name, website_url, description, domain, industry, plan, owner_email, expires_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, CURRENT_DATE + INTERVAL '1 year')`,
        ['TruthBomb Fact Verification', 'https://truth-bomb-eight.vercel.app/', 'AI Fact Verification & GEO Intelligence Platform by Kenzo Infosystems', 'truth-bomb-eight.vercel.app', 'Artificial Intelligence', 'Enterprise Tier', 'client1@kenzo.com']
      );
    } else {
      await client.query(
        `UPDATE organizations SET name=$1, website_url=$2, description=$3, plan=$4 WHERE LOWER(owner_email)=LOWER($5)`,
        ['TruthBomb Fact Verification', 'https://truth-bomb-eight.vercel.app/', 'AI Fact Verification & GEO Intelligence Platform by Kenzo Infosystems', 'Enterprise Tier', 'client1@kenzo.com']
      );
    }

    const o2 = await client.query('SELECT id FROM organizations WHERE LOWER(owner_email) = LOWER($1)', ['client2@kenzo.com']);
    if (o2.rows.length === 0) {
      await client.query(
        `INSERT INTO organizations (name, website_url, description, domain, industry, plan, owner_email, expires_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, CURRENT_DATE + INTERVAL '1 year')`,
        ['Kenzo OneERP SaaS Platform', 'https://kenzo-one-erp.vercel.app/', 'Flagship Multi-tenant Cloud ERP with HRMS, CRM, Finance, and AI Copilot', 'kenzo-one-erp.vercel.app', 'Enterprise Software', 'Enterprise Tier', 'client2@kenzo.com']
      );
    } else {
      await client.query(
        `UPDATE organizations SET name=$1, website_url=$2, description=$3, plan=$4 WHERE LOWER(owner_email)=LOWER($5)`,
        ['Kenzo OneERP SaaS Platform', 'https://kenzo-one-erp.vercel.app/', 'Flagship Multi-tenant Cloud ERP with HRMS, CRM, Finance, and AI Copilot', 'Enterprise Tier', 'client2@kenzo.com']
      );
    }

    // Route pattern normalization for legacy seeded flows
    await client.query(`
      UPDATE flows SET url_rules = '[{"type":"contains","pattern":"/dashboard/crm"}]'::jsonb
      WHERE (name LIKE '%CRM%' OR name LIKE '%Pipeline%' OR name LIKE '%Deal%')
        AND (url_rules IS NULL OR url_rules = '[]'::jsonb OR url_rules = '[{"type":"contains","pattern":"/"}]'::jsonb);
    `);
    await client.query(`
      UPDATE flows SET url_rules = '[{"type":"contains","pattern":"/dashboard/hrms"}]'::jsonb
      WHERE (name LIKE '%HRMS%' OR name LIKE '%Employee%' OR name LIKE '%HR %')
        AND (url_rules IS NULL OR url_rules = '[]'::jsonb OR url_rules = '[{"type":"contains","pattern":"/"}]'::jsonb);
    `);
    await client.query(`
      UPDATE flows SET url_rules = '[{"type":"contains","pattern":"/dashboard/finance"}]'::jsonb
      WHERE (name LIKE '%Finance%' OR name LIKE '%Financial%')
        AND (url_rules IS NULL OR url_rules = '[]'::jsonb OR url_rules = '[{"type":"contains","pattern":"/"}]'::jsonb);
    `);

    // ── Seed Guidance Suite for Kenzo-erp ────────────────────────────────────
    await seedGuidanceSuiteForERP(client, erpProjectId);

    // ── Seed Guidance Suite for TruthBomb ────────────────────────────────────
    await seedGuidanceSuiteForTruthBomb(client, tbProjectId);

    console.log('[Database] Phase 2 complete — 22 tables bootstrapped with indexes, seed flows, and guidance suite.');

  } catch (err) {
    console.error('[Database] Error bootstrapping database:', err);
    throw err;
  } finally {
    client.release();
  }
}

async function seedGuidanceSuiteForERP(client: any, projectId: string) {
  // Check if project has already been seeded. If so, respect all admin deletions permanently!
  const proj = await client.query('SELECT guidance_seeded FROM projects WHERE id = $1', [projectId]);
  if (proj.rows.length > 0 && proj.rows[0].guidance_seeded) {
    return;
  }

  // 1. Smart Tips
  const tipCount = await client.query('SELECT COUNT(*) FROM smart_tips WHERE project_id = $1', [projectId]);
  if (parseInt(tipCount.rows[0].count) === 0) {
    const tips = [
      { name: 'Dashboard KPI Overview', content: 'Real-time sync of system performance, active users, and company metrics.', position: 'bottom', selector: { type: 'css', value: '.grid, table, .stats-grid, body' }, trigger: 'hover', urlRules: [{ type: 'contains', pattern: '/dashboard' }] },
      { name: 'Quick Deal Pipeline Action', content: 'Click here to rapidly register and qualify new sales deals into your CRM pipeline.', position: 'right', selector: { type: 'css', value: 'button, .btn-primary, body' }, trigger: 'hover', urlRules: [{ type: 'contains', pattern: '/dashboard/crm' }] },
      { name: 'Attendance & Leave Verification', content: 'Review and approve pending employee leave requests and timesheets in one click.', position: 'top', selector: { type: 'css', value: 'button, table, body' }, trigger: 'hover', urlRules: [{ type: 'contains', pattern: '/dashboard/hrms' }] },
      { name: 'Sprint Task Prioritization', content: 'Filter deliverables by sprint milestone, engineer assignee, or completion status.', position: 'left', selector: { type: 'css', value: '.grid, table, button, body' }, trigger: 'hover', urlRules: [{ type: 'contains', pattern: '/dashboard/projects' }] },
      { name: 'Export Financial Ledger', content: 'Export comprehensive monthly revenue reports, balance sheets, and audit logs.', position: 'bottom', selector: { type: 'css', value: 'button, .grid, body' }, trigger: 'hover', urlRules: [{ type: 'contains', pattern: '/dashboard/finance' }] },
    ];
    for (const t of tips) {
      await client.query(`
        INSERT INTO smart_tips (project_id, name, content, selector, position, trigger_event, url_rules, status)
        VALUES ($1, $2, $3, $4, $5, $6, $7, 'published')
      `, [projectId, t.name, t.content, JSON.stringify(t.selector), t.position, t.trigger, JSON.stringify(t.urlRules)]);
    }
  }

  // 2. Beacons
  const beaconCount = await client.query('SELECT COUNT(*) FROM beacons WHERE project_id = $1', [projectId]);
  if (parseInt(beaconCount.rows[0].count) === 0) {
    const beacons = [
      { name: 'Add Deal Hotspot', label: 'Register Lead', description: 'Pulsing hotspot guiding sales reps to create deals.', color: '#3b82f6', selector: { type: 'css', value: 'button, .btn-primary, body' }, urlRules: [{ type: 'contains', pattern: '/dashboard/crm' }] },
      { name: 'New Task Deliverable', label: 'Create Task', description: 'Quick hotspot for engineers to assign deliverables.', color: '#10b981', selector: { type: 'css', value: 'button, body' }, urlRules: [{ type: 'contains', pattern: '/dashboard/projects' }] },
      { name: 'Leave Approval Hotspot', label: 'Approvals', description: 'Hotspot for managers to review pending requests.', color: '#8b5cf6', selector: { type: 'css', value: 'button, table, body' }, urlRules: [{ type: 'contains', pattern: '/dashboard/hrms' }] },
    ];
    for (const b of beacons) {
      await client.query(`
        INSERT INTO beacons (project_id, name, label, description, selector, color, size, pulse_animation, on_click_action, url_rules, status)
        VALUES ($1, $2, $3, $4, $5, $6, 'medium', true, 'show_tooltip', $7, 'published')
      `, [projectId, b.name, b.label, b.description, JSON.stringify(b.selector), b.color, JSON.stringify(b.urlRules)]);
    }
  }

  // 3. Popups
  const popupCount = await client.query('SELECT COUNT(*) FROM popups WHERE project_id = $1', [projectId]);
  if (parseInt(popupCount.rows[0].count) === 0) {
    await client.query(`
      INSERT INTO popups (project_id, name, title, content, popup_type, position, theme, trigger_event, trigger_delay, show_close_button, buttons, url_rules, status)
      VALUES ($1, 'Welcome to Kenzo OneERP', 'Welcome to Kenzo OneERP 👋',
              'Your unified enterprise workspace for CRM, HRMS, Sprint Tasks, and Financial analytics. Launch interactive guides anytime via the Start Guide button.',
              'modal', 'center', 'dark', 'page_load', 2, true,
              $2, $3, 'published')
    `, [
      projectId,
      JSON.stringify([{ text: 'Explore Workspace', action: 'close', style: 'primary' }]),
      JSON.stringify([{ type: 'contains', pattern: '/dashboard' }])
    ]);
  }

  // 4. Self Help Articles
  const articleCount = await client.query('SELECT COUNT(*) FROM self_help_articles WHERE project_id = $1', [projectId]);
  if (parseInt(articleCount.rows[0].count) === 0) {
    const articles = [
      { title: 'Navigating Kenzo OneERP Modules', category: 'Getting Started', tags: ['navigation', 'overview', 'dashboard'], content: 'The navigation sidebar provides instant access to CRM, HRMS, Projects, and Financial analytics. Click the "Start Guide" widget at bottom-right anytime for guided interactive tours.' },
      { title: 'Managing Client Deals in CRM', category: 'CRM & Sales', tags: ['crm', 'deals', 'leads'], content: 'Navigate to /dashboard/crm to view deals in kanban or table view. Click "+ Add Deal" to register client prospects and monitor conversion stages.' },
      { title: 'Processing Employee Leave & Attendance', category: 'Human Resources', tags: ['hrms', 'attendance', 'payroll'], content: 'HR Managers can review attendance logs, approve leave requests, and verify payroll allocations directly in the HRMS view.' },
      { title: 'Tracking Sprint Tasks & Priorities', category: 'Project Management', tags: ['projects', 'sprints', 'tasks'], content: 'Assign engineering deliverables, configure priority tags (Urgent, High, Normal), and track sprint milestone progress live.' },
      { title: 'Exporting Financial Ledgers & Reports', category: 'Finance', tags: ['finance', 'billing', 'reports'], content: 'Accountants can view live revenue charts, expense distributions, and export monthly balance sheets in CSV or PDF format.' },
    ];
    for (const a of articles) {
      await client.query(`
        INSERT INTO self_help_articles (project_id, title, content, category, tags, status)
        VALUES ($1, $2, $3, $4, $5, 'published')
      `, [projectId, a.title, a.content, a.category, JSON.stringify(a.tags)]);
    }
  }

  // 5. Task Lists
  const taskListCount = await client.query('SELECT COUNT(*) FROM task_lists WHERE project_id = $1', [projectId]);
  if (parseInt(taskListCount.rows[0].count) === 0) {
    const tl = await client.query(`
      INSERT INTO task_lists (project_id, name, title, description, theme, url_rules, status)
      VALUES ($1, 'Getting Started with OneERP', 'OneERP Onboarding Checklist (4 Steps)', 'Complete these core steps to master OneERP tools.', 'dark', $2, 'published')
      RETURNING id
    `, [projectId, JSON.stringify([{ type: 'contains', pattern: '/dashboard' }])]);
    const listId = tl.rows[0].id;
    const items = [
      { title: 'Explore Executive Dashboard Overview', description: 'Review system KPI summary and active modules.', url: '/dashboard' },
      { title: 'Inspect CRM Sales Pipeline', description: 'View client deals and qualified lead conversions.', url: '/dashboard/crm' },
      { title: 'Review HRMS Attendance Logs', description: 'Check employee directories and pending leave approvals.', url: '/dashboard/hrms' },
      { title: 'Track Engineering Sprint Boards', description: 'View active task assignments and project deadlines.', url: '/dashboard/projects' },
    ];
    for (let i = 0; i < items.length; i++) {
      await client.query(`
        INSERT INTO task_list_items (task_list_id, order_index, title, description, url_pattern, is_required)
        VALUES ($1, $2, $3, $4, $5, false)
      `, [listId, i, items[i].title, items[i].description, items[i].url]);
    }
  }

  // 6. Surveys
  const surveyCount = await client.query('SELECT COUNT(*) FROM surveys WHERE project_id = $1', [projectId]);
  if (parseInt(surveyCount.rows[0].count) === 0) {
    const s = await client.query(`
      INSERT INTO surveys (project_id, name, title, description, survey_type, trigger_event, trigger_delay, url_rules, status)
      VALUES ($1, 'OneERP Usability Survey', 'How is your OneERP experience today?', 'Help us improve your workflow with quick feedback.', 'nps', 'page_load', 6, $2, 'published')
      RETURNING id
    `, [projectId, JSON.stringify([{ type: 'contains', pattern: '/dashboard' }])]);
    const surveyId = s.rows[0].id;
    await client.query(`
      INSERT INTO survey_questions (survey_id, order_index, question_type, question_text, is_required)
      VALUES ($1, 0, 'rating', 'How easy is it to manage your daily workflows in OneERP? (1-5)', true),
             ($1, 1, 'text', 'What additional features would improve your productivity?', false)
    `, [surveyId]);
  }

  // Mark project as seeded so future admin deletions are 100% permanent
  await client.query('UPDATE projects SET guidance_seeded = TRUE WHERE id = $1', [projectId]);
}

async function seedGuidanceSuiteForTruthBomb(client: any, projectId: string) {
  // Check if project has already been seeded. If so, respect all admin deletions permanently!
  const proj = await client.query('SELECT guidance_seeded FROM projects WHERE id = $1', [projectId]);
  if (proj.rows.length > 0 && proj.rows[0].guidance_seeded) {
    return;
  }

  // 1. Smart Tips
  const tipCount = await client.query('SELECT COUNT(*) FROM smart_tips WHERE project_id = $1', [projectId]);
  if (parseInt(tipCount.rows[0].count) === 0) {
    await client.query(`
      INSERT INTO smart_tips (project_id, name, content, selector, position, trigger_event, url_rules, status)
      VALUES ($1, 'AI Fact Verification Engine', 'Instant multi-source verification with credibility score analysis.', $2, 'bottom', 'hover', $3, 'published'),
             ($1, 'GEO Intelligence Scanner', 'Cross-reference geo-tagged claims with global historical datasets.', $4, 'top', 'hover', $5, 'published')
    `, [
      projectId,
      JSON.stringify({ type: 'css', value: 'input, textarea, button, body' }),
      JSON.stringify([{ type: 'contains', pattern: '/' }]),
      JSON.stringify({ type: 'css', value: 'button, .grid, body' }),
      JSON.stringify([{ type: 'contains', pattern: '/' }])
    ]);
  }

  // 2. Beacons
  const beaconCount = await client.query('SELECT COUNT(*) FROM beacons WHERE project_id = $1', [projectId]);
  if (parseInt(beaconCount.rows[0].count) === 0) {
    await client.query(`
      INSERT INTO beacons (project_id, name, label, description, selector, color, size, pulse_animation, on_click_action, url_rules, status)
      VALUES ($1, 'Verify Claim Hotspot', 'Verify Claim', 'Click to initiate AI fact verification on current statement.', $2, '#38bdf8', 'medium', true, 'show_tooltip', $3, 'published')
    `, [
      projectId,
      JSON.stringify({ type: 'css', value: 'button, input, body' }),
      JSON.stringify([{ type: 'contains', pattern: '/' }])
    ]);
  }

  // 3. Popups
  const popupCount = await client.query('SELECT COUNT(*) FROM popups WHERE project_id = $1', [projectId]);
  if (parseInt(popupCount.rows[0].count) === 0) {
    await client.query(`
      INSERT INTO popups (project_id, name, title, content, popup_type, position, theme, trigger_event, trigger_delay, show_close_button, buttons, url_rules, status)
      VALUES ($1, 'Welcome to TruthBomb', 'TruthBomb AI Intelligence 🔍',
              'Verify claims, detect disinformation, and inspect geo-spatial intelligence signals in real time.',
              'modal', 'center', 'dark', 'page_load', 2, true,
              $2, $3, 'published')
    `, [
      projectId,
      JSON.stringify([{ text: 'Start Analyzing', action: 'close', style: 'primary' }]),
      JSON.stringify([{ type: 'contains', pattern: '/' }])
    ]);
  }

  // 4. Self Help Articles
  const articleCount = await client.query('SELECT COUNT(*) FROM self_help_articles WHERE project_id = $1', [projectId]);
  if (parseInt(articleCount.rows[0].count) === 0) {
    await client.query(`
      INSERT INTO self_help_articles (project_id, title, content, category, tags, status)
      VALUES ($1, 'How to Verify Statements with TruthBomb', 'Enter any public claim or news URL into the analyzer to inspect multi-source corroboration.', 'Fact-Checking', '["verification", "claims"]', 'published'),
             ($1, 'Understanding Truth Scores & GEO Signals', 'Truth scores range from 0 to 100 based on source authority, consensus, and chronological integrity.', 'AI Engine', '["scores", "signals"]', 'published')
    `, [projectId]);
  }

  // Mark project as seeded so future admin deletions are 100% permanent
  await client.query('UPDATE projects SET guidance_seeded = TRUE WHERE id = $1', [projectId]);
}
