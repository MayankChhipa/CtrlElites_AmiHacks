require('dotenv').config();

const http = require('http');
const express = require('express');
const cors = require('cors');

const connectDB = require('./config/db');
const {
  disconnectDB,
} = require('./config/db');

const {
  initSocket,
} = require('./config/socket');

// Route Imports
const authRoutes = require('./routes/authRoutes');
const donationRoutes = require('./routes/donationRoutes');
const matchRoutes = require('./routes/matchRoutes');
const deliveryRoutes = require('./routes/deliveryRoutes');
const analyticsRoutes = require('./routes/analyticsRoutes');
const notificationRoutes = require('./routes/notificationRoutes');
const uploadRoutes = require('./routes/uploadRoutes');
const adminRoutes = require('./routes/adminRoutes');

const {
  autoSeedIfEmpty,
} = require('./utils/autoSeed');

const app = express();
const server = http.createServer(app);

/*
 * ----------------------------------------------------
 * Configuration
 * ----------------------------------------------------
 */

const PORT =
  Number.parseInt(
    process.env.PORT,
    10
  ) || 5000;

const CLIENT_URL =
  process.env.CLIENT_URL ||
  'http://localhost:5173';

/*
 * ----------------------------------------------------
 * Middleware
 * ----------------------------------------------------
 */

app.use(
  cors({
    origin: CLIENT_URL,
    credentials: true,
    methods: [
      'GET',
      'POST',
      'PUT',
      'PATCH',
      'DELETE',
      'OPTIONS',
    ],
  })
);

app.use(
  express.json({
    limit: '1mb',
  })
);

app.use(
  express.urlencoded({
    extended: true,
    limit: '1mb',
  })
);

/*
 * ----------------------------------------------------
 * Health Check
 * ----------------------------------------------------
 */

app.get(
  '/api/health',
  (req, res) => {
    return res.status(200).json({
      success: true,
      status: 'OK',
      message:
        'Surplus-to-Shelter API running',
      database:
        'connected',
    });
  }
);

/*
 * ----------------------------------------------------
 * Routes
 * ----------------------------------------------------
 */

app.use(
  '/api/auth',
  authRoutes
);

app.use(
  '/api/donations',
  donationRoutes
);

app.use(
  '/api/matches',
  matchRoutes
);

app.use(
  '/api/deliveries',
  deliveryRoutes
);

app.use(
  '/api/analytics',
  analyticsRoutes
);

app.use(
  '/api/notifications',
  notificationRoutes
);

app.use(
  '/api/upload',
  uploadRoutes
);

app.use(
  '/api/admin',
  adminRoutes
);

/*
 * ----------------------------------------------------
 * 404 Handler
 * ----------------------------------------------------
 */

app.use(
  (req, res) => {
    return res.status(404).json({
      success: false,
      message:
        `Route not found: ${req.method} ${req.originalUrl}`,
    });
  }
);

/*
 * ----------------------------------------------------
 * Global Error Handler
 * ----------------------------------------------------
 */

app.use(
  (
    err,
    req,
    res,
    next
  ) => {
    console.error(
      'Unhandled server error:',
      err
    );

    if (res.headersSent) {
      return next(err);
    }

    /*
     * Multer errors
     */
    if (
      err?.name === 'MulterError'
    ) {
      return res.status(400).json({
        success: false,
        message:
          err.message ||
          'File upload error.',
      });
    }

    /*
     * Mongoose validation errors
     */
    if (
      err?.name ===
      'ValidationError'
    ) {
      return res.status(400).json({
        success: false,
        message:
          'Request validation failed.',
        errors: Object.values(
          err.errors || {}
        ).map(
          (validationError) =>
            validationError.message
        ),
      });
    }

    /*
     * Mongoose duplicate key
     */
    if (
      err?.code === 11000
    ) {
      return res.status(409).json({
        success: false,
        message:
          'A record with the provided unique value already exists.',
      });
    }

    const statusCode =
      Number.isInteger(err?.statusCode)
        ? err.statusCode
        : Number.isInteger(err?.status)
          ? err.status
          : 500;

    /*
     * Do not expose internal error details
     * in production.
     */
    const message =
      process.env.NODE_ENV ===
        'production' &&
      statusCode >= 500
        ? 'Internal Server Error'
        : err?.message ||
          'Internal Server Error';

    return res.status(
      statusCode
    ).json({
      success: false,
      message,
    });
  }
);

/*
 * ----------------------------------------------------
 * Socket.IO
 * ----------------------------------------------------
 */

initSocket(server);

/*
 * ----------------------------------------------------
 * Graceful Shutdown
 * ----------------------------------------------------
 */

let isShuttingDown = false;

const shutdown = async (
  signal
) => {
  if (isShuttingDown) {
    return;
  }

  isShuttingDown = true;

  console.log(
    `\n🛑 ${signal} received. Shutting down gracefully...`
  );

  server.close(
    async () => {
      try {
        await disconnectDB();

        console.log(
          '✅ Server shutdown complete.'
        );

        process.exit(0);
      } catch (error) {
        console.error(
          '❌ Error during shutdown:',
          error
        );

        process.exit(1);
      }
    }
  );

  /*
   * Prevent the process from hanging forever
   * during a broken shutdown.
   */
  setTimeout(() => {
    console.error(
      '⚠️ Forced shutdown after timeout.'
    );

    process.exit(1);
  }, 10000).unref();
};

process.on(
  'SIGINT',
  () => shutdown('SIGINT')
);

process.on(
  'SIGTERM',
  () => shutdown('SIGTERM')
);

/*
 * ----------------------------------------------------
 * Startup
 * ----------------------------------------------------
 */

const startServer = async () => {
  try {
    console.log(
      '🔄 Connecting to MongoDB...'
    );

    await connectDB();

    /*
     * Seed only after the database connection
     * has been successfully established.
     */
    if (
      process.env.NODE_ENV !==
        'production' ||
      process.env.ALLOW_DEMO_SEED ===
        'true'
    ) {
      try {
        await autoSeedIfEmpty();
      } catch (seedError) {
        console.error(
          '⚠️ Auto-seeding failed:',
          seedError
        );

        /*
         * Auto-seeding should not prevent the API
         * from starting if the application database
         * itself is healthy.
         */
      }
    }

    server.listen(
      PORT,
      () => {
        console.log(
          `🚀 Surplus-to-Shelter Server running on port ${PORT}`
        );

        console.log(
          `🌐 Client URL: ${CLIENT_URL}`
        );

        console.log(
          `❤️ Health: http://localhost:${PORT}/api/health`
        );
      }
    );
  } catch (error) {
    console.error(
      '❌ Server startup failed:',
      error
    );

    try {
      await disconnectDB();
    } catch (disconnectError) {
      console.error(
        '❌ Failed to close database connection:',
        disconnectError
      );
    }

    process.exit(1);
  }
};

startServer();

module.exports = {
  app,
  server,
};