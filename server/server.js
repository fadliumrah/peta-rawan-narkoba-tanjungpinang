import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import helmet from 'helmet';
import net from 'net';
import compression from 'compression';
import rateLimit from 'express-rate-limit';
import morgan from 'morgan';
import cloudinary from 'cloudinary';

// Import routes
import bannerRoutes from './routes/banner.routes.js';
import logoRoutes from './routes/logo.routes.js';
import locationRoutes from './routes/location.routes.js';
import newsRoutes from './routes/news.routes.js';
import authRoutes from './routes/auth.routes.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 5000;

// Trust proxy when deployed behind a load balancer / reverse proxy (Heroku, Railway, Render)
// If `TRUST_PROXY` is explicitly set, respect it. Otherwise enable trust
// proxy automatically in production so platforms that set `X-Forwarded-For`
// (Railway, Render, Heroku, etc.) won't trigger express-rate-limit errors.
const trustProxyEnv = process.env.TRUST_PROXY;
// Prefer a numeric (number of trusted proxies) or specific value rather than
// a permissive boolean `true`. express-rate-limit treats a plain `true`
// as overly permissive and will raise ERR_ERL_PERMISSIVE_TRUST_PROXY.
let trustProxy;
if (typeof trustProxyEnv !== 'undefined') {
  if (trustProxyEnv === '1' || trustProxyEnv === 'true') trustProxy = 1;
  else if (!Number.isNaN(Number(trustProxyEnv))) trustProxy = Number(trustProxyEnv);
  else trustProxy = trustProxyEnv; // allow values like 'loopback'
} else {
  // Default to trusting the first proxy in production (typical for PaaS)
  trustProxy = process.env.NODE_ENV === 'production' ? 1 : false;
}
app.set('trust proxy', trustProxy);
console.log('🔐 Express trust proxy:', trustProxy);

// Security & performance middleware
app.use(helmet());
app.use(compression());

// Logging
if (process.env.NODE_ENV !== 'test') {
  app.use(morgan('combined'));
}

// CORS configuration: allow specific origins via ALLOWED_ORIGINS, or default to permissive for localhost/dev
let corsOptions = {};
if (process.env.ALLOWED_ORIGINS) {
  const allowed = process.env.ALLOWED_ORIGINS.split(',').map(s => s.trim()).filter(Boolean);
  corsOptions = {
    origin: function (origin, callback) {
      // allow non-browser requests like curl or server-to-server
      if (!origin) return callback(null, true);
      if (allowed.indexOf(origin) !== -1) {
        callback(null, true);
      } else {
        callback(new Error('Not allowed by CORS'));
      }
    }
  };
}
app.use(cors(corsOptions));

// Basic rate limiting for API
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  standardHeaders: true,
  legacyHeaders: false
});
app.use('/api/', apiLimiter);

// Temporary request-logging middleware for API troubleshooting
// Enable by setting `LOG_REQUESTS=1` in environment (works in production when set)
const shouldLog = process.env.LOG_REQUESTS === '1';
if (shouldLog) {
  app.use('/api', (req, res, next) => {
    const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress || 'unknown';
    console.log(`[API_REQ] ${new Date().toISOString()} ${req.method} ${req.originalUrl} from=${ip}`);
    next();
  });
} else {
  // no-op when not enabled
}

// Stricter limiter for auth endpoints (protect login/register)
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: 'Too many attempts, please try again later.'
});
app.use('/api/auth/login', authLimiter);
app.use('/api/auth/register', authLimiter);

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Log any API responses with error status to make debugging easier
app.use('/api', (req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    if (res.statusCode >= 400) {
      console.warn(`API ${req.method} ${req.originalUrl} -> ${res.statusCode} (${duration}ms)`);
    }
  });
  next();
});

// Static files untuk uploads (deprecated when using Cloudinary):
// Historically we served uploads from disk here. After migrating assets to
// Cloudinary we will remove this static serving to avoid exposing local files.
// app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Track database connection state so startup logs are informative
let dbConnected = false;
let dbConnecting = false;
const checkCloudinaryConfigured = () => !!(process.env.CLOUDINARY_CLOUD_NAME && process.env.CLOUDINARY_API_KEY && process.env.CLOUDINARY_API_SECRET);

// Database connection with retry logic and exponential backoff
const sleep = (ms) => new Promise((res) => setTimeout(res, ms));
const connectDB = async ({ maxRetries = 5, baseDelayMs = 2000 } = {}) => {
  const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/peta-rawan-narkoba';
  // Recommended mongoose options for stable connectivity
  const mongooseOpts = {
    serverSelectionTimeoutMS: 5000,
    // Let mongoose manage reconnects; keep heartbeat and monitoring aggressive enough
    heartbeatFrequencyMS: 10000,
  };
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      console.log(`🔌 Attempting MongoDB connection (attempt ${attempt}/${maxRetries})`);
      await mongoose.connect(uri, mongooseOpts);
      console.log('✅ MongoDB Connected Successfully');
      console.log('📦 Database:', mongoose.connection.name);
      dbConnected = true;
      return true;
    } catch (err) {
      console.error(`❌ MongoDB Connection Error (attempt ${attempt}):`, err.message);
      if (attempt < maxRetries) {
        const delay = baseDelayMs * Math.pow(2, attempt - 1);
        console.log(`🔁 Retrying in ${Math.round(delay / 1000)}s...`);
        // wait before retrying
        // eslint-disable-next-line no-await-in-loop
        await sleep(delay);
        continue;
      }

      console.error('\n⚠️  DATABASE NOT CONNECTED after retries!');
      console.log('📝 Please setup MongoDB:');
      console.log('   1. Create free account at: https://www.mongodb.com/cloud/atlas');
      console.log('   2. Create a cluster and get connection string');
      console.log('   3. Update MONGODB_URI in server/.env file\n');
      console.log('💡 Server will continue running without database for testing API structure.\n');

      // If development, attempt to connect to local DB as a fallback
      if (process.env.NODE_ENV === 'development' && process.env.MONGODB_URI && !process.env.MONGODB_URI.startsWith('mongodb://localhost')) {
        try {
          console.log('🔁 Attempting local DB fallback at mongodb://localhost:27017/peta-rawan-narkoba');
          await mongoose.connect('mongodb://localhost:27017/peta-rawan-narkoba', mongooseOpts);
          console.log('✅ Local MongoDB fallback connected');
          dbConnected = true;
          return true;
        } catch (err2) {
          console.error('❌ Local fallback connection failed:', err2.message);
        }
      }

      return false;
    }
  }
};

// Start initial connect attempts asynchronously but wait up to a short timeout
// so startup logs reflect the likely DB state.
(async () => {
  dbConnecting = true;
  const connected = await Promise.race([
    connectDB({ maxRetries: 3, baseDelayMs: 1500 }),
    sleep(4000).then(() => false),
  ]);
  dbConnecting = false;

  if (!connected) {
    console.warn('⚠️ Database appears not ready during startup. Will continue background reconnect attempts.');
  }
  // keep background reconnect attempts running
  connectDB({ maxRetries: 5, baseDelayMs: 2000 });
})();

// Log mongoose connection errors after initial connect attempt
mongoose.connection.on('error', (err) => {
  console.error('❌ Mongoose connection error:', err && err.message ? err.message : err);
});

// Reflect connection lifecycle in logs and `dbConnected` flag
mongoose.connection.on('connected', () => {
  dbConnected = true;
  console.log('🔗 Mongoose: connected');
});
mongoose.connection.on('reconnected', () => {
  dbConnected = true;
  console.log('🔁 Mongoose: reconnected');
});
mongoose.connection.on('disconnected', () => {
  dbConnected = false;
  console.warn('⚠️ Mongoose: disconnected');
});
mongoose.connection.on('connecting', () => {
  console.log('⏳ Mongoose: connecting...');
});

// Global process handlers to make failures visible in deployment logs
process.on('unhandledRejection', (reason, p) => {
  console.error('Unhandled Rejection at:', p, 'reason:', reason);
});

process.on('uncaughtException', (err) => {
  console.error('Uncaught Exception:', err && err.stack ? err.stack : err);
  process.exit(1);
});

// Diagnostic hooks: log exit and beforeExit so we can see why process ends
process.on('beforeExit', (code) => {
  console.log('Process beforeExit with code', code);
});
process.on('exit', (code) => {
  console.log('Process exit with code', code);
});

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/banner', bannerRoutes);
app.use('/api/logo', logoRoutes);
app.use('/api/locations', locationRoutes);
app.use('/api/news', newsRoutes);

// Serve client production build if available (allows hosting server+client on same host)
const clientBuildPath = path.join(__dirname, '..', 'client', 'dist');
if (fs.existsSync(clientBuildPath)) {
  console.log('📦 Serving client from', clientBuildPath);
  app.use(express.static(clientBuildPath));

  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api') || req.path.startsWith('/uploads')) return next();
    res.sendFile(path.join(clientBuildPath, 'index.html'));
  });
}

// API index route (kept at /api so root can serve the SPA when available)
app.get('/api', (req, res) => {
  res.json({ 
    message: 'Peta Rawan Narkoba API', 
    version: '1.0.0',
    endpoints: {
      auth: '/api/auth',
      banner: '/api/banner',
      logo: '/api/logo',
      locations: '/api/locations',
      news: '/api/news'
    }
  });

  // Compatibility: if /api/health is requested in environments where proxy
  // or routing rules interfere, redirect to the canonical /health endpoint.
  app.get('/api/health', (req, res) => {
    return res.redirect('/health');
  });
});

// Block write requests when database is not available to avoid confusing errors
app.use('/api', (req, res, next) => {
  // Allow read-only requests even if DB is down; block anything that mutates data
  const writeMethods = ['POST', 'PUT', 'PATCH', 'DELETE'];
  if (!dbConnected && writeMethods.includes(req.method)) {
    return res.status(503).json({ success: false, message: 'Service temporarily unavailable - database not connected' });
  }
  return next();
});

// If client build exists, prefer serving the SPA at root `/`.
// This makes the public URL load the frontend while `/api` continues to expose API info.
if (fs.existsSync(clientBuildPath)) {
  app.get('/', (req, res) => {
    res.sendFile(path.join(clientBuildPath, 'index.html'));
  });
} else {
  // Fallback: when there's no client build, keep root as API index
  app.get('/', (req, res) => {
    res.json({ 
      message: 'Peta Rawan Narkoba API', 
      version: '1.0.0',
      endpoints: {
        auth: '/api/auth',
        banner: '/api/banner',
        logo: '/api/logo',
        locations: '/api/locations',
        news: '/api/news'
      }
    });
  });
}

// Health check endpoint for load balancers and container healthchecks
const healthHandler = async (req, res) => {
  try {
    const dbReadyState = mongoose.connection.readyState; // 0 = disconnected, 1 = connected
    const dbStatus = dbReadyState === 1 ? 'connected' : 'disconnected';

    res.json({
      success: true,
      status: 'ok',
      db: dbStatus,
      services: {
        cloudinary: checkCloudinaryConfigured()
      }
    });
  } catch (err) {
    console.error('Health check failed:', err && err.message ? err.message : err);
    res.status(500).json({ success: false, status: 'error', error: err && err.message ? err.message : String(err) });
  }
};

// Expose both `/health` and `/api/health` so platform probes and external tools
// can check the API health even when a static client is being served at root.
app.get('/health', healthHandler);
app.get('/api/health', healthHandler);

// Diagnostics endpoint to check external services like Cloudinary
app.get('/api/diagnostics', async (req, res) => {
  try {
    const dbReadyState = mongoose.connection.readyState === 1;
    let cloudinaryOk = false;
    let cloudinaryInfo = null;
    try {
      cloudinary.v2.config({
        cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
        api_key: process.env.CLOUDINARY_API_KEY,
        api_secret: process.env.CLOUDINARY_API_SECRET
      });
      // Try listing a small number of resources to verify credentials
      const result = await cloudinary.v2.api.resources({ max_results: 1 });
      cloudinaryOk = true;
      cloudinaryInfo = { total: result.total_count || 0 };
    } catch (e) {
      cloudinaryOk = false;
      cloudinaryInfo = { error: e.message };
    }

    res.json({ success: true, db: dbReadyState ? 'connected' : 'disconnected', cloudinary: cloudinaryOk ? 'ok' : cloudinaryInfo });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ 
    success: false, 
    message: 'Something went wrong!',
    error: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});

// Helper: check if a port is free by attempting to listen on it briefly
const isPortFree = (port) => new Promise((resolve) => {
  const tester = net.createServer()
    .once('error', (err) => {
      tester.close?.();
      resolve(false);
    })
    .once('listening', () => {
      tester.close();
      resolve(true);
    })
    .listen(port);
});

const startServer = async (startPort = PORT, maxAttempts = 10) => {
  let port = Number(startPort);
  // Optionally wait for DB connection before starting if explicitly requested
  if (process.env.WAIT_FOR_DB === '1') {
    console.log('⏳ WAIT_FOR_DB=1 set — waiting for MongoDB to be available before listening...');
    const ok = await connectDB({ maxRetries: 10, baseDelayMs: 1500 });
    if (!ok) {
      console.error('❌ Could not connect to MongoDB; aborting because WAIT_FOR_DB=1');
      process.exit(1);
    }
  }
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    // probe port first to avoid race conditions and uncaught exceptions
    const free = await isPortFree(port);
    if (!free) {
      console.warn(`Port ${port} in use; trying port ${port + 1}...`);
      port += 1;
      continue;
    }

    const host = process.env.HOST || '0.0.0.0';
    const server = app.listen(port, host, () => {
      console.log(`🚀 Server running on ${host}:${port}`);
      const ready = mongoose.connection.readyState; // 0 = disconnected, 1 = connected, 2 = connecting
      if (ready === 1) {
        console.log('✅ Database: connected');
      } else if (ready === 2) {
        console.log('⏳ Database: connecting (will continue retries in background)');
      } else {
        console.warn('⚠️ Database: DISCONNECTED - admin endpoints may be unavailable. Check MONGODB_URI and connection logs.');
      }
      console.log(`Cloudinary configured: ${checkCloudinaryConfigured() ? 'yes' : 'no'}`);
    });

    server.on('error', (err) => {
      console.error('Server error:', err);
      process.exit(1);
    });

    return server;
  }

  console.error(`Failed to bind a port after ${maxAttempts} attempts. Please free a port or set PORT environment variable.`);
  process.exit(1);
};

startServer().catch((err) => {
  console.error('Fatal error starting server:', err);
  process.exit(1);
});
