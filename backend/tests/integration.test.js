const test = require('node:test');
const assert = require('node:assert/strict');
const http = require('http');
const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const { MongoMemoryServer } = require('mongodb-memory-server');
const express = require('express');
const User = require('../models/User');
const { signToken } = require('../config/jwt');

// Import routes & config
const { initSocket } = require('../config/socket');
const authRoutes = require('../routes/authRoutes');
const donationRoutes = require('../routes/donationRoutes');
const matchRoutes = require('../routes/matchRoutes');
const deliveryRoutes = require('../routes/deliveryRoutes');
const analyticsRoutes = require('../routes/analyticsRoutes');
const notificationRoutes = require('../routes/notificationRoutes');
const adminRoutes = require('../routes/adminRoutes');
const uploadRoutes = require('../routes/uploadRoutes');
const { isConfigured: cloudinaryIsConfigured } = require('../config/cloudinary');

let mongod;
let server;
let baseUrl;

test.before(async () => {
  mongod = await MongoMemoryServer.create();
  const uri = mongod.getUri();
  await mongoose.connect(uri);

  const app = express();
  server = http.createServer(app);
  initSocket(server);

  app.use(express.json());
  app.use('/api/auth', authRoutes);
  app.use('/api/donations', donationRoutes);
  app.use('/api/matches', matchRoutes);
  app.use('/api/deliveries', deliveryRoutes);
  app.use('/api/analytics', analyticsRoutes);
  app.use('/api/notifications', notificationRoutes);
  app.use('/api/admin', adminRoutes);
  app.use('/api/upload', uploadRoutes);

  await new Promise((resolve) => {
    server.listen(0, () => {
      const port = server.address().port;
      baseUrl = `http://localhost:${port}`;
      resolve();
    });
  });
});

test.after(async () => {
  if (server) {
    await new Promise((resolve) => server.close(resolve));
  }
  await mongoose.disconnect();
  if (mongod) {
    await mongod.stop();
  }
});

let donorToken, ngoToken, ngo2Token, driverToken, driver2Token, adminToken;
let donorUser, ngoUser, ngo2User, driverUser, driver2User, adminUser;
let createdDonationId, proposalMatchId, createdDeliveryId;
let rematchDonationId, rematchMatchId, assignedDriverToken;
let pickupOtp, deliveryOtp;

test('Auth: Register and Login users with roles', async () => {
  // 1. Register Donor
  const resDonor = await fetch(`${baseUrl}/api/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: 'Test Bistro',
      email: 'donor_test@example.com',
      password: 'password123',
      role: 'DONOR',
      phone: '+1 555-1111',
      coordinates: [77.209, 28.6139],
    }),
  });
  const dataDonor = await resDonor.json();
  assert.equal(resDonor.status, 201);
  assert.ok(dataDonor.token);
  donorToken = dataDonor.token;
  donorUser = dataDonor.user;

  // 2. Register NGO 1
  const resNgo = await fetch(`${baseUrl}/api/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: 'Hope Kitchen',
      email: 'ngo_test@example.com',
      password: 'password123',
      role: 'NGO',
      phone: '+1 555-2222',
      coordinates: [77.215, 28.62],
      roleDetails: {
        capacityDailyMeals: 100,
        acceptedFoodTypes: ['COOKED_MEALS'],
        dietaryRestrictionsAccepted: ['VEG', 'ANY'],
      },
    }),
  });
  const dataNgo = await resNgo.json();
  assert.equal(resNgo.status, 201);
  ngoToken = dataNgo.token;
  ngoUser = dataNgo.user;

  // 3. Register NGO 2 (Fallback for re-matching test)
  const resNgo2 = await fetch(`${baseUrl}/api/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: 'Mercy Shelter',
      email: 'ngo2_test@example.com',
      password: 'password123',
      role: 'NGO',
      phone: '+1 555-3333',
      coordinates: [77.23, 28.63],
      roleDetails: {
        capacityDailyMeals: 80,
        acceptedFoodTypes: ['COOKED_MEALS'],
        dietaryRestrictionsAccepted: ['VEG', 'ANY'],
      },
    }),
  });
  const dataNgo2 = await resNgo2.json();
  assert.equal(resNgo2.status, 201);
  ngo2Token = dataNgo2.token;
  ngo2User = dataNgo2.user;

  // 4. Register Driver 1
  const resDriver = await fetch(`${baseUrl}/api/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: 'Speedy Driver',
      email: 'driver_test@example.com',
      password: 'password123',
      role: 'DRIVER',
      phone: '+1 555-4444',
      coordinates: [77.21, 28.615],
      roleDetails: {
        vehicleType: 'CAR',
        isAvailable: true,
      },
    }),
  });
  const dataDriver = await resDriver.json();
  assert.equal(resDriver.status, 201);
  driverToken = dataDriver.token;
  driverUser = dataDriver.user;

  // 5. Register Driver 2 (For race condition test)
  const resDriver2 = await fetch(`${baseUrl}/api/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: 'Second Driver',
      email: 'driver2_test@example.com',
      password: 'password123',
      role: 'DRIVER',
      phone: '+1 555-5555',
      coordinates: [77.21, 28.615],
      roleDetails: {
        vehicleType: 'BIKE',
        isAvailable: true,
      },
    }),
  });
  const dataDriver2 = await resDriver2.json();
  assert.equal(resDriver2.status, 201);
  driver2Token = dataDriver2.token;
  driver2User = dataDriver2.user;

  // 6. Provision Admin directly, as public admin registration is disabled.
  const adminPasswordHash = await bcrypt.hash('password123', 12);
  const adminDocument = await User.create({
    name: 'Platform Admin',
    email: 'admin_test@example.com',
    passwordHash: adminPasswordHash,
    role: 'ADMIN',
    phone: '+1 555-9999',
    isVerified: true,
    location: {
      type: 'Point',
      coordinates: [77.209, 28.6139],
    },
  });

  adminUser = {
    _id: adminDocument._id.toString(),
    role: adminDocument.role,
  };
  adminToken = signToken(adminDocument);

  // Verify partner accounts through the same admin workflow used by the app.
  for (const user of [ngoUser, ngo2User, driverUser, driver2User]) {
    const response = await fetch(
      `${baseUrl}/api/admin/users/${user._id}/verify`,
      {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${adminToken}`,
        },
        body: JSON.stringify({ isVerified: true }),
      }
    );

    assert.equal(response.status, 200);
  }

  // Public registration must not allow privilege escalation to ADMIN.
  const resAdmin = await fetch(`${baseUrl}/api/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: 'Platform Admin',
      email: 'admin_test@example.com',
      password: 'password123',
      role: 'ADMIN',
      phone: '+1 555-9999',
    }),
  });
  assert.equal(resAdmin.status, 400);

  // Test Login
  const resLogin = await fetch(`${baseUrl}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: 'donor_test@example.com',
      password: 'password123',
    }),
  });
  const dataLogin = await resLogin.json();
  assert.equal(resLogin.status, 200);
  assert.ok(dataLogin.token);
});

test('Auth: Protected routes and Role Authorization enforcement', async () => {
  // 1. Unauthenticated request to protected route
  const resNoAuth = await fetch(`${baseUrl}/api/donations/my`);
  assert.equal(resNoAuth.status, 401);

  // 2. Role restriction: Driver cannot create donation
  const resForbidden = await fetch(`${baseUrl}/api/donations`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${driverToken}`,
    },
    body: JSON.stringify({ title: 'Illegal' }),
  });
  assert.equal(resForbidden.status, 403);

  // 3. Admin-only route forbidden for Donor
  const resAdminForbidden = await fetch(`${baseUrl}/api/admin/users`, {
    headers: { Authorization: `Bearer ${donorToken}` },
  });
  assert.equal(resAdminForbidden.status, 403);

  // 4. Admin-only route allowed for Admin
  const resAdminAllowed = await fetch(`${baseUrl}/api/admin/users`, {
    headers: { Authorization: `Bearer ${adminToken}` },
  });
  assert.equal(resAdminAllowed.status, 200);
});

test('Donation: Creation, Urgency Calculation, and Matching', async () => {
  let images = [];

  // Avoid external Cloudinary calls in automated tests; exercise the local fallback.
  if (!cloudinaryIsConfigured) {
    const formData = new FormData();
    const onePixelPng = Buffer.from(
      'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/lXcAAAAASUVORK5CYII=',
      'base64'
    );
    formData.append(
      'image',
      new Blob([onePixelPng], { type: 'image/png' }),
      'donation.png'
    );

    const resUpload = await fetch(`${baseUrl}/api/upload`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${donorToken}` },
      body: formData,
    });
    const uploadData = await resUpload.json();
    assert.equal(resUpload.status, 200);
    assert.match(uploadData.url, /^data:image\/png;base64,/);
    images = [uploadData.url];
  }

  // Donor creates a donation with 3 hours expiry (MEDIUM urgency)
  const resDonation = await fetch(`${baseUrl}/api/donations`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${donorToken}`,
    },
    body: JSON.stringify({
      title: 'Surplus Fresh Rice and Curry',
      foodType: 'COOKED_MEALS',
      dietaryPreference: 'VEG',
      quantity: {
        amount: 25,
        unit: 'SERVINGS',
        estimatedServings: 25,
        estimatedWeightKg: 10,
      },
      perishability: {
        expiryHours: 3,
        requiresColdChain: false,
      },
      pickupLocation: {
        address: 'Downtown Kitchen',
        coordinates: [77.209, 28.6139],
      },
      images,
    }),
  });

  const data = await resDonation.json();
  assert.equal(resDonation.status, 201);
  assert.equal(data.success, true);
  assert.ok(data.donation._id);
  assert.equal(data.donation.urgencyLevel, 'MEDIUM');
  assert.ok(data.matchesFound > 0);

  // Check OTP security: Donor can see pickupOtp, but deliveryOtp must be hidden!
  assert.ok(data.donation.pickupOtp);
  assert.equal(data.donation.deliveryOtp, undefined);

  createdDonationId = data.donation._id;
  pickupOtp = data.donation.pickupOtp;

  // Donor dashboard list and tracking detail must return saved map/image data.
  const resMyDonations = await fetch(`${baseUrl}/api/donations/my`, {
    headers: { Authorization: `Bearer ${donorToken}` },
  });
  const myDonationsData = await resMyDonations.json();
  assert.equal(resMyDonations.status, 200);
  const listedDonation = myDonationsData.donations.find(
    (item) => item._id.toString() === createdDonationId.toString()
  );
  assert.ok(listedDonation);
  assert.deepEqual(
    listedDonation.pickupLocation.location.coordinates,
    [77.209, 28.6139]
  );
  assert.deepEqual(listedDonation.images, images);

  const resDonationDetail = await fetch(
    `${baseUrl}/api/donations/${createdDonationId}`,
    { headers: { Authorization: `Bearer ${donorToken}` } }
  );
  const detailData = await resDonationDetail.json();
  assert.equal(resDonationDetail.status, 200);
  assert.equal(detailData.donation._id.toString(), createdDonationId.toString());
  assert.equal(detailData.donation.urgencyLevel, 'MEDIUM');
});

test('Matching: NGO Proposals, Breakdown, and Capacity', async () => {
  // NGO 1 checks proposals
  const resProp = await fetch(`${baseUrl}/api/matches/proposals`, {
    headers: { Authorization: `Bearer ${ngoToken}` },
  });
  const dataProp = await resProp.json();
  assert.equal(resProp.status, 200);
  assert.ok(dataProp.proposals.length > 0);

  const proposal = dataProp.proposals.find(
    (p) => p.donationId._id.toString() === createdDonationId.toString()
  );
  assert.ok(proposal);
  assert.ok(proposal.matchScore > 0);
  assert.ok(proposal.scoreBreakdown.distanceScore !== undefined);
  assert.ok(proposal.scoreBreakdown.urgencyScore !== undefined);
  assert.ok(proposal.scoreBreakdown.capacityScore !== undefined);
  assert.ok(proposal.scoreBreakdown.compatibilityScore !== undefined);
  assert.ok(proposal.scoreBreakdown.driverScore !== undefined);

  proposalMatchId = proposal._id;

  // Check NGO capacity endpoint
  const resCap = await fetch(`${baseUrl}/api/matches/capacity`, {
    headers: { Authorization: `Bearer ${ngoToken}` },
  });
  const dataCap = await resCap.json();
  assert.equal(resCap.status, 200);
  assert.equal(dataCap.capacityDailyMeals, 100);
  assert.equal(dataCap.allocatedCapacity, 0);
  assert.equal(dataCap.availableCapacity, 100);
});

test('Matching: NGO Rejection and Re-matching to secondary NGO', async () => {
  // Create another donation specifically to test decline & re-matching
  const resDon = await fetch(`${baseUrl}/api/donations`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${donorToken}`,
    },
    body: JSON.stringify({
      title: 'Surplus Lunch Trays',
      foodType: 'COOKED_MEALS',
      quantity: { amount: 20, unit: 'SERVINGS', estimatedServings: 20, estimatedWeightKg: 8 },
      perishability: { expiryHours: 2 },
      pickupLocation: {
        address: '10 Test Kitchen Road',
        contactPhone: '+1 555-1111',
        coordinates: [77.209, 28.6139],
      },
    }),
  });
  const donData = await resDon.json();

  // Find match proposal for NGO 1
  const resProp1 = await fetch(`${baseUrl}/api/matches/proposals`, {
    headers: { Authorization: `Bearer ${ngoToken}` },
  });
  const pData1 = await resProp1.json();
  const targetProp = pData1.proposals.find((p) => p.donationId._id === donData.donation._id);

  if (targetProp) {
    // NGO 1 declines
    const resDecline = await fetch(`${baseUrl}/api/matches/${targetProp._id}/decline`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${ngoToken}` },
    });
    assert.equal(resDecline.status, 200);

    // Verify secondary NGO receives re-match proposal
    const resProp2 = await fetch(`${baseUrl}/api/matches/proposals`, {
      headers: { Authorization: `Bearer ${ngo2Token}` },
    });
    const pData2 = await resProp2.json();
    const rematched = pData2.proposals.find((p) => p.donationId._id === donData.donation._id);
    assert.ok(rematched, 'Secondary NGO should receive re-matched proposal');
    rematchDonationId = donData.donation._id;
    rematchMatchId = rematched._id;
  }
});

test('Matching: NGO Acceptance reserves capacity', async () => {
  // NGO 1 accepts original donation
  const resAccept = await fetch(`${baseUrl}/api/matches/${proposalMatchId}/accept`, {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${ngoToken}` },
  });
  const dataAccept = await resAccept.json();
  assert.equal(resAccept.status, 200);
  assert.equal(dataAccept.donation.status, 'MATCHED');

  // Matched NGO can see deliveryOtp, but not pickupOtp!
  assert.ok(dataAccept.donation.deliveryOtp);
  assert.equal(dataAccept.donation.pickupOtp, undefined);
  deliveryOtp = dataAccept.donation.deliveryOtp;

  // Verify NGO capacity is allocated (100 - 25 = 75 available)
  const resCap = await fetch(`${baseUrl}/api/matches/capacity`, {
    headers: { Authorization: `Bearer ${ngoToken}` },
  });
  const dataCap = await resCap.json();
  assert.equal(dataCap.allocatedCapacity, 25);
  assert.equal(dataCap.availableCapacity, 75);
});

test('Delivery: Driver claim race condition protection', async () => {
  const resAvailable = await fetch(`${baseUrl}/api/deliveries/available`, {
    headers: { Authorization: `Bearer ${driverToken}` },
  });
  const availableData = await resAvailable.json();
  assert.equal(resAvailable.status, 200);
  assert.ok(
    availableData.available.some(
      (donation) => donation._id.toString() === createdDonationId.toString()
    ),
    'Accepted donations should appear in the driver dashboard'
  );

  // Driver 1 and Driver 2 attempt to claim the same donation concurrently
  const [claim1, claim2] = await Promise.all([
    fetch(`${baseUrl}/api/deliveries/${createdDonationId}/claim`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${driverToken}` },
    }),
    fetch(`${baseUrl}/api/deliveries/${createdDonationId}/claim`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${driver2Token}` },
    }),
  ]);

  const statuses = [claim1.status, claim2.status];
  assert.ok(statuses.includes(201), 'One driver must successfully claim (201)');
  assert.ok(statuses.includes(409), 'The competing driver must receive conflict (409)');

  const successClaim = claim1.status === 201 ? await claim1.json() : await claim2.json();
  createdDeliveryId = successClaim.delivery._id;
  assignedDriverToken = claim1.status === 201 ? driverToken : driver2Token;
  assert.equal(successClaim.delivery.status, 'ASSIGNED');
  assert.deepEqual(successClaim.delivery.pickupCoords, [77.209, 28.6139]);
  assert.ok(Array.isArray(successClaim.delivery.dropoffCoords));
  assert.ok(successClaim.delivery.routeSummary?.geojson?.coordinates?.length >= 2);

  const resActive = await fetch(`${baseUrl}/api/deliveries/my-active`, {
    headers: { Authorization: `Bearer ${assignedDriverToken}` },
  });
  const activeData = await resActive.json();
  assert.equal(resActive.status, 200);
  assert.ok(activeData.deliveries.some((delivery) => delivery._id === createdDeliveryId));

  const resDeliveryDetail = await fetch(
    `${baseUrl}/api/deliveries/${createdDeliveryId}`,
    { headers: { Authorization: `Bearer ${assignedDriverToken}` } }
  );
  const detailData = await resDeliveryDetail.json();
  assert.equal(resDeliveryDetail.status, 200);
  assert.ok(detailData.delivery.routeSummary?.geojson?.coordinates?.length >= 2);
});

test('Delivery: Lifecycle state transitions and OTP verification', async () => {
  // 1. Driver starts route to pickup
  const resEnRoutePickup = await fetch(`${baseUrl}/api/deliveries/${createdDeliveryId}/en-route-pickup`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${driverToken}` },
  });
  assert.equal(resEnRoutePickup.status, 200);

  // 2. Driver arrives at pickup
  const resArrivedPickup = await fetch(`${baseUrl}/api/deliveries/${createdDeliveryId}/arrived-pickup`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${driverToken}` },
  });
  assert.equal(resArrivedPickup.status, 200);

  // 3. Confirm pickup with WRONG OTP -> fails
  const resWrongOtpPickup = await fetch(`${baseUrl}/api/deliveries/${createdDeliveryId}/pickup`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${driverToken}`,
    },
    body: JSON.stringify({ otp: '0000' }),
  });
  assert.equal(resWrongOtpPickup.status, 400);

  // 4. Confirm pickup with CORRECT OTP -> succeeds
  const resCorrectOtpPickup = await fetch(`${baseUrl}/api/deliveries/${createdDeliveryId}/pickup`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${driverToken}`,
    },
    body: JSON.stringify({ otp: pickupOtp }),
  });
  const dataPickup = await resCorrectOtpPickup.json();
  assert.equal(resCorrectOtpPickup.status, 200);
  assert.equal(dataPickup.delivery.status, 'PICKED_UP');

  // 5. Driver starts route to delivery
  const resEnRouteDelivery = await fetch(`${baseUrl}/api/deliveries/${createdDeliveryId}/en-route-delivery`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${driverToken}` },
  });
  assert.equal(resEnRouteDelivery.status, 200);

  // 6. Driver arrives at dropoff
  const resArrivedDropoff = await fetch(`${baseUrl}/api/deliveries/${createdDeliveryId}/arrived-dropoff`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${driverToken}` },
  });
  assert.equal(resArrivedDropoff.status, 200);

  // 7. Confirm delivery with WRONG OTP -> fails
  const resWrongOtpDelivery = await fetch(`${baseUrl}/api/deliveries/${createdDeliveryId}/deliver`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${driverToken}`,
    },
    body: JSON.stringify({ otp: '9999' }),
  });
  assert.equal(resWrongOtpDelivery.status, 400);

  // 8. Confirm delivery with CORRECT OTP -> succeeds
  const resCorrectOtpDelivery = await fetch(`${baseUrl}/api/deliveries/${createdDeliveryId}/deliver`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${driverToken}`,
    },
    body: JSON.stringify({ otp: deliveryOtp, notes: 'Delivered in good condition' }),
  });
  const dataDeliver = await resCorrectOtpDelivery.json();
  assert.equal(resCorrectOtpDelivery.status, 200);
  assert.equal(dataDeliver.delivery.status, 'DELIVERED');
  assert.ok(dataDeliver.impact.mealsRescued === 25);
  assert.ok(dataDeliver.impact.co2PreventedKg > 0);

  // 9. NGO verifies delivery -> releases capacity!
  const resVerify = await fetch(`${baseUrl}/api/deliveries/${createdDeliveryId}/verify`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${ngoToken}`,
    },
    body: JSON.stringify({ rating: 5, feedbackNote: 'Great food, thank you!' }),
  });
  const dataVerify = await resVerify.json();
  assert.equal(resVerify.status, 200);
  assert.equal(dataVerify.donation.status, 'VERIFIED');

  // Verify NGO capacity is released back to 0 allocated / 100 available
  const resCapAfter = await fetch(`${baseUrl}/api/matches/capacity`, {
    headers: { Authorization: `Bearer ${ngoToken}` },
  });
  const dataCapAfter = await resCapAfter.json();
  assert.equal(dataCapAfter.allocatedCapacity, 0);
  assert.equal(dataCapAfter.availableCapacity, 100);
});

test('Delivery: Cancellation releases the driver and reopens the donation', async () => {
  assert.ok(rematchMatchId && rematchDonationId);

  const resAccept = await fetch(
    `${baseUrl}/api/matches/${rematchMatchId}/accept`,
    {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${ngo2Token}` },
    }
  );
  assert.equal(resAccept.status, 200);

  const resClaim = await fetch(
    `${baseUrl}/api/deliveries/${rematchDonationId}/claim`,
    {
      method: 'POST',
      headers: { Authorization: `Bearer ${driverToken}` },
    }
  );
  const claimData = await resClaim.json();
  assert.equal(resClaim.status, 201);

  const resCancel = await fetch(
    `${baseUrl}/api/deliveries/${claimData.delivery._id}/cancel`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${driverToken}`,
      },
      body: JSON.stringify({ reason: 'Vehicle issue' }),
    }
  );
  const cancelData = await resCancel.json();
  assert.equal(resCancel.status, 200);
  assert.equal(cancelData.delivery.status, 'CANCELLED');

  const resAvailable = await fetch(`${baseUrl}/api/deliveries/available`, {
    headers: { Authorization: `Bearer ${driverToken}` },
  });
  const availableData = await resAvailable.json();
  assert.ok(
    availableData.available.some(
      (donation) => donation._id.toString() === rematchDonationId.toString()
    ),
    'Cancelled donations should return to the available delivery queue'
  );

  const resActive = await fetch(`${baseUrl}/api/deliveries/my-active`, {
    headers: { Authorization: `Bearer ${driverToken}` },
  });
  const activeData = await resActive.json();
  assert.equal(resActive.status, 200);
  assert.ok(
    activeData.deliveries.every(
      (delivery) => delivery._id !== claimData.delivery._id
    )
  );
});

test('Analytics & Admin: Verify impact telemetry and statistics', async () => {
  // Analytics is an authenticated endpoint in the app.
  const resAnalytics = await fetch(`${baseUrl}/api/analytics/impact`, {
    headers: { Authorization: `Bearer ${adminToken}` },
  });
  const dataAnalytics = await resAnalytics.json();
  assert.equal(resAnalytics.status, 200);
  assert.ok(dataAnalytics.impact.totalMealsRescued >= 25);
  assert.ok(dataAnalytics.donationsByFoodType.length > 0);

  // Check Admin Statistics
  const resAdminStats = await fetch(`${baseUrl}/api/admin/statistics`, {
    headers: { Authorization: `Bearer ${adminToken}` },
  });
  const dataAdminStats = await resAdminStats.json();
  assert.equal(resAdminStats.status, 200);
  assert.ok(dataAdminStats.stats.users.total >= 5);
  assert.ok(dataAdminStats.stats.impact.totalMealsRescued >= 25);
});
