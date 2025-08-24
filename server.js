import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { SimulationManager } from './server/SimulationManager.js';
import { DatabaseManager } from './server/DatabaseManager.js';
import { EmailService } from './server/EmailService.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const server = createServer(app);
const io = new Server(server);

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static('.'));

// Initialize services
const db = new DatabaseManager();
const emailService = new EmailService();
const simulationManager = new SimulationManager(io, db, emailService);

// Routes
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

// Registration page
app.get('/register', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'register.html'));
});

// Bot tracking page
app.get('/track/:botId', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'track.html'));
});

// Dashboard page
app.get('/dashboard', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'dashboard.html'));
});

// Clean simulation view
app.get('/simulation', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'simulation.html'));
});

// API Routes
app.post('/api/register', async (req, res) => {
  try {
    const { email, name } = req.body;
    
    if (!email) {
      return res.status(400).json({ error: 'Email is required' });
    }

    // Check if user already exists
    const existingUser = await db.getUserByEmail(email);
    if (existingUser) {
      return res.status(400).json({ error: 'Email already registered' });
    }

    // Create user and bot
    const user = await db.createUser(email, name || 'Anonymous');
    const bot = simulationManager.createUserBot(user.id);
    
    // Store bot in database
    await db.createBot(bot.id, user.id, bot.genes);
    
    // Send welcome email
    await emailService.sendWelcomeEmail(email, bot.id);
    
    res.json({ 
      success: true, 
      botId: bot.id,
      message: 'Bot created! Check your email for tracking info.'
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get bot info
app.get('/api/bot/:botId', async (req, res) => {
  try {
    const { botId } = req.params;
    const botData = await db.getBotInfo(botId);
    
    if (!botData) {
      return res.status(404).json({ error: 'Bot not found' });
    }

    // Get current simulation state
    const currentBot = simulationManager.getBotById(botId);
    
    res.json({
      ...botData,
      isAlive: !!currentBot,
      currentState: currentBot ? {
        x: currentBot.x,
        y: currentBot.y,
        energy: currentBot.energy,
        state: currentBot.state,
        age: currentBot.age
      } : null
    });
  } catch (error) {
    console.error('Bot info error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// WebSocket connections
io.on('connection', (socket) => {
  console.log('Client connected:', socket.id);

  socket.on('track-bot', (botId) => {
    socket.join(`bot-${botId}`);
    console.log(`Socket ${socket.id} tracking bot ${botId}`);
  });

  socket.on('join-dashboard', () => {
    socket.join('dashboard');
    console.log(`Socket ${socket.id} joined dashboard`);
  });

  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
  });
});

// Initialize and start
async function start() {
  try {
    await db.initialize();
    console.log('Database connected');
    
    simulationManager.start();
    console.log('Simulation started');
    
    const port = process.env.PORT || 3000;
    server.listen(port, () => {
      console.log(`🐟 Swimbots server running on http://localhost:${port}`);
      console.log(`📊 Dashboard: http://localhost:${port}/dashboard`);
      console.log(`📝 Register: http://localhost:${port}/register`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

start();
