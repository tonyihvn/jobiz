import dotenv from 'dotenv';
dotenv.config();
import express from 'express';
import mysql from 'mysql2/promise';
import cors from 'cors';
import nodemailer from 'nodemailer';
import twilio from 'twilio';
import helmet from 'helmet';
import jwt from 'jsonwebtoken';
import path from 'path';
import fs from 'fs';
import multer from 'multer';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const port = process.env.PORT || 3001;

// Security headers via Helmet
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", 'data:', 'blob:', 'https:'],
      connectSrc: ["'self'", process.env.APP_URL || 'http://localhost:5173', 'https:', 'ws:'],
      fontSrc: ["'self'", 'https:'],
      objectSrc: ["'none'"],
      baseUri: ["'self'"],
      formAction: ["'self'"]
    }
  },
  crossOriginEmbedderPolicy: false
}));

// Middleware
// Enable CORS and explicitly allow the Authorization header (used by the client)
app.use(cors({ origin: true, allowedHeaders: ['Content-Type', 'Authorization'], exposedHeaders: ['Authorization'] }));
app.use(express.json({ limit: '50mb' }));

// Serve uploaded files
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });
app.use('/uploads', express.static(uploadsDir));

// Rate limiting for feedback form (protect from spam/bot attacks)
const feedbackRateLimit = new Map();
const FEEDBACK_LIMIT = 5; // max 5 submissions
const FEEDBACK_WINDOW = 3600000; // per hour
const isRateLimited = (ip) => {
  const now = Date.now();
  if (!feedbackRateLimit.has(ip)) {
    feedbackRateLimit.set(ip, []);
  }
  const submissions = feedbackRateLimit.get(ip).filter(time => now - time < FEEDBACK_WINDOW);
  feedbackRateLimit.set(ip, submissions);
  return submissions.length >= FEEDBACK_LIMIT;
};
const recordFeedbackSubmission = (ip) => {
  if (!feedbackRateLimit.has(ip)) {
    feedbackRateLimit.set(ip, []);
  }
  feedbackRateLimit.get(ip).push(Date.now());
};

// Multer setup for file uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadsDir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, uniqueSuffix + '-' + file.originalname.replace(/[^a-zA-Z0-9.\-_]/g, '_'));
  }
});
const upload = multer({ storage });

// Database Connection
const pool = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  port: process.env.DB_PORT || 3306,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  multipleStatements: true
});

// Test database connection early
(async () => {
  try {
    const conn = await pool.getConnection();
    console.log('✅ Database connection established');
    conn.release();
  } catch (err) {
    console.error('❌ Failed to connect to database:', err.message || err);
    console.error('Please ensure MySQL is running and credentials in .env are correct');
    process.exit(1);
  }
})();

// Small migration: ensure `is_service` column exists on `sale_items`
(async () => {
  try {
    await pool.execute("ALTER TABLE sale_items ADD COLUMN is_service TINYINT(1) DEFAULT 0");
    console.log('Migration: ensured sale_items.is_service column exists');
  } catch (err) {
    // Ignore 'column exists' error (MySQL errno 1060 / ER_DUP_FIELDNAME)
    if (!(err && (err.errno === 1060 || err.code === 'ER_DUP_FIELDNAME'))) {
      console.warn('Migration: failed to add is_service to sale_items:', err && err.message ? err.message : err);
    }
  }
})();

// Email Configuration
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: process.env.SMTP_PORT,
  secure: true,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
  connectionTimeout: 5000,
  socketTimeout: 5000,
  tls: {
    rejectUnauthorized: false
  }
});

// SMS Configuration
const smsClient = process.env.SMS_SID ? twilio(process.env.SMS_SID, process.env.SMS_TOKEN) : null;

// --- API ROUTES ---

// Auth helper middleware
function authMiddleware(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader) return res.status(401).json({ error: 'Missing Authorization header' });
  const parts = authHeader.split(' ');
  if (parts.length !== 2 || parts[0] !== 'Bearer') return res.status(401).json({ error: 'Invalid Authorization format' });
  const token = parts[1];
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET || 'change-me');
    req.user = payload;
    next();
  } catch (err) {
    console.warn('authMiddleware: token verification failed:', err && err.message ? err.message : err);
    return res.status(401).json({ error: 'Invalid token' });
  }
}

// Super Admin Middleware - Allows super admins to access endpoints without business_id restrictions
async function superAdminAuthMiddleware(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader) return res.status(401).json({ error: 'Missing Authorization header' });
  const parts = authHeader.split(' ');
  if (parts.length !== 2 || parts[0] !== 'Bearer') return res.status(401).json({ error: 'Invalid Authorization format' });
  const token = parts[1];
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET || 'change-me');
    req.user = payload;
    // Check if user is super admin
    try {
      const [empRows] = await pool.execute('SELECT is_super_admin FROM employees WHERE id = ?', [req.user.id]);
      if (empRows && empRows[0] && empRows[0].is_super_admin) {
        req.isSuperAdmin = true;
        next();
      } else {
        return res.status(403).json({ error: 'Super admin access required' });
      }
    } catch (e) {
      console.warn('superAdminAuthMiddleware: database error:', e && e.message ? e.message : e);
      return res.status(403).json({ error: 'Super admin access required' });
    }
  } catch (err) {
    console.warn('superAdminAuthMiddleware: token verification failed:', err && err.message ? err.message : err);
    return res.status(401).json({ error: 'Invalid token' });
  }
}

// Helper to resolve business_id for the current request user
async function resolveBusinessId(req) {
  try {
    const [bizRows] = await pool.execute('SELECT business_id FROM employees WHERE id = ?', [req.user && req.user.id]);
    let businessId = (bizRows && bizRows[0]) ? bizRows[0].business_id : null;
    if (!businessId && req.user && (req.user.businessId || req.user.business_id)) {
      businessId = req.user.businessId || req.user.business_id;
    }
    return businessId;
  } catch (e) {
    return null;
  }
}

// Return current user info from token
app.get('/api/me', authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;
    const [rows] = await pool.execute('SELECT id, name, role_id, email, is_super_admin, default_location_id, business_id FROM employees WHERE id = ?', [userId]);
    if (!rows || rows.length === 0) return res.status(404).json({ error: 'User not found' });
    const u = rows[0];
    res.json({ id: u.id, name: u.name, roleId: u.role_id, email: u.email, is_super_admin: !!u.is_super_admin, default_location_id: u.default_location_id, businessId: u.business_id });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Forgot Password endpoint
app.post('/api/forgot-password', async (req, res) => {
  const { email } = req.body;
  try {
    if (!email) return res.status(400).json({ error: 'Email is required' });

    // Check if user exists
    const [rows] = await pool.execute('SELECT id, name, email FROM employees WHERE email = ?', [email]);
    if (!rows || rows.length === 0) {
      // For security, don't reveal if email exists
      return res.json({ success: true, message: 'If an account exists, you will receive a password reset email' });
    }

    const user = rows[0];
    
    // Generate reset token
    const resetToken = crypto.randomBytes(32).toString('hex');
    const tokenId = 'reset_' + Date.now();
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

    // Store reset token
    await pool.execute(
      'INSERT INTO password_reset_tokens (id, email, token, expires_at) VALUES (?, ?, ?, ?)',
      [tokenId, email, resetToken, expiresAt]
    );

    // Send reset email
    const resetLink = `${process.env.APP_URL || 'http://localhost:5173'}/#/reset-password?token=${resetToken}`;
    
    try {
      await transporter.sendMail({
        from: process.env.SMTP_FROM || 'noreply@omnisales.com',
        to: email,
        subject: 'Password Reset Request - OmniSales',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2>Password Reset Request</h2>
            <p>Hello ${user.name},</p>
            <p>We received a request to reset your password. Click the link below to proceed:</p>
            <div style="margin: 30px 0;">
              <a href="${resetLink}" style="background-color: #3b82f6; color: white; padding: 12px 24px; border-radius: 6px; text-decoration: none; font-weight: bold;">Reset Password</a>
            </div>
            <p>Or copy this link: <a href="${resetLink}">${resetLink}</a></p>
            <p style="color: #666; font-size: 12px;">This link will expire in 24 hours. If you didn't request this, please ignore this email.</p>
          </div>
        `
      });
      console.log('Password reset email sent to:', email);
    } catch (emailErr) {
      console.error('Failed to send reset email:', emailErr);
      // Still return success for security reasons, but log the error
    }

    res.json({ success: true, message: 'If an account exists, you will receive a password reset email' });
  } catch (err) {
    console.error('Forgot password error:', err);
    res.status(500).json({ error: 'Failed to process forgot password request' });
  }
});

// Reset Password endpoint
app.post('/api/reset-password', async (req, res) => {
  const { token, newPassword } = req.body;
  try {
    if (!token || !newPassword) return res.status(400).json({ error: 'Token and new password are required' });
    
    // Enforce password policy: minimum 8 characters, at least one number and at least one letter
    const hasLetter = /[a-zA-Z]/.test(newPassword);
    const hasNumber = /\d/.test(newPassword);
    const hasMinLength = newPassword.length >= 8;
    
    if (!hasMinLength || !hasLetter || !hasNumber) {
      return res.status(400).json({ error: 'Password must be at least 8 characters and include both letters and numbers' });
    }

    // Find valid reset token
    const [tokenRows] = await pool.execute(
      'SELECT email FROM password_reset_tokens WHERE token = ? AND expires_at > NOW()',
      [token]
    );

    if (!tokenRows || tokenRows.length === 0) {
      return res.status(400).json({ error: 'Invalid or expired reset token' });
    }

    const { email } = tokenRows[0];

    // Hash new password
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // Update employee password
    await pool.execute('UPDATE employees SET password = ? WHERE email = ?', [hashedPassword, email]);

    // Delete used token
    await pool.execute('DELETE FROM password_reset_tokens WHERE token = ?', [token]);

    res.json({ success: true, message: 'Password has been reset successfully' });
  } catch (err) {
    console.error('Reset password error:', err);
    res.status(500).json({ error: 'Failed to reset password' });
  }
});

// Authentication (Mocked for safety, real impl would use hashing/JWT)
app.post('/api/login', async (req, res) => {
  const { email, password } = req.body;
  try {
    const [rows] = await pool.execute(
      'SELECT id, name, role_id, email, password, email_verified, account_approved FROM employees WHERE email = ?',
      [email]
    );
    if (rows.length === 0) return res.status(401).json({ error: 'Invalid credentials' });

    const user = rows[0];
    
    // Check email verification
    if (!user.email_verified) {
      return res.status(403).json({ 
        error: 'Email not verified',
        code: 'EMAIL_NOT_VERIFIED',
        message: 'Please verify your email before logging in'
      });
    }

    // Check account approval
    if (!user.account_approved) {
      return res.status(403).json({ 
        error: 'Account not approved',
        code: 'ACCOUNT_NOT_APPROVED',
        message: 'Your account is pending approval from the administrator'
      });
    }

    const stored = user.password || '';
    let ok = false;
    if (stored.startsWith('$2')) {
      ok = await bcrypt.compare(password, stored);
    } else {
      // legacy plaintext: compare and re-hash on success
      ok = password === stored;
      if (ok) {
        try {
          const h = await bcrypt.hash(password, 10);
          await pool.execute('UPDATE employees SET password = ? WHERE id = ?', [h, user.id]);
          console.log('Upgraded plaintext password to bcrypt for', user.id);
        } catch (e) {
          console.warn('Failed to re-hash password for', user.id, e.message || e);
        }
      }
    }
    if (!ok) return res.status(401).json({ error: 'Invalid credentials' });

    const token = jwt.sign({ id: user.id, email: user.email, role: user.role_id }, process.env.JWT_SECRET || 'change-me', { expiresIn: '8h' });
    res.json({ success: true, token, user: { id: user.id, name: user.name, role_id: user.role_id, email: user.email } });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Registration endpoint
app.post('/api/register', async (req, res) => {
  const { companyName, email, password, phone } = req.body;
  
  try {
    // Validation
    if (!companyName || !email || !password) {
      return res.status(400).json({ error: 'Missing required fields: companyName, email, password' });
    }

    // Enforce password policy: minimum 8 characters, at least one number and at least one letter
    const hasLetter = /[a-zA-Z]/.test(password);
    const hasNumber = /\d/.test(password);
    const hasMinLength = password.length >= 8;
    
    if (!hasMinLength || !hasLetter || !hasNumber) {
      return res.status(400).json({ error: 'Password must be at least 8 characters and include both letters and numbers' });
    }

    // Check if email already exists
    const [existingEmail] = await pool.execute('SELECT id FROM employees WHERE email = ?', [email]);
    if (existingEmail && existingEmail.length > 0) {
      return res.status(400).json({ error: 'Email already registered' });
    }

    // Create business
    const businessId = Date.now().toString();
    const businessStatus = 'pending'; // Await super admin approval
    
    await pool.execute(
      'INSERT INTO businesses (id, name, email, phone, status, paymentStatus, registeredAt) VALUES (?, ?, ?, ?, ?, ?, NOW())',
      [businessId, companyName, email, phone || null, businessStatus, 'unpaid']
    );

    // Create admin employee for this business
    const employeeId = Date.now().toString() + '_admin';
    const hashedPassword = await bcrypt.hash(password, 10);
    
    await pool.execute(
      'INSERT INTO employees (id, business_id, name, email, phone, password, is_super_admin, role_id, account_approved) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [employeeId, businessId, companyName + ' Admin', email, phone || null, hashedPassword, 0, 'admin', 0]
    );

    // Create default settings for business
    await pool.execute(
      'INSERT INTO settings (business_id, name, currency) VALUES (?, ?, ?)',
      [businessId, companyName, '$']
    );

    // Generate email verification token
    const verificationToken = crypto.randomBytes(32).toString('hex');
    const tokenId = 'email_verify_' + Date.now();
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

    // Store verification token
    await pool.execute(
      'INSERT INTO email_verification_tokens (id, employee_id, email, token, expires_at) VALUES (?, ?, ?, ?, ?)',
      [tokenId, employeeId, email, verificationToken, expiresAt]
    );
    
    // Send verification email
    try {
      const verifyLink = `${process.env.APP_URL || 'http://localhost:5173'}/#/verify-email?token=${verificationToken}`;
      const appUrl = process.env.APP_URL || 'http://localhost:5173';
      const mailOptions = {
        from: process.env.SMTP_FROM || 'noreply@omnisales.com',
        to: email,
        subject: `Welcome to ${process.env.APP_NAME || "JOBIZ!"} Verify Your Email`,
        html: `
          <!DOCTYPE html>
          <html>
            <head>
              <meta charset="utf-8">
              <meta name="viewport" content="width=device-width, initial-scale=1.0">
              <style>
                body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; }
                .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 40px 20px; text-align: center; border-radius: 8px 8px 0 0; }
                .header h1 { margin: 0; font-size: 28px; }
                .content { background: white; padding: 40px 20px; border: 1px solid #e5e7eb; }
                .button { display: inline-block; background: #3b82f6; color: white; padding: 14px 32px; border-radius: 6px; text-decoration: none; font-weight: bold; margin: 20px 0; }
                .button:hover { background: #2563eb; }
                .steps { background: #f9fafb; padding: 20px; border-left: 4px solid #3b82f6; margin: 20px 0; border-radius: 4px; }
                .steps h3 { margin-top: 0; color: #1f2937; }
                .steps ol { margin: 10px 0; padding-left: 20px; }
                .steps li { margin: 8px 0; }
                .footer { background: #f3f4f6; padding: 20px; text-align: center; font-size: 12px; color: #6b7280; border-radius: 0 0 8px 8px; border: 1px solid #e5e7eb; border-top: none; }
                .highlight { color: #667eea; font-weight: bold; }
                .warning { background: #fef3c7; padding: 15px; border-radius: 4px; margin: 20px 0; border-left: 4px solid #f59e0b; }
              </style>
            </head>
            <body>
              <div class="container">
                <div class="header">
                  <h1>🎉 Welcome to ${process.env.APP_NAME || "JOBIZ!"}</h1>
                  <p style="margin: 10px 0 0 0; font-size: 16px;">Complete Your Registration</p>
                </div>
                
                <div class="content">
                  <p>Hi <span class="highlight">${companyName}</span>,</p>
                  
                  <p>Thank you for choosing ${process.env.APP_NAME || "JOBIZ"}! We're excited to help you manage your business more efficiently.</p>
                  
                  <p><strong>Your registration is almost complete.</strong> We just need to verify your email address to proceed.</p>
                  
                  <center>
                    <a href="${verifyLink}" class="button">Verify My Email Address</a>
                  </center>
                  
                  <p style="text-align: center; color: #6b7280; font-size: 14px;">
                    Or copy this link: <br>
                    <code style="background: #f3f4f6; padding: 8px 12px; border-radius: 4px; word-break: break-all; display: inline-block; margin-top: 8px;">
                      ${verifyLink}
                    </code>
                  </p>
                  
                  <div class="steps">
                    <h3>📋 What Happens Next:</h3>
                    <ol>
                      <li><strong>Verify Your Email:</strong> Click the button above to confirm your email address</li>
                      <li><strong>Add Payment Details:</strong> You'll be directed to enter your payment information</li>
                      <li><strong>Admin Review:</strong> Our team will review your application and payment</li>
                      <li><strong>Account Activation:</strong> Once approved, you can access your dashboard immediately</li>
                    </ol>
                  </div>
                  
                  <div class="warning">
                    ⏰ <strong>Important:</strong> This verification link expires in 24 hours. Please verify your email soon to avoid losing access.
                  </div>
                  
                  <p style="color: #6b7280; font-size: 13px;">
                    Questions? Reply to this email or contact our support team at <a href="mailto:support@jobiz.ng" style="color: #3b82f6;">support@jobiz.ng</a>
                  </p>
                </div>
                
                <div class="footer">
                  <p style="margin: 0;">
                    © ${new Date().getFullYear()} JOBIZ. All rights reserved.<br>
                    <a href="${appUrl}" style="color: #3b82f6; text-decoration: none;">Visit Our Website</a>
                  </p>
                </div>
              </div>
            </body>
          </html>
        `
      };
      
      // Add timeout to email sending (max 8 seconds)
      const emailTimeout = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Email sending timeout')), 8000)
      );
      
      try {
        console.log('Sending verification email:', { from: mailOptions.from, to: mailOptions.to, subject: mailOptions.subject });
        const result = await Promise.race([transporter.sendMail(mailOptions), emailTimeout]);
        console.log('✅ Verification email sent successfully to', email, 'Response:', result);
      } catch (mailErr) {
        console.warn('❌ Failed to send verification email to', email, ':', mailErr.message);
      }
    } catch (emailErr) {
      console.warn('Failed to prepare verification email:', emailErr.message);
      // Don't fail the registration if email fails
    }

    // Send notification email to super admin
    try {
      const adminEmail = process.env.SMTP_USER || 'admin@jobiz.ng';
      const mailOptions = {
        from: process.env.SMTP_FROM || 'noreply@jobiz.ng',
        to: adminEmail,
        subject: `New Registration: ${companyName}`,
        html: `
          <h3>New Business Registration</h3>
          <p><strong>Company:</strong> ${companyName}</p>
          <p><strong>Admin Email:</strong> ${email}</p>
          <p><strong>Business ID:</strong> ${businessId}</p>
          <p><strong>Status:</strong> Pending Payment & Approval</p>
          <p>Please review and activate when payment is confirmed.</p>
        `
      };
      
      // Add timeout to email sending (max 5 seconds)
      const emailTimeout = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Admin email timeout')), 5000)
      );
      
      await Promise.race([transporter.sendMail(mailOptions), emailTimeout]);
    } catch (emailErr) {
      console.warn('Failed to send admin notification:', emailErr.message);
    }

    // Send OTP to phone number if provided
    if (phone) {
      try {
        // Generate 6-digit OTP
        const otp = Math.floor(100000 + Math.random() * 900000).toString();
        const otpId = 'otp_' + Date.now();
        const otpExpiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes expiry

        // Store OTP
        await pool.execute(
          'INSERT INTO phone_otp_tokens (id, employee_id, phone, otp, attempts, expires_at) VALUES (?, ?, ?, ?, ?, ?)',
          [otpId, employeeId, phone, otp, 0, otpExpiresAt]
        );

        // Send OTP via SMS
        const smsMessage = `Your JOBIZ verification code is: ${otp}. This code expires in 10 minutes. Do not share this code.`;
        
        // Use SMSLive247 if configured
        if ((process.env.SMS_PROVIDER || '').toLowerCase() === 'smslive247' && process.env.SMSLIVE_API_KEY) {
          try {
            const https = await import('https');
            const url = new URL(process.env.SMSLIVE_BATCH_URL || 'https://api.smslive247.com/v1/sms/batch');
            // Remove + sign from phone for SMS gateway
            const phoneForSMS = phone.replace(/^\+/, '');
            const payload = {
              phoneNumbers: [phoneForSMS],
              messageText: smsMessage,
              senderID: process.env.SMSLIVE_SENDER || 'INFO'
            };

            const smsTimeout = new Promise((_, reject) => 
              setTimeout(() => reject(new Error('SMS sending timeout')), 10000)
            );

            const sendSmsPromise = new Promise((resolve, reject) => {
              const reqOpts = {
                method: 'POST',
                hostname: url.hostname,
                port: url.port || 443,
                path: url.pathname + (url.search || ''),
                headers: {
                  'Content-Type': 'application/json',
                  'Content-Length': Buffer.byteLength(JSON.stringify(payload)),
                  'Accept': 'application/json',
                  'Authorization': process.env.SMSLIVE_API_KEY
                }
              };

              const request = https.request(reqOpts, (resp) => {
                let data = '';
                resp.on('data', (chunk) => { data += chunk; });
                resp.on('end', () => {
                  try {
                    const parsed = JSON.parse(data || '{}');
                    if (resp.statusCode && resp.statusCode >= 200 && resp.statusCode < 300) {
                      resolve(parsed);
                    } else {
                      reject(new Error('SMS provider error: ' + parsed.message));
                    }
                  } catch (e) {
                    reject(new Error('SMS provider returned invalid JSON'));
                  }
                });
              });

              request.on('error', (e) => {
                reject(new Error('Failed to contact SMS provider: ' + (e && e.message ? e.message : String(e))));
              });
              request.write(JSON.stringify(payload));
              request.end();
            });

            await Promise.race([sendSmsPromise, smsTimeout]);
            console.log('✅ OTP sent successfully to', phone);
          } catch (err) {
            console.warn('❌ Failed to send OTP to', phone, ':', err.message);
          }
        } else {
          // Fallback: if SMS not configured, just log the OTP for testing
          console.log('📱 OTP for phone verification:', otp, 'Phone:', phone);
        }
      } catch (otpErr) {
        console.warn('Failed to generate/send OTP:', otpErr.message);
        // Don't fail registration if OTP fails
      }
    }

    // Return success with business and employee info
    res.json({
      success: true,
      message: 'Registration successful! Check your email for verification.',
      businessId,
      employeeId,
      email,
      status: 'pending_verification'
    });

  } catch (err) {
    console.error('Registration error:', err);
    res.status(500).json({ error: err.message || 'Registration failed' });
  }
});

// Email Verification endpoint
app.post('/api/verify-email', async (req, res) => {
  const { token } = req.body;
  try {
    if (!token) return res.status(400).json({ error: 'Token is required' });

    // Find valid token
    const [tokenRows] = await pool.execute(
      'SELECT employee_id, email FROM email_verification_tokens WHERE token = ? AND expires_at > NOW()',
      [token]
    );

    if (!tokenRows || tokenRows.length === 0) {
      return res.status(400).json({ error: 'Invalid or expired verification token' });
    }

    const { employee_id, email } = tokenRows[0];

    // Update employee as email verified
    await pool.execute(
      'UPDATE employees SET email_verified = 1, email_verified_at = NOW() WHERE id = ?',
      [employee_id]
    );

    // Delete used token
    await pool.execute('DELETE FROM email_verification_tokens WHERE token = ?', [token]);

    res.json({ success: true, message: 'Email verified successfully!' });
  } catch (err) {
    console.error('Email verification error:', err);
    res.status(500).json({ error: 'Failed to verify email' });
  }
});

// Resend verification email endpoint
app.post('/api/resend-verification-email', async (req, res) => {
  const { email } = req.body;
  try {
    if (!email) return res.status(400).json({ error: 'Email is required' });

    // Find employee by email
    const [empRows] = await pool.execute(
      'SELECT id, name FROM employees WHERE email = ? LIMIT 1',
      [email]
    );

    if (!empRows || empRows.length === 0) {
      return res.status(404).json({ error: 'Email not found' });
    }

    const employee = empRows[0];

    // Check if already verified
    const [verified] = await pool.execute(
      'SELECT email_verified FROM employees WHERE email = ?',
      [email]
    );

    if (verified && verified[0] && verified[0].email_verified) {
      return res.status(400).json({ error: 'Email already verified' });
    }

    // Delete old token if exists
    await pool.execute('DELETE FROM email_verification_tokens WHERE email = ?', [email]);

    // Generate new verification token
    const verificationToken = crypto.randomBytes(32).toString('hex');
    const tokenId = 'email_verify_' + Date.now();
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

    // Store verification token
    await pool.execute(
      'INSERT INTO email_verification_tokens (id, employee_id, email, token, expires_at) VALUES (?, ?, ?, ?, ?)',
      [tokenId, employee.id, email, verificationToken, expiresAt]
    );

    // Send verification email
    const verifyLink = `${process.env.APP_URL || 'http://localhost:5173'}/#/verify-email?token=${verificationToken}`;
    const appUrl = process.env.APP_URL || 'http://localhost:5173';
    
    const mailOptions = {
      from: process.env.SMTP_FROM || 'info@jobiz.ng',
      to: email,
      subject: 'Verify Your OmniSales Email',
      html: `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8">
            <style>
              body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; }
              .button { display: inline-block; background: #3b82f6; color: white; padding: 12px 28px; border-radius: 6px; text-decoration: none; }
            </style>
          </head>
          <body>
            <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
              <h2>Verify Your Email</h2>
              <p>Hi ${employee.name},</p>
              <p>Please verify your email address by clicking the button below:</p>
              <center>
                <a href="${verifyLink}" class="button">Verify Email</a>
              </center>
              <p>Or copy this link: <code>${verifyLink}</code></p>
              <p>This link expires in 24 hours.</p>
            </div>
          </body>
        </html>
      `
    };

    const emailTimeout = new Promise((_, reject) => 
      setTimeout(() => reject(new Error('Email sending timeout')), 8000)
    );

    try {
      console.log('Resending verification email to:', email);
      await Promise.race([transporter.sendMail(mailOptions), emailTimeout]);
      console.log('✅ Resend verification email sent to', email);
      res.json({ success: true, message: 'Verification email resent successfully!' });
    } catch (mailErr) {
      console.warn('❌ Failed to resend verification email to', email, ':', mailErr.message);
      res.status(500).json({ error: 'Failed to send email. Please try again later.' });
    }
  } catch (err) {
    console.error('Resend verification error:', err);
    res.status(500).json({ error: 'Failed to resend verification email' });
  }
});

// Send OTP to phone endpoint
app.post('/api/send-otp', async (req, res) => {
  const { phone } = req.body;
  try {
    if (!phone) return res.status(400).json({ error: 'Phone number is required' });

    // Generate 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const otpId = 'otp_' + Date.now();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes expiry

    // Find employee by phone (assuming they just registered)
    const [employees] = await pool.execute('SELECT id FROM employees WHERE phone = ? ORDER BY id DESC LIMIT 1', [phone]);
    if (!employees || employees.length === 0) {
      return res.status(400).json({ error: 'Phone number not found in registration' });
    }
    const employeeId = employees[0].id;

    // Store OTP
    await pool.execute(
      'INSERT INTO phone_otp_tokens (id, employee_id, phone, otp, attempts, expires_at) VALUES (?, ?, ?, ?, ?, ?)',
      [otpId, employeeId, phone, otp, 0, expiresAt]
    );

    // Send OTP via SMS
    const smsMessage = `Your OmniSales verification code is: ${otp}. This code expires in 10 minutes. Do not share this code.`;
    
    // Use SMSLive247 if configured
    if ((process.env.SMS_PROVIDER || '').toLowerCase() === 'smslive247' && process.env.SMSLIVE_API_KEY) {
      try {
        const https = await import('https');
        const url = new URL(process.env.SMSLIVE_BATCH_URL || 'https://api.smslive247.com/v1/sms/batch');
        // Remove + sign from phone for SMS gateway
        const phoneForSMS = phone.replace(/^\+/, '');
        const payload = {
          phoneNumbers: [phoneForSMS],
          messageText: smsMessage,
          senderID: process.env.SMSLIVE_SENDER || 'INFO'
        };

        const smsTimeout = new Promise((_, reject) => 
          setTimeout(() => reject(new Error('SMS sending timeout')), 10000)
        );

        const sendSmsPromise = new Promise((resolve, reject) => {
          const reqOpts = {
            method: 'POST',
            hostname: url.hostname,
            port: url.port || 443,
            path: url.pathname + (url.search || ''),
            headers: {
              'Content-Type': 'application/json',
              'Content-Length': Buffer.byteLength(JSON.stringify(payload)),
              'Accept': 'application/json',
              'Authorization': process.env.SMSLIVE_API_KEY
            }
          };

          const request = https.request(reqOpts, (resp) => {
            let data = '';
            resp.on('data', (chunk) => { data += chunk; });
            resp.on('end', () => {
              try {
                const parsed = JSON.parse(data || '{}');
                if (resp.statusCode && resp.statusCode >= 200 && resp.statusCode < 300) {
                  resolve(parsed);
                } else {
                  reject(new Error('SMS provider error: ' + parsed.message));
                }
              } catch (e) {
                reject(new Error('SMS provider returned invalid JSON'));
              }
            });
          });

          request.on('error', (e) => {
            reject(new Error('Failed to contact SMS provider: ' + (e && e.message ? e.message : String(e))));
          });
          request.write(JSON.stringify(payload));
          request.end();
        });

        await Promise.race([sendSmsPromise, smsTimeout]);
        console.log('✅ OTP sent successfully to', phone);
        res.json({ success: true, message: 'OTP sent successfully to your phone' });
      } catch (err) {
        console.warn('❌ Failed to send OTP to', phone, ':', err.message);
        res.status(500).json({ error: 'Failed to send OTP: ' + err.message });
      }
    } else {
      // Fallback: if SMS not configured, just log the OTP for testing
      console.log('📱 OTP for phone verification:', otp, 'Phone:', phone);
      res.json({ success: true, message: 'OTP sent successfully (development mode)' });
    }
  } catch (err) {
    console.error('Send OTP error:', err);
    res.status(500).json({ error: 'Failed to send OTP' });
  }
});

// Verify OTP endpoint
app.post('/api/verify-otp', async (req, res) => {
  const { phone, otp } = req.body;
  try {
    if (!phone || !otp) return res.status(400).json({ error: 'Phone and OTP are required' });
    if (otp.length !== 6) return res.status(400).json({ error: 'OTP must be 6 digits' });

    // Find the latest OTP for this phone
    const [otpRecords] = await pool.execute(
      'SELECT id, employee_id, otp, attempts, expires_at FROM phone_otp_tokens WHERE phone = ? AND verified_at IS NULL ORDER BY created_at DESC LIMIT 1',
      [phone]
    );

    if (!otpRecords || otpRecords.length === 0) {
      return res.status(400).json({ error: 'No OTP found for this phone number. Please request a new one.' });
    }

    const otpRecord = otpRecords[0];
    const now = new Date();

    // Check if OTP has expired
    if (now > new Date(otpRecord.expires_at)) {
      return res.status(400).json({ error: 'OTP has expired. Please request a new one.' });
    }

    // Check attempt limit (max 5 attempts)
    if (otpRecord.attempts >= 5) {
      return res.status(400).json({ error: 'Too many attempts. Please request a new OTP.' });
    }

    // Verify OTP
    if (otpRecord.otp !== otp) {
      // Increment attempts
      await pool.execute(
        'UPDATE phone_otp_tokens SET attempts = attempts + 1 WHERE id = ?',
        [otpRecord.id]
      );
      return res.status(400).json({ error: 'Invalid OTP. Please try again.' });
    }

    // OTP verified! Mark as verified and update employee
    const verifiedAt = new Date();
    await pool.execute(
      'UPDATE phone_otp_tokens SET verified_at = ? WHERE id = ?',
      [verifiedAt, otpRecord.id]
    );

    // Mark BOTH phone and email as verified (either method completes the verification)
    await pool.execute(
      'UPDATE employees SET phone_verified = 1, phone_verified_at = ?, email_verified = 1, email_verified_at = ? WHERE id = ?',
      [verifiedAt, verifiedAt, otpRecord.employee_id]
    );

    console.log('✅ Account verified successfully via phone OTP for employee:', otpRecord.employee_id);
    res.json({ success: true, message: 'Phone verified successfully. You can now proceed to payment.' });
  } catch (err) {
    console.error('Verify OTP error:', err);
    res.status(500).json({ error: 'Failed to verify OTP' });
  }
});

// Add payment details endpoint
app.post('/api/add-payment', authMiddleware, async (req, res) => {
  const { paymentType, planId, amount, cardLastFour, cardBrand, billingCycleStart, billingCycleEnd } = req.body;
  try {
    if (!paymentType || !amount) {
      return res.status(400).json({ error: 'Payment type and amount are required' });
    }

    // Get employee business_id
    const [empRows] = await pool.execute('SELECT business_id FROM employees WHERE id = ?', [req.user.id]);
    if (!empRows || empRows.length === 0) {
      return res.status(404).json({ error: 'Employee not found' });
    }

    const businessId = empRows[0].business_id;

    // Create payment record
    const paymentId = 'payment_' + Date.now();
    await pool.execute(
      `INSERT INTO business_payments (id, business_id, payment_type, plan_id, amount, card_last_four, card_brand, status, billing_cycle_start, billing_cycle_end)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [paymentId, businessId, paymentType, planId || null, amount, cardLastFour || null, cardBrand || null, 'pending', billingCycleStart || null, billingCycleEnd || null]
    );

    res.json({ success: true, paymentId, message: 'Payment details submitted for approval' });
  } catch (err) {
    console.error('Add payment error:', err);
    res.status(500).json({ error: 'Failed to add payment' });
  }
});

// Get user's pending payment
app.get('/api/user-payment', authMiddleware, async (req, res) => {
  try {
    // Get employee business_id
    const [empRows] = await pool.execute('SELECT business_id FROM employees WHERE id = ?', [req.user.id]);
    if (!empRows || empRows.length === 0) {
      return res.status(404).json({ error: 'Employee not found' });
    }

    const businessId = empRows[0].business_id;

    // Get latest payment
    const [paymentRows] = await pool.execute(
      `SELECT * FROM business_payments WHERE business_id = ? ORDER BY created_at DESC LIMIT 1`,
      [businessId]
    );

    if (!paymentRows || paymentRows.length === 0) {
      return res.json({ payment: null });
    }

    res.json({ payment: paymentRows[0] });
  } catch (err) {
    console.error('Get payment error:', err);
    res.status(500).json({ error: 'Failed to fetch payment' });
  }
});

// Super Admin: Get all pending payments
app.get('/api/super-admin/pending-payments', superAdminAuthMiddleware, async (req, res) => {
  try {
    const [payments] = await pool.execute(
      `SELECT bp.*, b.name as businessName, b.email as businessEmail
       FROM business_payments bp
       JOIN businesses b ON bp.business_id = b.id
       WHERE bp.status = 'pending'
       ORDER BY bp.created_at DESC`
    );

    res.json({ payments: payments || [] });
  } catch (err) {
    console.error('Get pending payments error:', err);
    res.status(500).json({ error: 'Failed to fetch payments' });
  }
});

// Super Admin: Approve payment
app.post('/api/super-admin/approve-payment/:paymentId', superAdminAuthMiddleware, async (req, res) => {
  try {
    const paymentId = req.params.paymentId;

    // Update payment status
    await pool.execute(
      'UPDATE business_payments SET status = ?, approved_by = ?, approved_at = NOW() WHERE id = ?',
      ['approved', req.user.id, paymentId]
    );

    // Get payment details to approve business account
    const [paymentRows] = await pool.execute('SELECT business_id FROM business_payments WHERE id = ?', [paymentId]);
    if (paymentRows && paymentRows[0]) {
      // Approve the account
      const businessId = paymentRows[0].business_id;
      await pool.execute('UPDATE employees SET account_approved = 1, account_approved_at = NOW() WHERE business_id = ?', [businessId]);
      await pool.execute('UPDATE businesses SET paymentStatus = ? WHERE id = ?', ['paid', businessId]);
    }

    res.json({ success: true, message: 'Payment approved and account activated' });
  } catch (err) {
    console.error('Approve payment error:', err);
    res.status(500).json({ error: 'Failed to approve payment' });
  }
});

// Super Admin: Reject payment
app.post('/api/super-admin/reject-payment/:paymentId', superAdminAuthMiddleware, async (req, res) => {
  try {
    const { reason } = req.body;
    const paymentId = req.params.paymentId;

    // Update payment status
    await pool.execute(
      'UPDATE business_payments SET status = ?, approved_by = ?, approved_at = NOW() WHERE id = ?',
      ['rejected', req.user.id, paymentId]
    );

    res.json({ success: true, message: 'Payment rejected' });
  } catch (err) {
    console.error('Reject payment error:', err);
    res.status(500).json({ error: 'Failed to reject payment' });
  }
});

app.get('/api/products', async (req, res) => {
  try {
    const [rows] = await pool.execute('SELECT * FROM products ORDER BY name');
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/products', authMiddleware, async (req, res) => {
  // Normalize incoming fields (accept camelCase, snake_case, legacy names)
  try {
    const body = req.body || {};
    const id = body.id || body.product_id || body.productId || null;
    const businessId = body.business_id || body.businessId || null;
    const name = body.name || body.product_name || body.productName || '';
    const categoryName = body.category_name || body.categoryName || body.category || null;
    const categoryGroup = body.category_group || body.categoryGroup || null;
    const price = typeof body.price !== 'undefined' && body.price !== null && body.price !== '' ? Number(body.price) : 0;
    const stock = typeof body.stock !== 'undefined' && body.stock !== null && body.stock !== '' ? Number(body.stock) : 0;
    const unit = body.unit || body.uom || body.unit_name || null;
    const supplierId = body.supplier_id || body.supplierId || body.supplier || null;
    const isService = typeof body.is_service !== 'undefined' ? (body.is_service ? 1 : 0) : (typeof body.isService !== 'undefined' ? (body.isService ? 1 : 0) : 0);
    const imageUrl = body.image_url || body.imageUrl || null;

    // Build params in the exact order of columns to avoid undefined binds
    // Use provided id if present, otherwise let MySQL generate auto id (if schema supports it)
    // Here products.id is VARCHAR primary key in schema, so require an id; generate timestamp id when missing
    const pid = id || Date.now().toString();

    // Resolve business id from authenticated user when not provided
    let resolvedBusinessId = businessId || null;
    if (!resolvedBusinessId) {
      try {
        const [bizRows] = await pool.execute('SELECT business_id FROM employees WHERE id = ?', [req.user.id]);
        resolvedBusinessId = (Array.isArray(bizRows) && bizRows[0]) ? bizRows[0].business_id : resolvedBusinessId;
      } catch (e) {
        console.warn('Failed to resolve business_id for user', req.user && req.user.id, e && e.message ? e.message : e);
      }
    }

    const params = [pid, resolvedBusinessId || null, name || null, categoryName || null, categoryGroup || null, price, stock, unit || null, supplierId || null, isService ? 1 : 0, imageUrl || null];

    // Upsert to avoid duplicate-key insert errors and to support updates
    const sql = `INSERT INTO products (id, business_id, name, category_name, category_group, price, stock, unit, supplier_id, is_service, image_url) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?) ON DUPLICATE KEY UPDATE name=VALUES(name), category_name=VALUES(category_name), category_group=VALUES(category_group), price=VALUES(price), stock=VALUES(stock), unit=VALUES(unit), supplier_id=VALUES(supplier_id), is_service=VALUES(is_service), image_url=VALUES(image_url)`;

    // Log SQL & params for debugging unknown-column / bind errors
    console.log('POST /api/products -> executing SQL:', sql);
    console.log('POST /api/products -> params:', params);
    const [result] = await pool.execute(sql, params);

    // Audit log (best-effort)
    try {
      const aid = Date.now().toString();
      await pool.execute('INSERT INTO audit_logs (id, business_id, user_id, user_name, action, resource, details) VALUES (?, ?, ?, ?, ?, ?, ?)', [aid, resolvedBusinessId, req.user.id, req.user.email || req.user.id, 'create', 'product', JSON.stringify(body)]);
    } catch (e) { console.warn('Failed to write audit log', e.message || e); }

    res.json({ success: true, id: pid, inserted: (result && (result.insertId || result.affectedRows)) ? true : true });
  } catch (err) {
    console.error('Error in POST /api/products:', err && err.message ? err.message : err);
    res.status(500).json({ error: err.message || String(err) });
  }
});

// Sales
app.post('/api/sales', authMiddleware, async (req, res) => {
  const { items, total, customerId, paymentMethod, locationId: providedLocationId } = req.body;
  const connection = await pool.getConnection();
  try {
    // Determine if there are physical (non-service) items
    const hasPhysicalItems = Array.isArray(items) ? items.some(it => !it.isService) : true;

    // Determine location: use provided or user's default_location_id
    const [empRows] = await pool.execute('SELECT default_location_id, is_super_admin, role_id FROM employees WHERE id = ?', [req.user.id]);
    const emp = empRows[0] || {};
    const saleLocation = providedLocationId || emp.default_location_id;

    // If there are physical items and no location was supplied or available, require a location
    if (!saleLocation && hasPhysicalItems && !req.body.isProforma) {
      return res.status(400).json({ error: 'Sale location not specified for physical items' });
    }

    // Permission: only admin or role with pos:any_location can sale from other locations
    if (providedLocationId && providedLocationId !== emp.default_location_id) {
      // check role permissions
      const [roleRows] = await pool.execute('SELECT permissions FROM roles WHERE id = ? AND business_id = (SELECT business_id FROM employees WHERE id = ?)', [emp.role_id, req.user.id]);
      const role = roleRows[0];
      const perms = role && role.permissions ? (role.permissions || '') : '';
      const isAdmin = emp.is_super_admin || perms.includes('pos:any_location');
      if (!isAdmin) return res.status(403).json({ error: 'Forbidden: cannot create sale from another location' });
    }

    // resolve business id from user (use connection for transactional consistency)
    const [bizRows] = await connection.execute('SELECT business_id FROM employees WHERE id = ?', [req.user.id]);
    const businessId = (Array.isArray(bizRows) && bizRows[0]) ? bizRows[0].business_id : null;
    await connection.beginTransaction();

    // Check per-location stock availability for physical items only (skip if all are services or this is a proforma)
    if (hasPhysicalItems && saleLocation) {
      for (const item of items) {
        if (!item.isService) {
          const [stockRows] = await connection.execute('SELECT quantity FROM stock_entries WHERE product_id = ? AND location_id = ? FOR UPDATE', [item.id, saleLocation]);
          const available = stockRows[0] ? stockRows[0].quantity : 0;
          if (available < item.quantity) {
            await connection.rollback();
            return res.status(400).json({ error: `Insufficient stock for ${item.name} at this location` });
          }
        }
      }
    }

    // Insert Sale (include business_id and explicit id)
    const saleId = req.body.id || Date.now().toString();
    const isProformaFlag = req.body.isProforma ? 1 : 0;
    const deliveryFee = req.body.deliveryFee || req.body.delivery_fee || 0;
    const particularsText = req.body.particulars || '';

    const [saleResult] = await connection.execute(
      'INSERT INTO sales (id, business_id, subtotal, vat, total, customer_id, payment_method, cashier, is_proforma, delivery_fee, particulars, location_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [saleId, businessId, req.body.subtotal || 0, req.body.vat || 0, total, customerId, paymentMethod, req.user.email || req.user.id, isProformaFlag, deliveryFee, particularsText, saleLocation || null]
    );

    // Insert Items & Update stock_entries and aggregated products.stock
    for (let idx = 0; idx < (items || []).length; idx++) {
      const item = items[idx];
      // If this item is a service (stored in `services` table), ensure a corresponding
      // row exists in `products` so that the `sale_items.product_id` foreign key is satisfied.
      // We mark it as `is_service=1` and upsert basic info (name, price).
      if (item.isService) {
        try {
          const serviceProductId = item.id;
          const svcName = item.name || item.description || 'Service';
          const svcPrice = typeof item.price !== 'undefined' ? item.price : 0;
          await connection.execute(
            `INSERT INTO products (id, business_id, name, category_name, category_group, price, stock, unit, supplier_id, is_service, image_url) VALUES (?, ?, ?, NULL, NULL, ?, 0, NULL, NULL, 1, NULL) ON DUPLICATE KEY UPDATE name=VALUES(name), price=VALUES(price), is_service=VALUES(is_service)`,
            [serviceProductId, businessId, svcName, svcPrice]
          );
        } catch (e) {
          console.warn('Failed to ensure product row for service item', item, e && e.message ? e.message : e);
        }
      }
      // Ensure sale_items.id is set (sale_items table expects a primary key)
      const itemId = item && item.itemId ? item.itemId : `${saleId}_${Date.now()}_${idx}`;
      await connection.execute(
        'INSERT INTO sale_items (id, sale_id, product_id, quantity, price, is_service) VALUES (?, ?, ?, ?, ?, ?)',
        [itemId, saleId, item.id, item.quantity, item.price, item.isService ? 1 : 0]
      );

      if (!item.isService && saleLocation) {
        await connection.execute('UPDATE stock_entries SET quantity = GREATEST(0, quantity - ?) WHERE product_id = ? AND location_id = ?', [item.quantity, item.id, saleLocation]);
        // Recalculate aggregated stock
        const [sumRows] = await connection.execute('SELECT COALESCE(SUM(quantity),0) as total FROM stock_entries WHERE product_id = ?', [item.id]);
        const totalStock = sumRows[0].total || 0;
        await connection.execute('UPDATE products SET stock = ? WHERE id = ?', [totalStock, item.id]);
      }
    }

    await connection.commit();
    res.json({ success: true, saleId });
  } catch (err) {
    await connection.rollback();
    res.status(500).json({ error: err.message });
  } finally {
    connection.release();
  }
});

// Get sales list (scoped to business)
app.get('/api/sales', authMiddleware, async (req, res) => {
  try {
    const [salesRows] = await pool.execute('SELECT * FROM sales WHERE business_id = (SELECT business_id FROM employees WHERE id = ?) ORDER BY date DESC', [req.user.id]);
    // Fetch items for each sale
    const sales = Array.isArray(salesRows) ? salesRows : [];
    const detailed = [];
    for (const s of sales) {
      const [items] = await pool.execute('SELECT product_id as id, quantity, price, is_service FROM sale_items WHERE sale_id = ?', [s.id]);
      detailed.push({ ...s, items: Array.isArray(items) ? items : [] });
    }
    res.json(detailed);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Communications
app.post('/api/send-email', async (req, res) => {
  const { to, subject, text } = req.body;
  try {
    await transporter.sendMail({
      from: process.env.SMTP_FROM,
      to,
      subject,
      text,
    });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/send-sms', async (req, res) => {
  const { to, body } = req.body;
  if (!to) return res.status(400).json({ error: 'Missing recipients' });
  const recipients = Array.isArray(to) ? to.filter(Boolean) : [to];
  if (recipients.length === 0) return res.status(400).json({ error: 'No valid recipients' });

  // If SMS provider configured as smslive247 use their batch endpoint
  if ((process.env.SMS_PROVIDER || '').toLowerCase() === 'smslive247' && process.env.SMSLIVE_API_KEY) {
    try {
      const https = await import('https');
      const url = new URL(process.env.SMSLIVE_BATCH_URL || 'https://api.smslive247.com/v1/sms/batch');
      const payload = {
        api_key: process.env.SMSLIVE_API_KEY,
        sender: process.env.SMSLIVE_SENDER || process.env.SMS_FROM || '',
        messages: recipients.map(r => ({ to: r, message: body }))
      };

      const reqOpts = {
        method: 'POST',
        hostname: url.hostname,
        port: url.port || 443,
        path: url.pathname + (url.search || ''),
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(JSON.stringify(payload)),
          'Accept': 'application/json'
        }
      };

      const request = https.request(reqOpts, (resp) => {
        let data = '';
        resp.on('data', (chunk) => { data += chunk; });
        resp.on('end', () => {
          try {
            const parsed = JSON.parse(data || '{}');
            if (resp.statusCode && resp.statusCode >= 200 && resp.statusCode < 300) return res.json({ success: true, provider: 'smslive247', result: parsed });
            return res.status(502).json({ error: 'SMS provider error', details: parsed });
          } catch (e) {
            return res.status(502).json({ error: 'SMS provider returned invalid JSON', raw: data });
          }
        });
      });

      request.on('error', (e) => {
        return res.status(500).json({ error: 'Failed to contact SMS provider', details: e && e.message ? e.message : String(e) });
      });
      request.write(JSON.stringify(payload));
      request.end();
    } catch (err) {
      return res.status(500).json({ error: 'Failed to send via SMS provider', details: err && err.message ? err.message : String(err) });
    }
    return;
  }

  // Fallback to Twilio if configured - send messages sequentially
  if (!smsClient) return res.status(503).json({ error: 'SMS Gateway not configured' });
  try {
    for (const r of recipients) {
      await smsClient.messages.create({ body, from: process.env.SMS_FROM, to: r });
    }
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// File upload endpoint (protected)
app.post('/api/upload', authMiddleware, upload.single('file'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
  const fileUrl = `/uploads/${req.file.filename}`;
  res.json({ success: true, url: fileUrl, filename: req.file.filename });
});

// Locations endpoints
app.get('/api/locations', authMiddleware, async (req, res) => {
  try {
    const [rows] = await pool.execute('SELECT * FROM locations WHERE business_id = (SELECT business_id FROM employees WHERE id = ?)', [req.user.id]);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/locations', authMiddleware, async (req, res) => {
  const { id, name, address } = req.body;
  try {
    // Only allow users from a business to create locations for their business
    const [bizRows] = await pool.execute('SELECT business_id FROM employees WHERE id = ?', [req.user.id]);
    const businessId = bizRows[0].business_id;
    const [result] = await pool.execute('INSERT INTO locations (id, business_id, name, address) VALUES (?, ?, ?, ?)', [id || Date.now().toString(), businessId, name, address]);
    res.json({ success: true, id: result.insertId || id });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/locations/:id', authMiddleware, async (req, res) => {
  const { id } = req.params;
  const { name, address } = req.body;
  try {
    await pool.execute('UPDATE locations SET name = ?, address = ? WHERE id = ? AND business_id = (SELECT business_id FROM employees WHERE id = ?)', [name, address, id, req.user.id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/locations/:id', authMiddleware, async (req, res) => {
  const { id } = req.params;
  try {
    await pool.execute('DELETE FROM locations WHERE id = ? AND business_id = (SELECT business_id FROM employees WHERE id = ?)', [id, req.user.id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Stock endpoints
app.get('/api/stock/:productId', authMiddleware, async (req, res) => {
  const { productId } = req.params;
  try {
    const [rows] = await pool.execute('SELECT * FROM stock_entries WHERE product_id = ? AND business_id = (SELECT business_id FROM employees WHERE id = ?)', [productId, req.user.id]);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Stock history for a product
app.get('/api/stock/history/:productId', authMiddleware, async (req, res) => {
  const { productId } = req.params;
  try {
    const [rows] = await pool.execute('SELECT * FROM stock_history WHERE product_id = ? AND business_id = (SELECT business_id FROM employees WHERE id = ?) ORDER BY timestamp DESC', [productId, req.user.id]);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Stock history for the business (all products)
app.get('/api/stock/history', authMiddleware, async (req, res) => {
  try {
    const [rows] = await pool.execute('SELECT * FROM stock_history WHERE business_id = (SELECT business_id FROM employees WHERE id = ?) ORDER BY timestamp DESC', [req.user.id]);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Categories CRUD
app.get('/api/categories', authMiddleware, async (req, res) => {
  try {
    const businessId = await resolveBusinessId(req);
    if (!businessId) return res.json([]);
    const [rows] = await pool.execute('SELECT * FROM categories WHERE business_id = ? ORDER BY name', [businessId]);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/categories', authMiddleware, async (req, res) => {
  try {
    const body = req.body || {};
    const id = body.id || body.category_id || Date.now().toString();
    const name = body.name || body.label || null;
    const group = body.group || body.category_group || null;
    const is_product = typeof body.is_product !== 'undefined' ? (body.is_product ? 1 : 0) : (typeof body.isProduct !== 'undefined' ? (body.isProduct ? 1 : 0) : 1);
    const description = body.description || null;

    const businessId = await resolveBusinessId(req);
    if (!businessId) return res.status(400).json({ error: 'Business not found for current user' });

    const sql = `INSERT INTO categories (id, business_id, name, \`group\`, is_product, description) VALUES (?, ?, ?, ?, ?, ?) ON DUPLICATE KEY UPDATE name=VALUES(name), \`group\`=VALUES(\`group\`), is_product=VALUES(is_product), description=VALUES(description)`;
    const params = [id, businessId, name, group, is_product, description];
    await pool.execute(sql, params);
    // audit
    try { const aid = Date.now().toString(); await pool.execute('INSERT INTO audit_logs (id, business_id, user_id, user_name, action, resource, details) VALUES (?, ?, ?, ?, ?, ?, ?)', [aid, businessId, req.user.id, req.user.email || req.user.id, 'create', 'category', JSON.stringify({ id, name, group, is_product, description })]); } catch (e) { /* ignore */ }
    res.json({ success: true, id });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/categories/:id', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const body = req.body || {};
    const name = body.name || body.label || null;
    const group = body.group || body.category_group || null;
    const is_product = typeof body.is_product !== 'undefined' ? (body.is_product ? 1 : 0) : (typeof body.isProduct !== 'undefined' ? (body.isProduct ? 1 : 0) : 1);
    const description = body.description || null;
    const businessId = await resolveBusinessId(req);
    if (!businessId) return res.status(400).json({ error: 'Business not found for current user' });
    await pool.execute('UPDATE categories SET name = ?, `group` = ?, is_product = ?, description = ? WHERE id = ? AND business_id = ?', [name, group, is_product, description, id, businessId]);
    try { const aid = Date.now().toString(); await pool.execute('INSERT INTO audit_logs (id, business_id, user_id, user_name, action, resource, details) VALUES (?, ?, ?, ?, ?, ?, ?)', [aid, businessId, req.user.id, req.user.email || req.user.id, 'update', 'category', JSON.stringify({ id, name, group, is_product, description })]); } catch (e) {}
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/categories/:id', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const businessId = await resolveBusinessId(req);
    if (!businessId) return res.status(400).json({ error: 'Business not found for current user' });
    await pool.execute('DELETE FROM categories WHERE id = ? AND business_id = ?', [id, businessId]);
    try { const aid = Date.now().toString(); await pool.execute('INSERT INTO audit_logs (id, business_id, user_id, user_name, action, resource, details) VALUES (?, ?, ?, ?, ?, ?, ?)', [aid, businessId, req.user.id, req.user.email || req.user.id, 'delete', 'category', JSON.stringify({ id })]); } catch (e) {}
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Audit logs read endpoint
app.get('/api/audit-logs', authMiddleware, async (req, res) => {
  try {
    const [bizRows] = await pool.execute('SELECT business_id FROM employees WHERE id = ?', [req.user.id]);
    const businessId = bizRows && bizRows[0] ? bizRows[0].business_id : null;
    if (!businessId) return res.json([]);
    const [rows] = await pool.execute('SELECT id, business_id, user_id, user_name, action, resource, details, timestamp FROM audit_logs WHERE business_id = ? ORDER BY timestamp DESC LIMIT 1000', [businessId]);
    const mapped = (rows || []).map((r) => ({
      id: r.id,
      businessId: r.business_id,
      userId: r.user_id,
      userName: r.user_name,
      action: r.action,
      resource: r.resource,
      details: r.details,
      timestamp: r.timestamp
    }));
    res.json(mapped);
  } catch (e) {
    console.warn('Failed to fetch audit logs', e && e.message ? e.message : e);
    res.status(500).json({ error: 'Failed to fetch audit logs' });
  }
});

// Barcode generation endpoint (optional dependency: bwip-js)
app.get('/api/barcode/:text', authMiddleware, async (req, res) => {
  const { text } = req.params;
  try {
    let bwip;
    try {
      bwip = (await import('bwip-js')).default || (await import('bwip-js'));
    } catch (e) {
      return res.status(501).json({ error: 'Barcode generator not installed. Install `bwip-js` to enable this endpoint.' });
    }

    const png = await bwip.toBuffer({
      bcid: 'code128',       // Barcode type
      text: String(text || ''),    // Text to encode
      scale: 3,             // 3x scaling
      height: 10,           // bar height, mm
      includetext: true,    // show human-readable text
      textxalign: 'center',
    });
    res.set('Content-Type', 'image/png');
    res.send(png);
  } catch (err) {
    res.status(500).json({ error: err.message || String(err) });
  }
});

app.post('/api/stock/increase', authMiddleware, async (req, res) => {
  const { productId, locationId, qty } = req.body;
  try {
    // Only allow business users to add stock to their locations
    const [bizRows] = await pool.execute('SELECT business_id FROM employees WHERE id = ?', [req.user.id]);
    const businessId = bizRows[0].business_id;
    // Upsert: if exists, increase, otherwise insert
    await pool.execute('INSERT INTO stock_entries (id, business_id, product_id, location_id, quantity) VALUES (?, ?, ?, ?, ?) ON DUPLICATE KEY UPDATE quantity = quantity + VALUES(quantity)', [Date.now().toString(), businessId, productId, locationId, qty]);
    // Update aggregated product.stock
    const [sumRows] = await pool.execute('SELECT COALESCE(SUM(quantity),0) as total FROM stock_entries WHERE product_id = ?', [productId]);
    const total = sumRows[0].total || 0;
    await pool.execute('UPDATE products SET stock = ? WHERE id = ?', [total, productId]);
    // Record history
    try {
      const sid = Date.now().toString();
      const [bizRows2] = await pool.execute('SELECT business_id FROM employees WHERE id = ?', [req.user.id]);
      const businessId = bizRows2[0] ? bizRows2[0].business_id : null;
      const supplierId = req.body.supplierId || req.body.supplier_id || null;
      const batchNumber = req.body.batchNumber || req.body.batch_number || null;
      const referenceId = req.body.referenceId || req.body.reference_id || null;
      await pool.execute('INSERT INTO stock_history (id, business_id, product_id, location_id, change_amount, type, supplier_id, batch_number, reference_id, user_id, notes) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)', [sid, businessId, productId, locationId, qty, 'IN', supplierId, batchNumber, referenceId, req.user.id, 'Stock increase via API']);
    } catch (e) { console.warn('Failed to write stock history', e.message || e); }

    res.json({ success: true, total });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/stock/decrease', authMiddleware, async (req, res) => {
  const { productId, locationId, qty } = req.body;
  try {
    await pool.execute('UPDATE stock_entries SET quantity = GREATEST(0, quantity - ?) WHERE product_id = ? AND location_id = ?', [qty, productId, locationId]);
    const [sumRows] = await pool.execute('SELECT COALESCE(SUM(quantity),0) as total FROM stock_entries WHERE product_id = ?', [productId]);
    const total = sumRows[0].total || 0;
    await pool.execute('UPDATE products SET stock = ? WHERE id = ?', [total, productId]);
    // Record history for decrease
    try {
      const sid = Date.now().toString();
      const [bizRows2] = await pool.execute('SELECT business_id FROM employees WHERE id = ?', [req.user.id]);
      const businessId = bizRows2[0] ? bizRows2[0].business_id : null;
      const supplierId = req.body.supplierId || req.body.supplier_id || null;
      const batchNumber = req.body.batchNumber || req.body.batch_number || null;
      const referenceId = req.body.referenceId || req.body.reference_id || null;
      await pool.execute('INSERT INTO stock_history (id, business_id, product_id, location_id, change_amount, type, supplier_id, batch_number, reference_id, user_id, notes) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)', [sid, businessId, productId, locationId, -Math.abs(qty), 'OUT', supplierId, batchNumber, referenceId, req.user.id, 'Stock decrease via API']);
    } catch (e) { console.warn('Failed to write stock history', e.message || e); }

    res.json({ success: true, total });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/stock/move', authMiddleware, async (req, res) => {
  const { productId, fromLocationId, toLocationId, qty } = req.body;
  try {
    // Check permissions: only admin or role with inventory:move
    const [empRows] = await pool.execute('SELECT is_super_admin, role_id FROM employees WHERE id = ?', [req.user.id]);
    const emp = empRows[0] || {};
    if (!emp.is_super_admin) {
      const [roleRows] = await pool.execute('SELECT permissions FROM roles WHERE id = ? AND business_id = (SELECT business_id FROM employees WHERE id = ?)', [emp.role_id, req.user.id]);
      const perms = roleRows[0] ? (roleRows[0].permissions || '') : '';
      if (!perms.includes('inventory:move')) return res.status(403).json({ error: 'Forbidden' });
    }
    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();
      await connection.execute('UPDATE stock_entries SET quantity = GREATEST(0, quantity - ?) WHERE product_id = ? AND location_id = ?', [qty, productId, fromLocationId]);
      await connection.execute('INSERT INTO stock_entries (id, business_id, product_id, location_id, quantity) VALUES (?, (SELECT business_id FROM employees WHERE id = ?), ?, ?, ?) ON DUPLICATE KEY UPDATE quantity = quantity + VALUES(quantity)', [Date.now().toString(), req.user.id, productId, toLocationId, qty]);
      const [sumRows] = await connection.execute('SELECT COALESCE(SUM(quantity),0) as total FROM stock_entries WHERE product_id = ?', [productId]);
      const total = sumRows[0].total || 0;
      await connection.execute('UPDATE products SET stock = ? WHERE id = ?', [total, productId]);
      // Record move history (out and in)
      try {
        const bidRes = await connection.execute('SELECT business_id FROM employees WHERE id = ?', [req.user.id]);
        const businessId = bidRes[0] && bidRes[0][0] ? bidRes[0][0].business_id : null;
        const supplierId = req.body.supplierId || req.body.supplier_id || null;
        const batchNumber = req.body.batchNumber || req.body.batch_number || null;
        const requestReference = req.body.referenceId || req.body.reference_id || null;
        const outId = Date.now().toString() + '_out';
        const inId = Date.now().toString() + '_in';
        await connection.execute('INSERT INTO stock_history (id, business_id, product_id, location_id, change_amount, type, supplier_id, batch_number, reference_id, user_id, notes) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)', [outId, businessId, productId, fromLocationId, -Math.abs(qty), 'MOVE_OUT', supplierId, batchNumber, requestReference || null, req.user.id, `Moved to ${toLocationId}`]);
        await connection.execute('INSERT INTO stock_history (id, business_id, product_id, location_id, change_amount, type, supplier_id, batch_number, reference_id, user_id, notes) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)', [inId, businessId, productId, toLocationId, qty, 'MOVE_IN', supplierId, batchNumber, requestReference || outId, req.user.id, `Moved from ${fromLocationId}`]);
      } catch (e) { console.warn('Failed to write move history', e.message || e); }
      await connection.commit();
      res.json({ success: true, total });
    } catch (err) {
      await connection.rollback();
      res.status(500).json({ error: err.message });
    } finally {
      connection.release();
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Products update & delete
app.put('/api/products/:id', authMiddleware, async (req, res) => {
  const { id } = req.params;
  const { name, category_name, category_group, price, stock, unit, is_service, image_url } = req.body;
  try {
    await pool.execute(
      `UPDATE products SET name = ?, category_name = ?, category_group = ?, price = ?, stock = ?, unit = ?, is_service = ?, image_url = ? WHERE id = ? AND business_id = (SELECT business_id FROM employees WHERE id = ?)`,
      [name, category_name, category_group, price, stock, unit, is_service ? 1 : 0, image_url || null, id, req.user.id]
    );
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/products/:id', authMiddleware, async (req, res) => {
  const { id } = req.params;
  try {
    await pool.execute('DELETE FROM products WHERE id = ? AND business_id = (SELECT business_id FROM employees WHERE id = ?)', [id, req.user.id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Services CRUD (separate table for non-stock items: memberships, courses, art school, etc.)
app.get('/api/services', authMiddleware, async (req, res) => {
  try {
    const [rows] = await pool.execute('SELECT * FROM services WHERE business_id = (SELECT business_id FROM employees WHERE id = ?) ORDER BY name', [req.user.id]);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/services', authMiddleware, async (req, res) => {
  // Normalize incoming fields and avoid undefined bind params
  try {
    const body = req.body || {};
    const id = body.id || body.id || null;
    const name = body.name || null;
    const categoryName = body.category_name || body.categoryName || body.category || null;
    const categoryGroup = body.category_group || body.categoryGroup || null;
    const description = body.description || null;
    const price = (typeof body.price !== 'undefined' && body.price !== null && body.price !== '') ? Number(body.price) : 0;
    const unit = body.unit || null;
    const imageUrl = body.image_url || body.imageUrl || null;

    const sid = id || Date.now().toString();
    // Resolve business_id from authenticated user
    let businessId = null;
    try {
      const [bizRows] = await pool.execute('SELECT business_id FROM employees WHERE id = ?', [req.user.id]);
      businessId = bizRows && bizRows[0] ? bizRows[0].business_id : null;
    } catch (e) { console.warn('Failed to resolve business for service create', e && e.message ? e.message : e); }
    if (!businessId) return res.status(400).json({ error: 'Business not found for user' });

    const params = [sid, businessId, name || null, categoryName || null, categoryGroup || null, description || null, price, unit || null, imageUrl || null];
    const sql = 'INSERT INTO services (id, business_id, name, category_name, category_group, description, price, unit, image_url) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?) ON DUPLICATE KEY UPDATE name=VALUES(name), category_name=VALUES(category_name), category_group=VALUES(category_group), description=VALUES(description), price=VALUES(price), unit=VALUES(unit), image_url=VALUES(image_url)';
    console.log('POST /api/services -> sql:', sql);
    console.log('POST /api/services -> params:', params);
    await pool.execute(sql, params);
    try { const aid = Date.now().toString(); await pool.execute('INSERT INTO audit_logs (id, business_id, user_id, user_name, action, resource, details) VALUES (?, ?, ?, ?, ?, ?, ?)', [aid, businessId, req.user.id, req.user.email || req.user.id, 'create', 'service', JSON.stringify(body)]); } catch (e) { /* ignore */ }
    res.json({ success: true, id: sid });
  } catch (err) {
    console.error('Error in POST /api/services:', err && err.message ? err.message : err);
    res.status(500).json({ error: err.message || String(err) });
  }
});

app.put('/api/services/:id', authMiddleware, async (req, res) => {
  const { id } = req.params;
  const { name, category_name, category_group, description, price, unit, image_url } = req.body;
  try {
    await pool.execute('UPDATE services SET name = ?, category_name = ?, category_group = ?, description = ?, price = ?, unit = ?, image_url = ? WHERE id = ? AND business_id = (SELECT business_id FROM employees WHERE id = ?)', [name, category_name, category_group, description, price, unit, image_url, id, req.user.id]);
    try { const [bizRows] = await pool.execute('SELECT business_id FROM employees WHERE id = ?', [req.user.id]); const businessId = bizRows[0] ? bizRows[0].business_id : null; const aid = Date.now().toString(); await pool.execute('INSERT INTO audit_logs (id, business_id, user_id, user_name, action, resource, details) VALUES (?, ?, ?, ?, ?, ?, ?)', [aid, businessId, req.user.id, req.user.email || req.user.id, 'update', 'service', JSON.stringify(req.body)]); } catch(e){}
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/services/:id', authMiddleware, async (req, res) => {
  const { id } = req.params;
  try {
    await pool.execute('DELETE FROM services WHERE id = ? AND business_id = (SELECT business_id FROM employees WHERE id = ?)', [id, req.user.id]);
    try { const [bizRows] = await pool.execute('SELECT business_id FROM employees WHERE id = ?', [req.user.id]); const businessId = bizRows[0] ? bizRows[0].business_id : null; const aid = Date.now().toString(); await pool.execute('INSERT INTO audit_logs (id, business_id, user_id, user_name, action, resource, details) VALUES (?, ?, ?, ?, ?, ?, ?)', [aid, businessId, req.user.id, req.user.email || req.user.id, 'delete', 'service', JSON.stringify({ id })]); } catch(e){}
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Employees CRUD (scoped to business)
app.get('/api/employees', authMiddleware, async (req, res) => {
  try {
    const [rows] = await pool.execute('SELECT id, name, role_id, email, phone, default_location_id, is_super_admin FROM employees WHERE business_id = (SELECT business_id FROM employees WHERE id = ?)', [req.user.id]);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/employees', authMiddleware, async (req, res) => {
  const { id, name, role_id, email, phone, password, default_location_id, is_super_admin, passportUrl, cvUrl, designation, department, unit, notes, salary } = req.body;
  try {
    // If password provided, enforce strong policy
    if (password) {
      const hasLowercase = /[a-z]/.test(password);
      const hasUppercase = /[A-Z]/.test(password);
      const hasNumber = /\d/.test(password);
      const hasSpecialChar = /[^\w]/.test(password); // Any non-alphanumeric character
      const hasMinLength = password.length >= 8;
      
      if (!hasMinLength || !hasLowercase || !hasUppercase || !hasNumber || !hasSpecialChar) {
        return res.status(400).json({ error: 'Password must be at least 8 characters and include lowercase, uppercase, number and special character' });
      }
    }
    const [bizRows] = await pool.execute('SELECT business_id FROM employees WHERE id = ?', [req.user.id]);
    if (!bizRows || !bizRows[0]) return res.status(400).json({ error: 'Business not found' });
    const businessId = bizRows[0].business_id;
    const eid = id || Date.now().toString();
    const hashed = password ? await bcrypt.hash(password, 10) : null;
    await pool.execute('INSERT INTO employees (id, business_id, is_super_admin, name, role_id, password, salary, email, phone, passport_url, cv_url, designation, department, unit, notes, default_location_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?) ON DUPLICATE KEY UPDATE name = VALUES(name), role_id = VALUES(role_id), email = VALUES(email), phone = VALUES(phone), password = IF(VALUES(password) IS NOT NULL, VALUES(password), password), salary = VALUES(salary), passport_url = VALUES(passport_url), cv_url = VALUES(cv_url), designation = VALUES(designation), department = VALUES(department), unit = VALUES(unit), notes = VALUES(notes), default_location_id = VALUES(default_location_id)', [eid, businessId, is_super_admin ? 1 : 0, name, role_id, hashed, Number(salary || 0), email, phone, passportUrl || null, cvUrl || null, designation || null, department || null, unit || null, notes || null, default_location_id]);
    res.json({ success: true, id: eid });
  } catch (err) {
    console.error('POST /api/employees error:', err && err.message ? err.message : err);
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/employees/:id', authMiddleware, async (req, res) => {
  const { id } = req.params;
  const { name, role_id, email, phone, password, default_location_id, passportUrl, cvUrl, designation, department, unit, notes, salary } = req.body;
  try {
    // If password provided, enforce strong policy
    if (password) {
      const hasLowercase = /[a-z]/.test(password);
      const hasUppercase = /[A-Z]/.test(password);
      const hasNumber = /\d/.test(password);
      const hasSpecialChar = /[^\w]/.test(password); // Any non-alphanumeric character
      const hasMinLength = password.length >= 8;
      
      if (!hasMinLength || !hasLowercase || !hasUppercase || !hasNumber || !hasSpecialChar) {
        return res.status(400).json({ error: 'Password must be at least 8 characters and include lowercase, uppercase, number and special character' });
      }
    }
    const hashed = password ? await bcrypt.hash(password, 10) : null;
    if (hashed) {
      await pool.execute('UPDATE employees SET name = ?, role_id = ?, email = ?, phone = ?, password = ?, salary = ?, passport_url = ?, cv_url = ?, designation = ?, department = ?, unit = ?, notes = ?, default_location_id = ? WHERE id = ? AND business_id = (SELECT business_id FROM employees WHERE id = ?)', [name, role_id, email, phone, hashed, Number(salary || 0), passportUrl || null, cvUrl || null, designation || null, department || null, unit || null, notes || null, default_location_id, id, req.user.id]);
    } else {
      await pool.execute('UPDATE employees SET name = ?, role_id = ?, email = ?, phone = ?, salary = ?, passport_url = ?, cv_url = ?, designation = ?, department = ?, unit = ?, notes = ?, default_location_id = ? WHERE id = ? AND business_id = (SELECT business_id FROM employees WHERE id = ?)', [name, role_id, email, phone, Number(salary || 0), passportUrl || null, cvUrl || null, designation || null, department || null, unit || null, notes || null, default_location_id, id, req.user.id]);
    }
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/employees/:id', authMiddleware, async (req, res) => {
  const { id } = req.params;
  try {
    await pool.execute('DELETE FROM employees WHERE id = ? AND business_id = (SELECT business_id FROM employees WHERE id = ?)', [id, req.user.id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Customers CRUD
app.get('/api/customers', authMiddleware, async (req, res) => {
  try {
    const [rows] = await pool.execute('SELECT * FROM customers WHERE business_id = (SELECT business_id FROM employees WHERE id = ?)', [req.user.id]);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Tasks CRUD
app.get('/api/tasks', authMiddleware, async (req, res) => {
  try {
    const [rows] = await pool.execute('SELECT * FROM tasks WHERE business_id = (SELECT business_id FROM employees WHERE id = ?) ORDER BY date_to_do DESC', [req.user.id]);
    res.json(rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/tasks', authMiddleware, async (req, res) => {
  try {
    const body = req.body || {};
    const id = body.id || Date.now().toString();
    const businessId = await resolveBusinessId(req);
    if (!businessId) return res.status(400).json({ error: 'Business not found for current user' });
    await pool.execute('INSERT INTO tasks (id, business_id, title, description, assigned_to, created_by, date_to_do, date_to_complete, status, type, category) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?) ON DUPLICATE KEY UPDATE title=VALUES(title), description=VALUES(description), assigned_to=VALUES(assigned_to), date_to_do=VALUES(date_to_do), date_to_complete=VALUES(date_to_complete), status=VALUES(status), type=VALUES(type), category=VALUES(category)', [id, businessId, body.title || null, body.description || null, body.assignedTo || null, body.createdBy || req.user.id, body.dateToDo || null, body.dateToComplete || null, body.status || null, body.type || null, body.category || null]);
    res.json({ success: true, id });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.put('/api/tasks/:id', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const body = req.body || {};
    const businessId = await resolveBusinessId(req);
    if (!businessId) return res.status(400).json({ error: 'Business not found for current user' });
    await pool.execute('UPDATE tasks SET title=?, description=?, assigned_to=?, date_to_do=?, date_to_complete=?, status=?, type=?, category=? WHERE id = ? AND business_id = ?', [body.title || null, body.description || null, body.assignedTo || null, body.dateToDo || null, body.dateToComplete || null, body.status || null, body.type || null, body.category || null, id, businessId]);
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.delete('/api/tasks/:id', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const businessId = await resolveBusinessId(req);
    if (!businessId) return res.status(400).json({ error: 'Business not found for current user' });
    await pool.execute('DELETE FROM tasks WHERE id = ? AND business_id = ?', [id, businessId]);
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// Reports CRUD
app.get('/api/reports', authMiddleware, async (req, res) => {
  try {
    const businessId = await resolveBusinessId(req);
    if (!businessId) return res.json([]);
    const [rows] = await pool.execute('SELECT * FROM reports WHERE business_id = ? ORDER BY created_at DESC', [businessId]);
    res.json(rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/reports', authMiddleware, async (req, res) => {
  try {
    const body = req.body || {};
    const id = body.id || Date.now().toString();
    const businessId = await resolveBusinessId(req);
    if (!businessId) return res.status(400).json({ error: 'Business not found for current user' });
    await pool.execute('INSERT INTO reports (id, business_id, title, content, related_task_id, created_by, category) VALUES (?, ?, ?, ?, ?, ?, ?) ON DUPLICATE KEY UPDATE title=VALUES(title), content=VALUES(content), related_task_id=VALUES(related_task_id), category=VALUES(category)', [id, businessId, body.title || null, body.content || null, body.related_task_id || null, req.user.id, body.category || null]);
    res.json({ success: true, id });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.delete('/api/reports/:id', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    await pool.execute('DELETE FROM reports WHERE id = ? AND business_id = (SELECT business_id FROM employees WHERE id = ?)', [id, req.user.id]);
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/customers', authMiddleware, async (req, res) => {
  const { id, name, phone, email, address, category, details } = req.body;
  try {
    const [bizRows] = await pool.execute('SELECT business_id FROM employees WHERE id = ?', [req.user.id]);
    const businessId = bizRows[0].business_id;
    const cid = id || Date.now().toString();
    await pool.execute('INSERT INTO customers (id, business_id, name, phone, email, address, category, details) VALUES (?, ?, ?, ?, ?, ?, ?, ?) ON DUPLICATE KEY UPDATE name=VALUES(name), phone=VALUES(phone), email=VALUES(email), address=VALUES(address), category=VALUES(category), details=VALUES(details)', [cid, businessId, name, phone, email, address, category, details]);
    // audit
    try { const aid = Date.now().toString(); await pool.execute('INSERT INTO audit_logs (id, business_id, user_id, user_name, action, resource, details) VALUES (?, ?, ?, ?, ?, ?, ?)', [aid, businessId, req.user.id, req.user.email || req.user.id, 'create', 'customer', JSON.stringify(req.body)]); } catch (e) { /* ignore */ }
    res.json({ success: true, id: cid });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/customers/:id', authMiddleware, async (req, res) => {
  const { id } = req.params;
  const { name, phone, email, address, category, details } = req.body;
  try {
    await pool.execute('UPDATE customers SET name = ?, phone = ?, email = ?, address = ?, category = ?, details = ? WHERE id = ? AND business_id = (SELECT business_id FROM employees WHERE id = ?)', [name, phone, email, address, category, details, id, req.user.id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/customers/:id', authMiddleware, async (req, res) => {
  const { id } = req.params;
  try {
    await pool.execute('DELETE FROM customers WHERE id = ? AND business_id = (SELECT business_id FROM employees WHERE id = ?)', [id, req.user.id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Suppliers CRUD
app.get('/api/suppliers', authMiddleware, async (req, res) => {
  try {
    const [rows] = await pool.execute('SELECT * FROM suppliers WHERE business_id = (SELECT business_id FROM employees WHERE id = ?)', [req.user.id]);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/suppliers', authMiddleware, async (req, res) => {
  const { id, name, contact_person, phone, email, address } = req.body;
  try {
    const [bizRows] = await pool.execute('SELECT business_id FROM employees WHERE id = ?', [req.user.id]);
    const businessId = bizRows[0].business_id;
    const sid = id || Date.now().toString();
    await pool.execute('INSERT INTO suppliers (id, business_id, name, contact_person, phone, email, address) VALUES (?, ?, ?, ?, ?, ?, ?) ON DUPLICATE KEY UPDATE name=VALUES(name), contact_person=VALUES(contact_person), phone=VALUES(phone), email=VALUES(email), address=VALUES(address)', [sid, businessId, name, contact_person, phone, email, address]);
    // audit
    try { const aid = Date.now().toString(); await pool.execute('INSERT INTO audit_logs (id, business_id, user_id, user_name, action, resource, details) VALUES (?, ?, ?, ?, ?, ?, ?)', [aid, businessId, req.user.id, req.user.email || req.user.id, 'create', 'supplier', JSON.stringify(req.body)]); } catch (e) { /* ignore */ }
    res.json({ success: true, id: sid });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/suppliers/:id', authMiddleware, async (req, res) => {
  const { id } = req.params;
  const { name, contact_person, phone, email, address } = req.body;
  try {
    await pool.execute('UPDATE suppliers SET name = ?, contact_person = ?, phone = ?, email = ?, address = ? WHERE id = ? AND business_id = (SELECT business_id FROM employees WHERE id = ?)', [name, contact_person, phone, email, address, id, req.user.id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/suppliers/:id', authMiddleware, async (req, res) => {
  const { id } = req.params;
  try {
    await pool.execute('DELETE FROM suppliers WHERE id = ? AND business_id = (SELECT business_id FROM employees WHERE id = ?)', [id, req.user.id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Roles CRUD
app.get('/api/roles', authMiddleware, async (req, res) => {
  try {
    const [rows] = await pool.execute('SELECT id, name, permissions FROM roles WHERE business_id = (SELECT business_id FROM employees WHERE id = ?)', [req.user.id]);
    // parse permissions JSON if stored as JSON
    const out = (rows || []).map(r => ({ id: r.id, name: r.name, permissions: (() => { try { return JSON.parse(r.permissions); } catch (e) { return r.permissions || []; } })() }));
    res.json(out);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/roles', authMiddleware, async (req, res) => {
  const { id, name, permissions } = req.body;
  try {
    const [bizRows] = await pool.execute('SELECT business_id FROM employees WHERE id = ?', [req.user.id]);
    let businessId = (bizRows && bizRows[0]) ? bizRows[0].business_id : null;
    if (!businessId && req.user && (req.user.businessId || req.user.business_id)) {
      businessId = req.user.businessId || req.user.business_id;
    }
    if (!businessId) return res.status(400).json({ error: 'Business not found for current user' });
    const rid = id || Date.now().toString();
    const permsStr = typeof permissions === 'string' ? permissions : JSON.stringify(permissions || []);
    await pool.execute('INSERT INTO roles (id, business_id, name, permissions) VALUES (?, ?, ?, ?) ON DUPLICATE KEY UPDATE name=VALUES(name), permissions=VALUES(permissions)', [rid, businessId, name, permsStr]);
    res.json({ success: true, id: rid });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/roles/:id', authMiddleware, async (req, res) => {
  const { id } = req.params;
  const { name, permissions } = req.body;
  try {
    const permsStr = typeof permissions === 'string' ? permissions : JSON.stringify(permissions || []);
    // resolve business id similar to other endpoints to avoid errors when employee row is missing
    const [bizRows] = await pool.execute('SELECT business_id FROM employees WHERE id = ?', [req.user.id]);
    let businessId = (bizRows && bizRows[0]) ? bizRows[0].business_id : null;
    if (!businessId && req.user && (req.user.businessId || req.user.business_id)) {
      businessId = req.user.businessId || req.user.business_id;
    }
    if (!businessId) return res.status(400).json({ error: 'Business not found for current user' });

    await pool.execute('UPDATE roles SET name = ?, permissions = ? WHERE id = ? AND business_id = ?', [name, permsStr, id, businessId]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/roles/:id', authMiddleware, async (req, res) => {
  const { id } = req.params;
  try {
    await pool.execute('DELETE FROM roles WHERE id = ? AND business_id = (SELECT business_id FROM employees WHERE id = ?)', [id, req.user.id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Transactions endpoints
app.get('/api/transactions', authMiddleware, async (req, res) => {
  try {
    const [rows] = await pool.execute('SELECT * FROM transactions WHERE business_id = (SELECT business_id FROM employees WHERE id = ?) ORDER BY date DESC', [req.user.id]);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Settings endpoints (per-business)
app.get('/api/settings', authMiddleware, async (req, res) => {
  try {
    const [rows] = await pool.execute('SELECT * FROM settings WHERE business_id = (SELECT business_id FROM employees WHERE id = ?) LIMIT 1', [req.user.id]);
    if (!rows || rows.length === 0) return res.json({});
    // Normalize column names to frontend expectations
    const r = rows[0];
    let landing = null;
    try { landing = r.landing_content ? JSON.parse(r.landing_content) : null; } catch (e) { landing = r.landing_content || null; }
    let loginRedirects = null;
    try { loginRedirects = r.login_redirects ? JSON.parse(r.login_redirects) : null; } catch (e) { loginRedirects = r.login_redirects || null; }
    const out = {
      businessId: r.business_id,
      name: r.name,
      motto: r.motto,
      address: r.address,
      phone: r.phone,
      email: r.email,
      logoUrl: r.logo_url,
      headerImageUrl: r.header_image_url,
      footerImageUrl: r.footer_image_url,
      vatRate: r.vat_rate,
      currency: r.currency,
      defaultLocationId: r.default_location_id || null,
      landingContent: landing,
      loginRedirects: loginRedirects,
      invoiceNotes: r.invoice_notes
    };
    res.json(out);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/settings', authMiddleware, async (req, res) => {
  try {
    const data = req.body || {};
    const [bizRows] = await pool.execute('SELECT business_id FROM employees WHERE id = ?', [req.user.id]);
    const businessId = bizRows[0] ? bizRows[0].business_id : null;
    if (!businessId) return res.status(400).json({ error: 'Business not found for user' });
    
    // Prepare JSON fields
    const landing = typeof data.landingContent !== 'undefined' ? JSON.stringify(data.landingContent) : (typeof data.landing_content !== 'undefined' ? JSON.stringify(data.landing_content) : null);
    const loginRedirects = typeof data.loginRedirects !== 'undefined' ? JSON.stringify(data.loginRedirects) : (typeof data.login_redirects !== 'undefined' ? JSON.stringify(data.login_redirects) : null);
    const invoiceNotes = data.invoiceNotes || data.invoice_notes || null;
    
    // Upsert settings row
    await pool.execute(
      `INSERT INTO settings (business_id, name, motto, address, phone, email, logo_url, header_image_url, footer_image_url, vat_rate, currency, default_location_id, login_redirects, landing_content, invoice_notes) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?) ON DUPLICATE KEY UPDATE name=VALUES(name), motto=VALUES(motto), address=VALUES(address), phone=VALUES(phone), email=VALUES(email), logo_url=VALUES(logo_url), header_image_url=VALUES(header_image_url), footer_image_url=VALUES(footer_image_url), vat_rate=VALUES(vat_rate), currency=VALUES(currency), default_location_id=VALUES(default_location_id), login_redirects=VALUES(login_redirects), landing_content=VALUES(landing_content), invoice_notes=VALUES(invoice_notes)`,
        [businessId, data.name || null, data.motto || null, data.address || null, data.phone || null, data.email || null, data.logoUrl || data.logo_url || null, data.headerImageUrl || data.header_image_url || null, data.footerImageUrl || data.footer_image_url || null, data.vatRate || data.vat_rate || 0, data.currency || '', data.defaultLocationId || data.default_location_id || null, loginRedirects, landing, invoiceNotes]
    );
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/transactions', authMiddleware, async (req, res) => {
  const { id, date, account_head, type, amount, particulars, paid_by, received_by, approved_by } = req.body;
  try {
    const [bizRows] = await pool.execute('SELECT business_id FROM employees WHERE id = ?', [req.user.id]);
    const businessId = (Array.isArray(bizRows) && bizRows[0] && bizRows[0].business_id) ? bizRows[0].business_id : (req.body.businessId || null);
    if (!businessId) {
      console.warn('Failed to resolve business for user', req.user && req.user.id);
      return res.status(400).json({ error: 'Unable to determine business for current user' });
    }

    const tid = id || Date.now().toString();
    // ensure date is a proper value for MySQL
    const sqlDate = date ? new Date(date) : new Date();
    // Build params safely (convert undefined -> null) and log for debugging
    const params = [tid, businessId, sqlDate, account_head ?? null, type ?? null, (typeof amount !== 'undefined' ? amount : null), particulars ?? null, paid_by ?? null, received_by ?? null, approved_by ?? null];
    const txSql = 'INSERT INTO transactions (id, business_id, date, account_head, type, amount, particulars, paid_by, received_by, approved_by) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?) ON DUPLICATE KEY UPDATE amount=VALUES(amount), particulars=VALUES(particulars)';
    console.log('POST /api/transactions -> sql:', txSql);
    console.log('POST /api/transactions -> params:', params);
    try {
      await pool.execute(txSql, params);
    } catch (dbErr) {
      console.error('DB error inserting transaction:', dbErr && dbErr.message ? dbErr.message : dbErr);
      return res.status(500).json({ error: 'Database error while saving transaction' });
    }

    // audit
    try {
      const aid = Date.now().toString();
      await pool.execute('INSERT INTO audit_logs (id, business_id, user_id, user_name, action, resource, details) VALUES (?, ?, ?, ?, ?, ?, ?)', [aid, businessId, req.user.id, req.user.email || req.user.id, 'create', 'transaction', JSON.stringify(req.body)]);
    } catch (e) { console.warn('Failed to write audit log for transaction', e && e.message ? e.message : e); }

    res.json({ success: true, id: tid });
  } catch (err) {
    console.error('Unhandled error in /api/transactions:', err && err.message ? err.message : err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Account Heads CRUD
app.get('/api/account-heads', authMiddleware, async (req, res) => {
  try {
    const [rows] = await pool.execute('SELECT * FROM account_heads WHERE business_id = (SELECT business_id FROM employees WHERE id = ?) ORDER BY title', [req.user.id]);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/account-heads', authMiddleware, async (req, res) => {
  try {
    const body = req.body || {};
    const id = body.id || Date.now().toString();
    const title = body.title || body.name || null;
    const type = body.type || null;
    const description = body.description || null;

    const [bizRows] = await pool.execute('SELECT business_id FROM employees WHERE id = ?', [req.user.id]);
    const businessId = bizRows[0] ? bizRows[0].business_id : null;
    if (!businessId) return res.status(400).json({ error: 'Business not found for user' });

    const sql = 'INSERT INTO account_heads (id, business_id, title, type, description) VALUES (?, ?, ?, ?, ?) ON DUPLICATE KEY UPDATE title=VALUES(title), type=VALUES(type), description=VALUES(description)';
    await pool.execute(sql, [id, businessId, title, type, description]);
    res.json({ success: true, id });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/account-heads/:id', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const { title, type, description } = req.body;
    await pool.execute('UPDATE account_heads SET title = ?, type = ?, description = ? WHERE id = ? AND business_id = (SELECT business_id FROM employees WHERE id = ?)', [title, type, description, id, req.user.id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/account-heads/:id', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    await pool.execute('DELETE FROM account_heads WHERE id = ? AND business_id = (SELECT business_id FROM employees WHERE id = ?)', [id, req.user.id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Reports generation endpoints
// POST endpoint for report generation with date range
app.post('/api/reports/generate/sales', authMiddleware, async (req, res) => {
  try {
    const { dateFrom, dateTo } = req.body;
    const start = dateFrom ? new Date(dateFrom) : null;
    const end = dateTo ? new Date(dateTo) : null;
    const params = [];
    let sql = `SELECT si.product_id as productId, COALESCE(p.name, si.product_id) as name, COALESCE(p.is_service, 0) as isService, SUM(si.quantity) as qty_sold, SUM(si.quantity * si.price) as revenue FROM sale_items si JOIN sales s ON si.sale_id = s.id LEFT JOIN products p ON si.product_id = p.id WHERE s.business_id = (SELECT business_id FROM employees WHERE id = ?)`;
    params.push(req.user.id);
    if (start) {
      sql += ' AND s.date >= ?'; params.push(start.toISOString().slice(0,19).replace('T',' '));
    }
    if (end) {
      sql += ' AND s.date <= ?'; params.push(end.toISOString().slice(0,19).replace('T',' '));
    }
    sql += ' AND COALESCE(p.is_service,0) = 0 GROUP BY si.product_id, COALESCE(p.name, si.product_id) ORDER BY qty_sold DESC';
    const [rows] = await pool.execute(sql, params);
    const summary = { total_items: rows.length, total_revenue: rows.reduce((sum, r) => sum + (Number(r.revenue) || 0), 0) };
    res.json({ data: rows, summary });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/reports/generate/services', authMiddleware, async (req, res) => {
  try {
    const { dateFrom, dateTo } = req.body;
    const start = dateFrom ? new Date(dateFrom) : null;
    const end = dateTo ? new Date(dateTo) : null;
    const params = [];
    let sql = `SELECT si.product_id as productId, COALESCE(p.name, si.product_id) as name, SUM(si.quantity) as qty_sold, SUM(si.quantity * si.price) as revenue FROM sale_items si JOIN sales s ON si.sale_id = s.id LEFT JOIN products p ON si.product_id = p.id WHERE s.business_id = (SELECT business_id FROM employees WHERE id = ?)`;
    params.push(req.user.id);
    if (start) {
      sql += ' AND s.date >= ?'; params.push(start.toISOString().slice(0,19).replace('T',' '));
    }
    if (end) {
      sql += ' AND s.date <= ?'; params.push(end.toISOString().slice(0,19).replace('T',' '));
    }
    sql += ' AND si.is_service = 1 GROUP BY si.product_id, COALESCE(p.name, si.product_id) ORDER BY qty_sold DESC';
    const [rows] = await pool.execute(sql, params);
    const summary = { total_items: rows.length, total_revenue: rows.reduce((sum, r) => sum + (Number(r.revenue) || 0), 0) };
    res.json({ data: rows, summary });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/reports/generate/account_heads', authMiddleware, async (req, res) => {
  try {
    const { dateFrom, dateTo, filter, accountHead } = req.body;
    const start = dateFrom ? new Date(dateFrom) : null;
    const end = dateTo ? new Date(dateTo) : null;
    const params = [req.user.id];
    let sql = `SELECT t.date, t.account_head as accountHead, t.type, SUM(t.amount) as total_amount, COUNT(*) as count FROM transactions t WHERE t.business_id = (SELECT business_id FROM employees WHERE id = ?)`;
    if (start) { sql += ' AND t.date >= ?'; params.push(start.toISOString().slice(0,19).replace('T',' ')); }
    if (end) { sql += ' AND t.date <= ?'; params.push(end.toISOString().slice(0,19).replace('T',' ')); }
    if (filter === 'individual' && accountHead) { sql += ' AND t.account_head = ?'; params.push(String(accountHead)); }
    sql += ' GROUP BY t.account_head, t.type, DATE(t.date) ORDER BY t.date DESC';
    const [rows] = await pool.execute(sql, params);
    const summary = { total_transactions: rows.length, total_amount: rows.reduce((sum, r) => sum + (Number(r.total_amount) || 0), 0) };
    res.json({ data: rows, summary });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/reports/generate/all', authMiddleware, async (req, res) => {
  try {
    const { dateFrom, dateTo } = req.body;
    const start = dateFrom ? new Date(dateFrom) : null;
    const end = dateTo ? new Date(dateTo) : null;
    const params = [req.user.id];
    let sql = `SELECT t.* FROM transactions t WHERE t.business_id = (SELECT business_id FROM employees WHERE id = ?)`;
    if (start) { sql += ' AND t.date >= ?'; params.push(start.toISOString().slice(0,19).replace('T',' ')); }
    if (end) { sql += ' AND t.date <= ?'; params.push(end.toISOString().slice(0,19).replace('T',' ')); }
    sql += ' ORDER BY t.date DESC';
    const [rows] = await pool.execute(sql, params);
    const inflows = rows.filter(r => r.type === 'Inflow').reduce((sum, r) => sum + Number(r.amount), 0);
    const expenditures = rows.filter(r => r.type === 'Expenditure').reduce((sum, r) => sum + Number(r.amount), 0);
    const summary = { total_transactions: rows.length, total_inflow: inflows, total_expenditure: expenditures, net_balance: inflows - expenditures };
    res.json({ data: rows, summary });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Generate aggregated sold items (products/services) over date range
app.get('/api/reports/generate/sales_items', authMiddleware, async (req, res) => {
  try {
    const type = (req.query.type || 'both'); // 'products' | 'services' | 'both'
    const start = req.query.start ? new Date(String(req.query.start)) : null;
    const end = req.query.end ? new Date(String(req.query.end)) : null;
    const params = [];
    let sql = `SELECT si.product_id as productId, COALESCE(p.name, si.product_id) as name, COALESCE(p.is_service, 0) as isService, SUM(si.quantity) as qty_sold, SUM(si.quantity * si.price) as revenue FROM sale_items si JOIN sales s ON si.sale_id = s.id LEFT JOIN products p ON si.product_id = p.id WHERE s.business_id = (SELECT business_id FROM employees WHERE id = ?)`;
    params.push(req.user.id);
    if (start) {
      sql += ' AND s.date >= ?'; params.push(start.toISOString().slice(0,19).replace('T',' '));
    }
    if (end) {
      sql += ' AND s.date <= ?'; params.push(end.toISOString().slice(0,19).replace('T',' '));
    }
    if (type === 'products') sql += ' AND COALESCE(p.is_service,0) = 0';
    if (type === 'services') sql += ' AND COALESCE(p.is_service,0) = 1';
    sql += ' GROUP BY si.product_id, COALESCE(p.name, si.product_id), COALESCE(p.is_service,0) ORDER BY qty_sold DESC';
    const [rows] = await pool.execute(sql, params);
    res.json(rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// Generate transactions report filtered by account head and date range
app.get('/api/reports/generate/transactions', authMiddleware, async (req, res) => {
  try {
    const account = req.query.account || null;
    const start = req.query.start ? new Date(String(req.query.start)) : null;
    const end = req.query.end ? new Date(String(req.query.end)) : null;
    const params = [req.user.id];
    let sql = `SELECT t.* FROM transactions t WHERE t.business_id = (SELECT business_id FROM employees WHERE id = ?)`;
    if (start) { sql += ' AND t.date >= ?'; params.push(start.toISOString().slice(0,19).replace('T',' ')); }
    if (end) { sql += ' AND t.date <= ?'; params.push(end.toISOString().slice(0,19).replace('T',' ')); }
    if (account) { sql += ' AND t.account_head = ?'; params.push(String(account)); }
    sql += ' ORDER BY t.date DESC';
    const [rows] = await pool.execute(sql, params);
    res.json(rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ============== SUPER ADMIN ENDPOINTS ==============

// GET all businesses (for super admin)
app.get('/api/businesses', authMiddleware, async (req, res) => {
  try {
    const [rows] = await pool.execute('SELECT * FROM businesses ORDER BY registeredAt DESC');
    res.json(rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// GET single business by ID
app.get('/api/businesses/:id', authMiddleware, async (req, res) => {
  try {
    const [rows] = await pool.execute('SELECT * FROM businesses WHERE id = ?', [req.params.id]);
    if (rows.length === 0) return res.status(404).json({ error: 'Business not found' });
    res.json(rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// PUT update business status
app.put('/api/businesses/:id', authMiddleware, async (req, res) => {
  try {
    const { status, paymentStatus } = req.body;
    const updates = [];
    const params = [];
    if (status) { updates.push('status = ?'); params.push(status); }
    if (paymentStatus) { updates.push('paymentStatus = ?'); params.push(paymentStatus); }
    if (updates.length === 0) return res.status(400).json({ error: 'No fields to update' });
    
    params.push(req.params.id);
    const sql = `UPDATE businesses SET ${updates.join(', ')} WHERE id = ?`;
    await pool.execute(sql, params);
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// GET all subscription plans
app.get('/api/plans', authMiddleware, async (req, res) => {
  try {
    const [rows] = await pool.execute('SELECT * FROM plans ORDER BY price ASC');
    res.json(rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// POST create new plan
app.post('/api/plans', authMiddleware, async (req, res) => {
  try {
    const { name, price, interval, features } = req.body;
    if (!name || price === undefined) return res.status(400).json({ error: 'Missing required fields' });
    
    const id = 'plan_' + Date.now();
    const featuresJson = JSON.stringify(features || []);
    await pool.execute(
      'INSERT INTO plans (id, name, price, interval, features) VALUES (?, ?, ?, ?, ?)',
      [id, name, price, interval || 'monthly', featuresJson]
    );
    res.json({ id, name, price, interval: interval || 'monthly', features: features || [] });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// PUT update plan
app.put('/api/plans/:id', authMiddleware, async (req, res) => {
  try {
    const { name, price, interval, features } = req.body;
    const updates = [];
    const params = [];
    
    if (name) { updates.push('name = ?'); params.push(name); }
    if (price !== undefined) { updates.push('price = ?'); params.push(price); }
    if (interval) { updates.push('interval = ?'); params.push(interval); }
    if (features) { updates.push('features = ?'); params.push(JSON.stringify(features)); }
    
    if (updates.length === 0) return res.status(400).json({ error: 'No fields to update' });
    params.push(req.params.id);
    
    const sql = `UPDATE plans SET ${updates.join(', ')} WHERE id = ?`;
    await pool.execute(sql, params);
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// POST verify payment
app.post('/api/superadmin/verify-payment/:businessId', authMiddleware, async (req, res) => {
  try {
    await pool.execute(
      'UPDATE businesses SET paymentStatus = ? WHERE id = ?',
      ['paid', req.params.businessId]
    );
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// GET all feedbacks
app.get('/api/feedbacks', authMiddleware, async (req, res) => {
  try {
    const [rows] = await pool.execute('SELECT * FROM feedbacks ORDER BY created_at DESC LIMIT 100');
    res.json(rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// POST create feedback
app.post('/api/feedbacks', async (req, res) => {
  try {
    const clientIp = req.ip || req.connection.remoteAddress || req.socket.remoteAddress;
    
    // Check rate limit
    if (isRateLimited(clientIp)) {
      return res.status(429).json({ error: 'Too many submissions. Please try again later.' });
    }
    
    const { name, email, phone, companyName, message } = req.body;
    if (!name || !email || !message) return res.status(400).json({ error: 'Missing required fields' });
    
    // Basic validation to prevent common bot patterns
    if (message.length < 10) return res.status(400).json({ error: 'Message too short' });
    if (message.length > 5000) return res.status(400).json({ error: 'Message too long' });
    
    const id = 'feedback_' + Date.now();
    await pool.execute(
      'INSERT INTO feedbacks (id, name, email, phone, companyName, message, status, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, NOW())',
      [id, name, email, phone || null, companyName || null, message, 'new']
    );
    
    // Record submission for rate limiting
    recordFeedbackSubmission(clientIp);
    
    res.json({ id, name, email, phone, companyName, message, status: 'new' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// PUT update feedback
app.put('/api/feedbacks/:id', authMiddleware, async (req, res) => {
  try {
    const { status } = req.body;
    if (!status) return res.status(400).json({ error: 'Status required' });
    
    await pool.execute('UPDATE feedbacks SET status = ? WHERE id = ?', [status, req.params.id]);
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// DELETE feedback
app.delete('/api/feedbacks/:id', authMiddleware, async (req, res) => {
  try {
    await pool.execute('DELETE FROM feedbacks WHERE id = ?', [req.params.id]);
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ===== SUPER ADMIN ENDPOINTS =====

// GET all businesses (for Super Admin)
app.get('/api/super-admin/businesses', superAdminAuthMiddleware, async (req, res) => {
  try {
    const [rows] = await pool.execute(
      'SELECT id, name, email, status, paymentStatus, registeredAt FROM businesses ORDER BY registeredAt DESC'
    );
    res.json({ businesses: rows || [] });
  } catch (err) {
    console.error('GET /api/super-admin/businesses error:', err && err.message ? err.message : err);
    res.status(500).json({ error: err.message || 'Failed to fetch businesses' });
  }
});

// GET all payments (for Super Admin)
app.get('/api/super-admin/payments', superAdminAuthMiddleware, async (req, res) => {
  try {
    // Mock payment data - in production, this would come from a payments table
    const [businesses] = await pool.execute('SELECT id, name FROM businesses LIMIT 20');
    const payments = (businesses || []).map((b, i) => ({
      id: 'pay_' + b.id,
      business_id: b.id,
      businessName: b.name,
      amount: Math.random() * 1000 + 50,
      status: i % 3 === 0 ? 'pending' : i % 3 === 1 ? 'completed' : 'failed',
      method: 'stripe',
      createdAt: new Date(),
      processedAt: null
    }));
    res.json({ payments });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT update payment status
app.put('/api/super-admin/payments/:id', superAdminAuthMiddleware, async (req, res) => {
  try {
    const { status } = req.body;
    if (!status) return res.status(400).json({ error: 'Status required' });
    // In production, update payments table
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST approve business
app.post('/api/super-admin/approve-business/:id', superAdminAuthMiddleware, async (req, res) => {
  try {
    const businessId = req.params.id;
    await pool.execute(
      'UPDATE businesses SET status = ? WHERE id = ?',
      ['approved', businessId]
    );
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST reject business
app.post('/api/super-admin/reject-business/:id', superAdminAuthMiddleware, async (req, res) => {
  try {
    const businessId = req.params.id;
    await pool.execute(
      'UPDATE businesses SET status = ? WHERE id = ?',
      ['rejected', businessId]
    );
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT toggle business status (active/suspended)
app.put('/api/super-admin/toggle-business/:id', superAdminAuthMiddleware, async (req, res) => {
  try {
    const { status } = req.body;
    if (!status) return res.status(400).json({ error: 'Status required' });
    
    const businessId = decodeURIComponent(req.params.id);
    
    await pool.execute(
      'UPDATE businesses SET status = ? WHERE id = ?',
      [status, businessId]
    );
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE business (for Super Admin)
app.delete('/api/super-admin/delete-business/:id', superAdminAuthMiddleware, async (req, res) => {
  try {
    const businessId = decodeURIComponent(req.params.id);
    
    console.log('Attempting to delete business:', businessId);
    
    // Verify business exists before deleting
    const [business] = await pool.execute('SELECT id FROM businesses WHERE id = ?', [businessId]);
    if (!business || business.length === 0) {
      console.log('Business not found:', businessId);
      return res.status(404).json({ error: 'Business not found' });
    }
    
    // Delete related data in correct order (respect foreign key constraints)
    const tablesToDelete = [
      'audit_logs',
      'stock_history',
      'sale_items',
      'sales',
      'stock_entries',
      'products',
      'customers',
      'suppliers',
      'services',
      'reports',
      'tasks',
      'categories',
      'transactions',
      'account_heads',
      'settings',
      'employees',
      'roles',
      'locations'
    ];
    
    for (const table of tablesToDelete) {
      try {
        await pool.execute(`DELETE FROM ${table} WHERE business_id = ?`, [businessId]);
      } catch (err) {
        // Table might not exist or error might be expected, continue
        console.log(`Note: Could not delete from ${table}:`, err.message);
      }
    }
    
    // Finally delete the business
    const [result] = await pool.execute('DELETE FROM businesses WHERE id = ?', [businessId]);
    
    if (result.affectedRows === 0) {
      console.log('Failed to delete business after cleanup:', businessId);
      return res.status(500).json({ error: 'Failed to delete business' });
    }
    
    console.log('Business deleted successfully:', businessId);
    res.json({ success: true, message: 'Business deleted successfully' });
  } catch (err) {
    console.error('Delete business error:', err);
    res.status(500).json({ error: err.message || 'Internal server error' });
  }
});

// GET all feedbacks (for Super Admin)
app.get('/api/super-admin/feedbacks', superAdminAuthMiddleware, async (req, res) => {
  try {
    // Determine feedbacks table columns so we can normalize different schemas (legacy vs current)
    const dbName = process.env.DB_NAME;
    const [cols] = await pool.execute(
      'SELECT COLUMN_NAME FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ?',
      [dbName, 'feedbacks']
    );

    const colSet = new Set((cols || []).map(c => c.COLUMN_NAME));

    // Build select list depending on available columns
    const selectParts = [];
    // id
    selectParts.push('id');
    // name
    if (colSet.has('name')) selectParts.push('name');
    else selectParts.push('NULL as name');
    // email
    if (colSet.has('email')) selectParts.push('email');
    else selectParts.push('NULL as email');
    // phone
    if (colSet.has('phone')) selectParts.push('phone');
    else selectParts.push('NULL as phone');
    // companyName
    if (colSet.has('companyName')) selectParts.push('companyName');
    else selectParts.push('NULL as companyName');
    // business_id may not exist in landing-page feedbacks
    if (colSet.has('business_id')) selectParts.push('business_id');
    else selectParts.push('NULL as business_id');
    // subject may be named 'subject' or stored in 'name' for simple feedbacks
    if (colSet.has('subject')) selectParts.push('subject');
    else selectParts.push('NULL as subject');
    // message
    if (colSet.has('message')) selectParts.push('message');
    else selectParts.push('NULL as message');
    // rating
    if (colSet.has('rating')) selectParts.push('rating');
    else selectParts.push('0 as rating');
    // status
    if (colSet.has('status')) selectParts.push('status');
    else selectParts.push("'new' as status");
    // createdAt - prefer createdAt, else created_at
    if (colSet.has('createdAt')) selectParts.push('createdAt');
    else if (colSet.has('created_at')) selectParts.push('created_at as createdAt');
    else selectParts.push('NOW() as createdAt');

    const sql = `SELECT ${selectParts.join(', ')} FROM feedbacks ORDER BY createdAt DESC LIMIT 100`;
    const [rows] = await pool.execute(sql);

    // Add business names where available
    const feedbacks = await Promise.all((rows || []).map(async (f) => {
      try {
        if (f.business_id) {
          const [biz] = await pool.execute('SELECT name FROM businesses WHERE id = ?', [f.business_id]);
          return { ...f, businessName: biz && biz[0] ? biz[0].name : 'Unknown' };
        }
        return { ...f, businessName: f.subject || 'Unknown' };
      } catch (e) {
        return { ...f, businessName: f.subject || 'Unknown' };
      }
    }));

    res.json({ feedbacks });
  } catch (err) {
    console.error('GET /api/super-admin/feedbacks error:', err && err.message ? err.message : err);
    res.status(500).json({ error: err.message || 'Failed to fetch feedbacks' });
  }
});

// PUT update feedback status (for Super Admin)
app.put('/api/super-admin/feedbacks/:id', superAdminAuthMiddleware, async (req, res) => {
  try {
    const { status } = req.body;
    if (!status) return res.status(400).json({ error: 'Status required' });
    
    await pool.execute('UPDATE feedbacks SET status = ? WHERE id = ?', [status, req.params.id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE feedback (for Super Admin)
app.delete('/api/super-admin/feedbacks/:id', superAdminAuthMiddleware, async (req, res) => {
  try {
    await pool.execute('DELETE FROM feedbacks WHERE id = ?', [req.params.id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET super admin settings (landing page config)
// PUBLIC endpoint - get landing page settings (no auth required)
app.get('/api/landing/settings', async (req, res) => {
  try {
    const [rows] = await pool.execute('SELECT * FROM settings WHERE business_id = "super_admin_org" LIMIT 1');
    const settings = rows && rows[0] ? rows[0] : {};
    
    // Parse JSON fields if they exist
    if (settings.landing_content && typeof settings.landing_content === 'string') {
      settings.landing_content = JSON.parse(settings.landing_content);
    }
    
    res.json(settings);
  } catch (err) {
    console.error('GET /api/landing/settings error:', err);
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/super-admin/settings', superAdminAuthMiddleware, async (req, res) => {
  try {
    // For super admin, we store settings under the super admin org business id
    const [rows] = await pool.execute('SELECT * FROM settings WHERE business_id = "super_admin_org" LIMIT 1');
    const settings = rows && rows[0] ? rows[0] : {};
    
    // Parse JSON fields if they exist
    if (settings.landing_content && typeof settings.landing_content === 'string') {
      settings.landing_content = JSON.parse(settings.landing_content);
    }
    
    res.json(settings);
  } catch (err) {
    console.error('GET /api/super-admin/settings error:', err);
    res.status(500).json({ error: err.message });
  }
});

// POST super admin settings (landing page config)
app.post('/api/super-admin/settings', superAdminAuthMiddleware, async (req, res) => {
  try {
    const { landingContent } = req.body;
    
    if (!landingContent) {
      return res.status(400).json({ error: 'Landing content is required' });
    }

    // Check if super admin org settings exist
    const [existing] = await pool.execute('SELECT business_id FROM settings WHERE business_id = "super_admin_org" LIMIT 1');
    
    const landingContentJson = typeof landingContent === 'string' ? landingContent : JSON.stringify(landingContent);
    
    if (existing && existing[0]) {
      // Update existing
      await pool.execute(
        'UPDATE settings SET landing_content = ? WHERE business_id = "super_admin_org"',
        [landingContentJson]
      );
    } else {
      // Insert new under the super admin org business id
      await pool.execute(
        'INSERT INTO settings (business_id, landing_content) VALUES ("super_admin_org", ?)',
        [landingContentJson]
      );
    }

    res.json({ success: true, message: 'Landing page configuration saved' });
  } catch (err) {
    console.error('POST /api/super-admin/settings error:', err);
    res.status(500).json({ error: err.message });
  }
});

// GET all businesses data (for Super Admin dashboard)
app.get('/api/super-admin/all-data', superAdminAuthMiddleware, async (req, res) => {
  try {
    const [businesses] = await pool.execute(
      'SELECT id, name, email, status, paymentStatus, registeredAt FROM businesses ORDER BY registeredAt DESC'
    );
    
    const businessesData = await Promise.all((businesses || []).map(async (b) => {
      try {
        const [employees] = await pool.execute('SELECT id, name, email, role_id FROM employees WHERE business_id = ?', [b.id]);
        const [settings] = await pool.execute('SELECT name, currency FROM settings WHERE business_id = ?', [b.id]);
        const [products] = await pool.execute('SELECT COUNT(*) as cnt FROM products WHERE business_id = ?', [b.id]);
        const [sales] = await pool.execute('SELECT COUNT(*) as cnt FROM sales WHERE business_id = ?', [b.id]);
        
        return {
          business: b,
          employees: employees || [],
          settings: settings && settings[0] ? settings[0] : {},
          stats: {
            totalEmployees: (employees || []).length,
            totalTransactions: sales && sales[0] ? sales[0].cnt : 0,
            totalRevenue: 0
          }
        };
      } catch (e) {
        return {
          business: b,
          employees: [],
          settings: {},
          stats: {
            totalEmployees: 0,
            totalTransactions: 0,
            totalRevenue: 0
          }
        };
      }
    }));
    
    res.json({ businessesData });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET export business data
app.get('/api/super-admin/export-business/:id', superAdminAuthMiddleware, async (req, res) => {
  try {
    const businessId = req.params.id;
    const [business] = await pool.execute('SELECT * FROM businesses WHERE id = ?', [businessId]);
    const [employees] = await pool.execute('SELECT * FROM employees WHERE business_id = ?', [businessId]);
    const [settings] = await pool.execute('SELECT * FROM settings WHERE business_id = ?', [businessId]);
    const [products] = await pool.execute('SELECT * FROM products WHERE business_id = ?', [businessId]);
    const [sales] = await pool.execute('SELECT * FROM sales WHERE business_id = ? LIMIT 100', [businessId]);
    
    const data = {
      business: business && business[0] ? business[0] : {},
      employees: employees || [],
      settings: settings || [],
      products: products || [],
      sales: sales || []
    };
    
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Apply schema.sql and ensure super admin on startup
async function runMigrations() {
  try {
    const schemaPath = path.join(__dirname, 'schema.sql');
    if (!fs.existsSync(schemaPath)) {
      console.warn('schema.sql not found, skipping migrations');
      return;
    }
    const sql = fs.readFileSync(schemaPath, 'utf8');
    if (!sql || !sql.trim()) {
      console.warn('schema.sql is empty, skipping');
      return;
    }
    console.log('Applying database schema from schema.sql...');
    // Sanitize and split SQL into individual statements to avoid issues with some servers
    let clean = sql.replace(/\/\*[\s\S]*?\*\//g, ''); // remove block comments
    clean = clean.split('\n').filter(l => !l.trim().startsWith('--')).join('\n'); // drop -- comments
    const statements = clean.split(/;\s*\n/).map(s => s.trim()).filter(s => s.length > 0);
    for (const stmt of statements) {
      try {
        await pool.execute(stmt);
      } catch (stmtErr) {
        // Log and continue - some statements (like duplicate index creation) may fail harmlessly
        console.warn('Statement failed (continuing):', stmtErr.message || stmtErr);
      }
    }
    console.log('Database schema applied (best-effort).');
    // Ensure `is_product` exists on `categories` for older databases that lack the column
    try {
      const dbName = process.env.DB_NAME || null;
      if (dbName) {
        const [colRows] = await pool.execute("SELECT COUNT(*) as cnt FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'categories' AND COLUMN_NAME = 'is_product'", [dbName]);
        const has = colRows && colRows[0] ? (colRows[0].cnt || 0) : 0;
        if (!has) {
          try {
            await pool.execute('ALTER TABLE categories ADD COLUMN is_product TINYINT(1) DEFAULT 1');
            console.log('ALTER TABLE: added `is_product` column to categories');
          } catch (alterErr) {
            console.warn('Failed to ALTER categories add is_product:', alterErr && alterErr.message ? alterErr.message : alterErr);
          }
        }
      }
    } catch (e) {
      console.warn('Error while checking/adding is_product to categories:', e && e.message ? e.message : e);
    }
    // Ensure `login_redirects` column exists on `settings` so frontend-configured redirects persist
    try {
      const dbName = process.env.DB_NAME || null;
      if (dbName) {
        const [colRows2] = await pool.execute("SELECT COUNT(*) as cnt FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'settings' AND COLUMN_NAME = 'login_redirects'", [dbName]);
        const hasLR = colRows2 && colRows2[0] ? (colRows2[0].cnt || 0) : 0;
        if (!hasLR) {
          try {
            await pool.execute('ALTER TABLE settings ADD COLUMN login_redirects TEXT');
            console.log('ALTER TABLE: added `login_redirects` column to settings');
          } catch (alterErr) {
            console.warn('Failed to ALTER settings add login_redirects:', alterErr && alterErr.message ? alterErr.message : alterErr);
          }
        }
      }
    } catch (ee) {
      console.warn('Error while checking/adding login_redirects to settings:', ee && ee.message ? ee.message : ee);
    }
  } catch (err) {
    console.error('Failed to apply schema.sql:', err.message || err);
  }
}

async function ensureSuperAdmin() {
  try {
    const [rows] = await pool.execute('SELECT COUNT(*) as cnt FROM employees WHERE is_super_admin = 1');
    const cnt = rows && rows[0] ? rows[0].cnt || rows[0].CNT || 0 : 0;
    if (cnt > 0) {
      console.log('Super admin account already exists.');
      // If env var provided, update existing super admin password(s)
      const newPass = process.env.SUPER_ADMIN_PASSWORD;
      if (newPass) {
        try {
          const hashedNew = await bcrypt.hash(newPass, 10);
          // Prefer updating known id 'usr_super' if present, otherwise update all super admins
          const [r] = await pool.execute('SELECT id FROM employees WHERE id = ? LIMIT 1', ['usr_super']);
          if (r && r.length > 0) {
            await pool.execute('UPDATE employees SET password = ? WHERE id = ?', [hashedNew, 'usr_super']);
          } else {
            await pool.execute('UPDATE employees SET password = ? WHERE is_super_admin = 1', [hashedNew]);
          }
          console.log('Updated existing Super Admin password from env var.');
        } catch (e) {
          console.warn('Failed to update Super Admin password from env var:', e.message || e);
        }
      }
      return;
    }

    console.log('Creating default Super Admin account...');
    const superBusinessId = 'super_admin_org';
    await pool.execute(`INSERT INTO businesses (id, name, email, status, paymentStatus, planId, subscriptionExpiry, registeredAt) VALUES (?, ?, ?, 'active', 'paid', ?, ?, NOW()) ON DUPLICATE KEY UPDATE name = VALUES(name)`, [superBusinessId, 'Super Admin Org', 'super@omnisales.com', 'plan_pro', '2030-01-01']);

    // default role
    const perms = 'all';
    await pool.execute(`INSERT INTO roles (id, business_id, name, permissions) VALUES (?, ?, ?, ?) ON DUPLICATE KEY UPDATE permissions = VALUES(permissions)`, ['super_role', superBusinessId, 'Super Administrator', perms]);

    const superPass = process.env.SUPER_ADMIN_PASSWORD || '@@BJAdmin22';
    const hashed = await bcrypt.hash(superPass, 10);
    await pool.execute(`INSERT INTO employees (id, business_id, is_super_admin, name, role_id, password, salary, email, phone) VALUES (?, ?, 1, ?, ?, ?, 0, ?, ?) ON DUPLICATE KEY UPDATE email = VALUES(email), password = VALUES(password)`, ['usr_super', superBusinessId, 'Super Admin', 'super_role', hashed, 'super@omnisales.com', '000']);

    console.log('Super Admin ensured (id: usr_super). Use env SUPER_ADMIN_PASSWORD to set a custom password.');
  } catch (err) {
    console.error('Failed to ensure Super Admin:', err.message || err);
  }
}

// Ensure global settings business record exists
async function ensureGlobalSettingsBusiness() {
  try {
    // Ensure the super admin org exists and use it for global settings
    const [existing] = await pool.execute('SELECT id FROM businesses WHERE id = "super_admin_org" LIMIT 1');
    if (existing && existing[0]) {
      return; // Already exists
    }
    // If super admin org is missing, create it (ensureSuperAdmin will also create)
    console.log('super_admin_org business missing; creating via ensureSuperAdmin()');
    await ensureSuperAdmin();
  } catch (err) {
    console.error('Failed to ensure global settings business:', err.message || err);
  }
}

// Migrate any non-bcrypt passwords to bcrypt (idempotent)
async function migratePlainPasswords() {
  try {
    const [rows] = await pool.execute("SELECT id, password FROM employees WHERE password IS NOT NULL AND password != ''");
    for (const r of rows) {
      const pw = r.password || '';
      if (pw && !pw.startsWith('$2')) {
        try {
          const h = await bcrypt.hash(pw, 10);
          await pool.execute('UPDATE employees SET password = ? WHERE id = ?', [h, r.id]);
          console.log('Hashed password for employee', r.id);
        } catch (e) {
          console.warn('Failed to hash password for', r.id, e.message || e);
        }
      }
    }
  } catch (err) {
    console.warn('Password migration check failed:', err.message || err);
  }
}

async function ensureDemoSeed() {
  try {
    const demoBiz = 'biz_demo_123';
    // Check if demo business exists
    const [brows] = await pool.execute('SELECT COUNT(*) as cnt FROM businesses WHERE id = ?', [demoBiz]);
    const bcnt = brows && brows[0] ? brows[0].cnt || 0 : 0;
    if (bcnt > 0) {
      console.log('Demo business already present. Running idempotent demo seed/upserts.');
    } else {
      console.log('Seeding demo data for business:', demoBiz);
    }
    // Insert business
    await pool.execute(`INSERT INTO businesses (id, name, email, status, paymentStatus, planId, subscriptionExpiry, registeredAt) VALUES (?, ?, ?, 'active', 'paid', ?, ?, NOW()) ON DUPLICATE KEY UPDATE name = VALUES(name)`, [demoBiz, 'OmniSales Demo Corp', 'admin@omnisales.com', 'plan_pro', '2030-01-01']);

    // Roles
    const adminPerms = JSON.stringify(['dashboard','pos','inventory','stock','suppliers','clients','services','courses','sales_history','service_history','finance','communications','admin','settings','tasks','reports','audit_trails','inventory:create','inventory:read','inventory:update','inventory:delete','suppliers:create','suppliers:read','suppliers:update','suppliers:delete','clients:create','clients:read','clients:update','clients:delete','employees:create','employees:read','employees:update','employees:delete','finance:create','finance:read','finance:update','finance:delete','tasks:create','tasks:read','tasks:update','tasks:delete','reports:create','reports:read','reports:update','reports:delete','inventory:move','pos:any_location']);
    await pool.execute('INSERT INTO roles (id, business_id, name, permissions) VALUES (?, ?, ?, ?) ON DUPLICATE KEY UPDATE permissions = VALUES(permissions)', ['admin', demoBiz, 'Administrator', adminPerms]);

    // Employees (ensure demo admin exists). Create with hashed password; only overwrite existing password when env var provided.
    const adminId = 'usr_demo_admin';
    try {
      const [empCheck] = await pool.execute('SELECT COUNT(*) as cnt FROM employees WHERE id = ?', [adminId]);
      const empCnt = empCheck && empCheck[0] ? (empCheck[0].cnt || 0) : 0;
      const providedPass = process.env.DEMO_ADMIN_PASSWORD;
      if (empCnt === 0) {
        const usePass = providedPass || 'admin';
        const hashed = await bcrypt.hash(usePass, 10);
        await pool.execute(`INSERT INTO employees (id, business_id, is_super_admin, name, role_id, password, salary, email, phone, default_location_id) VALUES (?, ?, 0, ?, ?, ?, ?, ?, ?, ?) ON DUPLICATE KEY UPDATE email = VALUES(email)`, [adminId, demoBiz, 'Demo Admin', 'admin', hashed, 5000, 'admin@omnisales.com', '555-0123', 'loc_main']);
        if (providedPass) {
          console.log('Demo Admin created: admin@omnisales.com / (from DEMO_ADMIN_PASSWORD env)');
        } else {
          console.log('Demo Admin created: admin@omnisales.com / admin (default)');
        }
      } else if (providedPass) {
        // Update password only when env var provided
        const hashed = await bcrypt.hash(providedPass, 10);
        await pool.execute('UPDATE employees SET password = ? WHERE id = ?', [hashed, adminId]);
        console.log('Demo Admin password updated from env var (admin@omnisales.com).');
      } else {
        console.log('Demo Admin already exists (admin@omnisales.com). Password preserved.');
      }
    } catch (e) {
      console.warn('Failed to ensure demo admin user:', e.message || e);
    }

    // Locations
    await pool.execute('INSERT INTO locations (id, business_id, name, address) VALUES (?, ?, ?, ?) ON DUPLICATE KEY UPDATE name=VALUES(name)', ['loc_main', demoBiz, 'Main Store', 'Headquarters']);
    await pool.execute('INSERT INTO locations (id, business_id, name, address) VALUES (?, ?, ?, ?) ON DUPLICATE KEY UPDATE name=VALUES(name)', ['loc_branch', demoBiz, 'Branch Office', 'Branch Road']);

    // Products & stock seeding is disabled by default. To enable demo products/services set env SEED_DEMO_PRODUCTS=1
    if (process.env.SEED_DEMO_PRODUCTS === '1') {
      const products = [
        { id: '1', name: 'Studio A - Hourly', price: 50, stock: 9999, unit: 'hr', is_service: 1 },
        { id: '2', name: 'Gold Membership', price: 100, stock: 9999, unit: 'mo', is_service: 1 },
        { id: '4', name: 'Cola', price: 2.5, stock: 200, unit: 'btl', is_service: 0 }
      ];
      for (const p of products) {
        await pool.execute('INSERT INTO products (id, business_id, name, category_name, category_group, price, stock, unit, is_service) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?) ON DUPLICATE KEY UPDATE price=VALUES(price), stock=VALUES(stock)', [p.id, demoBiz, p.name, null, null, p.price, p.stock, p.unit, p.is_service]);
      }

      // Stock entries for physical product id '4'
      await pool.execute('INSERT INTO stock_entries (id, business_id, product_id, location_id, quantity) VALUES (?, ?, ?, ?, ?) ON DUPLICATE KEY UPDATE quantity=VALUES(quantity)', ['4_loc_main', demoBiz, '4', 'loc_main', 150]);
      await pool.execute('INSERT INTO stock_entries (id, business_id, product_id, location_id, quantity) VALUES (?, ?, ?, ?, ?) ON DUPLICATE KEY UPDATE quantity=VALUES(quantity)', ['4_loc_branch', demoBiz, '4', 'loc_branch', 50]);
      console.log('Demo products/services seeded (SEED_DEMO_PRODUCTS=1)');
    } else {
      console.log('Skipping demo products/services seed (SEED_DEMO_PRODUCTS not set).');
    }

    if (process.env.DEMO_ADMIN_PASSWORD) {
      console.log('Demo seed complete. Admin login: admin@omnisales.com /', process.env.DEMO_ADMIN_PASSWORD);
    } else {
      console.log('Demo seed complete. Admin login: admin@omnisales.com / (existing password preserved or default: admin)');
    }
  } catch (err) {
    console.error('Demo seeding failed:', err.message || err);
  }
}

async function startServer() {
  await runMigrations();
  await ensureSuperAdmin();
  await ensureGlobalSettingsBusiness();
  await migratePlainPasswords();
  // Only run demo/seeding routines when SEED_DATABASE is explicitly enabled.
  // Default behaviour is to assume the database already contains required data.
  const seedFlag = (process.env.SEED_DATABASE || '').toString().toLowerCase();
  if (seedFlag === '1' || seedFlag === 'true') {
    await ensureDemoSeed();
  } else {
    console.log('Skipping demo seed (SEED_DATABASE not enabled).');
  }
  app.listen(port, () => {
    console.log(`Server running on port ${port}`);
  });
}

// TEST EMAIL ENDPOINT (for debugging)
app.post('/api/test-email', async (req, res) => {
  const { to } = req.body;
  if (!to) return res.status(400).json({ error: 'Email address required' });
  
  // Create a timeout promise that rejects after 10 seconds
  const timeoutPromise = new Promise((_, reject) => 
    setTimeout(() => reject(new Error('Email sending timeout - SMTP server not responding')), 10000)
  );
  
  try {
    console.log('Testing email to:', to);
    console.log('SMTP Config:', {
      host: process.env.SMTP_HOST,
      port: process.env.SMTP_PORT,
      user: process.env.SMTP_USER,
      from: process.env.SMTP_FROM
    });
    
    const mailOptions = {
      from: process.env.SMTP_FROM || 'info@jobiz.ng',
      to: to,
      subject: 'Test Email from OmniSales',
      html: `
        <h2>Test Email</h2>
        <p>If you received this email, SMTP is working correctly!</p>
        <p>Sent at: ${new Date().toISOString()}</p>
      `
    };
    
    console.log('Sending email with options:', { from: mailOptions.from, to: mailOptions.to });
    await Promise.race([transporter.sendMail(mailOptions), timeoutPromise]);
    console.log('Test email sent successfully to', to);
    res.json({ success: true, message: 'Test email sent successfully!' });
  } catch (err) {
    console.error('Test email error:', err.message);
    res.status(500).json({ error: err.message || 'Failed to send test email' });
  }
});

// TEST SMS ENDPOINT (for debugging)
app.post('/api/test-sms', async (req, res) => {
  const { phone, message } = req.body;
  if (!phone) return res.status(400).json({ error: 'Phone number required' });
  if (!message) return res.status(400).json({ error: 'Message required' });
  
  try {
    console.log('Testing SMS to:', phone);
    console.log('SMS Config:', {
      provider: process.env.SMS_PROVIDER || 'not-configured',
      apiKey: process.env.SMSLIVE_API_KEY ? '***set***' : 'not-set',
      sender: process.env.SMSLIVE_SENDER || 'not-configured'
    });
    
    // Use SMSLive247 if configured
    if ((process.env.SMS_PROVIDER || '').toLowerCase() === 'smslive247' && process.env.SMSLIVE_API_KEY) {
      try {
        const https = await import('https');
        const url = new URL(process.env.SMSLIVE_BATCH_URL || 'https://api.smslive247.com/v1/sms/batch');
        // Remove + sign from phone for SMS gateway
        const phoneForSMS = phone.replace(/^\+/, '');
        const payload = {
          phoneNumbers: [phoneForSMS],
          messageText: message,
          senderID: process.env.SMSLIVE_SENDER || 'INFO'
        };

        console.log('SMS Payload:', {
          phoneNumbers: payload.phoneNumbers,
          senderID: payload.senderID,
          messageText: payload.messageText,
          url: url.href
        });

        const smsTimeout = new Promise((_, reject) => 
          setTimeout(() => reject(new Error('SMS sending timeout')), 15000)
        );

        const sendSmsPromise = new Promise((resolve, reject) => {
          const reqOpts = {
            method: 'POST',
            hostname: url.hostname,
            port: url.port || 443,
            path: url.pathname + (url.search || ''),
            headers: {
              'Content-Type': 'application/json',
              'Content-Length': Buffer.byteLength(JSON.stringify(payload)),
              'Accept': 'application/json',
              'Authorization': process.env.SMSLIVE_API_KEY
            }
          };

          const request = https.request(reqOpts, (resp) => {
            let data = '';
            resp.on('data', (chunk) => { data += chunk; });
            resp.on('end', () => {
              try {
                const parsed = JSON.parse(data || '{}');
                console.log('SMS Response:', { statusCode: resp.statusCode, data: parsed });
                if (resp.statusCode && resp.statusCode >= 200 && resp.statusCode < 300) {
                  resolve(parsed);
                } else {
                  reject(new Error('SMS provider error: ' + (parsed.message || 'Unknown error')));
                }
              } catch (e) {
                reject(new Error('SMS provider returned invalid JSON: ' + data));
              }
            });
          });

          request.on('error', (e) => {
            reject(new Error('Failed to contact SMS provider: ' + (e && e.message ? e.message : String(e))));
          });
          request.write(JSON.stringify(payload));
          request.end();
        });

        const result = await Promise.race([sendSmsPromise, smsTimeout]);
        console.log('✅ SMS sent successfully to', phone);
        res.json({ success: true, message: 'SMS sent successfully!', response: result });
      } catch (err) {
        console.error('❌ Failed to send SMS to', phone, ':', err.message);
        res.status(500).json({ error: 'Failed to send SMS: ' + err.message });
      }
    } else {
      res.status(400).json({ 
        error: 'SMS not configured', 
        config: {
          provider: process.env.SMS_PROVIDER || 'not-set',
          apiKey: process.env.SMSLIVE_API_KEY ? 'set' : 'not-set'
        }
      });
    }
  } catch (err) {
    console.error('Test SMS error:', err.message);
    res.status(500).json({ error: err.message || 'Failed to send test SMS' });
  }
});

startServer();