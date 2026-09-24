require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const User = require('./models/User');
const Donation = require('./models/Donation');
const Match = require('./models/Match');
const Delivery = require('./models/Delivery');
const ImpactLog = require('./models/ImpactLog');
const connectDB = require('./config/db');

const seedData = async () => {
  try {
    await connectDB();

    console.log('🧹 Clearing previous seed data...');
    await User.deleteMany({});
    await Donation.deleteMany({});
    await Match.deleteMany({});
    await Delivery.deleteMany({});
    await ImpactLog.deleteMany({});

    console.log('🌱 Seeding demo users...');
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash('password123', salt);

    // 1. Donor
    const donor = await User.create({
      name: 'Golden Oak Bistro',
      email: 'donor@example.com',
      passwordHash,
      role: 'DONOR',
      phone: '+1 555-0192',
      isVerified: true,
      location: { type: 'Point', coordinates: [77.209, 28.6139] },
      address: {
        street: '14 Gourmet Avenue',
        city: 'New Delhi',
        formattedAddress: '14 Gourmet Avenue, Connaught Place',
      },
      donorProfile: {
        organizationType: 'RESTAURANT',
        licenseNumber: 'FSSAI-994821',
      },
    });

    // 2. NGO #1 (Primary)
    const ngo = await User.create({
      name: 'Hope Haven Community Kitchen',
      email: 'ngo@example.com',
      passwordHash,
      role: 'NGO',
      phone: '+1 555-0188',
      isVerified: true,
      location: { type: 'Point', coordinates: [77.218, 28.625] }, // ~1.5 km away
      address: {
        street: '42 Shelter Lane',
        city: 'New Delhi',
        formattedAddress: '42 Shelter Lane, Central District',
      },
      ngoProfile: {
        registrationNumber: 'NGO-DEL-2023-441',
        capacityDailyMeals: 150,
        storageFacilities: { hasRefrigeration: true, dryStorageAvailable: true },
        acceptedFoodTypes: ['COOKED_MEALS', 'RAW_PRODUCE', 'PACKAGED_FOOD', 'BAKERY'],
      },
    });

    // 3. NGO #2 (Secondary fallback)
    const ngo2 = await User.create({
      name: 'Grace Children Shelter',
      email: 'grace@example.com',
      passwordHash,
      role: 'NGO',
      phone: '+1 555-0144',
      isVerified: true,
      location: { type: 'Point', coordinates: [77.235, 28.638] }, // ~3.5 km away
      address: {
        street: '88 Mercy Road',
        city: 'New Delhi',
        formattedAddress: '88 Mercy Road, North Extension',
      },
      ngoProfile: {
        registrationNumber: 'NGO-DEL-2022-819',
        capacityDailyMeals: 80,
        storageFacilities: { hasRefrigeration: true },
        acceptedFoodTypes: ['COOKED_MEALS', 'BAKERY'],
      },
    });

    // 4. Driver
    const driver = await User.create({
      name: 'Alex Rivera (Courier)',
      email: 'driver@example.com',
      passwordHash,
      role: 'DRIVER',
      phone: '+1 555-0122',
      isVerified: true,
      location: { type: 'Point', coordinates: [77.212, 28.618] },
      address: { formattedAddress: 'City Mobile Driver Hub' },
      driverProfile: {
        vehicleType: 'CAR',
        licenseNumber: 'DL-04-2021-998',
        isAvailable: true,
        currentLocation: { type: 'Point', coordinates: [77.212, 28.618] },
      },
    });

    // 5. Admin
    const admin = await User.create({
      name: 'System Admin',
      email: 'admin@example.com',
      passwordHash,
      role: 'ADMIN',
      phone: '+1 555-0100',
      isVerified: true,
      location: { type: 'Point', coordinates: [77.209, 28.6139] },
      address: { formattedAddress: 'Surplus-to-Shelter Operations HQ' },
    });

    console.log('✅ Demo users seeded successfully!');
    console.log('   DONOR : donor@example.com / password123');
    console.log('   NGO   : ngo@example.com   / password123');
    console.log('   DRIVER: driver@example.com/ password123');
    console.log('   ADMIN : admin@example.com / password123');

    // Create an initial completed rescue for impact telemetry demonstration
    const pastDonation = await Donation.create({
      donorId: donor._id,
      title: 'Surplus Lunch Buffet (Biryani & Paneer)',
      description: 'Freshly prepared lunch buffet excess, packed in hygienic insulated containers.',
      foodType: 'COOKED_MEALS',
      dietaryPreference: 'VEG',
      quantity: {
        amount: 40,
        unit: 'SERVINGS',
        estimatedServings: 40,
        estimatedWeightKg: 18,
      },
      perishability: {
        preparedAt: new Date(Date.now() - 4 * 60 * 60 * 1000),
        expiryTime: new Date(Date.now() + 2 * 60 * 60 * 1000),
        requiresColdChain: false,
      },
      pickupLocation: {
        address: '14 Gourmet Avenue, Connaught Place',
        contactPhone: '+1 555-0192',
        location: { type: 'Point', coordinates: [77.209, 28.6139] },
      },
      status: 'DELIVERED',
      matchedNgoId: ngo._id,
      assignedDriverId: driver._id,
      pickupOtp: '4821',
      deliveryOtp: '7392',
    });

    await ImpactLog.create({
      donationId: pastDonation._id,
      donorId: donor._id,
      ngoId: ngo._id,
      driverId: driver._id,
      mealsRescued: 40,
      weightKgSaved: 18,
      co2PreventedKg: 45,
      completedAt: new Date(Date.now() - 2 * 60 * 60 * 1000),
    });

    console.log('✅ Sample completed donation & impact log seeded!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Seeding failed:', error);
    process.exit(1);
  }
};

seedData();
