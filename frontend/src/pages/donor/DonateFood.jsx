import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  PlusCircle,
  Upload,
  AlertCircle,
  Clock,
  MapPin,
  Utensils,
  Image as ImageIcon,
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
    if (hours <= 0) return { label: 'EXPIRED', color: 'bg-rose-500/20 text-rose-400 border-rose-500/40' };
    if (hours < 1) return { label: 'CRITICAL (<1 hour)', color: 'bg-rose-500/20 text-rose-400 border-rose-500/40' };
    if (hours <= 2) return { label: 'HIGH (1-2 hours)', color: 'bg-amber-500/20 text-amber-400 border-amber-500/40' };
    if (hours <= 4) return { label: 'MEDIUM (2-4 hours)', color: 'bg-blue-500/20 text-blue-400 border-blue-500/40' };
    return { label: 'LOW (>4 hours)', color: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40' };
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
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      <div>
        <h1 className="text-3xl font-extrabold tracking-tight text-white">Post Surplus Food</h1>
        <p className="text-slate-400 text-sm mt-1">
          Our intelligent engine will instantly calculate urgency and match eligible shelters nearby.
        </p>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 flex items-center gap-3 text-rose-300 text-sm">
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Food Details Card */}
        <div className="glass-panel p-6 sm:p-8 rounded-2xl border border-slate-700/80 space-y-5">
          <h2 className="text-base font-bold text-white flex items-center gap-2 border-b border-slate-800 pb-3">
            <Utensils className="w-4 h-4 text-emerald-400" />
            <span>Food & Dietary Specifications</span>
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
                Food Name / Title
              </label>
              <input
                type="text"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g., Excess Buffet Trays - Paneer Curry & Rice"
                className="w-full px-4 py-2.5 rounded-xl glass-input text-sm"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
                Description / Packaging Details
              </label>
              <textarea
                rows={2}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Packed hygienically in aluminum trays, ready for pickup"
                className="w-full px-4 py-2.5 rounded-xl glass-input text-sm"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
                Food Category
              </label>
              <select
                value={foodType}
                onChange={(e) => setFoodType(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl glass-input text-sm bg-slate-900 text-white"
              >
                <option value="COOKED_MEALS">Cooked Meals (Buffet / Prepared)</option>
                <option value="RAW_PRODUCE">Raw Produce (Vegetables / Fruits)</option>
                <option value="PACKAGED_FOOD">Packaged / Canned Food</option>
                <option value="BAKERY">Bakery & Breads</option>
                <option value="DAIRY">Dairy Products</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
                Dietary Preference
              </label>
              <select
                value={dietaryPreference}
                onChange={(e) => setDietaryPreference(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl glass-input text-sm bg-slate-900 text-white"
              >
                <option value="VEG">Vegetarian</option>
                <option value="NON_VEG">Non-Vegetarian</option>
                <option value="VEGAN">Vegan</option>
                <option value="MIXED">Mixed Trays</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
                Quantity Amount
              </label>
              <input
                type="number"
                min="1"
                required
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl glass-input text-sm"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
                Unit of Measure
              </label>
              <select
                value={unit}
                onChange={(e) => setUnit(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl glass-input text-sm bg-slate-900 text-white"
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
        <div className="glass-panel p-6 sm:p-8 rounded-2xl border border-slate-700/80 space-y-5">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <Clock className="w-4 h-4 text-amber-400" />
              <span>Perishability & Remaining Safe Window</span>
            </h2>
            <span className={`text-xs font-bold px-2.5 py-0.5 rounded-full border ${urgencyPreview.color}`}>
              {urgencyPreview.label}
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
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
                className="w-full px-4 py-2.5 rounded-xl glass-input text-sm"
              />
              <span className="text-[11px] text-slate-400 block mt-1">
                Estimated safe consumption cutoff time for recipient shelter.
              </span>
            </div>

            <div className="flex items-center gap-3 pt-6">
              <input
                type="checkbox"
                id="coldchain"
                checked={requiresColdChain}
                onChange={(e) => setRequiresColdChain(e.target.checked)}
                className="w-4 h-4 rounded text-emerald-500 focus:ring-emerald-500"
              />
              <div>
                <label htmlFor="coldchain" className="text-xs text-slate-200 font-semibold block">
                  Requires Cold Chain / Temperature Control
                </label>
                <span className="text-[11px] text-slate-400">
                  Only matches with shelters and vehicles having refrigeration
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Pickup Location & Image Upload */}
        <div className="glass-panel p-6 sm:p-8 rounded-2xl border border-slate-700/80 space-y-5">
          <h2 className="text-base font-bold text-white flex items-center gap-2 border-b border-slate-800 pb-3">
            <MapPin className="w-4 h-4 text-cyan-400" />
            <span>Pickup Logistics & Food Photo</span>
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
                Pickup Address
              </label>
              <input
                type="text"
                required
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl glass-input text-sm"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
                Contact Phone for Courier
              </label>
              <input
                type="tel"
                required
                value={contactPhone}
                onChange={(e) => setContactPhone(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl glass-input text-sm"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
                Pickup Instructions / Notes
              </label>
              <input
                type="text"
                value={instructions}
                onChange={(e) => setInstructions(e.target.value)}
                placeholder="Kitchen entrance at rear parking"
                className="w-full px-4 py-2.5 rounded-xl glass-input text-sm"
              />
            </div>

            {/* Food Image Upload */}
            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
                Food Photo (Optional)
              </label>
              <div className="flex items-center gap-4">
                <label className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-slate-700 bg-slate-800/80 hover:bg-slate-700 text-slate-200 text-xs font-semibold cursor-pointer transition-colors">
                  <Upload className="w-4 h-4 text-emerald-400" />
                  <span>Choose Image File</span>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleImageChange}
                    className="hidden"
                  />
                </label>
                {imagePreview && (
                  <div className="flex items-center gap-2">
                    <img
                      src={imagePreview}
                      alt="Preview"
                      className="w-12 h-12 rounded-lg object-cover border border-emerald-500/50"
                    />
                    <span className="text-xs text-emerald-400 font-medium">Image attached</span>
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
          className="w-full py-4 px-6 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-base rounded-2xl shadow-xl shadow-emerald-600/30 flex items-center justify-center gap-2.5 transition-all hover:scale-[1.01] active:scale-[0.99] disabled:opacity-50"
        >
          {loading ? (
            <div className="flex items-center gap-2">
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              <span>Matching Shelters & Dispatching...</span>
            </div>
          ) : (
            <>
              <PlusCircle className="w-5 h-5" />
              <span>Create Surplus Donation & Find Shelters</span>
            </>
          )}
        </button>
      </form>
    </div>
  );
};

export default DonateFood;
