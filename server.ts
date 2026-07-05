import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { Database, normalizeEmail, normalizePhoneNumber, normalizeName } from './src/server/db.ts';
import { Registration } from './src/types.ts';

const app = express();
const PORT = 3000;
const JWT_SECRET = 'super-secure-electronic-registration-jwt-secret-key-2026';

// Initialize Database singleton
const db = Database.getInstance();
db.init().then(() => {
  console.log('Database initialized successfully.');
}).catch((err) => {
  console.error('Database initialization failed:', err);
});

// JSON parsing with a safe size limit (for base64 images)
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ limit: '10mb', extended: true }));

// Store CAPTCHAs in memory with expiration
interface CaptchaStoreVal {
  solution: string;
  expiresAt: number;
}
const captchaStore = new Map<string, CaptchaStoreVal>();

// Clean expired CAPTCHAs every minute
setInterval(() => {
  const now = Date.now();
  for (const [id, val] of captchaStore.entries()) {
    if (now > val.expiresAt) {
      captchaStore.delete(id);
    }
  }
}, 60000);

// Store CSRF tokens in memory or validate cryptographically
const csrfStore = new Set<string>();

// Mock Email logs store to show in admin dashboard
interface EmailLog {
  id: string;
  recipient: string;
  subject: string;
  body: string;
  sentAt: string;
}
const emailLogs: EmailLog[] = [];

// Clean up expired CSRF tokens or logs if needed
function logEmail(recipient: string, subject: string, body: string) {
  const log: EmailLog = {
    id: 'email_' + Math.random().toString(36).substring(2, 9),
    recipient,
    subject,
    body,
    sentAt: new Date().toISOString(),
  };
  emailLogs.unshift(log);
  // Keep last 100 emails
  if (emailLogs.length > 100) emailLogs.pop();
  
  console.log('====================================');
  console.log(`✉️ EMAIL SENT TO: ${recipient}`);
  console.log(`Subject: ${subject}`);
  console.log(`Content Preview: ${body.substring(0, 150)}...`);
  console.log('====================================');
}

// ----------------------------------------------------
// SECURITY MIDDLEWARES
// ----------------------------------------------------

// 1. Custom Rate Limiting
const rateLimitStore = new Map<string, { count: number; resetTime: number }>();
function customRateLimiter(limit: number, windowMs: number) {
  return (req: express.Request, res: express.Response, next: express.NextFunction) => {
    // In Cloud Run, IP is usually in x-forwarded-for header
    const forwarded = req.headers['x-forwarded-for'];
    const ip = typeof forwarded === 'string' ? forwarded.split(',')[0].trim() : (req.socket.remoteAddress || 'unknown');
    const now = Date.now();
    const clientLimit = rateLimitStore.get(ip);
    
    if (!clientLimit || now > clientLimit.resetTime) {
      rateLimitStore.set(ip, { count: 1, resetTime: now + windowMs });
      return next();
    }
    
    clientLimit.count++;
    if (clientLimit.count > limit) {
      return res.status(429).json({ 
        error: 'Too many requests. Please wait and try again later.' 
      });
    }
    next();
  };
}

// 2. Input Sanitization / Recursive XSS Protection
function sanitizeData(obj: any): any {
  if (typeof obj !== 'object' || obj === null) {
    if (typeof obj === 'string') {
      // Basic sanitization: strip common script tags and visual HTML
      return obj.replace(/<script[^>]*>([\S\s]*?)<\/script>/gi, '')
                .replace(/<[^>]*>/g, '')
                .trim();
    }
    return obj;
  }
  for (const key in obj) {
    obj[key] = sanitizeData(obj[key]);
  }
  return obj;
}

function sanitizeMiddleware(req: express.Request, res: express.Response, next: express.NextFunction) {
  if (req.body) {
    req.body = sanitizeData(req.body);
  }
  next();
}

// 3. CSRF Protection Middleware
// For simplicity and 100% reliability in sandbox iframes, we:
// - Expose a GET /api/csrf-token endpoint that sets a cookie AND returns a JSON token.
// - Expect the client to return this token in the 'X-CSRF-Token' header for state-changing requests.
function csrfVerifyMiddleware(req: express.Request, res: express.Response, next: express.NextFunction) {
  const method = req.method;
  if (['GET', 'HEAD', 'OPTIONS'].includes(method)) {
    return next();
  }
  
  const tokenHeader = req.headers['x-csrf-token'];
  if (!tokenHeader || typeof tokenHeader !== 'string' || !csrfStore.has(tokenHeader)) {
    return res.status(403).json({ error: 'Security verification failed (Invalid CSRF Token).' });
  }
  
  next();
}

// 4. JWT Admin Auth Middleware
function adminAuthMiddleware(req: express.Request, res: express.Response, next: express.NextFunction) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Authentication required. Please log in.' });
  }
  
  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as { username: string };
    req.headers['x-admin-user'] = decoded.username;
    next();
  } catch (error) {
    return res.status(401).json({ error: 'Invalid or expired session. Please log in again.' });
  }
}

// Apply core security layers to all APIs
app.use('/api', sanitizeMiddleware);

// ----------------------------------------------------
// API ENDPOINTS
// ----------------------------------------------------

// GET CSRF Token
app.get('/api/csrf-token', (req, res) => {
  const token = 'csrf_' + Math.random().toString(36).substring(2, 15) + Date.now().toString(36);
  csrfStore.add(token);
  
  // Clean up csrfStore if it grows too big (keep last 1000)
  if (csrfStore.size > 1000) {
    const arr = Array.from(csrfStore);
    csrfStore.clear();
    arr.slice(500).forEach(t => csrfStore.add(t));
  }
  
  res.json({ csrfToken: token });
});

// GET CAPTCHA Challenge
app.get('/api/captcha', (req, res) => {
  const id = 'cap_' + Math.random().toString(36).substring(2, 11) + Date.now().toString(36);
  const num1 = Math.floor(Math.random() * 15) + 1;
  const num2 = Math.floor(Math.random() * 10) + 1;
  const ops = ['+', '-'];
  const op = ops[Math.floor(Math.random() * ops.length)];
  
  let solution = 0;
  let question = '';
  
  if (op === '+') {
    solution = num1 + num2;
    question = `What is ${num1} + ${num2}?`;
  } else {
    // ensure result is positive
    const first = Math.max(num1, num2);
    const second = Math.min(num1, num2);
    solution = first - second;
    question = `What is ${first} - ${second}?`;
  }
  
  captchaStore.set(id, {
    solution: String(solution),
    expiresAt: Date.now() + 5 * 60 * 1000, // 5 minutes
  });
  
  res.json({ id, question });
});

// POST Register
app.post('/api/register', customRateLimiter(5, 60 * 1000), csrfVerifyMiddleware, async (req, res) => {
  const { 
    fullName, 
    email, 
    phoneNumber, 
    gender, 
    dob, 
    address, 
    stateOfOrigin, 
    occupation, 
    education, 
    passportPhoto, 
    skills,
    captchaId,
    captchaAnswer
  } = req.body;

  // 1. Validate CAPTCHA
  if (!captchaId || !captchaAnswer) {
    return res.status(400).json({ error: 'Please answer the security question (CAPTCHA).' });
  }

  const storedCaptcha = captchaStore.get(captchaId);
  if (!storedCaptcha) {
    return res.status(400).json({ error: 'CAPTCHA has expired. Please refresh the question.' });
  }

  if (storedCaptcha.solution !== String(captchaAnswer).trim()) {
    return res.status(400).json({ error: 'Incorrect answer to the security question.' });
  }

  // Remove CAPTCHA after single-use validation
  captchaStore.delete(captchaId);

  // 2. Validate required fields
  if (!fullName || !email || !phoneNumber || !gender || !dob || !address || !stateOfOrigin || !occupation) {
    return res.status(400).json({ error: 'All required fields must be completed.' });
  }

  // 3. Email format validation
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email.trim())) {
    return res.status(400).json({ error: 'Please enter a valid email address.' });
  }

  // 4. Nigerian phone number validation
  // Standard local formats: 080..., 081..., 090..., 091..., 070... (11 digits)
  // Standard international: +234..., 234... (13 or 14 digits)
  const normPhone = normalizePhoneNumber(phoneNumber);
  const nigerianPhoneRegex = /^(070|080|081|090|091|071|082)\d{8}$/;
  if (!nigerianPhoneRegex.test(normPhone)) {
    return res.status(400).json({ 
      error: 'Please enter a valid Nigerian phone number (e.g., 08031234567).' 
    });
  }

  // 5. Save and validate constraints in database
  try {
    const newReg = await db.createRegistration({
      fullName,
      email,
      phoneNumber,
      gender,
      dob,
      address,
      stateOfOrigin,
      occupation,
      education: education || '',
      passportPhoto: passportPhoto || '',
      skills: skills || '',
    });

    // 6. Send simulated email (log it beautifully)
    const emailBody = `
      Dear ${newReg.fullName},

      Congratulations! Your registration has been submitted successfully.

      Here are your details:
      - Name: ${newReg.fullName}
      - Email: ${newReg.email}
      - Phone Number: ${newReg.phoneNumber}
      - Date of Birth: ${newReg.dob}
      - Occupation: ${newReg.occupation}
      
      Your Registration ID is: ${newReg.id}
      
      Best Regards,
      Registration Admin Team
    `;
    
    logEmail(newReg.email, 'Registration Completed Successfully', emailBody);

    return res.json({ 
      success: true, 
      message: 'Congratulations! Your registration has been submitted successfully.',
      registration: newReg
    });

  } catch (error: any) {
    // Intercept database constraint errors and map to the exact instructions
    const message = error.message;
    return res.status(400).json({ error: message });
  }
});

// POST Admin Login
app.post('/api/admin/login', customRateLimiter(10, 60 * 1000), async (req, res) => {
  const { username, password } = req.body;
  
  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password are required.' });
  }
  
  try {
    const admin = await db.getAdmin();
    if (admin.username !== username) {
      return res.status(401).json({ error: 'Invalid administrative credentials.' });
    }
    
    const isMatch = await bcrypt.compare(password, admin.passwordHash);
    if (!isMatch) {
      return res.status(401).json({ error: 'Invalid administrative credentials.' });
    }
    
    // Generate JWT token
    const token = jwt.sign({ username: admin.username }, JWT_SECRET, { expiresIn: '2h' });
    
    res.json({ 
      success: true, 
      token, 
      admin: { username: admin.username } 
    });
  } catch (error) {
    res.status(500).json({ error: 'An error occurred during authentication.' });
  }
});

// GET Admin Statistics (Secured)
app.get('/api/admin/stats', adminAuthMiddleware, async (req, res) => {
  try {
    const stats = await db.getStats();
    res.json(stats);
  } catch (error) {
    res.status(500).json({ error: 'Failed to retrieve stats.' });
  }
});

// GET Registrations list with Search & Filter (Secured)
app.get('/api/admin/registrations', adminAuthMiddleware, async (req, res) => {
  try {
    const regs = await db.getRegistrations();
    
    // Search query parameters
    const search = typeof req.query.search === 'string' ? req.query.search.trim().toLowerCase() : '';
    const dateFilter = typeof req.query.date === 'string' ? req.query.date : ''; // YYYY-MM-DD
    
    let filtered = [...regs];
    
    // Apply search filter (name, email, or phone)
    if (search) {
      filtered = filtered.filter((r) => 
        r.fullName.toLowerCase().includes(search) ||
        r.email.toLowerCase().includes(search) ||
        r.phoneNumber.includes(search)
      );
    }
    
    // Apply date filter
    if (dateFilter) {
      filtered = filtered.filter((r) => {
        const regDate = r.createdAt.substring(0, 10); // YYYY-MM-DD
        return regDate === dateFilter;
      });
    }
    
    // Sort descending by default
    filtered.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    
    res.json(filtered);
  } catch (error) {
    res.status(500).json({ error: 'Failed to retrieve registrations.' });
  }
});

// GET Email Logs (Secured - lets admins check sent confirmation emails)
app.get('/api/admin/email-logs', adminAuthMiddleware, (req, res) => {
  res.json(emailLogs);
});

// PUT Update Registration (Secured)
app.put('/api/admin/registrations/:id', adminAuthMiddleware, csrfVerifyMiddleware, async (req, res) => {
  const { id } = req.params;
  const updateFields = req.body;
  
  try {
    const updated = await db.updateRegistration(id, updateFields);
    res.json({
      success: true,
      message: 'Record updated successfully.',
      registration: updated,
    });
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

// DELETE Registration (Secured)
app.delete('/api/admin/registrations/:id', adminAuthMiddleware, csrfVerifyMiddleware, async (req, res) => {
  const { id } = req.params;
  
  try {
    const deleted = await db.deleteRegistration(id);
    if (deleted) {
      res.json({ success: true, message: 'Record deleted successfully.' });
    } else {
      res.status(404).json({ error: 'Registration not found.' });
    }
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to delete record.' });
  }
});

// ----------------------------------------------------
// VITE OR STATIC SERVING MIDDLEWARE
// ----------------------------------------------------
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    // In development mode, load Vite server as a middleware
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
    console.log('Vite development middleware mounted.');
  } else {
    // In production mode, serve the static built files
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
    console.log('Production static asset routing enabled.');
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start Express-Vite server:', err);
});
