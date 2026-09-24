import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  PlusCircle,
  Upload,
  AlertCircle,
  Clock,
  MapPin,
  Utensils,
  Sparkles,
  Heart,
  CheckCircle2,
} from 'lucide-react';
import api from '../../services/api';
import { useAuth } from '../../context/AuthContext';

const DonateFood = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [foodType, setFoodType] = useState('COOKED_MEALS');
  const [dietaryPreference, setDietaryPreference] = useState('VEG');
  const [amount, setAmount] = useState(30);
  const [unit, setUnit] = useState('SERVINGS');
  const [expiryHours, setExpiryHours] = useState(3);
  const [requiresColdChain, setRequiresColdChain] = useState(false);
  const [address, setAddress] = useState(user?.address?.formattedAddress || '14 Gourmet Avenue, Connaught Place, New Delhi');
  const [instructions, setInstructions] = useState('Call on arrival. Back door kitchen entrance.');
  const [contactPhone, setContactPhone] = useState(user?.phone || '+1 555-0192');

  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState('');
  const [uploadingImage, setUploadingImage] = useState(false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleImageChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
  };

  const getUrgencyPreview = (hours) => {
    if (hours <= 0) return { label: 'EXPIRED', color: 'bg-red-100 text-red-900 border-red-300' };
    if (hours < 1) return { label: 'CRITICAL (<1 hour)', color: 'bg-red-100 text-red-900 border-red-300' };
    if (hours <= 2) return { label: 'HIGH (1-2 hours)', color: 'bg-orange-100 text-orange-900 border-orange-300' };
    if (hours <= 4) return { label: 'MEDIUM (2-4 hours)', color: 'bg-yellow-100 text-yellow-900 border-yellow-300' };
    return { label: 'LOW (>4 hours)', color: 'bg-emerald-100 text-emerald-900 border-emerald-300' };
  };

  const urgencyPreview = getUrgencyPreview(Number(expiryHours));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      let imageUrls = [];
      if (imageFile) {
        setUploadingImage(true);
        const formData = new FormData();
        formData.append('image', imageFile);
        const uploadRes = await api.post('/upload', formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
        if (uploadRes.data.success && uploadRes.data.url) {
          imageUrls.push(uploadRes.data.url);
        }
        setUploadingImage(false);
      }

      const res = await api.post('/donations', {
        title,
        description,
        foodType,
        dietaryPreference,
        quantity: {
          amount: Number(amount),
          unit,
          estimatedServings: unit === 'SERVINGS' ? Number(amount) : Number(amount) * 2,
          estimatedWeightKg: unit === 'KG' ? Number(amount) : Math.round(Number(amount) * 0.4),
        },
        perishability: {
          expiryHours: Number(expiryHours),
          requiresColdChain,
        },
        pickupLocation: {
          address,
          instructions,
          contactPhone,
          coordinates: user?.location?.coordinates || [77.209, 28.6139],
        },
        images: imageUrls,
      });

      if (res.data.success) {
        navigate(`/donor/donations/${res.data.donation._id}`);
      }
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Failed to post donation');
    } finally {
      setLoading(false);
      setUploadingImage(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-100 via-orange-50 to-yellow-100 text-stone-800 font-sans py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto space-y-8">

        {/* Header & FR Monogram Branding */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-orange-200/80 text-orange-950 text-xs font-black uppercase tracking-wide mb-2">
              <Sparkles className="w-3.5 h-3.5 fill-red-600 text-red-600" /> Share Surplus, Feed Hope
            </div>
            <h1 className="text-3xl sm:text-4xl font-black tracking-tight text-red-950">
              Post Surplus Food
            </h1>
            <p className="text-stone-600 text-sm sm:text-base font-semibold mt-1">
              Our intelligent engine will instantly calculate urgency and match eligible shelters nearby.
            </p>
          </div>

          {/* FR Monogram Branding Badge */}
          <div className="inline-flex items-center gap-2 bg-[#FFFDF6] px-4 py-2 rounded-full shadow-md shadow-orange-900/5 border border-orange-200/80 shrink-0 self-start sm:self-auto">
            <div className="w-8 h-8 rounded-full bg-red-600 flex items-center justify-center text-white font-black text-sm tracking-tighter shadow-inner">
              FR
            </div>
            <span className="text-xs font-black tracking-wider text-red-900 uppercase">
              FoodRescue Impact
            </span>
          </div>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="p-4 rounded-2xl bg-red-100 border-2 border-red-300 text-red-900 text-sm font-bold flex items-center gap-3 shadow-md shadow-red-900/5">
            <AlertCircle className="w-5 h-5 text-red-600 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">

          {/* Food Details Card */}
          <div className="bg-[#FFFDF6] p-6 sm:p-8 rounded-3xl shadow-xl shadow-orange-900/5 border border-orange-100 space-y-5">
            <h2 className="text-lg font-black text-red-950 flex items-center gap-2 border-b border-orange-100 pb-3">
              <div className="w-8 h-8 rounded-full bg-amber-100 flex items-center justify-center text-amber-800">
                <Utensils className="w-4 h-4 stroke-[2.5]" />
              </div>
              <span>Food & Dietary Specifications</span>
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="sm:col-span-2">
                <label className="block text-xs font-black uppercase tracking-wider text-stone-600 mb-1.5">
                  Food Name / Title
                </label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g., Excess Buffet Trays - Paneer Curry & Rice"
                  className="w-full px-4 py-3 rounded-2xl bg-orange-50/50 border border-orange-200/80 text-sm font-semibold text-stone-800 placeholder-stone-400 focus:outline-none focus:ring-2 focus:ring-red-500/50 focus:bg-white transition-all"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-xs font-black uppercase tracking-wider text-stone-600 mb-1.5">
                  Description / Packaging Details
                </label>
                <textarea
                  rows={2}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Packed hygienically in aluminum trays, ready for pickup"
                  className="w-full px-4 py-3 rounded-2xl bg-orange-50/50 border border-orange-200/80 text-sm font-semibold text-stone-800 placeholder-stone-400 focus:outline-none focus:ring-2 focus:ring-red-500/50 focus:bg-white transition-all"
                />
              </div>

              <div>
                <label className="block text-xs font-black uppercase tracking-wider text-stone-600 mb-1.5">
                  Food Category
                </label>
                <select
                  value={foodType}
                  onChange={(e) => setFoodType(e.target.value)}
                  className="w-full px-4 py-3 rounded-2xl bg-orange-50/50 border border-orange-200/80 text-sm font-bold text-stone-800 focus:outline-none focus:ring-2 focus:ring-red-500/50 focus:bg-white transition-all"
                >
                  <option value="COOKED_MEALS">Cooked Meals (Buffet / Prepared)</option>
                  <option value="RAW_PRODUCE">Raw Produce (Vegetables / Fruits)</option>
                  <option value="PACKAGED_FOOD">Packaged / Canned Food</option>
                  <option value="BAKERY">Bakery & Breads</option>
                  <option value="DAIRY">Dairy Products</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-black uppercase tracking-wider text-stone-600 mb-1.5">
                  Dietary Preference
                </label>
                <select
                  value={dietaryPreference}
                  onChange={(e) => setDietaryPreference(e.target.value)}
                  className="w-full px-4 py-3 rounded-2xl bg-orange-50/50 border border-orange-200/80 text-sm font-bold text-stone-800 focus:outline-none focus:ring-2 focus:ring-red-500/50 focus:bg-white transition-all"
                >
                  <option value="VEG">Vegetarian</option>
                  <option value="NON_VEG">Non-Vegetarian</option>
                  <option value="VEGAN">Vegan</option>
                  <option value="MIXED">Mixed Trays</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-black uppercase tracking-wider text-stone-600 mb-1.5">
                  Quantity Amount
                </label>
                <input
                  type="number"
                  min="1"
                  required
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="w-full px-4 py-3 rounded-2xl bg-orange-50/50 border border-orange-200/80 text-sm font-semibold text-stone-800 focus:outline-none focus:ring-2 focus:ring-red-500/50 focus:bg-white transition-all"
                />
              </div>

              <div>
                <label className="block text-xs font-black uppercase tracking-wider text-stone-600 mb-1.5">
                  Unit of Measure
                </label>
                <select
                  value={unit}
                  onChange={(e) => setUnit(e.target.value)}
                  className="w-full px-4 py-3 rounded-2xl bg-orange-50/50 border border-orange-200/80 text-sm font-bold text-stone-800 focus:outline-none focus:ring-2 focus:ring-red-500/50 focus:bg-white transition-all"
                >
                  <option value="SERVINGS">Servings (Individual Portions)</option>
                  <option value="KG">Kilograms (KG)</option>
                  <option value="BOXES">Boxes</option>
                  <option value="PACKETS">Packets</option>
                </select>
              </div>
            </div>
          </div>

          {/* Perishability & Urgency Card */}
          <div className="bg-[#FFFDF6] p-6 sm:p-8 rounded-3xl shadow-xl shadow-orange-900/5 border border-orange-100 space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-orange-100 pb-3">
              <h2 className="text-lg font-black text-red-950 flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-orange-100 flex items-center justify-center text-orange-800">
                  <Clock className="w-4 h-4 stroke-[2.5]" />
                </div>
                <span>Perishability & Safe Window</span>
              </h2>
              <span className={`self-start sm:self-auto text-xs font-black px-3 py-1 rounded-full border shadow-sm ${urgencyPreview.color}`}>
                {urgencyPreview.label}
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-black uppercase tracking-wider text-stone-600 mb-1.5">
                  Safe Consumption Window (Hours Remaining)
                </label>
                <input
                  type="number"
                  min="0.5"
                  step="0.5"
                  max="72"
                  required
                  value={expiryHours}
                  onChange={(e) => setExpiryHours(e.target.value)}
                  className="w-full px-4 py-3 rounded-2xl bg-orange-50/50 border border-orange-200/80 text-sm font-semibold text-stone-800 focus:outline-none focus:ring-2 focus:ring-red-500/50 focus:bg-white transition-all"
                />
                <span className="text-[11px] font-semibold text-stone-500 block mt-1.5">
                  Estimated safe consumption cutoff time for recipient shelter.
                </span>
              </div>

              <div className="flex items-center gap-3 sm:pt-4">
                <input
                  type="checkbox"
                  id="coldchain"
                  checked={requiresColdChain}
                  onChange={(e) => setRequiresColdChain(e.target.checked)}
                  className="w-5 h-5 rounded-lg text-red-600 focus:ring-red-500/40 accent-red-600 cursor-pointer"
                />
                <div>
                  <label htmlFor="coldchain" className="text-xs font-black text-stone-800 block cursor-pointer">
                    Requires Cold Chain / Temperature Control
                  </label>
                  <span className="text-[11px] font-medium text-stone-500">
                    Only matches with shelters and vehicles having refrigeration
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Pickup Location & Image Upload */}
          <div className="bg-[#FFFDF6] p-6 sm:p-8 rounded-3xl shadow-xl shadow-orange-900/5 border border-orange-100 space-y-5">
            <h2 className="text-lg font-black text-red-950 flex items-center gap-2 border-b border-orange-100 pb-3">
              <div className="w-8 h-8 rounded-full bg-red-100 flex items-center justify-center text-red-800">
                <MapPin className="w-4 h-4 stroke-[2.5]" />
              </div>
              <span>Pickup Logistics & Food Photo</span>
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="sm:col-span-2">
                <label className="block text-xs font-black uppercase tracking-wider text-stone-600 mb-1.5">
                  Pickup Address
                </label>
                <input
                  type="text"
                  required
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  className="w-full px-4 py-3 rounded-2xl bg-orange-50/50 border border-orange-200/80 text-sm font-semibold text-stone-800 focus:outline-none focus:ring-2 focus:ring-red-500/50 focus:bg-white transition-all"
                />
              </div>

              <div>
                <label className="block text-xs font-black uppercase tracking-wider text-stone-600 mb-1.5">
                  Contact Phone for Courier
                </label>
                <input
                  type="tel"
                  required
                  value={contactPhone}
                  onChange={(e) => setContactPhone(e.target.value)}
                  className="w-full px-4 py-3 rounded-2xl bg-orange-50/50 border border-orange-200/80 text-sm font-semibold text-stone-800 focus:outline-none focus:ring-2 focus:ring-red-500/50 focus:bg-white transition-all"
                />
              </div>

              <div>
                <label className="block text-xs font-black uppercase tracking-wider text-stone-600 mb-1.5">
                  Pickup Instructions / Notes
                </label>
                <input
                  type="text"
                  value={instructions}
                  onChange={(e) => setInstructions(e.target.value)}
                  placeholder="Kitchen entrance at rear parking"
                  className="w-full px-4 py-3 rounded-2xl bg-orange-50/50 border border-orange-200/80 text-sm font-semibold text-stone-800 focus:outline-none focus:ring-2 focus:ring-red-500/50 focus:bg-white transition-all"
                />
              </div>

              {/* Food Image Upload */}
              <div className="sm:col-span-2">
                <label className="block text-xs font-black uppercase tracking-wider text-stone-600 mb-1.5">
                  Food Photo (Optional)
                </label>
                <div className="flex flex-wrap items-center gap-4">
                  <label className="flex items-center gap-2 px-5 py-2.5 rounded-full border border-orange-300 bg-orange-100/70 hover:bg-orange-200/80 text-stone-800 text-xs font-black cursor-pointer transition-all active:scale-95 shadow-sm">
                    <Upload className="w-4 h-4 text-red-600" />
                    <span>Choose Image File</span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleImageChange}
                      className="hidden"
                    />
                  </label>
                  {imagePreview && (
                    <div className="flex items-center gap-2 bg-emerald-50 px-3 py-1.5 rounded-2xl border border-emerald-200">
                      <img
                        src={imagePreview}
                        alt="Preview"
                        className="w-10 h-10 rounded-xl object-cover border border-emerald-400"
                      />
                      <span className="text-xs text-emerald-800 font-bold flex items-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> Image attached
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={loading || uploadingImage}
            className="w-full py-4 px-6 bg-red-600 hover:bg-red-700 text-white font-black text-base rounded-full shadow-lg shadow-red-600/30 flex items-center justify-center gap-2.5 transition-all hover:-translate-y-0.5 active:scale-[0.99] disabled:opacity-50"
          >
            {loading ? (
              <div className="flex items-center gap-2">
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                <span>Matching Shelters & Dispatching...</span>
              </div>
            ) : (
              <>
                <PlusCircle className="w-5 h-5 stroke-[2.5]" />
                <span>Create Surplus Donation & Find Shelters</span>
              </>
            )}
          </button>
        </form>

      </div>
    </div>
  );
};

export default DonateFood;