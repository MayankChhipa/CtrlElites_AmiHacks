const { Server } = require('socket.io');
const { verifyToken } = require('./jwt');
const Delivery = require('../models/Delivery');

let io = null;

const initSocket = (server) => {
  io = new Server(server, {
    cors: {
      origin:
        process.env.CLIENT_URL ||
        'http://localhost:5173',
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
        const [scheme, value] =
          authorizationHeader.split(' ');

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

      next(
        new Error(
          'Invalid or expired authentication token'
        )
      );
    }
  });

  io.on('connection', (socket) => {
    const userId = socket.user?.id;
    const role = socket.user?.role?.toUpperCase();

    // --------------------------------------------------
    // USER ROOM
    // --------------------------------------------------

    if (userId) {
      socket.join(`user:${userId}`);
    }

    // --------------------------------------------------
    // ROLE ROOM
    // --------------------------------------------------

    if (role) {
      socket.join(`role:${role}`);
    }

    // --------------------------------------------------
    // DONATION ROOM
    // --------------------------------------------------

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

    // ==================================================
    // LIVE DELIVERY TRACKING
    // ==================================================

    /**
     * Join a delivery tracking room.
     *
     * Allowed users:
     * - Assigned driver
     * - Donor
     * - NGO
     * - ADMIN
     */
    socket.on(
      'join_delivery_tracking',
      async ({ deliveryId } = {}) => {
        try {
          if (!deliveryId) {
            return;
          }

          const delivery =
            await Delivery.findById(deliveryId);

          if (!delivery) {
            return;
          }

          const currentUserId =
            userId?.toString();

          const allowed =
            role === 'ADMIN' ||
            delivery.driverId?.toString() ===
              currentUserId ||
            delivery.donorId?.toString() ===
              currentUserId ||
            delivery.ngoId?.toString() ===
              currentUserId;

          if (!allowed) {
            console.warn(
              `Unauthorized tracking room access: ${currentUserId}`
            );

            return;
          }

          socket.join(
            `delivery:${deliveryId}`
          );

          console.log(
            `Socket ${socket.id} joined delivery:${deliveryId}`
          );

          // Send current location immediately
          // if one already exists in the database.
          if (
            delivery.currentLocation?.coordinates
          ) {
            socket.emit(
              'driver_location_updated',
              {
                deliveryId:
                  deliveryId.toString(),

                donationId:
                  delivery.donationId?.toString(),

                coordinates:
                  delivery.currentLocation
                    .coordinates,

                heading: null,
                speed: null,

                updatedAt: new Date(),
              }
            );
          }
        } catch (error) {
          console.error(
            'Join delivery tracking error:',
            error
          );
        }
      }
    );

    /**
     * Driver sends live GPS location.
     *
     * Expected:
     *
     * {
     *   deliveryId,
     *   coordinates: [longitude, latitude],
     *   heading,
     *   speed
     * }
     */
    socket.on(
      'send_driver_location',
      async (data = {}) => {
        try {
          // Only DRIVER can send GPS.
          if (role !== 'DRIVER') {
            return;
          }

          const {
            deliveryId,
            coordinates,
            heading,
            speed,
          } = data;

          if (!deliveryId) {
            return;
          }

          // ------------------------------------------------
          // Validate coordinates
          // ------------------------------------------------

          if (
            !Array.isArray(coordinates) ||
            coordinates.length !== 2
          ) {
            return;
          }

          const [
            longitude,
            latitude,
          ] = coordinates;

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

          // ------------------------------------------------
          // Find delivery
          // ------------------------------------------------

          const delivery =
            await Delivery.findById(
              deliveryId
            );

          if (!delivery) {
            return;
          }

          // ------------------------------------------------
          // Verify assigned driver
          // ------------------------------------------------

          if (
            delivery.driverId?.toString() !==
            userId?.toString()
          ) {
            console.warn(
              `Unauthorized GPS update from driver ${userId}`
            );

            return;
          }

          // ------------------------------------------------
          // Update latest driver location
          // ------------------------------------------------

          delivery.currentLocation = {
            type: 'Point',
            coordinates: [
              longitude,
              latitude,
            ],
          };

          // ------------------------------------------------
          // Store breadcrumb
          // ------------------------------------------------

          delivery.breadcrumbs.push({
            coordinates: [
              longitude,
              latitude,
            ],
            timestamp: new Date(),
          });

          await delivery.save();

          // ------------------------------------------------
          // Prepare broadcast data
          // ------------------------------------------------

          const locationData = {
            deliveryId:
              delivery._id.toString(),

            donationId:
              delivery.donationId?.toString(),

            coordinates: [
              longitude,
              latitude,
            ],

            heading:
              typeof heading === 'number'
                ? heading
                : null,

            speed:
              typeof speed === 'number'
                ? speed
                : null,

            driverId:
              userId?.toString(),

            updatedAt: new Date(),
          };

          // ------------------------------------------------
          // Broadcast to delivery trackers
          // ------------------------------------------------

          io
            .to(`delivery:${deliveryId}`)
            .emit(
              'driver_location_updated',
              locationData
            );

          // ------------------------------------------------
          // Also broadcast to donation room
          // ------------------------------------------------

          if (delivery.donationId) {
            io
              .to(
                `donation:${delivery.donationId}`
              )
              .emit(
                'driver_location_updated',
                locationData
              );
          }

          // ------------------------------------------------
          // Admin live tracking
          // ------------------------------------------------

          io
            .to('role:ADMIN')
            .emit(
              'admin_driver_location_stream',
              locationData
            );
        } catch (error) {
          console.error(
            'Driver location update error:',
            error
          );
        }
      }
    );

    // --------------------------------------------------
    // DISCONNECT
    // --------------------------------------------------

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