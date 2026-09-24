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

  // Socket Auth & Room Assignment Middleware
  io.use((socket, next) => {
    const token = socket.handshake.auth?.token || socket.handshake.headers?.authorization?.split(' ')[1];
    
    if (token && token !== 'null' && token !== 'undefined') {
      try {
        const decoded = verifyToken(token);
        socket.user = decoded;
      } catch (err) {
        console.warn(`Socket auth failed: ${err.message}`);
      }
    }
    return next();
  });

  io.on('connection', (socket) => {
    const userId = socket.user?.id;
    const role = socket.user?.role;

    if (userId) {
      socket.join(`user:${userId}`);
    }
    if (role) {
      socket.join(`role:${role}`);
    }

    // Room join/leave subscriptions
    socket.on('join_donation', (donationId) => {
      socket.join(`donation:${donationId}`);
    });

    socket.on('leave_donation', (donationId) => {
      socket.leave(`donation:${donationId}`);
    });

    // Real-time driver location streaming
    socket.on('driver_location_update', (data) => {
      // data: { deliveryId, donationId, coords: [lng, lat], heading, speed }
      if (data?.donationId) {
        io.to(`donation:${data.donationId}`).emit('driver_location_broadcast', data);
      }
      io.to('role:ADMIN').emit('admin_driver_location_stream', data);
    });

    socket.on('disconnect', () => {
      // Clean disconnect
    });
  });

  return io;
};

const getIO = () => {
  if (!io) {
    throw new Error('Socket.IO is not initialized!');
  }
  return io;
};

module.exports = { initSocket, getIO };
