import pg from 'pg';
const { Pool } = pg;

export class DatabaseManager {
  constructor() {
    // Use in-memory storage if no database URL provided
    if (!process.env.DATABASE_URL) {
      console.log('⚠️  No database configured - using in-memory storage');
      this.useMemory = true;
      this.memory = {
        users: new Map(),
        bots: new Map(),
        stats: []
      };
    } else {
      this.pool = new Pool({
        connectionString: process.env.DATABASE_URL
      });
    }
  }

  async initialize() {
    if (this.useMemory) {
      console.log('✅ In-memory database ready');
      return;
    }
    // Create tables if they don't exist
    await this.createTables();
  }

  async createTables() {
    const client = await this.pool.connect();
    
    try {
      // Enable UUID extension
      await client.query('CREATE EXTENSION IF NOT EXISTS "pgcrypto"');
      
      // Users table
      await client.query(`
        CREATE TABLE IF NOT EXISTS users (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          email VARCHAR(255) UNIQUE NOT NULL,
          name VARCHAR(255),
          created_at TIMESTAMP DEFAULT NOW()
        )
      `);

      // Bots table
      await client.query(`
        CREATE TABLE IF NOT EXISTS bots (
          id VARCHAR(20) PRIMARY KEY,
          user_id UUID REFERENCES users(id),
          parent_a_id VARCHAR(20),
          parent_b_id VARCHAR(20),
          genes JSONB NOT NULL,
          birth_time TIMESTAMP DEFAULT NOW(),
          death_time TIMESTAMP,
          death_cause VARCHAR(50),
          max_offspring INTEGER DEFAULT 0,
          created_at TIMESTAMP DEFAULT NOW()
        )
      `);

      // Simulation statistics
      await client.query(`
        CREATE TABLE IF NOT EXISTS sim_stats (
          id SERIAL PRIMARY KEY,
          timestamp TIMESTAMP DEFAULT NOW(),
          total_bots INTEGER,
          total_adults INTEGER,
          total_children INTEGER,
          total_food INTEGER,
          avg_traits JSONB,
          frame_count BIGINT
        )
      `);

      console.log('Database tables created/verified');
    } finally {
      client.release();
    }
  }

  async createUser(email, name) {
    if (this.useMemory) {
      const id = 'user_' + Math.random().toString(36).substr(2, 9);
      const user = { id, email, name, created_at: new Date() };
      this.memory.users.set(email, user);
      return user;
    }
    
    const result = await this.pool.query(
      'INSERT INTO users (email, name) VALUES ($1, $2) RETURNING *',
      [email, name]
    );
    return result.rows[0];
  }

  async getUserByEmail(email) {
    if (this.useMemory) {
      return this.memory.users.get(email) || null;
    }
    
    const result = await this.pool.query(
      'SELECT * FROM users WHERE email = $1',
      [email]
    );
    return result.rows[0];
  }

  async getUserById(id) {
    if (this.useMemory) {
      for (const user of this.memory.users.values()) {
        if (user.id === id) return user;
      }
      return null;
    }
    
    const result = await this.pool.query(
      'SELECT * FROM users WHERE id = $1',
      [id]
    );
    return result.rows[0];
  }

  async createBot(botId, userId, genes, parentAId = null, parentBId = null) {
    if (this.useMemory) {
      const bot = {
        id: botId,
        user_id: userId,
        parent_a_id: parentAId,
        parent_b_id: parentBId,
        genes,
        birth_time: new Date(),
        death_time: null,
        death_cause: null,
        max_offspring: 0
      };
      this.memory.bots.set(botId, bot);
      return;
    }
    
    await this.pool.query(`
      INSERT INTO bots (id, user_id, parent_a_id, parent_b_id, genes) 
      VALUES ($1, $2, $3, $4, $5)
      ON CONFLICT (id) DO NOTHING
    `, [botId, userId, parentAId, parentBId, JSON.stringify(genes)]);
  }

  async getBotInfo(botId) {
    if (this.useMemory) {
      const bot = this.memory.bots.get(botId);
      if (!bot) return null;
      
      // Count offspring
      let offspring_count = 0;
      const offspring = [];
      for (const otherBot of this.memory.bots.values()) {
        if (otherBot.parent_a_id === botId || otherBot.parent_b_id === botId) {
          offspring_count++;
          offspring.push({
            id: otherBot.id,
            birth_time: otherBot.birth_time,
            death_time: otherBot.death_time
          });
        }
      }
      
      // Get user info
      const user = Array.from(this.memory.users.values()).find(u => u.id === bot.user_id);
      
      return {
        ...bot,
        email: user?.email,
        user_name: user?.name,
        offspring_count,
        offspring: offspring.sort((a, b) => new Date(b.birth_time) - new Date(a.birth_time))
      };
    }
    
    const result = await this.pool.query(`
      SELECT 
        b.*,
        u.email,
        u.name as user_name,
        (SELECT COUNT(*) FROM bots WHERE parent_a_id = b.id OR parent_b_id = b.id) as offspring_count
      FROM bots b
      LEFT JOIN users u ON b.user_id = u.id
      WHERE b.id = $1
    `, [botId]);
    
    if (result.rows.length === 0) return null;
    
    const bot = result.rows[0];
    
    // Get offspring
    const offspring = await this.pool.query(`
      SELECT id, birth_time, death_time 
      FROM bots 
      WHERE parent_a_id = $1 OR parent_b_id = $1
      ORDER BY birth_time DESC
    `, [botId]);
    
    return {
      ...bot,
      offspring: offspring.rows
    };
  }

  async markBotDead(botId, cause) {
    if (this.useMemory) {
      const bot = this.memory.bots.get(botId);
      if (bot) {
        bot.death_time = new Date();
        bot.death_cause = cause;
      }
      return;
    }
    
    await this.pool.query(
      'UPDATE bots SET death_time = NOW(), death_cause = $2 WHERE id = $1',
      [botId, cause]
    );
  }

  async saveStats(stats) {
    if (this.useMemory) {
      this.memory.stats.push({
        ...stats,
        timestamp: new Date()
      });
      // Keep only last 1000 stats
      if (this.memory.stats.length > 1000) {
        this.memory.stats = this.memory.stats.slice(-1000);
      }
      return;
    }
    
    await this.pool.query(`
      INSERT INTO sim_stats (total_bots, total_adults, total_children, total_food, avg_traits, frame_count)
      VALUES ($1, $2, $3, $4, $5, $6)
    `, [
      stats.totalBots,
      stats.adults,
      stats.children,
      stats.food,
      JSON.stringify(stats.avgTraits),
      stats.frameCount
    ]);
  }

  async getRecentStats(limit = 100) {
    if (this.useMemory) {
      return this.memory.stats.slice(-limit).reverse();
    }
    
    const result = await this.pool.query(`
      SELECT * FROM sim_stats 
      ORDER BY timestamp DESC 
      LIMIT $1
    `, [limit]);
    return result.rows;
  }

  async close() {
    if (this.pool) {
      await this.pool.end();
    }
  }
}
