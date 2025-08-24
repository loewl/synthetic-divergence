import { Simulation } from '../src/core/Simulation.js';

export class SimulationManager {
  constructor(io, db, emailService) {
    this.io = io;
    this.db = db;
    this.emailService = emailService;
    this.simulation = new Simulation();
    this.userBots = new Map(); // userId -> botId mapping
    this.isRunning = false;
    this.frameCount = 0;
  }

  start() {
    if (this.isRunning) return;
    
    this.isRunning = true;
    console.log('Starting simulation loop...');
    
    // Initialize simulation with some bots
    this.simulation.reset();

    // Main simulation loop (60 FPS)
    setInterval(() => {
      this.update();
    }, 1000 / 60);

    // Broadcast updates every 100ms (10 FPS for network)
    setInterval(() => {
      this.broadcastState();
    }, 100);

    // Save stats every 10 seconds
    setInterval(() => {
      this.saveStats();
    }, 10000);
  }

  update() {
    const previousBots = new Set(this.simulation.bots.map(bot => bot.id));
    
    // Update simulation (using standard canvas size for now)
    this.simulation.step(1/60, 1920, 1080, 1);
    this.frameCount++;

    // Check for deaths (bots that were removed)
    const currentBots = new Set(this.simulation.bots.map(bot => bot.id));
    for (const botId of previousBots) {
      if (!currentBots.has(botId)) {
        this.handleBotDeath(botId);
      }
    }

    // Check for bot events
    this.checkBotEvents();
  }

  checkBotEvents() {
    // Check for new births
    this.simulation.bots.forEach(bot => {
      if (bot.justBorn) {
        bot.justBorn = false;
        this.handleBotBirth(bot);
      }
    });

    // Check for deaths (bots removed from simulation)
    // This would need to be tracked differently since removed bots are gone
    // For now, we'll implement death tracking when we modify the simulation
  }

  async handleBotBirth(bot) {
    try {
      // Find if parents are user bots
      const parentA = bot.parentA ? this.getUserIdForBot(bot.parentA.id) : null;
      const parentB = bot.parentB ? this.getUserIdForBot(bot.parentB.id) : null;

      // Store bot in database
      await this.db.createBot(
        bot.id, 
        parentA || parentB, // inherit user ownership from one parent
        bot.genes,
        bot.parentA?.id,
        bot.parentB?.id
      );

      // Emit birth event to dashboard
      this.io.to('dashboard').emit('bot-born', {
        botId: bot.id,
        parentIds: [bot.parentA?.id, bot.parentB?.id].filter(Boolean),
        generation: bot.generation || 0,
        genes: bot.genes,
        isUserBot: bot.isUserBot || false
      });

      // Notify users if their bot reproduced
      if (parentA) {
        const user = await this.db.getUserById(parentA);
        if (user) {
          await this.emailService.sendBirthNotification(user.email, bot.parentA.id, bot.id);
        }
      }
      if (parentB && parentB !== parentA) {
        const user = await this.db.getUserById(parentB);
        if (user) {
          await this.emailService.sendBirthNotification(user.email, bot.parentB.id, bot.id);
        }
      }

      // Broadcast to tracking clients
      this.io.to(`bot-${bot.parentA?.id}`).emit('bot-offspring', {
        parentId: bot.parentA?.id,
        childId: bot.id
      });
      
      this.io.to(`bot-${bot.parentB?.id}`).emit('bot-offspring', {
        parentId: bot.parentB?.id,
        childId: bot.id
      });

    } catch (error) {
      console.error('Error handling bot birth:', error);
    }
  }

  handleBotDeath(botId) {
    // Emit death event to dashboard
    this.io.to('dashboard').emit('bot-died', {
      botId: botId,
      timestamp: Date.now()
    });

    // Notify tracking users
    this.io.to(`bot-${botId}`).emit('bot-died', {
      botId: botId
    });
  }

  getUserIdForBot(botId) {
    for (const [userId, userBotId] of this.userBots) {
      if (userBotId === botId) return userId;
    }
    return null;
  }

  createUserBot(userId) {
    // Create a new bot in the simulation
    const bot = this.simulation.spawnRandomBot();
    
    // Track ownership
    this.userBots.set(userId, bot.id);
    
    // Mark as user-created for special handling
    bot.isUserBot = true;
    bot.userId = userId;
    
    return bot;
  }

  getBotById(botId) {
    return this.simulation.bots.find(bot => bot.id === botId);
  }

  broadcastState() {
    const stats = this.getStats();
    
    // Send to dashboard with generation data
    this.io.to('dashboard').emit('simulation-state', {
      stats,
      bots: this.simulation.bots.slice(0, 200).map(bot => ({ // Limit for performance
        id: bot.id,
        x: bot.x,
        y: bot.y,
        hue: bot.hue(),
        state: bot.state,
        isAdult: bot.isAdult,
        energy: bot.energy / bot.energyMax,
        isUserBot: bot.isUserBot || false,
        age: bot.age,
        generation: bot.generation || 0,
        genes: bot.genes,
        parentIds: [bot.parentA?.id, bot.parentB?.id].filter(Boolean)
      })),
      food: this.simulation.food.slice(0, 100) // Limit food items too
    });

    // Send individual bot updates
    this.simulation.bots.forEach(bot => {
      if (bot.isUserBot) {
        this.io.to(`bot-${bot.id}`).emit('bot-update', {
          id: bot.id,
          alive: true,
          x: bot.x,
          y: bot.y,
          energy: bot.energy,
          energyMax: bot.energyMax,
          state: bot.state,
          age: bot.age,
          isAdult: bot.isAdult,
          offspring: [], // Would need to track this
          genes: bot.genes
        });
      }
    });
  }

  getStats() {
    const adults = this.simulation.bots.filter(bot => bot.isAdult).length;
    const children = this.simulation.bots.length - adults;
    
    // Calculate average traits
    const avgTraits = { O: 0, C: 0, E: 0, A: 0, N: 0 };
    if (this.simulation.bots.length > 0) {
      this.simulation.bots.forEach(bot => {
        avgTraits.O += bot.genes.O;
        avgTraits.C += bot.genes.C;
        avgTraits.E += bot.genes.E;
        avgTraits.A += bot.genes.A;
        avgTraits.N += bot.genes.N;
      });
      
      Object.keys(avgTraits).forEach(trait => {
        avgTraits[trait] /= this.simulation.bots.length;
      });
    }

    return {
      totalBots: this.simulation.bots.length,
      adults,
      children,
      food: this.simulation.food.length,
      avgTraits,
      frameCount: this.frameCount
    };
  }

  async saveStats() {
    try {
      const stats = this.getStats();
      await this.db.saveStats(stats);
    } catch (error) {
      console.error('Error saving stats:', error);
    }
  }
}
