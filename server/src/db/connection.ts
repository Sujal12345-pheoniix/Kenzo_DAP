import { Pool } from 'pg';
import dotenv from 'dotenv';

dotenv.config();

let connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  console.error('[Database] ERROR: DATABASE_URL is not set in environment variables.');
  process.exit(1);
}

// Silence the pg-connection-string / pg v9 compatibility warnings by replacing sslmode=require/prefer/verify-ca with verify-full
connectionString = connectionString
  .replace('sslmode=require', 'sslmode=verify-full')
  .replace('sslmode=prefer', 'sslmode=verify-full')
  .replace('sslmode=verify-ca', 'sslmode=verify-full');

export const pool = new Pool({
  connectionString,
  ssl: {
    rejectUnauthorized: false // Required for Neon serverless postgres connections
  }
});

export async function bootstrapDb(): Promise<void> {
  const client = await pool.connect();
  try {
    console.log('[Database] Bootstrapping tables if they do not exist...');

    // 1. Projects Table
    await client.query(`
      CREATE TABLE IF NOT EXISTS projects (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name VARCHAR(255) NOT NULL,
        api_key VARCHAR(255) UNIQUE NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // 2. Flows Table
    await client.query(`
      CREATE TABLE IF NOT EXISTS flows (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
        name VARCHAR(255) NOT NULL,
        description TEXT,
        status VARCHAR(50) DEFAULT 'draft', -- 'draft', 'published', 'archived'
        version INTEGER DEFAULT 1,
        url_rules JSONB DEFAULT '[]'::jsonb,
        conditions JSONB DEFAULT '[]'::jsonb,
        priority INTEGER DEFAULT 0,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // 3. Steps Table
    await client.query(`
      CREATE TABLE IF NOT EXISTS steps (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        flow_id UUID REFERENCES flows(id) ON DELETE CASCADE,
        order_index INTEGER NOT NULL,
        title VARCHAR(255) NOT NULL,
        content TEXT NOT NULL,
        selector JSONB NOT NULL,
        placement VARCHAR(50) DEFAULT 'auto',
        display_mode VARCHAR(50) DEFAULT 'tooltip', -- 'tooltip', 'spotlight', 'highlight', 'modal'
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

    // 4. Analytics Events Table
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

    // 5. User Progress Table
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

    // 6. SDK Sessions / Heartbeat Table
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

    // 7. Page Models Table
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

    // 8. Application Maps Table
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

    // 9. Selector Repairs Table
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

    // 10. Workflow Recordings Table
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

    // 10. Route pattern normalization for legacy seeded flows
    await client.query(`
      UPDATE flows SET url_rules = '[{"type":"contains","pattern":"/dashboard/crm"}]'::jsonb
      WHERE (name LIKE '%CRM%' OR name LIKE '%Pipeline%' OR name LIKE '%Deal%') AND (url_rules IS NULL OR url_rules = '[]'::jsonb OR url_rules = '[{"type":"contains","pattern":"/"}]'::jsonb);
    `);
    await client.query(`
      UPDATE flows SET url_rules = '[{"type":"contains","pattern":"/dashboard/hrms"}]'::jsonb
      WHERE (name LIKE '%HRMS%' OR name LIKE '%Employee%' OR name LIKE '%HR %') AND (url_rules IS NULL OR url_rules = '[]'::jsonb OR url_rules = '[{"type":"contains","pattern":"/"}]'::jsonb);
    `);
    await client.query(`
      UPDATE flows SET url_rules = '[{"type":"contains","pattern":"/dashboard/finance"}]'::jsonb
      WHERE (name LIKE '%Finance%' OR name LIKE '%Financial%') AND (url_rules IS NULL OR url_rules = '[]'::jsonb OR url_rules = '[{"type":"contains","pattern":"/"}]'::jsonb);
    `);
    await client.query(`
      UPDATE flows SET url_rules = '[{"type":"contains","pattern":"/dashboard"}]'::jsonb
      WHERE (name LIKE '%Admin Control Hub%' OR name LIKE '%Overview%') AND (url_rules IS NULL OR url_rules = '[]'::jsonb OR url_rules = '[{"type":"contains","pattern":"/"}]'::jsonb);
    `);

    console.log('[Database] Tables bootstrapped and route rules normalized.');

    // 11. Users Table (Authentication & RBAC)
    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        email VARCHAR(255) UNIQUE NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        name VARCHAR(255) NOT NULL,
        role VARCHAR(50) NOT NULL, -- 'SUPER_ADMIN', 'CLIENT_CEO', 'MEMBER'
        company_id VARCHAR(255) NOT NULL,
        company_name VARCHAR(255) NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Seed default developer project if not exists
    const devApiKey = 'kenzo_project_dev_api_key_2026';
    const result = await client.query('SELECT id FROM projects WHERE api_key = $1', [devApiKey]);
    let defaultProjectId = '';
    if (result.rows.length === 0) {
      const inserted = await client.query(
        'INSERT INTO projects (name, api_key) VALUES ($1, $2) RETURNING id',
        ['Company A - ERP & HRMS', devApiKey]
      );
      defaultProjectId = inserted.rows[0].id;
      console.log('[Database] Seeded Company A project with API Key:', devApiKey);
    } else {
      defaultProjectId = result.rows[0].id;
      console.log('[Database] Development project verified.');
    }

    // Seed Company B project
    const client2ApiKey = 'kenzo_project_client2_api_key_2026';
    const c2Result = await client.query('SELECT id FROM projects WHERE api_key = $1', [client2ApiKey]);
    if (c2Result.rows.length === 0) {
      await client.query(
        'INSERT INTO projects (name, api_key) VALUES ($1, $2)',
        ['Company B - CRM', client2ApiKey]
      );
      console.log('[Database] Seeded Company B project with API Key:', client2ApiKey);
    }

    // Seed Auth Users (Bcrypt Hashed)
    const bcrypt = require('bcryptjs');
    const adminPassHash = bcrypt.hashSync('kenzo123', 10);
    const clientPassHash = bcrypt.hashSync('client@123', 10);

    const adminUser = await client.query('SELECT id FROM users WHERE email = $1', ['Kenzo@gmail.com']);
    if (adminUser.rows.length === 0) {
      await client.query(
        'INSERT INTO users (email, password_hash, name, role, company_id, company_name) VALUES ($1, $2, $3, $4, $5, $6)',
        ['Kenzo@gmail.com', adminPassHash, 'Kenzo Super Admin', 'SUPER_ADMIN', 'super_admin_corp', 'Kenzo_DAP Global']
      );
      console.log('[Database] Seeded Super Admin user (Kenzo@gmail.com / kenzo123)');
    }

    const client1User = await client.query('SELECT id FROM users WHERE email = $1', ['client1@kenzo.com']);
    if (client1User.rows.length === 0) {
      await client.query(
        'INSERT INTO users (email, password_hash, name, role, company_id, company_name) VALUES ($1, $2, $3, $4, $5, $6)',
        ['client1@kenzo.com', clientPassHash, 'CEO Company A', 'CLIENT_CEO', 'comp_a', 'Company A']
      );
      console.log('[Database] Seeded Client CEO 1 (client1@kenzo.com / client@123)');
    }

    const client2User = await client.query('SELECT id FROM users WHERE email = $1', ['client2@kenzo.com']);
    if (client2User.rows.length === 0) {
      await client.query(
        'INSERT INTO users (email, password_hash, name, role, company_id, company_name) VALUES ($1, $2, $3, $4, $5, $6)',
        ['client2@kenzo.com', clientPassHash, 'CEO Company B', 'CLIENT_CEO', 'comp_b', 'Company B']
      );
      console.log('[Database] Seeded Client CEO 2 (client2@kenzo.com / client@123)');
    }

  } catch (err) {
    console.error('[Database] Error bootstrapping database:', err);
    throw err;
  } finally {
    client.release();
  }
}
