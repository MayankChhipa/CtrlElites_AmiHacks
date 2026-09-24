const { Server } = require('socket.io');
const { verifyToken } = require('./jwt');

let io = null;

const initSocket = (server) => {
  io = new Server(server, {
    cors: {
      origin: process.env.CLIENT_URL || 'http://localhost:5173',
      methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE'],
      credentials: true,
    },
  });

  /**
   * Socket authentication middleware
   */
  io.use((socket, next) => {
    try {
      const authToken = socket.handshake.auth?.token;

      const authorizationHeader =
        socket.handshake.headers?.authorization;

      let token = authToken;

      if (!token && authorizationHeader) {
        const [scheme, value] = authorizationHeader.split(' ');

        if (scheme?.toLowerCase() === 'bearer') {
          token = value;
        }
      }

      if (
        !token ||
        token === 'null' ||
        token === 'undefined'
      ) {
        return next(
          new Error('Authentication required')
        );
      }

      const decoded = verifyToken(token);

      socket.user = decoded;

      next();
    } catch (err) {
      console.warn(
        `Socket authentication failed: ${err.message}`
      );

      next(new Error('Invalid or expired authentication token'));
    }
  });

  io.on('connection', (socket) => {
    const userId = socket.user?.id;
    const role = socket.user?.role?.toUpperCase();

    // User-specific room
    if (userId) {
      socket.join(`user:${userId}`);
    }

    // Role-specific room
    if (role) {
      socket.join(`role:${role}`);
    }

    /**
     * Join a donation room
     *
     * Authorization should ideally be checked against
     * the Donation/Delivery database record here.
     */
    socket.on('join_donation', (donationId) => {
      if (!donationId) {
        return;
      }

      socket.join(`donation:${donationId}`);
    });

    socket.on('leave_donation', (donationId) => {
      if (!donationId) {
        return;
      }

      socket.leave(`donation:${donationId}`);
    });

    /**
     * Driver location update
     *
     * Expected:
     * {
     *   deliveryId,
     *   donationId,
     *   coords: [lng, lat],
     *   heading,
     *   speed
     * }
     */
    socket.on('driver_location_update', (data) => {
      try {
        // Only drivers should be allowed to send driver locations.
        if (role !== 'DRIVER') {
          return;
        }

        if (!data || typeof data !== 'object') {
          return;
        }

        const {
          deliveryId,
          donationId,
          coords,
          heading,
          speed,
        } = data;

        if (!deliveryId || !donationId) {
          return;
        }

        if (
          !Array.isArray(coords) ||
          coords.length !== 2
        ) {
          return;
        }

        const [longitude, latitude] = coords;

        if (
          typeof longitude !== 'number' ||
          typeof latitude !== 'number' ||
          !Number.isFinite(longitude) ||
          !Number.isFinite(latitude) ||
          longitude < -180 ||
          longitude > 180 ||
          latitude < -90 ||
          latitude > 90
        ) {
          return;
        }

        const locationData = {
          deliveryId,
          donationId,
          coords: [longitude, latitude],
          heading:
            typeof heading === 'number'
              ? heading
              : null,
          speed:
            typeof speed === 'number'
              ? speed
              : null,
          driverId: userId,
          timestamp: new Date().toISOString(),
        };

        // Broadcast to users watching this donation
        io
          .to(`donation:${donationId}`)
          .emit(
            'driver_location_broadcast',
            locationData
          );

        // Broadcast to administrators
        io
          .to('role:ADMIN')
          .emit(
            'admin_driver_location_stream',
            locationData
          );
      } catch (err) {
        console.error(
          'Driver location update error:',
          err
        );
      }
    });

    socket.on('disconnect', (reason) => {
      console.log(
        `Socket disconnected: ${socket.id} (${reason})`
      );
    });
  });

  return io;
};

const getIO = () => {
  if (!io) {
    throw new Error(
      'Socket.IO is not initialized!'
    );
  }

  return io;
};

module.exports = {
  initSocket,
  getIO,
};