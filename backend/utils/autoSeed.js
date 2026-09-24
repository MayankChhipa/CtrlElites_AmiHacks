const bcrypt = require('bcrypt');
const User = require('../models/User');
const Donation = require('../models/Donation');
const ImpactLog = require('../models/ImpactLog');

const autoSeedIfEmpty = async () => {
  try {
    const userCount = await User.countDocuments();
    if (userCount > 0) {
      return; // Already populated
    }

    console.log('🌱 Database is empty. Seeding initial demo accounts...');
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
      location: { type: 'Point', coordinates: [77.218, 28.625] },
      address: {
        street: '42 Shelter Lane',
        city: 'New Delhi',
        formattedAddress: '42 Shelter Lane, Central District',
      },
      ngoProfile: {
        registrationNumber: 'NGO-DEL-2023-441',
        capacityDailyMeals: 150,
        allocatedCapacity: 0,
        storageFacilities: { hasRefrigeration: true, dryStorageAvailable: true },
        acceptedFoodTypes: ['COOKED_MEALS', 'RAW_PRODUCE', 'PACKAGED_FOOD', 'BAKERY'],
        dietaryRestrictionsAccepted: ['VEG', 'ANY'],
      },
    });

    // 3. NGO #2 (Secondary)
    await User.create({
      name: 'Grace Children Shelter',
      email: 'grace@example.com',
      passwordHash,
      role: 'NGO',
      phone: '+1 555-0144',
      isVerified: true,
      location: { type: 'Point', coordinates: [77.235, 28.638] },
      address: {
        street: '88 Mercy Road',
        city: 'New Delhi',
        formattedAddress: '88 Mercy Road, North Extension',
      },
      ngoProfile: {
        registrationNumber: 'NGO-DEL-2022-819',
        capacityDailyMeals: 80,
        allocatedCapacity: 0,
        storageFacilities: { hasRefrigeration: true },
        acceptedFoodTypes: ['COOKED_MEALS', 'BAKERY'],
        dietaryRestrictionsAccepted: ['VEG', 'NON_VEG', 'ANY'],
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
    await User.create({
      name: 'System Admin',
      email: 'admin@example.com',
      passwordHash,
      role: 'ADMIN',
      phone: '+1 555-0100',
      isVerified: true,
      location: { type: 'Point', coordinates: [77.209, 28.6139] },
      address: { formattedAddress: 'Surplus-to-Shelter Operations HQ' },
    });

    // Seed 1 past completed rescue for immediate impact counter display
    const pastDonation = await Donation.create({
      donorId: donor._id,
      title: 'Buffet Excess (Biryani & Dal Makhani)',
      description: 'Hygienically packed surplus meals from corporate lunch buffet.',
      foodType: 'COOKED_MEALS',
      dietaryPreference: 'VEG',
      quantity: {
        amount: 35,
        unit: 'SERVINGS',
        estimatedServings: 35,
        estimatedWeightKg: 15,
      },
      perishability: {
        preparedAt: new Date(Date.now() - 3 * 3600 * 1000),
        expiryTime: new Date(Date.now() + 2 * 3600 * 1000),
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
      mealsRescued: 35,
      weightKgSaved: 15,
      co2PreventedKg: 37.5,
      completedAt: new Date(Date.now() - 2 * 3600 * 1000),
    });

    console.log('✅ Demo accounts and initial impact data ready!');
  } catch (error) {
    console.error('Error auto-seeding:', error);
  }
};

module.exports = { autoSeedIfEmpty };
