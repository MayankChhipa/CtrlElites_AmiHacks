const { getIO } = require('../config/socket');
const Notification = require('../models/Notification');

/**
 * Safely retrieves socket.io instance
 */
const safeGetIO = () => {
  try {
    return getIO();
  } catch (err) {
    return null;
  }
};

/**
 * Creates persistent notification in DB and emits via socket to the recipient
 */
const createAndSendNotification = async ({
  recipientId,
  senderId = null,
  title,
  message,
  type = 'SYSTEM',
  data = {},
}) => {
  try {
    const notification = await Notification.create({
      recipientId,
      senderId,
      title,
      message,
      type,
      data,
    });

    const io = safeGetIO();
    if (io) {
      io.to(`user:${recipientId}`).emit('notification', notification);
    }

    return notification;
  } catch (error) {
    console.error('[Notification] Error creating notification:', error.message);
    return null;
  }
};

// Event Emitters for Workflow

const emitDonationCreated = (donation) => {
  const io = safeGetIO();
  if (io) {
    io.emit('donation_created', { donationId: donation._id, title: donation.title });
    io.to('role:ADMIN').emit('admin_feed', { type: 'DONATION_CREATED', donation });
  }
};

const emitMatchProposed = async (match, donation, ngoId) => {
  const io = safeGetIO();
  if (io) {
    io.to(`user:${ngoId}`).emit('match_proposed', {
      matchId: match._id,
      donationId: donation._id,
      matchScore: match.matchScore,
    });
    io.to(`donation:${donation._id}`).emit('match_proposed', { matchId: match._id });
  }

  await createAndSendNotification({
    recipientId: ngoId,
    title: 'New Food Donation Proposed! 🍲',
    message: `A new surplus donation "${donation.title}" is waiting for your acceptance.`,
    type: 'MATCH',
    data: { donationId: donation._id, matchId: match._id },
  });
};

const emitMatchAccepted = async (match, donation) => {
  const io = safeGetIO();
  if (io) {
    io.to(`donation:${donation._id}`).emit('match_accepted', {
      donationId: donation._id,
      ngoId: match.ngoId,
    });
    io.to(`user:${donation.donorId}`).emit('match_accepted', {
      donationId: donation._id,
      ngoId: match.ngoId,
    });
    // Notify all available drivers that a new delivery is available
    io.to('role:DRIVER').emit('delivery_available', {
      donationId: donation._id,
      pickupLocation: donation.pickupLocation,
    });
  }

  await createAndSendNotification({
    recipientId: donation.donorId,
    title: 'Match Accepted! 🎉',
    message: 'A shelter has accepted your surplus donation. A driver will be assigned shortly.',
    type: 'MATCH',
    data: { donationId: donation._id, matchId: match._id },
  });
};

const emitMatchDeclined = (match, donation) => {
  const io = safeGetIO();
  if (io) {
    io.to(`donation:${donation._id}`).emit('match_declined', {
      donationId: donation._id,
      ngoId: match.ngoId,
    });
  }
};

const emitDriverAssigned = async (delivery, donation) => {
  const io = safeGetIO();
  if (io) {
    io.to(`donation:${donation._id}`).emit('driver_assigned', {
      deliveryId: delivery._id,
      driverId: delivery.driverId,
    });
    io.to(`user:${donation.donorId}`).emit('driver_assigned', {
      deliveryId: delivery._id,
      driverId: delivery.driverId,
    });
    io.to(`user:${donation.matchedNgoId}`).emit('driver_assigned', {
      deliveryId: delivery._id,
      driverId: delivery.driverId,
    });
  }

  await createAndSendNotification({
    recipientId: donation.donorId,
    title: 'Driver Assigned 🚚',
    message: 'A driver is heading to pick up your surplus donation.',
    type: 'DELIVERY',
    data: { donationId: donation._id, deliveryId: delivery._id },
  });

  await createAndSendNotification({
    recipientId: donation.matchedNgoId,
    title: 'Driver Assigned 🚚',
    message: 'A driver has claimed the rescue transport for your accepted donation.',
    type: 'DELIVERY',
    data: { donationId: donation._id, deliveryId: delivery._id },
  });
};

const emitDriverEnRoute = (delivery, stage, donationId) => {
  const io = safeGetIO();
  if (io) {
    io.to(`donation:${donationId}`).emit('driver_en_route', {
      deliveryId: delivery._id,
      stage,
      status: delivery.status,
    });
  }
};

const emitDriverArrived = (delivery, stage, donationId) => {
  const io = safeGetIO();
  if (io) {
    io.to(`donation:${donationId}`).emit('driver_arrived', {
      deliveryId: delivery._id,
      stage,
      status: delivery.status,
    });
  }
};

const emitPickupConfirmed = async (delivery, donation) => {
  const io = safeGetIO();
  if (io) {
    io.to(`donation:${donation._id}`).emit('pickup_confirmed', {
      deliveryId: delivery._id,
      donationId: donation._id,
    });
  }

  await createAndSendNotification({
    recipientId: donation.matchedNgoId,
    title: 'Food Picked Up! 📦',
    message: 'The driver has picked up the food from the donor and is heading your way.',
    type: 'DELIVERY',
    data: { donationId: donation._id, deliveryId: delivery._id },
  });
};

const emitDeliveryInTransit = (delivery, donation) => {
  const io = safeGetIO();
  if (io) {
    io.to(`donation:${donation._id}`).emit('delivery_in_transit', {
      deliveryId: delivery._id,
      donationId: donation._id,
    });
  }
};

const emitDeliveryCompleted = async (delivery, donation) => {
  const io = safeGetIO();
  if (io) {
    io.to(`donation:${donation._id}`).emit('delivery_completed', {
      deliveryId: delivery._id,
      donationId: donation._id,
    });
    io.to('role:ADMIN').emit('admin_feed', { type: 'DELIVERY_COMPLETED', delivery, donation });
  }

  await createAndSendNotification({
    recipientId: donation.donorId,
    title: 'Food Delivered! 💚',
    message: `Your donation "${donation.title}" has been successfully delivered to the shelter!`,
    type: 'DELIVERY',
    data: { donationId: donation._id, deliveryId: delivery._id },
  });

  await createAndSendNotification({
    recipientId: donation.matchedNgoId,
    title: 'Delivery Arrived! 📦',
    message: 'The driver has completed delivery. Please verify and confirm receipt.',
    type: 'DELIVERY',
    data: { donationId: donation._id, deliveryId: delivery._id },
  });
};

const emitDeliveryVerified = async (delivery, donation) => {
  const io = safeGetIO();
  if (io) {
    io.to(`donation:${donation._id}`).emit('delivery_verified', {
      deliveryId: delivery._id,
      donationId: donation._id,
    });
  }

  await createAndSendNotification({
    recipientId: delivery.driverId,
    title: 'Delivery Verified ⭐',
    message: 'The shelter has verified your delivery. Thank you for rescuing food!',
    type: 'DELIVERY',
    data: { donationId: donation._id, deliveryId: delivery._id },
  });
};

const emitDonationExpiring = async (donation) => {
  const io = safeGetIO();
  if (io) {
    io.to(`donation:${donation._id}`).emit('donation_expiring', {
      donationId: donation._id,
      expiryTime: donation.perishability?.expiryTime,
    });
  }

  await createAndSendNotification({
    recipientId: donation.donorId,
    title: 'Donation Expiring Soon ⏰',
    message: `Your donation "${donation.title}" has less than 1 hour remaining before expiry.`,
    type: 'URGENCY',
    data: { donationId: donation._id },
  });
};

module.exports = {
  createAndSendNotification,
  emitDonationCreated,
  emitMatchProposed,
  emitMatchAccepted,
  emitMatchDeclined,
  emitDriverAssigned,
  emitDriverEnRoute,
  emitDriverArrived,
  emitPickupConfirmed,
  emitDeliveryInTransit,
  emitDeliveryCompleted,
  emitDeliveryVerified,
  emitDonationExpiring,
};
