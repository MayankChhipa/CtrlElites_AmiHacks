import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  HeartHandshake,
  LogIn,
  AlertCircle,
  ArrowRight,
  Eye,
  EyeOff,
  Leaf,
  Building2,
  Truck,
  Shield,
  Mail,
  Lock,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

/* -------------------------------------------------------
   Food Rescue Illustration
------------------------------------------------------- */
const FoodRescueIllustration = () => {
  return (
    <svg
      viewBox="0 0 700 520"
      className="w-full max-w-[650px] h-auto"
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* Background restaurant */}
      <path
        d="M0 390 L0 310 Q40 280 90 310 L90 390 Z"
        fill="#F6A800"
        opacity="0.35"
      />

      {/* Restaurant roof */}
      <path
        d="M0 315 Q120 270 240 315 L240 340 Q120 300 0 340 Z"
        fill="#E52B20"
        opacity="0.25"
      />

      {/* Restaurant building */}
      <rect
        x="25"
        y="330"
        width="230"
        height="130"
        rx="8"
        fill="#FFB81C"
        opacity="0.4"
      />

      {/* Restaurant windows */}
      <rect
        x="50"
        y="365"
        width="65"
        height="55"
        rx="5"
        fill="#FFF3D6"
        opacity="0.8"
      />

      <rect
        x="135"
        y="365"
        width="65"
        height="55"
        rx="5"
        fill="#FFF3D6"
        opacity="0.8"
      />

      {/* FR restaurant logo */}
      <circle cx="155" cy="325" r="34" fill="#E52B20" />
      <text
        x="155"
        y="336"
        textAnchor="middle"
        fontSize="23"
        fontWeight="900"
        fill="#FFD23F"
      >
        FR
      </text>

      {/* Delivery truck */}
      <g transform="translate(430 365)">
        <rect
          x="0"
          y="30"
          width="160"
          height="70"
          rx="10"
          fill="#E52B20"
          opacity="0.9"
        />

        <path
          d="M160 55 L195 55 L220 80 L220 100 L160 100 Z"
          fill="#D82018"
        />

        <rect
          x="175"
          y="65"
          width="30"
          height="22"
          rx="4"
          fill="#FFE7A0"
        />

        <circle cx="45" cy="105" r="20" fill="#5B3027" />
        <circle cx="180" cy="105" r="20" fill="#5B3027" />

        <circle cx="45" cy="105" r="9" fill="#FFF3D6" />
        <circle cx="180" cy="105" r="9" fill="#FFF3D6" />

        <text
          x="80"
          y="73"
          textAnchor="middle"
          fontSize="17"
          fontWeight="800"
          fill="#FFF"
        >
          FOOD
        </text>

        <text
          x="80"
          y="92"
          textAnchor="middle"
          fontSize="17"
          fontWeight="800"
          fill="#FFF"
        >
          RESCUE
        </text>
      </g>

      {/* Person */}
      <g transform="translate(180 100)">
        {/* Hair */}
        <path
          d="M105 50 Q120 10 170 30 Q200 45 190 95 L105 90 Z"
          fill="#40231F"
        />

        {/* Face */}
        <circle cx="150" cy="105" r="48" fill="#F4C7A1" />

        {/* Hair front */}
        <path
          d="M110 90 Q110 35 160 40 Q190 45 188 85 Q170 65 150 72 Q130 80 110 90"
          fill="#40231F"
        />

        {/* Ear */}
        <circle cx="195" cy="110" r="10" fill="#F4C7A1" />

        {/* Eye */}
        <circle cx="168" cy="105" r="4" fill="#40231F" />

        {/* Smile */}
        <path
          d="M163 125 Q177 137 188 124"
          stroke="#40231F"
          strokeWidth="4"
          fill="none"
          strokeLinecap="round"
        />

        {/* Body / shirt */}
        <path
          d="M90 150 Q150 125 215 160 L245 365 L55 365 Z"
          fill="#D9271C"
        />

        {/* Shirt collar */}
        <path
          d="M130 150 L150 185 L170 150"
          fill="#B51F18"
        />

        {/* Small FR on shirt */}
        <circle cx="150" cy="225" r="25" fill="#FFD23F" />

        <text
          x="150"
          y="233"
          textAnchor="middle"
          fontSize="14"
          fontWeight="900"
          fill="#D9271C"
        >
          FR
        </text>

        {/* Left arm */}
        <path
          d="M90 175 Q45 200 60 275 L115 275 L130 220"
          fill="#D9271C"
        />

        {/* Right arm */}
        <path
          d="M215 180 Q260 205 250 270 L205 270 L185 220"
          fill="#D9271C"
        />

        {/* Box */}
        <rect
          x="75"
          y="245"
          width="170"
          height="100"
          rx="5"
          fill="#D99A43"
        />

        <rect
          x="80"
          y="250"
          width="160"
          height="92"
          rx="4"
          fill="#EAB15E"
        />

        {/* Food inside box */}
        <path
          d="M95 255 Q105 220 120 250"
          stroke="#3B8D40"
          strokeWidth="12"
          fill="none"
        />

        <path
          d="M125 260 Q140 215 160 250"
          stroke="#68A64D"
          strokeWidth="14"
          fill="none"
        />

        <circle cx="190" cy="252" r="18" fill="#E7462C" />
        <circle cx="215" cy="260" r="15" fill="#F5D13A" />

        {/* Hands */}
        <circle cx="70" cy="270" r="17" fill="#F4C7A1" />
        <circle cx="250" cy="270" r="17" fill="#F4C7A1" />
      </g>

      {/* Ground curve */}
      <path
        d="M0 480 Q280 410 700 480 L700 520 L0 520 Z"
        fill="#F4A900"
        opacity="0.65"
      />

      {/* Small plants */}
      <path
        d="M40 450 Q45 420 55 400"
        stroke="#D9271C"
        strokeWidth="6"
      />

      <ellipse
        cx="40"
        cy="425"
        rx="18"
        ry="8"
        fill="#E52B20"
        transform="rotate(-30 40 425)"
      />

      <ellipse
        cx="65"
        cy="410"
        rx="18"
        ry="8"
        fill="#D9271C"
        transform="rotate(25 65 410)"
      />
    </svg>
  );
};


/* -------------------------------------------------------
   LOGIN COMPONENT
------------------------------------------------------- */
const Login = () => {
  const { login } = useAuth();
  const navigate = useNavigate();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();

    setError('');
    setLoading(true);

    try {
      const user = await login(email, password);

      const routeMap = {
        DONOR: '/donor',
        NGO: '/ngo',
        DRIVER: '/driver',
        ADMIN: '/admin',
      };

      navigate(routeMap[user.role] || '/');
    } catch (err) {
      setError(
        err.response?.data?.message ||
        err.message ||
        'Login failed'
      );
    } finally {
      setLoading(false);
    }
  };


  /* Quick demo login */
  const handleQuickDemo = (demoEmail) => {
    setEmail(demoEmail);
    setPassword('password123');
  };


  return (
    <div className="min-h-[calc(100vh-4rem)] relative overflow-hidden bg-gradient-to-br from-[#FFD23F] via-[#FFB51B] to-[#F59E0B]">

      {/* Decorative background curves */}
      <div className="absolute -right-20 -top-20 w-[420px] h-[420px] rounded-full border-[45px] border-[#E99B00]/30 pointer-events-none" />

      <div className="absolute -left-32 -bottom-40 w-[500px] h-[500px] rounded-full border-[60px] border-[#F3A300]/40 pointer-events-none" />


      {/* Main layout */}
      <div className="relative z-10 min-h-[calc(100vh-4rem)] max-w-[1500px] mx-auto px-5 sm:px-8 lg:px-14 py-8 lg:py-12 flex items-center">

        <div className="w-full grid lg:grid-cols-[1fr_620px] gap-8 xl:gap-14 items-center">


          {/* =================================================
              LEFT SIDE
          ================================================= */}
          <section className="hidden lg:block">

            {/* Logo */}
            <div className="flex items-center gap-5 mb-10">

              <div className="w-[82px] h-[82px] flex items-center justify-center">

                <div className="relative w-[68px] h-[68px]">

                  {/* FR logo */}
                  <div className="absolute inset-0 rounded-[22px] bg-[#D9271C] rotate-[-8deg] shadow-xl" />

                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="text-[27px] font-black text-[#FFD23F] tracking-[-2px]">
                      FR
                    </span>
                  </div>

                </div>

              </div>


              <div className="border-l-2 border-[#D9271C]/30 pl-5">

                <h1 className="text-4xl font-black tracking-tight text-[#C92319]">
                  FoodRescue
                </h1>

                <p className="text-lg font-semibold text-[#C92319] mt-1">
                  Good Food. Greater Impact.
                </p>

              </div>

            </div>


            {/* Main heading */}
            <div className="max-w-[650px]">

              <h2 className="text-6xl xl:text-7xl font-black leading-[0.95] tracking-[-3px] text-[#C92319]">
                Turning surplus
                <br />
                into smiles.
              </h2>


              <p className="mt-7 text-2xl font-semibold leading-relaxed text-[#8C281F] max-w-[560px]">
                Good food shouldn't go to waste.
                <br />
                Let's rescue it, together.
              </p>

            </div>


            {/* Illustration */}
            <div className="mt-4 -ml-10">
              <FoodRescueIllustration />
            </div>

          </section>



          {/* =================================================
              MOBILE BRAND
          ================================================= */}
          <div className="lg:hidden">

            <div className="flex items-center gap-4 mb-3">

              <div className="w-14 h-14 rounded-2xl bg-[#D9271C] flex items-center justify-center shadow-lg rotate-[-5deg]">

                <span className="text-xl font-black text-[#FFD23F]">
                  FR
                </span>

              </div>

              <div>
                <h1 className="text-3xl font-black text-[#C92319]">
                  FoodRescue
                </h1>

                <p className="text-sm font-semibold text-[#8C281F]">
                  Good Food. Greater Impact.
                </p>
              </div>

            </div>

            <h2 className="text-4xl font-black leading-none text-[#C92319] mt-7">
              Turning surplus
              <br />
              into smiles.
            </h2>

          </div>



          {/* =================================================
              LOGIN CARD
          ================================================= */}
          <section>

            <div className="bg-[#FFFDF7] rounded-[30px] shadow-[0_25px_70px_rgba(128,64,0,0.22)] border border-white/70 px-6 sm:px-10 lg:px-12 py-8 sm:py-10">

              {/* Card logo */}
              <div className="flex justify-center mb-4">

                <div className="w-16 h-16 rounded-[20px] bg-[#FFD23F] flex items-center justify-center shadow-sm">

                  <span className="text-2xl font-black text-[#D9271C] tracking-[-2px]">
                    FR
                  </span>

                </div>

              </div>


              {/* Heading */}
              <div className="text-center mb-7">

                <h2 className="text-4xl font-black tracking-tight text-[#C92319]">
                  Welcome Back!
                </h2>

                <p className="mt-2 text-[#693B35] text-base">
                  Sign in to continue making a difference.
                </p>

              </div>


              {/* Error */}
              {error && (

                <div className="mb-5 p-3.5 bg-red-50 border border-red-200 rounded-xl flex items-center gap-2.5 text-red-600 text-sm">

                  <AlertCircle className="w-5 h-5 flex-shrink-0" />

                  <span>{error}</span>

                </div>

              )}


              {/* Form */}
              <form
                onSubmit={handleSubmit}
                className="space-y-4"
              >

                {/* Email */}
                <div className="relative">

                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[#8B7772]" />

                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Email"
                    className="
                      w-full
                      h-[62px]
                      pl-12 pr-5
                      rounded-2xl
                      border
                      border-[#E8CFAF]
                      bg-[#FFFDF8]
                      text-[#4A2822]
                      placeholder:text-[#9B8C87]
                      outline-none
                      focus:border-[#D9271C]
                      focus:ring-2
                      focus:ring-[#D9271C]/10
                      transition-all
                    "
                  />

                </div>


                {/* Password */}
                <div className="relative">

                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[#8B7772]" />

                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Password"
                    className="
                      w-full
                      h-[62px]
                      pl-12 pr-12
                      rounded-2xl
                      border
                      border-[#E8CFAF]
                      bg-[#FFFDF8]
                      text-[#4A2822]
                      placeholder:text-[#9B8C87]
                      outline-none
                      focus:border-[#D9271C]
                      focus:ring-2
                      focus:ring-[#D9271C]/10
                      transition-all
                    "
                  />

                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-[#6D5B56] hover:text-[#D9271C]"
                  >
                    {showPassword ? (
                      <EyeOff className="w-5 h-5" />
                    ) : (
                      <Eye className="w-5 h-5" />
                    )}
                  </button>

                </div>


                {/* Remember / Forgot */}
                <div className="flex items-center justify-between text-sm pt-1">

                  <label className="flex items-center gap-2 text-[#6D504A] cursor-pointer">

                    <input
                      type="checkbox"
                      className="w-4 h-4 accent-[#D9271C]"
                    />

                    Remember me

                  </label>


                  <button
                    type="button"
                    className="font-semibold text-[#D9271C] hover:underline"
                  >
                    Forgot password?
                  </button>

                </div>


                {/* Login button */}
                <button
                  type="submit"
                  disabled={loading}
                  className="
                    w-full
                    h-[62px]
                    mt-3
                    rounded-full
                    bg-[#D9271C]
                    hover:bg-[#C52018]
                    text-white
                    font-bold
                    text-lg
                    shadow-lg
                    shadow-[#D9271C]/25
                    flex
                    items-center
                    justify-center
                    gap-3
                    transition-all
                    hover:scale-[1.01]
                    active:scale-[0.99]
                    disabled:opacity-60
                  "
                >

                  {loading ? (

                    <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin" />

                  ) : (

                    <>
                      Log In
                      <ArrowRight className="w-5 h-5" />
                    </>

                  )}

                </button>

              </form>



              {/* Divider */}
              <div className="flex items-center gap-4 my-7">

                <div className="flex-1 h-px bg-[#E9DED7]" />

                <span className="text-sm font-medium text-[#9A8580]">
                  OR
                </span>

                <div className="flex-1 h-px bg-[#E9DED7]" />

              </div>



              {/* Role login */}
              <div>

                <p className="text-center text-sm font-semibold text-[#694A44] mb-4">
                  Continue as
                </p>


                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">


                  {/* Donor */}
                  <button
                    type="button"
                    onClick={() =>
                      handleQuickDemo('donor@example.com')
                    }
                    className="
                      group
                      p-3
                      rounded-2xl
                      bg-[#F8F5E9]
                      border
                      border-[#EFE4CF]
                      hover:border-[#55A630]
                      hover:bg-[#F0F8E9]
                      transition-all
                    "
                  >

                    <div className="mx-auto w-10 h-10 rounded-full bg-[#55A630] flex items-center justify-center">

                      <Leaf className="w-5 h-5 text-white" />

                    </div>

                    <p className="mt-2 text-xs font-bold text-[#49302B]">
                      Donor
                    </p>

                  </button>



                  {/* NGO */}
                  <button
                    type="button"
                    onClick={() =>
                      handleQuickDemo('ngo@example.com')
                    }
                    className="
                      group
                      p-3
                      rounded-2xl
                      bg-[#F8F5E9]
                      border
                      border-[#EFE4CF]
                      hover:border-[#E84A5F]
                      hover:bg-[#FFF0F2]
                      transition-all
                    "
                  >

                    <div className="mx-auto w-10 h-10 rounded-full bg-[#E84A5F] flex items-center justify-center">

                      <Building2 className="w-5 h-5 text-white" />

                    </div>

                    <p className="mt-2 text-xs font-bold text-[#49302B]">
                      NGO
                    </p>

                  </button>



                  {/* Driver */}
                  <button
                    type="button"
                    onClick={() =>
                      handleQuickDemo('driver@example.com')
                    }
                    className="
                      group
                      p-3
                      rounded-2xl
                      bg-[#F8F5E9]
                      border
                      border-[#EFE4CF]
                      hover:border-[#F59E0B]
                      hover:bg-[#FFF8E8]
                      transition-all
                    "
                  >

                    <div className="mx-auto w-10 h-10 rounded-full bg-[#F59E0B] flex items-center justify-center">

                      <Truck className="w-5 h-5 text-white" />

                    </div>

                    <p className="mt-2 text-xs font-bold text-[#49302B]">
                      Driver
                    </p>

                  </button>



                  {/* Admin */}
                  <button
                    type="button"
                    onClick={() =>
                      handleQuickDemo('admin@example.com')
                    }
                    className="
                      group
                      p-3
                      rounded-2xl
                      bg-[#F8F5E9]
                      border
                      border-[#EFE4CF]
                      hover:border-[#7C5CFC]
                      hover:bg-[#F3F0FF]
                      transition-all
                    "
                  >

                    <div className="mx-auto w-10 h-10 rounded-full bg-[#7C5CFC] flex items-center justify-center">

                      <Shield className="w-5 h-5 text-white" />

                    </div>

                    <p className="mt-2 text-xs font-bold text-[#49302B]">
                      Admin
                    </p>

                  </button>

                </div>

              </div>



              {/* Register */}
              <div className="text-center mt-7">

                <p className="text-sm text-[#694A44]">

                  Don't have an account?{' '}

                  <Link
                    to="/register"
                    className="font-bold text-[#D9271C] hover:underline"
                  >
                    Sign Up
                  </Link>

                </p>

              </div>

            </div>

          </section>

        </div>

      </div>

    </div>
  );
};

export default Login;