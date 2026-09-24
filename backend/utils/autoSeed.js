const bcrypt = require('bcrypt');

const User = require('../models/User');
const Donation = require('../models/Donation');
const Delivery = require('../models/Delivery');
const ImpactLog = require('../models/ImpactLog');

const getDemoCoordinates = () => {
  const longitude = Number(
    process.env.DEMO_LONGITUDE
  );

  const latitude = Number(
    process.env.DEMO_LATITUDE
  );

  /*
   * Explicit demo coordinates are optional.
   *
   * These defaults are only used for intentional local
   * demo seed data, never as application/business fallbacks.
   */
  if (
    Number.isFinite(longitude) &&
    Number.isFinite(latitude) &&
    longitude >= -180 &&
    longitude <= 180 &&
    latitude >= -90 &&
    latitude <= 90
  ) {
    return {
      longitude,
      latitude,
    };
  }

  return {
    longitude: 77.209,
    latitude: 28.6139,
  };
};

const autoSeedIfEmpty = async () => {
  try {
    const userCount =
      await User.countDocuments();

    if (userCount > 0) {
      console.log(
        'ℹ️ Database already contains users. Skipping demo seed.'
      );

      return;
    }

    if (
      process.env.NODE_ENV === 'production' &&
      process.env.ALLOW_DEMO_SEED !== 'true'
    ) {
      console.log(
        'ℹ️ Production environment detected. Demo seed disabled.'
      );

      return;
    }

    console.log(
      '🌱 Database is empty. Seeding initial demo accounts...'
    );

    const demoPassword =
      process.env.DEMO_PASSWORD ||
      'password123';

    if (
      typeof demoPassword !== 'string' ||
      demoPassword.length < 8
    ) {
      throw new Error(
        'DEMO_PASSWORD must contain at least 8 characters.'
      );
    }

    const passwordHash =
      await bcrypt.hash(
        demoPassword,
        10
      );

    const {
      longitude,
      latitude,
    } = getDemoCoordinates();

    /*
     * Slightly separated demo locations allow the
     * matching/routing system to calculate meaningful
     * distances.
     */
    const donorCoordinates = [
      longitude,
      latitude,
    ];

    const ngoOneCoordinates = [
      longitude + 0.009,
      latitude + 0.011,
    ];

    const ngoTwoCoordinates = [
      longitude + 0.026,
      latitude + 0.024,
    ];

    const driverCoordinates = [
      longitude + 0.003,
      latitude + 0.004,
    ];

    /*
     * 1. DONOR
     */
    const donor = await User.create({
      name: 'Golden Oak Bistro',
      email: 'donor@example.com',
      passwordHash,
      role: 'DONOR',
      phone: '+1 555-0192',
      isVerified: true,

      location: {
        type: 'Point',
        coordinates: donorCoordinates,
      },

      address: {
        street: '14 Gourmet Avenue',
        city: 'Demo City',
        formattedAddress:
          '14 Gourmet Avenue, Demo City',
      },

      donorProfile: {
        organizationType: 'RESTAURANT',
        licenseNumber: 'DEMO-FSSAI-994821',
      },
    });

    /*
     * 2. PRIMARY NGO
     */
    const ngo = await User.create({
      name: 'Hope Haven Community Kitchen',
      email: 'ngo@example.com',
      passwordHash,
      role: 'NGO',
      phone: '+1 555-0188',
      isVerified: true,

      location: {
        type: 'Point',
        coordinates: ngoOneCoordinates,
      },

      address: {
        street: '42 Shelter Lane',
        city: 'Demo City',
        formattedAddress:
          '42 Shelter Lane, Demo City',
      },

      ngoProfile: {
        registrationNumber:
          'DEMO-NGO-2023-441',

        capacityDailyMeals: 150,
        allocatedCapacity: 0,

        storageFacilities: {
          hasRefrigeration: true,
          hasFreezer: false,
          dryStorageAvailable: true,
        },

        acceptedFoodTypes: [
          'COOKED_MEALS',
          'RAW_PRODUCE',
          'PACKAGED_FOOD',
          'BAKERY',
        ],

        dietaryRestrictionsAccepted: [
          'VEG',
          'ANY',
        ],
      },
    });

    /*
     * 3. SECONDARY NGO
     */
    await User.create({
      name: 'Grace Children Shelter',
      email: 'grace@example.com',
      passwordHash,
      role: 'NGO',
      phone: '+1 555-0144',
      isVerified: true,

      location: {
        type: 'Point',
        coordinates: ngoTwoCoordinates,
      },

      address: {
        street: '88 Mercy Road',
        city: 'Demo City',
        formattedAddress:
          '88 Mercy Road, Demo City',
      },

      ngoProfile: {
        registrationNumber:
          'DEMO-NGO-2022-819',

        capacityDailyMeals: 80,
        allocatedCapacity: 0,

        storageFacilities: {
          hasRefrigeration: true,
          hasFreezer: false,
          dryStorageAvailable: true,
        },

        acceptedFoodTypes: [
          'COOKED_MEALS',
          'BAKERY',
        ],

        dietaryRestrictionsAccepted: [
          'VEG',
          'NON_VEG',
          'ANY',
        ],
      },
    });

    /*
     * 4. DRIVER
     */
    const driver = await User.create({
      name: 'Alex Rivera (Courier)',
      email: 'driver@example.com',
      passwordHash,
      role: 'DRIVER',
      phone: '+1 555-0122',
      isVerified: true,

      location: {
        type: 'Point',
        coordinates: driverCoordinates,
      },

      address: {
        formattedAddress:
          'Demo Driver Hub',
      },

      driverProfile: {
        vehicleType: 'CAR',
        licenseNumber: 'DEMO-DL-04-2021-998',
        isAvailable: true,
        activeDeliveryId: null,

        currentLocation: {
          type: 'Point',
          coordinates: driverCoordinates,
        },
      },
    });

    /*
     * 5. ADMIN
     *
     * Admin registration is intentionally not available
     * through the public auth endpoint, so the local seed
     * is the appropriate way to create the demo admin.
     */
    await User.create({
      name: 'System Admin',
      email: 'admin@example.com',
      passwordHash,
      role: 'ADMIN',
      phone: '+1 555-0100',
      isVerified: true,

      location: {
        type: 'Point',
        coordinates: donorCoordinates,
      },

      address: {
        formattedAddress:
          'Surplus-to-Shelter Operations HQ',
      },
    });

    /*
     * -----------------------------------------------------
     * Seed one completed rescue for dashboard/analytics data.
     * -----------------------------------------------------
     */

    const completedAt = new Date(
      Date.now() - 2 * 60 * 60 * 1000
    );

    const preparedAt = new Date(
      completedAt.getTime() -
        60 * 60 * 1000
    );

    /*
     * Give the historical donation an expiry before now.
     * This represents an already-completed rescue rather
     * than an active donation.
     */
    const expiryTime = new Date(
      completedAt.getTime() -
        30 * 60 * 1000
    );

    /*
     * Create the donation first because Delivery and
     * ImpactLog reference it.
     */
    const pastDonation =
      await Donation.create({
        donorId: donor._id,

        title:
          'Buffet Excess - Biryani & Dal Makhani',

        description:
          'Hygienically packed surplus meals from a corporate lunch buffet.',

        foodType: 'COOKED_MEALS',

        dietaryPreference: 'VEG',

        quantity: {
          amount: 35,
          unit: 'SERVINGS',
          estimatedServings: 35,
          estimatedWeightKg: 15,
        },

        perishability: {
          preparedAt,
          expiryTime,
          requiresColdChain: false,
        },

        pickupLocation: {
          address:
            '14 Gourmet Avenue, Demo City',

          contactPhone:
            '+1 555-0192',

          location: {
            type: 'Point',
            coordinates:
              donorCoordinates,
          },
        },

        status: 'VERIFIED',

        matchedNgoId: ngo._id,

        assignedDriverId:
          driver._id,

        pickupOtp: '4821',
        deliveryOtp: '7392',
      });

    /*
     * Create the corresponding completed Delivery.
     *
     * This keeps Donation, Delivery and ImpactLog
     * consistent with one another.
     */
    const delivery =
      await Delivery.create({
        donationId:
          pastDonation._id,

        driverId:
          driver._id,

        donorId:
          donor._id,

        ngoId:
          ngo._id,

        status: 'VERIFIED',

        pickupCoords:
          donorCoordinates,

        dropoffCoords:
          ngoOneCoordinates,

        routeSummary: {
          distanceKm: 1.5,
          durationMinutes: 6,
        },

        currentLocation:
          ngoOneCoordinates,

        breadcrumbs: [
          {
            coordinates:
              donorCoordinates,
            timestamp:
              new Date(
                completedAt.getTime() -
                  20 * 60 * 1000
              ),
          },
          {
            coordinates:
              ngoOneCoordinates,
            timestamp:
              completedAt,
          },
        ],

        pickupConfirmedAt:
          new Date(
            completedAt.getTime() -
              15 * 60 * 1000
          ),

        deliveredConfirmedAt:
          completedAt,

        proofOfDelivery: {
          photoUrl: null,
          ngoFeedbackNote:
            'Demo delivery successfully completed.',
          foodConditionRating: 5,
        },
      });

    /*
     * Link the completed delivery to the donation.
     */
    await Donation.updateOne(
      {
        _id: pastDonation._id,
      },
      {
        $set: {
          activeDeliveryId:
            delivery._id,
        },
      }
    );

    /*
     * Driver should not have an active delivery after
     * the historical rescue has been completed.
     */
    await User.updateOne(
      {
        _id: driver._id,
      },
      {
        $set: {
          'driverProfile.activeDeliveryId':
            null,

          'driverProfile.isAvailable':
            true,
        },
      }
    );

    /*
     * The completed rescue has already consumed NGO
     * capacity historically, but the current allocation
     * should be zero because the delivery is complete.
     */
    await User.updateOne(
      {
        _id: ngo._id,
      },
      {
        $set: {
          'ngoProfile.allocatedCapacity':
            0,
        },
      }
    );

    /*
     * Create exactly one impact record for the completed
     * donation.
     */
    await ImpactLog.create({
      donationId:
        pastDonation._id,

      donorId:
        donor._id,

      ngoId:
        ngo._id,

      driverId:
        driver._id,

      mealsRescued: 35,

      weightKgSaved: 15,

      co2PreventedKg: 37.5,

      completedAt,
    });

    console.log(
      '✅ Demo accounts, completed delivery, and initial impact data ready!'
    );
  } catch (error) {
    console.error(
      '❌ Error auto-seeding database:',
      error
    );

    /*
     * Do not silently hide seed failures.
     *
     * Re-throwing lets the application startup decide
     * whether a failed seed should prevent startup.
     */
    throw error;
  }
};

module.exports = {
  autoSeedIfEmpty,
};