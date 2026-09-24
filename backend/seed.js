require('dotenv').config();

const mongoose = require('mongoose');
const bcrypt = require('bcrypt');

const User = require('./models/User');
const Donation = require('./models/Donation');
const Delivery = require('./models/Delivery');
const ImpactLog = require('./models/ImpactLog');

const connectDB = require('./config/db');

const getDemoCoordinates = () => {
  const longitude = Number(
    process.env.DEMO_LONGITUDE ?? 77.209
  );

  const latitude = Number(
    process.env.DEMO_LATITUDE ?? 28.6139
  );

  if (
    !Number.isFinite(longitude) ||
    !Number.isFinite(latitude) ||
    longitude < -180 ||
    longitude > 180 ||
    latitude < -90 ||
    latitude > 90
  ) {
    throw new Error(
      'Invalid DEMO_LONGITUDE or DEMO_LATITUDE.'
    );
  }

  return [longitude, latitude];
};

const seedData = async () => {
  let shouldDisconnect = false;

  try {
    /*
     * Never allow this destructive seed to run accidentally
     * against a production database.
     */
    if (
      process.env.NODE_ENV === 'production' &&
      process.env.ALLOW_DEMO_SEED !== 'true'
    ) {
      throw new Error(
        'Demo seeding is disabled in production. Set ALLOW_DEMO_SEED=true only if you intentionally want to run it.'
      );
    }

    await connectDB();
    shouldDisconnect = true;

    const demoCoordinates =
      getDemoCoordinates();

    const demoPassword =
      process.env.DEMO_PASSWORD ||
      'password123';

    if (demoPassword.length < 8) {
      throw new Error(
        'DEMO_PASSWORD must contain at least 8 characters.'
      );
    }

    console.log(
      '🧹 Clearing previous seed data...'
    );

    /*
     * Delete dependent records first.
     * This keeps the seed deterministic and avoids
     * stale references between collections.
     */
    await ImpactLog.deleteMany({});
    await Delivery.deleteMany({});
    await Donation.deleteMany({});
    await User.deleteMany({});

    console.log(
      '🌱 Seeding demo users...'
    );

    const passwordHash =
      await bcrypt.hash(
        demoPassword,
        10
      );

    /*
     * 1. Donor
     */
    const donor =
      await User.create({
        name:
          'Golden Oak Bistro',
        email:
          'donor@example.com',
        passwordHash,
        role: 'DONOR',
        phone:
          '+1 555-0192',
        isVerified: true,

        location: {
          type: 'Point',
          coordinates:
            demoCoordinates,
        },

        address: {
          street:
            '14 Gourmet Avenue',
          city:
            'Demo City',
          formattedAddress:
            '14 Gourmet Avenue, Demo City',
        },

        donorProfile: {
          organizationType:
            'RESTAURANT',
          licenseNumber:
            'DEMO-FSSAI-994821',
        },
      });

    /*
     * 2. NGO #1 — primary
     */
    const ngo =
      await User.create({
        name:
          'Hope Haven Community Kitchen',
        email:
          'ngo@example.com',
        passwordHash,
        role: 'NGO',
        phone:
          '+1 555-0188',
        isVerified: true,

        location: {
          type: 'Point',
          coordinates: [
            demoCoordinates[0] + 0.009,
            demoCoordinates[1] + 0.011,
          ],
        },

        address: {
          street:
            '42 Shelter Lane',
          city:
            'Demo City',
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
            'VEGAN',
          ],
        },
      });

    /*
     * 3. NGO #2 — secondary
     */
    const ngo2 =
      await User.create({
        name:
          'Grace Children Shelter',
        email:
          'grace@example.com',
        passwordHash,
        role: 'NGO',
        phone:
          '+1 555-0144',
        isVerified: true,

        location: {
          type: 'Point',
          coordinates: [
            demoCoordinates[0] + 0.026,
            demoCoordinates[1] + 0.024,
          ],
        },

        address: {
          street:
            '88 Mercy Road',
          city:
            'Demo City',
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
          ],
        },
      });

    /*
     * 4. Driver
     */
    const driver =
      await User.create({
        name:
          'Alex Rivera (Courier)',
        email:
          'driver@example.com',
        passwordHash,
        role: 'DRIVER',
        phone:
          '+1 555-0122',
        isVerified: true,

        location: {
          type: 'Point',
          coordinates: [
            demoCoordinates[0] + 0.003,
            demoCoordinates[1] + 0.004,
          ],
        },

        address: {
          formattedAddress:
            'Demo Driver Hub',
        },

        driverProfile: {
          vehicleType:
            'CAR',
          licenseNumber:
            'DEMO-DL-04-2021-998',
          isAvailable: true,
          activeDeliveryId: null,

          currentLocation: {
            type: 'Point',
            coordinates: [
              demoCoordinates[0] + 0.003,
              demoCoordinates[1] + 0.004,
            ],
          },
        },
      });

    /*
     * 5. Admin
     */
    const admin =
      await User.create({
        name:
          'System Admin',
        email:
          'admin@example.com',
        passwordHash,
        role: 'ADMIN',
        phone:
          '+1 555-0100',
        isVerified: true,

        location: {
          type: 'Point',
          coordinates:
            demoCoordinates,
        },

        address: {
          formattedAddress:
            'Surplus-to-Shelter Operations HQ',
        },
      });

    console.log(
      '✅ Demo users seeded successfully!'
    );

    console.log(
      `   DONOR : donor@example.com / ${demoPassword}`
    );

    console.log(
      `   NGO   : ngo@example.com   / ${demoPassword}`
    );

    console.log(
      `   NGO 2 : grace@example.com / ${demoPassword}`
    );

    console.log(
      `   DRIVER: driver@example.com / ${demoPassword}`
    );

    console.log(
      `   ADMIN : admin@example.com  / ${demoPassword}`
    );

    /*
     * ----------------------------------------------------
     * Historical completed rescue
     * ----------------------------------------------------
     */

    const completedAt =
      new Date(
        Date.now() -
          2 * 60 * 60 * 1000
      );

    const preparedAt =
      new Date(
        completedAt.getTime() -
          2 * 60 * 60 * 1000
      );

    /*
     * The donation is historical, so its expiry must
     * already be in the past.
     */
    const expiryTime =
      new Date(
        completedAt.getTime() -
          30 * 60 * 1000
      );

    console.log(
      '🌱 Seeding completed rescue...'
    );

    const pastDonation =
      await Donation.create({
        donorId:
          donor._id,

        title:
          'Surplus Lunch Buffet (Biryani & Paneer)',

        description:
          'Freshly prepared lunch buffet excess, packed in hygienic insulated containers.',

        foodType:
          'COOKED_MEALS',

        dietaryPreference:
          'VEG',

        quantity: {
          amount: 40,
          unit: 'SERVINGS',
          estimatedServings: 40,
          estimatedWeightKg: 18,
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
          instructions:
            'Historical demo pickup location.',

          location: {
            type: 'Point',
            coordinates:
              demoCoordinates,
          },
        },

        status:
          'DELIVERED',

        matchedNgoId:
          ngo._id,

        assignedDriverId:
          driver._id,

        /*
         * These credentials are deliberately omitted
         * because this rescue is already completed.
         */
      });

    /*
     * Delivery associated with the completed donation.
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

        status:
          'VERIFIED',

        pickupCoords:
          demoCoordinates,

        dropoffCoords: [
          demoCoordinates[0] + 0.009,
          demoCoordinates[1] + 0.011,
        ],

        routeSummary: {
          distanceKm: 1.5,
          durationMinutes: 8,
          encodedGeometry: '',
          geojson: {
            type: 'LineString',
            coordinates: [
              demoCoordinates,
              [
                demoCoordinates[0] + 0.009,
                demoCoordinates[1] + 0.011,
              ],
            ],
          },
        },

        currentLocation: {
          type: 'Point',
          coordinates: [
            demoCoordinates[0] + 0.009,
            demoCoordinates[1] + 0.011,
          ],
        },

        breadcrumbs: [
          {
            coordinates:
              demoCoordinates,
            timestamp:
              new Date(
                completedAt.getTime() -
                  45 * 60 * 1000
              ),
          },
          {
            coordinates: [
              demoCoordinates[0] + 0.004,
              demoCoordinates[1] + 0.005,
            ],
            timestamp:
              new Date(
                completedAt.getTime() -
                  25 * 60 * 1000
              ),
          },
          {
            coordinates: [
              demoCoordinates[0] + 0.009,
              demoCoordinates[1] + 0.011,
            ],
            timestamp:
              completedAt,
          },
        ],

        pickupConfirmedAt:
          new Date(
            completedAt.getTime() -
              45 * 60 * 1000
          ),

        deliveredConfirmedAt:
          completedAt,

        proofOfDelivery: {
          ngoFeedbackNote:
            'Demo delivery verified successfully.',
          foodConditionRating: 5,
        },
      });

    /*
     * Link the donation to its delivery while it is
     * still in the historical delivery state.
     */
    await Donation.findByIdAndUpdate(
      pastDonation._id,
      {
        $set: {
          activeDeliveryId:
            delivery._id,
        },
      },
      {
        runValidators: true,
      }
    );

    /*
     * The final donation state is VERIFIED after the
     * NGO verification step.
     */
    await Donation.findByIdAndUpdate(
      pastDonation._id,
      {
        $set: {
          status: 'VERIFIED',
          activeDeliveryId: null,
        },
      },
      {
        runValidators: true,
      }
    );

    /*
     * The driver no longer has an active delivery.
     */
    await User.findByIdAndUpdate(
      driver._id,
      {
        $set: {
          'driverProfile.isAvailable':
            true,
          'driverProfile.activeDeliveryId':
            null,
        },
      },
      {
        runValidators: true,
      }
    );

    /*
     * Completed delivery should not consume the NGO's
     * currently allocated capacity.
     */
    await User.findByIdAndUpdate(
      ngo._id,
      {
        $set: {
          'ngoProfile.allocatedCapacity':
            0,
        },
      },
      {
        runValidators: true,
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

      mealsRescued:
        40,

      weightKgSaved:
        18,

      co2PreventedKg:
        45,

      completedAt,
    });

    console.log(
      '✅ Sample completed donation, delivery & impact log seeded!'
    );

    console.log(
      `   Donation : ${pastDonation._id}`
    );

    console.log(
      `   Delivery : ${delivery._id}`
    );

    console.log(
      `   Impact   : recorded`
    );

    console.log(
      '🎉 Database seed completed successfully.'
    );

    await mongoose.connection.close();

    console.log(
      '🔌 MongoDB connection closed.'
    );

    process.exit(0);
  } catch (error) {
    console.error(
      '❌ Seeding failed:',
      error
    );

    if (
      shouldDisconnect &&
      mongoose.connection.readyState !== 0
    ) {
      await mongoose.connection.close();
    }

    process.exit(1);
  }
};

seedData();