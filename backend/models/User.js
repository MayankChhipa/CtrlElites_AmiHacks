const mongoose = require('mongoose');
const bcrypt = require('bcrypt');

const UserSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, index: true },
    passwordHash: { type: String, required: true },
    role: {
      type: String,
      enum: ['DONOR', 'NGO', 'DRIVER', 'ADMIN'],
      required: true,
      index: true,
    },
    phone: { type: String, required: true },
    avatarUrl: { type: String },
    isVerified: { type: Boolean, default: false },

    // Geospatial Coordinates for Headquarters/Origin
    location: {
      type: { type: String, enum: ['Point'], default: 'Point' },
      coordinates: { type: [Number], required: true }, // [longitude, latitude]
    },
    address: {
      street: String,
      city: String,
      postalCode: String,
      formattedAddress: String,
    },

    // Role-Specific Profile Extensions
    donorProfile: {
      organizationType: {
        type: String,
        enum: ['RESTAURANT', 'CATERER', 'HOTEL', 'SUPERMARKET', 'BAKERY', 'INDIVIDUAL'],
        default: 'RESTAURANT',
      },
      licenseNumber: String,
    },

    ngoProfile: {
      registrationNumber: String,
      capacityDailyMeals: { type: Number, default: 100 },
      allocatedCapacity: { type: Number, default: 0 },
      storageFacilities: {
        hasRefrigeration: { type: Boolean, default: false },
        hasFreezer: { type: Boolean, default: false },
        dryStorageAvailable: { type: Boolean, default: true },
      },
      acceptedFoodTypes: [
        {
          type: String,
          enum: ['COOKED_MEALS', 'RAW_PRODUCE', 'PACKAGED_FOOD', 'BAKERY', 'DAIRY'],
        },
      ],
      dietaryRestrictionsAccepted: [
        {
          type: String,
          enum: ['VEG', 'NON_VEG', 'VEGAN', 'ANY'],
        },
      ],
    },

    driverProfile: {
      vehicleType: {
        type: String,
        enum: ['BIKE', 'CAR', 'VAN', 'REFRIGERATED_VAN', 'TRUCK'],
        default: 'CAR',
      },
      licenseNumber: String,
      isAvailable: { type: Boolean, default: true, index: true },
      activeDeliveryId: { type: mongoose.Schema.Types.ObjectId, ref: 'Delivery' },
      currentLocation: {
        type: { type: String, enum: ['Point'], default: 'Point' },
        coordinates: { type: [Number], default: [0, 0] },
      },
    },
  },
  { timestamps: true }
);

UserSchema.index({ location: '2dsphere' });
UserSchema.index({ 'driverProfile.currentLocation': '2dsphere' });

UserSchema.methods.comparePassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.passwordHash);
};

module.exports = mongoose.model('User', UserSchema);
