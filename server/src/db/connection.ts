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
        domain VARCHAR(255),
        industry VARCHAR(100),
        plan VARCHAR(50) DEFAULT 'starter',
        owner_email VARCHAR(255),
        logo_url TEXT,
        settings JSONB DEFAULT '{}'::jsonb,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);

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

    // ─── INDEXES ─────────────────────────────────────────────────────────────────
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

    // Seed Client A Project (TruthBomb)
    const devApiKey = 'kenzo_project_dev_api_key_2026';
    const r1 = await client.query('SELECT id FROM projects WHERE api_key = $1', [devApiKey]);
    if (r1.rows.length === 0) {
      await client.query(
        'INSERT INTO projects (name, api_key, client_email) VALUES ($1, $2, $3)',
        ['TruthBomb', devApiKey, 'client1@kenzo.com']
      );
      console.log('[Database] Seeded TruthBomb project for client1@kenzo.com');
    } else {
      await client.query('UPDATE projects SET name = $1, client_email = $2 WHERE id = $3', ['TruthBomb', 'client1@kenzo.com', r1.rows[0].id]);
    }

    // Seed Client B Project (Kenzo-erp)
    const client2ApiKey = 'kenzo_project_1785139787760_key_u1yaq';
    const r2 = await client.query('SELECT id FROM projects WHERE LOWER(name) LIKE $1 OR api_key = $2 OR api_key = $3', ['%kenzo-erp%', client2ApiKey, 'kenzo_project_client2_api_key_2026']);
    if (r2.rows.length === 0) {
      await client.query(
        'INSERT INTO projects (name, api_key, client_email) VALUES ($1, $2, $3)',
        ['Kenzo-erp', client2ApiKey, 'client2@kenzo.com']
      );
      console.log('[Database] Seeded Kenzo-erp project for client2@kenzo.com');
    } else {
      await client.query('UPDATE projects SET name = $1, api_key = $2, client_email = $3 WHERE id = $4', ['Kenzo-erp', client2ApiKey, 'client2@kenzo.com', r2.rows[0].id]);
    }

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

    console.log('[Database] Phase 2 complete — 22 tables bootstrapped with indexes and seed data.');

  } catch (err) {
    console.error('[Database] Error bootstrapping database:', err);
    throw err;
  } finally {
    client.release();
  }
}
