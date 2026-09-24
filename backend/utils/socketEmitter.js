const { getIO } = require('../config/socket');
const Notification = require('../models/Notification');

/**
 * Safely retrieves the Socket.IO instance.
 */
const safeGetIO = () => {
  try {
    return getIO();
  } catch (error) {
    return null;
  }
};

/**
 * Safely converts a Mongoose ObjectId, populated document,
 * or primitive ID into a string.
 */
const normalizeId = (value) => {
  if (!value) {
    return '';
  }

  if (
    typeof value === 'object' &&
    value._id
  ) {
    return value._id.toString();
  }

  return value.toString();
};

/**
 * Creates a persistent notification and emits it
 * to the recipient's private Socket.IO room.
 *
 * Notification failures are intentionally non-fatal.
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
    const normalizedRecipientId =
      normalizeId(recipientId);

    if (!normalizedRecipientId) {
      console.warn(
        '[Notification] Missing recipientId.'
      );
      return null;
    }

    if (
      typeof title !== 'string' ||
      !title.trim()
    ) {
      console.warn(
        '[Notification] Missing notification title.'
      );
      return null;
    }

    if (
      typeof message !== 'string' ||
      !message.trim()
    ) {
      console.warn(
        '[Notification] Missing notification message.'
      );
      return null;
    }

    const notification =
      await Notification.create({
        recipientId:
          normalizedRecipientId,
        senderId:
          senderId
            ? normalizeId(senderId)
            : undefined,
        title: title.trim(),
        message: message.trim(),
        type,
        data:
          data &&
          typeof data === 'object'
            ? data
            : {},
      });

    const io = safeGetIO();

    if (io) {
      io.to(
        `user:${normalizedRecipientId}`
      ).emit(
        'notification',
        notification
      );
    }

    return notification;
  } catch (error) {
    console.error(
      '[Notification] Error creating notification:',
      error.message
    );

    return null;
  }
};

/**
 * Donation lifecycle events
 */
const emitDonationCreated = (
  donation
) => {
  if (!donation?._id) {
    return;
  }

  const io = safeGetIO();

  if (!io) {
    return;
  }

  const donationId =
    normalizeId(donation._id);

  io.emit(
    'donation_created',
    {
      donationId,
      title: donation.title,
    }
  );

  io.to('role:ADMIN').emit(
    'admin_feed',
    {
      type: 'DONATION_CREATED',
      donation,
    }
  );
};

/**
 * Match proposed to NGO
 */
const emitMatchProposed = async (
  match,
  donation,
  ngoId
) => {
  if (
    !match?._id ||
    !donation?._id ||
    !ngoId
  ) {
    return;
  }

  const matchId =
    normalizeId(match._id);

  const donationId =
    normalizeId(donation._id);

  const normalizedNgoId =
    normalizeId(ngoId);

  const io = safeGetIO();

  if (io) {
    io.to(
      `user:${normalizedNgoId}`
    ).emit(
      'match_proposed',
      {
        matchId,
        donationId,
        matchScore:
          match.matchScore,
      }
    );

    io.to(
      `donation:${donationId}`
    ).emit(
      'match_proposed',
      {
        matchId,
      }
    );
  }

  await createAndSendNotification({
    recipientId: normalizedNgoId,
    title:
      'New Food Donation Proposed! 🍲',
    message:
      `A new surplus donation "${donation.title}" is waiting for your acceptance.`,
    type: 'MATCH',
    data: {
      donationId,
      matchId,
    },
  });
};

/**
 * Match accepted
 */
const emitMatchAccepted = async (
  match,
  donation
) => {
  if (
    !match?._id ||
    !match?.ngoId ||
    !donation?._id ||
    !donation?.donorId
  ) {
    return;
  }

  const matchId =
    normalizeId(match._id);

  const ngoId =
    normalizeId(match.ngoId);

  const donationId =
    normalizeId(donation._id);

  const donorId =
    normalizeId(donation.donorId);

  const io = safeGetIO();

  if (io) {
    io.to(
      `donation:${donationId}`
    ).emit(
      'match_accepted',
      {
        donationId,
        ngoId,
      }
    );

    io.to(
      `user:${donorId}`
    ).emit(
      'match_accepted',
      {
        donationId,
        ngoId,
      }
    );

    /*
     * Drivers receive availability updates.
     * The actual claim endpoint must still perform
     * atomic authorization/availability checks.
     */
    io.to('role:DRIVER').emit(
      'delivery_available',
      {
        donationId,
        pickupLocation:
          donation.pickupLocation,
      }
    );
  }

  await createAndSendNotification({
    recipientId: donorId,
    title:
      'Match Accepted! 🎉',
    message:
      'A shelter has accepted your surplus donation. A driver will be assigned shortly.',
    type: 'MATCH',
    data: {
      donationId,
      matchId,
    },
  });
};

/**
 * Match declined
 */
const emitMatchDeclined = (
  match,
  donation
) => {
  if (
    !match?._id ||
    !match?.ngoId ||
    !donation?._id
  ) {
    return;
  }

  const io = safeGetIO();

  if (!io) {
    return;
  }

  io.to(
    `donation:${normalizeId(
      donation._id
    )}`
  ).emit(
    'match_declined',
    {
      donationId:
        normalizeId(
          donation._id
        ),
      ngoId:
        normalizeId(
          match.ngoId
        ),
    }
  );
};

/**
 * Driver assigned to delivery
 */
const emitDriverAssigned = async (
  delivery,
  donation
) => {
  if (
    !delivery?._id ||
    !delivery?.driverId ||
    !donation?._id ||
    !donation?.donorId ||
    !donation?.matchedNgoId
  ) {
    return;
  }

  const deliveryId =
    normalizeId(delivery._id);

  const driverId =
    normalizeId(delivery.driverId);

  const donationId =
    normalizeId(donation._id);

  const donorId =
    normalizeId(donation.donorId);

  const ngoId =
    normalizeId(donation.matchedNgoId);

  const io = safeGetIO();

  if (io) {
    const payload = {
      deliveryId,
      driverId,
      donationId,
    };

    io.to(
      `donation:${donationId}`
    ).emit(
      'driver_assigned',
      payload
    );

    io.to(
      `user:${donorId}`
    ).emit(
      'driver_assigned',
      payload
    );

    io.to(
      `user:${ngoId}`
    ).emit(
      'driver_assigned',
      payload
    );
  }

  await createAndSendNotification({
    recipientId: donorId,
    title: 'Driver Assigned 🚚',
    message:
      'A driver is heading to pick up your surplus donation.',
    type: 'DELIVERY',
    data: {
      donationId,
      deliveryId,
    },
  });

  await createAndSendNotification({
    recipientId: ngoId,
    title: 'Driver Assigned 🚚',
    message:
      'A driver has claimed the rescue transport for your accepted donation.',
    type: 'DELIVERY',
    data: {
      donationId,
      deliveryId,
    },
  });
};

/**
 * Driver en-route event
 */
const emitDriverEnRoute = (
  delivery,
  stage,
  donationId
) => {
  if (!delivery?._id || !donationId) {
    return;
  }

  const io = safeGetIO();

  if (!io) {
    return;
  }

  io.to(
    `donation:${normalizeId(
      donationId
    )}`
  ).emit(
    'driver_en_route',
    {
      deliveryId:
        normalizeId(
          delivery._id
        ),
      stage,
      status:
        delivery.status,
    }
  );
};

/**
 * Driver arrived event
 */
const emitDriverArrived = (
  delivery,
  stage,
  donationId
) => {
  if (!delivery?._id || !donationId) {
    return;
  }

  const io = safeGetIO();

  if (!io) {
    return;
  }

  io.to(
    `donation:${normalizeId(
      donationId
    )}`
  ).emit(
    'driver_arrived',
    {
      deliveryId:
        normalizeId(
          delivery._id
        ),
      stage,
      status:
        delivery.status,
    }
  );
};

/**
 * Pickup confirmed
 */
const emitPickupConfirmed = async (
  delivery,
  donation
) => {
  if (
    !delivery?._id ||
    !donation?._id ||
    !donation?.matchedNgoId
  ) {
    return;
  }

  const deliveryId =
    normalizeId(delivery._id);

  const donationId =
    normalizeId(donation._id);

  const ngoId =
    normalizeId(donation.matchedNgoId);

  const io = safeGetIO();

  if (io) {
    io.to(
      `donation:${donationId}`
    ).emit(
      'pickup_confirmed',
      {
        deliveryId,
        donationId,
      }
    );
  }

  await createAndSendNotification({
    recipientId: ngoId,
    title:
      'Food Picked Up! 📦',
    message:
      'The driver has picked up the food from the donor and is heading your way.',
    type: 'DELIVERY',
    data: {
      donationId,
      deliveryId,
    },
  });
};

/**
 * Delivery entered transit
 */
const emitDeliveryInTransit = (
  delivery,
  donation
) => {
  if (
    !delivery?._id ||
    !donation?._id
  ) {
    return;
  }

  const io = safeGetIO();

  if (!io) {
    return;
  }

  io.to(
    `donation:${normalizeId(
      donation._id
    )}`
  ).emit(
    'delivery_in_transit',
    {
      deliveryId:
        normalizeId(
          delivery._id
        ),
      donationId:
        normalizeId(
          donation._id
        ),
    }
  );
};

/**
 * Delivery completed
 */
const emitDeliveryCompleted = async (
  delivery,
  donation
) => {
  if (
    !delivery?._id ||
    !donation?._id ||
    !donation?.donorId ||
    !donation?.matchedNgoId
  ) {
    return;
  }

  const deliveryId =
    normalizeId(delivery._id);

  const donationId =
    normalizeId(donation._id);

  const donorId =
    normalizeId(donation.donorId);

  const ngoId =
    normalizeId(donation.matchedNgoId);

  const io = safeGetIO();

  if (io) {
    io.to(
      `donation:${donationId}`
    ).emit(
      'delivery_completed',
      {
        deliveryId,
        donationId,
      }
    );

    io.to('role:ADMIN').emit(
      'admin_feed',
      {
        type:
          'DELIVERY_COMPLETED',
        delivery,
        donation,
      }
    );
  }

  await createAndSendNotification({
    recipientId: donorId,
    title:
      'Food Delivered! 💚',
    message:
      `Your donation "${donation.title}" has been successfully delivered to the shelter!`,
    type: 'DELIVERY',
    data: {
      donationId,
      deliveryId,
    },
  });

  await createAndSendNotification({
    recipientId: ngoId,
    title:
      'Delivery Arrived! 📦',
    message:
      'The driver has completed delivery. Please verify and confirm receipt.',
    type: 'DELIVERY',
    data: {
      donationId,
      deliveryId,
    },
  });
};

/**
 * Delivery verified by NGO/admin
 */
const emitDeliveryVerified = async (
  delivery,
  donation
) => {
  if (
    !delivery?._id ||
    !delivery?.driverId ||
    !donation?._id
  ) {
    return;
  }

  const deliveryId =
    normalizeId(delivery._id);

  const donationId =
    normalizeId(donation._id);

  const driverId =
    normalizeId(delivery.driverId);

  const io = safeGetIO();

  if (io) {
    io.to(
      `donation:${donationId}`
    ).emit(
      'delivery_verified',
      {
        deliveryId,
        donationId,
      }
    );
  }

  await createAndSendNotification({
    recipientId: driverId,
    title:
      'Delivery Verified ⭐',
    message:
      'The shelter has verified your delivery. Thank you for rescuing food!',
    type: 'DELIVERY',
    data: {
      donationId,
      deliveryId,
    },
  });
};

/**
 * Donation nearing expiry
 */
const emitDonationExpiring = async (
  donation
) => {
  if (
    !donation?._id ||
    !donation?.donorId
  ) {
    return;
  }

  const donationId =
    normalizeId(donation._id);

  const donorId =
    normalizeId(donation.donorId);

  const io = safeGetIO();

  if (io) {
    io.to(
      `donation:${donationId}`
    ).emit(
      'donation_expiring',
      {
        donationId,
        expiryTime:
          donation.perishability
            ?.expiryTime,
      }
    );
  }

  await createAndSendNotification({
    recipientId: donorId,
    title:
      'Donation Expiring Soon ⏰',
    message:
      `Your donation "${donation.title}" has less than 1 hour remaining before expiry.`,
    type: 'URGENCY',
    data: {
      donationId,
    },
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