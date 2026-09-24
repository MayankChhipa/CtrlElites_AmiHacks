import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { UserPlus, AlertCircle, Building2, Truck, Utensils } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const Register = () => {
  const { register } = useAuth();
  const navigate = useNavigate();

  const [role, setRole] = useState('DONOR');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('14 Gourmet Avenue, Connaught Place, New Delhi');

  // Role specifics
  const [orgType, setOrgType] = useState('RESTAURANT');
  const [capacityDailyMeals, setCapacityDailyMeals] = useState(120);
  const [hasRefrigeration, setHasRefrigeration] = useState(true);
  const [vehicleType, setVehicleType] = useState('CAR');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      let roleDetails = {};
      if (role === 'DONOR') {
        roleDetails = { organizationType: orgType };
      } else if (role === 'NGO') {
        roleDetails = {
          capacityDailyMeals: Number(capacityDailyMeals),
          storageFacilities: { hasRefrigeration, dryStorageAvailable: true },
          acceptedFoodTypes: ['COOKED_MEALS', 'RAW_PRODUCE', 'PACKAGED_FOOD', 'BAKERY'],
          dietaryRestrictionsAccepted: ['VEG', 'ANY'],
        };
      } else if (role === 'DRIVER') {
        roleDetails = {
          vehicleType,
          isAvailable: true,
        };
      }

      const user = await register({
        name,
        email,
        password,
        role,
        phone,
        address,
        coordinates: [77.209 + (Math.random() - 0.5) * 0.05, 28.6139 + (Math.random() - 0.5) * 0.05],
        roleDetails,
      });

      const routeMap = {
        DONOR: '/donor',
        NGO: '/ngo',
        DRIVER: '/driver',
        ADMIN: '/admin',
      };
      navigate(routeMap[user.role] || '/');
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center p-4 sm:p-6 lg:p-8 bg-[#F9C74F]">
      <div className="w-full max-w-2xl space-y-6">
        <div className="text-center space-y-2">
          <div className="inline-flex w-14 h-14 rounded-2xl bg-[#FFF7E6] items-center justify-center shadow-[0_10px_25px_rgba(185,28,28,0.18)] mb-1 border-2 border-[#E53935]/10">
            <span className="text-2xl font-black tracking-tight text-[#E53935]">FR</span>
          </div>
          <h2 className="text-3xl sm:text-4xl font-black tracking-tight text-[#B91C1C]">Join the Network</h2>
          <p className="text-sm text-[#7C2D12]">Connect surplus food with shelters, community kitchens & rescues</p>
        </div>

        <div className="bg-[#FFF7E6] p-6 sm:p-8 rounded-[2rem] shadow-[0_18px_45px_rgba(127,29,29,0.16)] border border-[#F4D6A0]">
          {error && (
            <div className="mb-5 p-3.5 bg-rose-500/10 border border-rose-500/30 rounded-xl flex items-center gap-2.5 text-rose-300 text-sm">
              <AlertCircle className="w-5 h-5 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Role Selector Tabs */}
          <div className="grid grid-cols-3 gap-2 mb-6 p-1 bg-[#FDE9B0] rounded-2xl border border-[#F2CF7A]">
            <button
              type="button"
              onClick={() => setRole('DONOR')}
              className={`py-3 px-3 rounded-xl text-xs font-bold flex flex-col items-center gap-1 transition-all ${
                role === 'DONOR'
                  ? 'bg-[#E53935] text-white shadow-md shadow-red-700/25'
                  : 'text-[#8B4513] hover:text-[#B91C1C]'
              }`}
            >
              <Utensils className="w-4 h-4" />
              <span>Donor</span>
            </button>
            <button
              type="button"
              onClick={() => setRole('NGO')}
              className={`py-3 px-3 rounded-xl text-xs font-bold flex flex-col items-center gap-1 transition-all ${
                role === 'NGO'
                  ? 'bg-[#E53935] text-white shadow-md shadow-red-700/25'
                  : 'text-[#8B4513] hover:text-[#B91C1C]'
              }`}
            >
              <Building2 className="w-4 h-4" />
              <span>Shelter / NGO</span>
            </button>
            <button
              type="button"
              onClick={() => setRole('DRIVER')}
              className={`py-3 px-3 rounded-xl text-xs font-bold flex flex-col items-center gap-1 transition-all ${
                role === 'DRIVER'
                  ? 'bg-[#E53935] text-white shadow-md shadow-red-700/25'
                  : 'text-[#8B4513] hover:text-[#B91C1C]'
              }`}
            >
              <Truck className="w-4 h-4" />
              <span>Driver</span>
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-[#7C2D12] mb-1.5">
                {role === 'DONOR' ? 'Organization or Donor Name' : role === 'NGO' ? 'Shelter / Kitchen Name' : 'Full Name'}
              </label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={role === 'DONOR' ? 'Grand Vista Restaurant' : role === 'NGO' ? 'Hope Kitchen' : 'Alex Driver'}
                className="w-full px-4 py-2.5 rounded-xl bg-white border border-[#E8C98F] text-[#431407] text-sm placeholder:text-[#B98B62] outline-none transition-all focus:border-[#E53935] focus:ring-4 focus:ring-red-100"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-[#7C2D12] mb-1.5">
                  Email
                </label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="contact@org.com"
                  className="w-full px-4 py-2.5 rounded-xl bg-white border border-[#E8C98F] text-[#431407] text-sm placeholder:text-[#B98B62] outline-none transition-all focus:border-[#E53935] focus:ring-4 focus:ring-red-100"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-[#7C2D12] mb-1.5">
                  Phone
                </label>
                <input
                  type="tel"
                  required
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+1 555-0199"
                  className="w-full px-4 py-2.5 rounded-xl bg-white border border-[#E8C98F] text-[#431407] text-sm placeholder:text-[#B98B62] outline-none transition-all focus:border-[#E53935] focus:ring-4 focus:ring-red-100"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-[#7C2D12] mb-1.5">
                Password
              </label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full px-4 py-2.5 rounded-xl bg-white border border-[#E8C98F] text-[#431407] text-sm placeholder:text-[#B98B62] outline-none transition-all focus:border-[#E53935] focus:ring-4 focus:ring-red-100"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-[#7C2D12] mb-1.5">
                Operating Address / Hub
              </label>
              <input
                type="text"
                required
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl bg-white border border-[#E8C98F] text-[#431407] text-sm placeholder:text-[#B98B62] outline-none transition-all focus:border-[#E53935] focus:ring-4 focus:ring-red-100"
              />
            </div>

            {/* Dynamic Role Profile Options */}
            {role === 'DONOR' && (
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-[#7C2D12] mb-1.5">
                  Donor Type
                </label>
                <select
                  value={orgType}
                  onChange={(e) => setOrgType(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl bg-white border border-[#E8C98F] text-[#431407] text-sm outline-none transition-all focus:border-[#E53935] focus:ring-4 focus:ring-red-100"
                >
                  <option value="RESTAURANT">Restaurant / Eatery</option>
                  <option value="CATERER">Caterer / Events Banquet</option>
                  <option value="HOTEL">Hotel Buffet</option>
                  <option value="SUPERMARKET">Supermarket / Grocery</option>
                  <option value="BAKERY">Bakery</option>
                  <option value="INDIVIDUAL">Individual Donor</option>
                </select>
              </div>
            )}

            {role === 'NGO' && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-[#7C2D12] mb-1.5">
                    Daily Capacity (Meals)
                  </label>
                  <input
                    type="number"
                    min="10"
                    max="5000"
                    value={capacityDailyMeals}
                    onChange={(e) => setCapacityDailyMeals(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl glass-input text-sm"
                  />
                </div>
                <div className="flex items-center gap-2 pt-6">
                  <input
                    type="checkbox"
                    id="refrigeration"
                    checked={hasRefrigeration}
                    onChange={(e) => setHasRefrigeration(e.target.checked)}
                    className="w-4 h-4 rounded text-[#E53935] focus:ring-[#E53935]"
                  />
                  <label htmlFor="refrigeration" className="text-xs text-[#7C2D12] font-semibold">
                    Has Refrigerator / Cold Storage
                  </label>
                </div>
              </div>
            )}

            {role === 'DRIVER' && (
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-[#7C2D12] mb-1.5">
                  Rescue Vehicle Type
                </label>
                <select
                  value={vehicleType}
                  onChange={(e) => setVehicleType(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl bg-white border border-[#E8C98F] text-[#431407] text-sm outline-none transition-all focus:border-[#E53935] focus:ring-4 focus:ring-red-100"
                >
                  <option value="CAR">Personal Car / Hatchback</option>
                  <option value="BIKE">Two-Wheeler / Scooter</option>
                  <option value="VAN">Cargo Van</option>
                  <option value="REFRIGERATED_VAN">Refrigerated Van</option>
                  <option value="TRUCK">Heavy Transport Truck</option>
                </select>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full mt-4 py-3 px-4 bg-[#E53935] hover:bg-[#C62828] text-white font-bold rounded-full shadow-[0_10px_22px_rgba(229,57,53,0.28)] flex items-center justify-center gap-2 transition-all hover:scale-[1.01] active:scale-[0.99] disabled:opacity-50"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              ) : (
                <>
                  <UserPlus className="w-4 h-4" />
                  Create Account
                </>
              )}
            </button>
          </form>
        </div>

        <p className="text-center text-sm text-[#7C2D12]">
          Already registered?{' '}
          <Link to="/login" className="font-bold text-[#C62828] hover:text-[#9F1239] transition-colors">
            Log in instead
          </Link>
        </p>
      </div>
    </div>
  );
};

export default Register;
