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

    console.log('[Database] Core tables verified.');

    // Seed default developer project if not exists
    const devApiKey = 'kenzo_project_dev_api_key_2026';
    const result = await client.query('SELECT id FROM projects WHERE api_key = $1', [devApiKey]);
    if (result.rows.length === 0) {
      await client.query(
        'INSERT INTO projects (name, api_key) VALUES ($1, $2)',
        ['Kenzo Development Workspace', devApiKey]
      );
      console.log('[Database] Seeded development project with API Key:', devApiKey);
    } else {
      console.log('[Database] Development project verified.');
    }

  } catch (err) {
    console.error('[Database] Error bootstrapping database:', err);
    throw err;
  } finally {
    client.release();
  }
}
