import nodemailer from 'nodemailer';

export class EmailService {
  constructor() {
    this.transporter = null;
    this.initialize();
  }

  initialize() {
    // Simple Gmail setup for development
    if (process.env.EMAIL_USER && process.env.EMAIL_PASS) {
      this.transporter = nodemailer.createTransporter({
        service: 'gmail',
        auth: {
          user: process.env.EMAIL_USER,
          pass: process.env.EMAIL_PASS // App-specific password
        }
      });
    } else {
      console.log('⚠️  Email not configured - emails will be logged to console');
    }
  }

  async sendWelcomeEmail(email, botId) {
    const subject = '🐟 Your Swimbot is alive!';
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #0066cc;">Welcome to Synthetic Divergence!</h2>
        
        <p>Congratulations! Your swimbot <strong>${botId}</strong> has been created and is now swimming in our digital ocean.</p>
        
        <div style="background: #f0f8ff; padding: 15px; border-radius: 8px; margin: 20px 0;">
          <h3>🤖 Your Bot: ${botId}</h3>
          <p>Your bot is now exploring, seeking food, and looking for mates. Watch it evolve and thrive in the digital ocean!</p>
        </div>
        
        <p><strong>Track your bot:</strong><br>
        <a href="${process.env.BASE_URL}/track/${botId}" style="color: #0066cc;">
          ${process.env.BASE_URL}/track/${botId}
        </a></p>
        
        <p><strong>Watch the live simulation:</strong><br>
        <a href="${process.env.BASE_URL}/dashboard" style="color: #0066cc;">
          ${process.env.BASE_URL}/dashboard
        </a></p>
        
        <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">
        <p style="font-size: 12px; color: #666;">
          This is an automated message from the Synthetic Divergence evolution simulation.
        </p>
      </div>
    `;

    await this.sendEmail(email, subject, html);
  }

  async sendBirthNotification(email, parentBotId, childBotId) {
    const subject = '🎉 Your Swimbot has reproduced!';
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #0066cc;">New Offspring Alert! 🐟➡️🐟</h2>
        
        <p>Great news! Your swimbot <strong>${parentBotId}</strong> has successfully found a mate and reproduced.</p>
        
        <div style="background: #f0fff0; padding: 15px; border-radius: 8px; margin: 20px 0;">
          <h3>🆕 New Baby Bot: ${childBotId}</h3>
          <p>This new bot has inherited traits from both parents through genetic crossover and mutation.</p>
        </div>
        
        <p><strong>Track the new bot:</strong><br>
        <a href="${process.env.BASE_URL}/track/${childBotId}" style="color: #0066cc;">
          ${process.env.BASE_URL}/track/${childBotId}
        </a></p>
        
        <p><strong>Track the parent:</strong><br>
        <a href="${process.env.BASE_URL}/track/${parentBotId}" style="color: #0066cc;">
          ${process.env.BASE_URL}/track/${parentBotId}
        </a></p>
        
        <p>Watch your lineage grow in the digital ocean!</p>
        
        <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">
        <p style="font-size: 12px; color: #666;">
          This is an automated message from the Synthetic Divergence evolution simulation.
        </p>
      </div>
    `;

    await this.sendEmail(email, subject, html);
  }

  async sendEmail(to, subject, html) {
    if (!this.transporter) {
      // Log to console if email not configured
      console.log('\n📧 EMAIL (would be sent to production):');
      console.log(`To: ${to}`);
      console.log(`Subject: ${subject}`);
      console.log(`Content: ${html.replace(/<[^>]*>/g, '').substring(0, 200)}...`);
      console.log('---\n');
      return;
    }

    try {
      const info = await this.transporter.sendMail({
        from: process.env.EMAIL_FROM || 'noreply@swimbots.example.com',
        to,
        subject,
        html
      });

      console.log(`📧 Email sent to ${to}: ${info.messageId}`);
    } catch (error) {
      console.error('📧 Email failed:', error.message);
      // Don't throw - email failure shouldn't break the app
    }
  }
}
