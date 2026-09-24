# Surplus-to-Shelter 🍲🚚🏢

> **Real-Time Surplus Food Recovery Platform connecting Food Donors (Restaurants, Caterers), Shelters & Community Kitchens (NGOs), and Rescue Couriers (Drivers) with Intelligent Urgency-Aware Matching and Dual-OTP Chain of Custody.**

---

## 🌟 Key Highlights & Features

- **Urgency Engine (`services/urgencyEngine.js`)**: Real-time remaining time calculation from donation expiry with 5 levels:
  - `CRITICAL`: < 1 hour remaining (100 urgency score)
  - `HIGH`: 1 to 2 hours remaining (80 urgency score)
  - `MEDIUM`: 2 to 4 hours remaining (50 urgency score)
  - `LOW`: > 4 hours remaining (25 urgency score)
  - `EXPIRED`: Expiry has passed (excluded from matching)
- **5-Component Weighted Matching Engine (`services/matchingEngine.js`)**:
  - Distance Proximity: **30%**
  - Perishability Urgency: **25%**
  - Shelter Capacity: **20%**
  - Food & Dietary Compatibility: **15%**
  - Fleet Driver Availability: **10%**
- **Dynamic Capacity Management**:
  - Tracks NGO daily capacity, reserved capacity, and remaining available servings.
  - Automatically reserves capacity on match acceptance and frees it on delivery completion or decline.
- **Robust Delivery Lifecycle with Dual-Handshake OTPs**:
  - `ASSIGNED` ➔ `EN_ROUTE_TO_PICKUP` ➔ `ARRIVED_AT_PICKUP` ➔ `PICKED_UP` (requires Donor Pickup OTP) ➔ `EN_ROUTE_TO_DELIVERY` ➔ `ARRIVED_AT_DROPOFF` ➔ `DELIVERED` (requires Shelter Delivery OTP) ➔ `VERIFIED` (Shelter food condition rating & capacity release).
  - Safe race-condition protection prevents concurrent driver claims using atomic database operations.
  - Full OTP security: OTPs are sanitized and hidden from couriers and unauthorized parties.
- **Automated Re-Matching**: If a shelter declines a proposal, the engine automatically finds and routes to the next eligible shelter.
- **Persistent Notifications & Socket.IO**: Real-time push events and database notification persistence for all workflow milestones.
- **Telemetry & Impact Analytics**: Aggregates meals rescued, landfill diversion (kg), and CO₂ abatement (1kg food ≈ 2.5kg CO₂e).

---

## 🔑 Demo Seed Credentials

All seeded demo accounts use password: `password123`

| Role | Email | Password | Purpose |
| :--- | :--- | :--- | :--- |
| **DONOR** | `donor@example.com` | `password123` | Golden Oak Bistro (Donor Hub) |
| **NGO (Shelter)** | `ngo@example.com` | `password123` | Hope Haven Community Kitchen (150 daily meals capacity) |
| **DRIVER** | `driver@example.com` | `password123` | Courier vehicle dispatch |
| **ADMIN** | `admin@example.com` | `password123` | Platform oversight & user verification |

---

## 🛠️ Tech Stack

- **Backend**: Node.js (v24+), Express.js, MongoDB / Mongoose, In-Memory Mongo fallback (`mongodb-memory-server`), Socket.IO, JWT, Bcrypt, Multer, Cloudinary fallback.
- **Frontend**: React 19, Vite 8, React Router v7, Tailwind CSS v4, Socket.IO Client, React Leaflet & Leaflet, Recharts, Lucide Icons.

---

## ⚙️ Environment Variables

### Backend (`backend/.env`)
```env
PORT=5000
MONGODB_URI=mongodb://localhost:27017/surplus_to_shelter
JWT_SECRET=super_secret_hackathon_jwt_key_2026_surplus_to_shelter
CLIENT_URL=http://localhost:5173
NODE_ENV=development

# Optional overrides
ALLOW_OTP_BYPASS=false
OSRM_URL=https://router.project-osrm.org
CLOUDINARY_CLOUD_NAME=demo_cloud
CLOUDINARY_API_KEY=demo_key
CLOUDINARY_API_SECRET=demo_secret
```

---

## 🚀 Getting Started

### 1. Backend Setup & Run

```bash
cd backend

# Install dependencies (if not already installed)
npm install

# Run automated tests
npm test

# Run end-to-end verification
node tests/verifyWorkflow.js

# Start server (auto-seeds demo accounts if DB is empty)
npm run dev
```

### 2. Frontend Setup & Run

```bash
cd frontend

# Install dependencies
npm install

# Build production bundle
npm run build

# Start Vite dev server
npm run dev
```

The frontend will be available at `http://localhost:5173` and backend API at `http://localhost:5000`.

---

## 📡 API Reference Overview

### Auth (`/api/auth`)
- `POST /register`: Register user with role specifics (Donor, NGO, Driver)
- `POST /login`: Authenticate and receive JWT token
- `GET /me`: Get authenticated user profile

### Donations (`/api/donations`)
- `POST /`: Create surplus donation (calculates urgency, runs matching engine, emits notifications)
- `GET /my`: Get current donor's donations
- `GET /`: Get all donations (optional `status` and `foodType` query filters)
- `GET /:id`: Get donation details (OTPs sanitized by role)

### Matches (`/api/matches`)
- `GET /proposals`: Get incoming proposals for logged-in NGO
- `GET /capacity`: Get NGO's meal capacity metrics (total, allocated, available)
- `PATCH /:matchId/accept`: Accept proposal and reserve capacity
- `PATCH /:matchId/decline`: Decline proposal and trigger automated re-matching

### Deliveries (`/api/deliveries`)
- `GET /available`: Get matched donations awaiting driver transport
- `GET /my-active`: Get driver's current active missions
- `GET /:deliveryId`: Get delivery route details
- `POST /:donationId/claim`: Atomically claim transport (race-condition safe)
- `POST /:deliveryId/en-route-pickup`: Driver starts route to donor
- `POST /:deliveryId/arrived-pickup`: Driver arrives at donor location
- `POST /:deliveryId/pickup`: Driver confirms pickup with Donor's Pickup OTP
- `POST /:deliveryId/en-route-delivery`: Driver starts route to shelter
- `POST /:deliveryId/arrived-dropoff`: Driver arrives at shelter
- `POST /:deliveryId/deliver`: Driver confirms delivery with Shelter's Delivery OTP
- `POST /:deliveryId/verify`: Shelter verifies food condition & releases capacity
- `POST /:deliveryId/cancel`: Cancel delivery and free driver

### Analytics (`/api/analytics`)
- `GET /impact`: Get platform aggregated metrics, food category breakdowns, status pipeline, and daily impact time-series

### Notifications (`/api/notifications`)
- `GET /`: Get user's notifications
- `GET /unread-count`: Get unread count
- `PATCH /:id/read`: Mark single notification as read
- `PATCH /read-all`: Mark all notifications as read

### Uploads (`/api/upload`)
- `POST /`: Upload single food or proof-of-delivery photo
- `POST /multiple`: Upload up to 5 photos

### Admin (`/api/admin`)
- `GET /users`: List and search users with role filters
- `GET /users/:id`: View user details
- `PATCH /users/:id/verify`: Approve or reject NGO/Driver verification
- `GET /donations`: View all platform donations
- `GET /donations/expiring`: Monitor urgent donations (< 2h remaining)
- `GET /deliveries/active`: Real-time fleet monitoring
- `GET /matches/failed`: Inspect donations needing routing intervention
- `GET /statistics`: Comprehensive platform counts and KPI metrics
- `GET /impact-logs`: Recent completed rescue logs
