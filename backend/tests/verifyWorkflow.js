const assert = require('node:assert/strict');
const http = require('http');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const express = require('express');
const cors = require('cors');

const { initSocket } = require('../config/socket');
const authRoutes = require('../routes/authRoutes');
const donationRoutes = require('../routes/donationRoutes');
const matchRoutes = require('../routes/matchRoutes');
const deliveryRoutes = require('../routes/deliveryRoutes');
const analyticsRoutes = require('../routes/analyticsRoutes');
const notificationRoutes = require('../routes/notificationRoutes');
const adminRoutes = require('../routes/adminRoutes');
const { autoSeedIfEmpty } = require('../utils/autoSeed');
const Notification = require('../models/Notification');

async function runVerification() {
  console.log('🚀 [PHASE 2] Starting End-to-End Workflow Verification...');

  const mongod = await MongoMemoryServer.create();
  const uri = mongod.getUri();
  await mongoose.connect(uri);
  console.log('✅ In-memory database connected.');

  const app = express();
  const server = http.createServer(app);
  initSocket(server);

  app.use(cors());
  app.use(express.json());

  // Health
  app.get('/api/health', (req, res) => {
    res.status(200).json({ status: 'OK', message: 'Surplus-to-Shelter API running' });
  });

  app.use('/api/auth', authRoutes);
  app.use('/api/donations', donationRoutes);
  app.use('/api/matches', matchRoutes);
  app.use('/api/deliveries', deliveryRoutes);
  app.use('/api/analytics', analyticsRoutes);
  app.use('/api/notifications', notificationRoutes);
  app.use('/api/admin', adminRoutes);

  await autoSeedIfEmpty();
  console.log('✅ Demo accounts seeded successfully.');

  const port = await new Promise((resolve) => {
    server.listen(0, () => resolve(server.address().port));
  });
  const baseUrl = `http://localhost:${port}`;
  console.log(`✅ Server listening on ephemeral port ${port}`);

  try {
    // 1. Health endpoint test
    const resHealth = await fetch(`${baseUrl}/api/health`);
    assert.equal(resHealth.status, 200);
    const healthJson = await resHealth.json();
    assert.equal(healthJson.status, 'OK');
    console.log('✅ 1. Health check passed.');

    // 2. Login all 4 seeded roles
    console.log('🔑 2. Logging in seeded accounts...');
    
    // Donor Login
    const donorLoginRes = await fetch(`${baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'donor@example.com', password: 'password123' }),
    });
    assert.equal(donorLoginRes.status, 200);
    const donorData = await donorLoginRes.json();
    const donorToken = donorData.token;
    console.log('   ✓ DONOR login successful');

    // NGO Login
    const ngoLoginRes = await fetch(`${baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'ngo@example.com', password: 'password123' }),
    });
    assert.equal(ngoLoginRes.status, 200);
    const ngoData = await ngoLoginRes.json();
    const ngoToken = ngoData.token;
    console.log('   ✓ NGO login successful');

    // Driver Login
    const driverLoginRes = await fetch(`${baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'driver@example.com', password: 'password123' }),
    });
    assert.equal(driverLoginRes.status, 200);
    const driverData = await driverLoginRes.json();
    const driverToken = driverData.token;
    console.log('   ✓ DRIVER login successful');

    // Admin Login
    const adminLoginRes = await fetch(`${baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'admin@example.com', password: 'password123' }),
    });
    assert.equal(adminLoginRes.status, 200);
    const adminData = await adminLoginRes.json();
    const adminToken = adminData.token;
    console.log('   ✓ ADMIN login successful');

    // 3. Donor creates donation (3h expiry -> MEDIUM urgency)
    console.log('🍲 3. Donor creating fresh donation...');
    const createRes = await fetch(`${baseUrl}/api/donations`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${donorToken}`,
      },
      body: JSON.stringify({
        title: '50 Fresh Biryani & Vegetable Curry Meals',
        foodType: 'COOKED_MEALS',
        dietaryPreference: 'VEG',
        quantity: {
          amount: 50,
          unit: 'SERVINGS',
          estimatedServings: 50,
          estimatedWeightKg: 20,
        },
        perishability: {
          expiryHours: 3,
          requiresColdChain: false,
        },
        pickupLocation: {
          address: 'Connaught Place Grand Hotel',
          coordinates: [77.209, 28.6139],
        },
      }),
    });
    assert.equal(createRes.status, 201);
    const donJson = await createRes.json();
    assert.equal(donJson.success, true);
    assert.equal(donJson.donation.urgencyLevel, 'MEDIUM');
    assert.ok(donJson.donation.pickupOtp, 'Donor must receive pickupOtp');
    assert.equal(donJson.donation.deliveryOtp, undefined, 'Delivery OTP must be hidden from donor');

    const donationId = donJson.donation._id;
    const pickupOtp = donJson.donation.pickupOtp;
    console.log(`   ✓ Donation created with ID: ${donationId} (Urgency: MEDIUM)`);

    // 4. Eligible NGO receives proposal
    console.log('📋 4. Eligible NGO inspecting proposals...');
    const propRes = await fetch(`${baseUrl}/api/matches/proposals`, {
      headers: { Authorization: `Bearer ${ngoToken}` },
    });
    assert.equal(propRes.status, 200);
    const propJson = await propRes.json();
    const matchingProp = propJson.proposals.find((p) => p.donationId._id === donationId);
    assert.ok(matchingProp, 'NGO must find the proposal');
    assert.ok(matchingProp.matchScore >= 50, 'Match score should be calculated');
    console.log(`   ✓ Proposal received with Match Score: ${matchingProp.matchScore}%`);
    console.log('     Score breakdown:', matchingProp.scoreBreakdown);

    // 5. NGO accepts proposal
    console.log('🤝 5. NGO accepting proposal (Reserving capacity)...');
    const acceptRes = await fetch(`${baseUrl}/api/matches/${matchingProp._id}/accept`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${ngoToken}` },
    });
    assert.equal(acceptRes.status, 200);
    const acceptJson = await acceptRes.json();
    assert.equal(acceptJson.donation.status, 'MATCHED');
    assert.ok(acceptJson.donation.deliveryOtp, 'Matched NGO must receive deliveryOtp');
    const deliveryOtp = acceptJson.donation.deliveryOtp;
    console.log(`   ✓ Match accepted! Delivery OTP obtained for shelter: ${deliveryOtp}`);

    // Verify NGO capacity was reduced by 50 meals
    const capRes = await fetch(`${baseUrl}/api/matches/capacity`, {
      headers: { Authorization: `Bearer ${ngoToken}` },
    });
    const capJson = await capRes.json();
    assert.equal(capJson.allocatedCapacity, 50);
    assert.equal(capJson.availableCapacity, 100);
    console.log(`   ✓ NGO Capacity verified: ${capJson.availableCapacity} / ${capJson.capacityDailyMeals} available`);

    // 6. Driver claims delivery
    console.log('🚚 6. Driver claiming delivery...');
    const claimRes = await fetch(`${baseUrl}/api/deliveries/${donationId}/claim`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${driverToken}` },
    });
    assert.equal(claimRes.status, 201);
    const claimJson = await claimRes.json();
    assert.equal(claimJson.delivery.status, 'ASSIGNED');
    assert.equal(claimJson.donation.pickupOtp, undefined, 'Driver must NOT see pickup OTP');
    assert.equal(claimJson.donation.deliveryOtp, undefined, 'Driver must NOT see delivery OTP');
    const deliveryId = claimJson.delivery._id;
    console.log(`   ✓ Delivery claimed with ID: ${deliveryId}`);

    // 7. Driver starts route to pickup
    console.log('🗺️ 7. Driver updating status: EN_ROUTE_TO_PICKUP...');
    const enRoutePickupRes = await fetch(`${baseUrl}/api/deliveries/${deliveryId}/en-route-pickup`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${driverToken}` },
    });
    assert.equal(enRoutePickupRes.status, 200);

    // 8. Driver arrives at pickup
    console.log('📍 8. Driver updating status: ARRIVED_AT_PICKUP...');
    const arrivedPickupRes = await fetch(`${baseUrl}/api/deliveries/${deliveryId}/arrived-pickup`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${driverToken}` },
    });
    assert.equal(arrivedPickupRes.status, 200);

    // 9. Driver confirms pickup with OTP
    console.log('🔐 9. Driver confirming pickup with OTP...');
    const pickupRes = await fetch(`${baseUrl}/api/deliveries/${deliveryId}/pickup`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${driverToken}`,
      },
      body: JSON.stringify({ otp: pickupOtp }),
    });
    assert.equal(pickupRes.status, 200);
    const pickupJson = await pickupRes.json();
    assert.equal(pickupJson.delivery.status, 'PICKED_UP');
    console.log('   ✓ Pickup confirmed with valid OTP!');

    // 10. Driver starts route to NGO
    console.log('🛣️ 10. Driver updating status: EN_ROUTE_TO_DELIVERY...');
    const enRouteDeliveryRes = await fetch(`${baseUrl}/api/deliveries/${deliveryId}/en-route-delivery`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${driverToken}` },
    });
    assert.equal(enRouteDeliveryRes.status, 200);

    // 11. Driver arrives at shelter dropoff
    console.log('🏢 11. Driver updating status: ARRIVED_AT_DROPOFF...');
    const arrivedDropoffRes = await fetch(`${baseUrl}/api/deliveries/${deliveryId}/arrived-dropoff`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${driverToken}` },
    });
    assert.equal(arrivedDropoffRes.status, 200);

    // 12. Driver confirms delivery with OTP
    console.log('🏁 12. Driver confirming delivery with shelter Delivery OTP...');
    const deliverRes = await fetch(`${baseUrl}/api/deliveries/${deliveryId}/deliver`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${driverToken}`,
      },
      body: JSON.stringify({ otp: deliveryOtp, notes: 'Delivered in thermal carriers' }),
    });
    assert.equal(deliverRes.status, 200);
    const deliverJson = await deliverRes.json();
    assert.equal(deliverJson.delivery.status, 'DELIVERED');
    assert.equal(deliverJson.impact.mealsRescued, 50);
    console.log(`   ✓ Delivery confirmed! Meals rescued: ${deliverJson.impact.mealsRescued}, CO2 prevented: ${deliverJson.impact.co2PreventedKg}kg`);

    // 13. NGO verifies delivery
    console.log('⭐ 13. NGO verifying delivery & rating food condition...');
    const verifyRes = await fetch(`${baseUrl}/api/deliveries/${deliveryId}/verify`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${ngoToken}`,
      },
      body: JSON.stringify({ rating: 5, feedbackNote: 'High quality food received safely' }),
    });
    assert.equal(verifyRes.status, 200);
    const verifyJson = await verifyRes.json();
    assert.equal(verifyJson.donation.status, 'VERIFIED');
    console.log('   ✓ Delivery verified and completed by shelter!');

    // 14. Verify NGO capacity is released
    const capAfterRes = await fetch(`${baseUrl}/api/matches/capacity`, {
      headers: { Authorization: `Bearer ${ngoToken}` },
    });
    const capAfterJson = await capAfterRes.json();
    assert.equal(capAfterJson.allocatedCapacity, 0);
    assert.equal(capAfterJson.availableCapacity, 150);
    console.log('   ✓ NGO capacity released back to 150 available.');

    // 15. Check impact analytics
    console.log('📊 14. Checking platform impact analytics...');
    const analyticsRes = await fetch(`${baseUrl}/api/analytics/impact`);
    assert.equal(analyticsRes.status, 200);
    const analyticsJson = await analyticsRes.json();
    assert.ok(analyticsJson.impact.totalMealsRescued >= 85); // 35 seeded + 50 new
    assert.ok(analyticsJson.impact.totalCo2PreventedKg >= 80);
    console.log(`   ✓ Analytics verified: ${analyticsJson.impact.totalMealsRescued} total meals rescued`);

    // 16. Verify notifications were created
    console.log('🔔 15. Checking persistent notifications...');
    const notificationsCount = await Notification.countDocuments();
    assert.ok(notificationsCount > 0, 'Notifications must be stored in database');
    console.log(`   ✓ Stored notifications count: ${notificationsCount}`);

    // Check Donor's notifications
    const donorNotifsRes = await fetch(`${baseUrl}/api/notifications`, {
      headers: { Authorization: `Bearer ${donorToken}` },
    });
    const donorNotifsJson = await donorNotifsRes.json();
    assert.ok(donorNotifsJson.notifications.length > 0);
    console.log(`   ✓ Donor received ${donorNotifsJson.notifications.length} notification(s)`);

    console.log('\n==================================================');
    console.log('🎉 ALL BACKEND CHECKS AND END-TO-END WORKFLOWS PASSED!');
    console.log('==================================================\n');
  } finally {
    server.close();
    await mongoose.disconnect();
    await mongod.stop();
  }
}

runVerification().catch((err) => {
  console.error('❌ Verification failed:', err);
  process.exit(1);
});
