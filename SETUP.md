# Synthetic Divergence - Server Setup

## Quick Start

1. **Install dependencies:**
```bash
npm install
```

2. **Set up PostgreSQL database:**
```bash
# Install PostgreSQL (Windows)
# Download from: https://www.postgresql.org/download/windows/

# Create database
createdb swimbots
```

3. **Configure environment:**
```bash
# Copy and edit environment file
cp .env.example .env

# Edit .env with your database URL and email settings
```

4. **Start the server:**
```bash
npm start
```

5. **Open in browser:**
- Main simulation: http://localhost:3000
- Dashboard: http://localhost:3000/dashboard  
- Registration: http://localhost:3000/register

## Environment Setup

### Database (PostgreSQL)
```
DATABASE_URL=postgresql://username:password@localhost:5432/swimbots
```

### Email (Gmail example)
```
EMAIL_FROM=your-simulation@example.com
EMAIL_SERVICE=gmail
EMAIL_USER=your-email@gmail.com
EMAIL_PASS=your-app-password
```

**Note:** For Gmail, use an [App Password](https://support.google.com/accounts/answer/185833?hl=en), not your regular password.

### Base URL
```
BASE_URL=http://localhost:3000
```

## Features Included

### ✅ Server-Side Simulation
- Your existing simulation runs on Node.js
- Real-time updates via WebSocket
- Persistent bot tracking

### ✅ User Registration
- Simple email + name form
- Creates personalized bots
- Email notifications

### ✅ Bot Tracking
- Individual bot pages
- Real-time status updates  
- Family tree display

### ✅ Dashboard
- Live simulation view
- Population statistics
- Trait evolution monitoring

### ✅ Database Storage
- User management
- Bot lineage tracking
- Historical statistics

## Next Steps

1. **Test locally** - Make sure everything works
2. **Add your simulation tweaks** - Modify bot behaviors for better tracking
3. **Email configuration** - Set up real email service
4. **Deploy to production** - Use Railway, Heroku, or DigitalOcean

## Production Deployment

### Railway (Recommended)
```bash
# Install Railway CLI
npm install -g @railway/cli

# Login and deploy
railway login
railway init
railway up
```

### Environment for Production
- Use managed PostgreSQL (Railway, AWS RDS, etc.)
- Use SendGrid or Mailgun for email
- Set BASE_URL to your production domain

## Architecture

```
Frontend (Static Files)
├── Original simulation (index.html)
├── Registration form (/register)
├── Bot tracking (/track/:botId)  
└── Dashboard (/dashboard)

Backend (Node.js + Express)
├── Simulation engine (server-side)
├── WebSocket real-time updates
├── REST API for forms
└── Email notifications

Database (PostgreSQL)
├── Users table
├── Bots table (with lineage)
└── Statistics table
```

This is the simplest possible setup that gives you everything you need!
