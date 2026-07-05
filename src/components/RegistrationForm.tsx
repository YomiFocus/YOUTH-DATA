import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Upload, CheckCircle2, RefreshCw, ChevronRight, ChevronLeft, ArrowRight, User, Mail, Phone, Calendar, Home, MapPin, Briefcase, GraduationCap, Award, Lock } from 'lucide-react';
import { Registration } from '../types';

interface RegistrationFormProps {
  csrfToken: string;
  onViewAdmin: () => void;
}

const STATES_OF_NIGERIA = [
  'Abia', 'Adamawa', 'Akwa Ibom', 'Anambra', 'Bauchi', 'Bayelsa', 'Benue', 'Borno',
  'Cross River', 'Delta', 'Ebonyi', 'Edo', 'Ekiti', 'Enugu', 'FCT (Abuja)', 'Gombe',
  'Imo', 'Jigawa', 'Kaduna', 'Kano', 'Katsina', 'Kebbi', 'Kogi', 'Kwara', 'Lagos',
  'Nasarawa', 'Niger', 'Ogun', 'Ondo', 'Osun', 'Oyo', 'Plateau', 'Rivers', 'Sokoto',
  'Taraba', 'Yobe', 'Zamfara'
];

export default function RegistrationForm({ csrfToken, onViewAdmin }: RegistrationFormProps) {
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    phoneNumber: '',
    gender: '',
    dob: '',
    address: '',
    stateOfOrigin: '',
    occupation: '',
    education: '',
    passportPhoto: '',
    skills: '',
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [captchaChallenge, setCaptchaChallenge] = useState<{ id: string; question: string } | null>(null);
  const [captchaAnswer, setCaptchaAnswer] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState<any>(null);
  const [generalError, setGeneralError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  // Load CAPTCHA
  const fetchCaptcha = async () => {
    try {
      const res = await fetch('/api/captcha');
      const data = await res.json();
      setCaptchaChallenge(data);
      setCaptchaAnswer('');
    } catch (err) {
      console.error('Error fetching captcha:', err);
    }
  };

  useEffect(() => {
    if (step === 4) {
      fetchCaptcha();
    }
  }, [step]);

  // Input change handler
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    // Clear error for that field
    if (errors[name]) {
      setErrors((prev) => {
        const copy = { ...prev };
        delete copy[name];
        return copy;
      });
    }
    setGeneralError(null);
  };

  // Image upload converter (File -> Base64)
  const handlePhotoUpload = (file: File) => {
    if (!file.type.startsWith('image/')) {
      setErrors((prev) => ({ ...prev, passportPhoto: 'File must be an image.' }));
      return;
    }
    if (file.size > 1.5 * 1024 * 1024) { // 1.5MB max
      setErrors((prev) => ({ ...prev, passportPhoto: 'Photo size must be less than 1.5MB.' }));
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      setFormData((prev) => ({ ...prev, passportPhoto: e.target?.result as string }));
      setErrors((prev) => {
        const copy = { ...prev };
        delete copy.passportPhoto;
        return copy;
      });
    };
    reader.readAsDataURL(file);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handlePhotoUpload(e.target.files[0]);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handlePhotoUpload(e.dataTransfer.files[0]);
    }
  };

  // Validate current step
  const validateStep = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (step === 1) {
      if (!formData.fullName.trim()) newErrors.fullName = 'Full Name is required.';
      else if (formData.fullName.trim().split(' ').length < 2) {
        newErrors.fullName = 'Please enter your first and last name.';
      }
      if (!formData.gender) newErrors.gender = 'Gender selection is required.';
      if (!formData.dob) newErrors.dob = 'Date of birth is required.';
      else {
        // Must be at least 15 years old
        const birthDate = new Date(formData.dob);
        const today = new Date();
        let age = today.getFullYear() - birthDate.getFullYear();
        const m = today.getMonth() - birthDate.getMonth();
        if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
          age--;
        }
        if (age < 12) {
          newErrors.dob = 'Registrant must be at least 12 years of age.';
        }
      }
      if (!formData.stateOfOrigin) newErrors.stateOfOrigin = 'State of Origin is required.';
    }

    if (step === 2) {
      if (!formData.email.trim()) newErrors.email = 'Email address is required.';
      else {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(formData.email.trim())) {
          newErrors.email = 'Please enter a valid email format.';
        }
      }

      if (!formData.phoneNumber.trim()) newErrors.phoneNumber = 'Phone number is required.';
      else {
        // Clean and test phone number format
        const digits = formData.phoneNumber.replace(/\D/g, '');
        // Normalized test: should have 11 digits if local, or 13 with 234
        let isValid = false;
        if (digits.startsWith('234') && digits.length === 13) {
          isValid = true;
        } else if (digits.length === 11 && digits.startsWith('0')) {
          isValid = true;
        } else if (digits.length === 10) {
          isValid = true;
        }
        if (!isValid) {
          newErrors.phoneNumber = 'Please enter a valid 11-digit Nigerian number (e.g. 08031234567).';
        }
      }

      if (!formData.address.trim()) newErrors.address = 'Residential Address is required.';
      if (!formData.occupation.trim()) newErrors.occupation = 'Occupation is required.';
    }

    if (step === 3) {
      if (!formData.passportPhoto) {
        newErrors.passportPhoto = 'Passport Photograph is required.';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleNext = () => {
    if (validateStep()) {
      setStep((prev) => prev + 1);
    }
  };

  const handlePrev = () => {
    setStep((prev) => prev - 1);
    setGeneralError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateStep()) return;

    if (!captchaAnswer.trim()) {
      setErrors((prev) => ({ ...prev, captchaAnswer: 'Security CAPTCHA is required.' }));
      return;
    }

    setIsSubmitting(true);
    setGeneralError(null);

    try {
      const response = await fetch('/api/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRF-Token': csrfToken,
        },
        body: JSON.stringify({
          ...formData,
          captchaId: captchaChallenge?.id,
          captchaAnswer: captchaAnswer,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Registration failed.');
      }

      setSubmitSuccess(data);
    } catch (err: any) {
      setGeneralError(err.message || 'An error occurred. Please try again.');
      // If error is related to captcha, reload captcha
      if (err.message.toLowerCase().includes('captcha') || err.message.toLowerCase().includes('security')) {
        fetchCaptcha();
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReset = () => {
    setStep(1);
    setFormData({
      fullName: '',
      email: '',
      phoneNumber: '',
      gender: '',
      dob: '',
      address: '',
      stateOfOrigin: '',
      occupation: '',
      education: '',
      passportPhoto: '',
      skills: '',
    });
    setCaptchaAnswer('');
    setSubmitSuccess(null);
    setGeneralError(null);
    setErrors({});
  };

  // Render Steps Indicator
  const stepsList = [
    { num: 1, label: 'Profile' },
    { num: 2, label: 'Contact' },
    { num: 3, label: 'Documents' },
    { num: 4, label: 'Verify' },
  ];

  return (
    <div id="registration_portal_container" className="w-full max-w-2xl mx-auto">
      {/* Visual Header */}
      <div className="text-center mb-8">
        <h1 className="text-3xl font-sans font-semibold text-slate-900 tracking-tight mb-2">
          Electronic Registration Portal
        </h1>
        <p className="text-sm text-slate-500">
          Secure duplicate-prevention candidate registration desk
        </p>
      </div>

      {/* Main Container Card */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden mb-6">
        {!submitSuccess ? (
          <div>
            {/* Progress Bar / Indicators */}
            <div className="bg-slate-50/50 border-b border-slate-100 px-6 py-4 flex justify-between items-center">
              <div className="flex items-center space-x-2">
                {stepsList.map((s, i) => (
                  <React.Fragment key={s.num}>
                    <div className="flex items-center space-x-1.5">
                      <div
                        className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium transition-all ${
                          step >= s.num
                            ? 'bg-emerald-600 text-white'
                            : 'bg-slate-200 text-slate-600'
                        }`}
                      >
                        {s.num}
                      </div>
                      <span
                        className={`text-xs font-medium hidden sm:inline ${
                          step === s.num ? 'text-slate-900 font-semibold' : 'text-slate-400'
                        }`}
                      >
                        {s.label}
                      </span>
                    </div>
                    {i < stepsList.length - 1 && (
                      <div className="w-6 sm:w-12 h-[1px] bg-slate-200" />
                    )}
                  </React.Fragment>
                ))}
              </div>
              <button
                type="button"
                id="btn_view_admin"
                onClick={onViewAdmin}
                className="flex items-center space-x-1 text-xs font-medium text-slate-600 hover:text-emerald-700 hover:bg-slate-100 px-2.5 py-1.5 rounded-lg border border-slate-200 transition-all cursor-pointer"
              >
                <Lock className="w-3 h-3" />
                <span>Admin Login</span>
              </button>
            </div>

            {/* Error Notifications */}
            {generalError && (
              <div className="m-6 mb-0 p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm font-medium flex items-start space-x-2.5">
                <div className="w-1.5 h-1.5 rounded-full bg-red-500 mt-1.5 shrink-0" />
                <span>{generalError}</span>
              </div>
            )}

            {/* Form Content */}
            <form onSubmit={handleSubmit} className="p-6 sm:p-8">
              <AnimatePresence mode="wait">
                {/* STEP 1: PERSONAL PROFILE */}
                {step === 1 && (
                  <motion.div
                    key="step-1"
                    initial={{ opacity: 0, x: 10 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -10 }}
                    className="space-y-5"
                  >
                    <div>
                      <h3 className="text-base font-medium text-slate-900 mb-1">Personal Profile</h3>
                      <p className="text-xs text-slate-400 mb-4">Please provide your official bio details.</p>
                    </div>

                    <div className="space-y-4">
                      {/* Full Name */}
                      <div>
                        <label htmlFor="fullName" className="block text-xs font-medium text-slate-700 mb-1.5">
                          Full Name <span className="text-red-500">*</span>
                        </label>
                        <div className="relative">
                          <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
                            <User className="w-4 h-4" />
                          </span>
                          <input
                            type="text"
                            name="fullName"
                            id="fullName"
                            required
                            value={formData.fullName}
                            onChange={handleChange}
                            placeholder="e.g. John David"
                            className={`w-full pl-10 pr-4 py-2.5 rounded-lg border text-sm text-slate-800 bg-white placeholder-slate-400 focus:outline-none focus:ring-1 transition-all ${
                              errors.fullName
                                ? 'border-red-300 focus:border-red-500 focus:ring-red-500/20'
                                : 'border-slate-200 focus:border-emerald-500 focus:ring-emerald-500/20'
                            }`}
                          />
                        </div>
                        {errors.fullName && (
                          <p className="text-xs text-red-500 font-medium mt-1">{errors.fullName}</p>
                        )}
                      </div>

                      {/* Gender and DOB Grid */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <label htmlFor="gender" className="block text-xs font-medium text-slate-700 mb-1.5">
                            Gender <span className="text-red-500">*</span>
                          </label>
                          <select
                            name="gender"
                            id="gender"
                            required
                            value={formData.gender}
                            onChange={handleChange}
                            className={`w-full px-3 py-2.5 rounded-lg border text-sm text-slate-800 bg-white focus:outline-none focus:ring-1 transition-all ${
                              errors.gender
                                ? 'border-red-300 focus:border-red-500 focus:ring-red-500/20'
                                : 'border-slate-200 focus:border-emerald-500 focus:ring-emerald-500/20'
                            }`}
                          >
                            <option value="">Select Gender</option>
                            <option value="male">Male</option>
                            <option value="female">Female</option>
                            <option value="other">Other</option>
                          </select>
                          {errors.gender && (
                            <p className="text-xs text-red-500 font-medium mt-1">{errors.gender}</p>
                          )}
                        </div>

                        <div>
                          <label htmlFor="dob" className="block text-xs font-medium text-slate-700 mb-1.5">
                            Date of Birth <span className="text-red-500">*</span>
                          </label>
                          <div className="relative">
                            <input
                              type="date"
                              name="dob"
                              id="dob"
                              required
                              value={formData.dob}
                              onChange={handleChange}
                              className={`w-full px-3 py-2.5 rounded-lg border text-sm text-slate-800 bg-white focus:outline-none focus:ring-1 transition-all ${
                                errors.dob
                                  ? 'border-red-300 focus:border-red-500 focus:ring-red-500/20'
                                  : 'border-slate-200 focus:border-emerald-500 focus:ring-emerald-500/20'
                              }`}
                            />
                          </div>
                          {errors.dob && (
                            <p className="text-xs text-red-500 font-medium mt-1">{errors.dob}</p>
                          )}
                        </div>
                      </div>

                      {/* State of Origin */}
                      <div>
                        <label htmlFor="stateOfOrigin" className="block text-xs font-medium text-slate-700 mb-1.5">
                          State of Origin <span className="text-red-500">*</span>
                        </label>
                        <select
                          name="stateOfOrigin"
                          id="stateOfOrigin"
                          required
                          value={formData.stateOfOrigin}
                          onChange={handleChange}
                          className={`w-full px-3 py-2.5 rounded-lg border text-sm text-slate-800 bg-white focus:outline-none focus:ring-1 transition-all ${
                            errors.stateOfOrigin
                              ? 'border-red-300 focus:border-red-500 focus:ring-red-500/20'
                              : 'border-slate-200 focus:border-emerald-500 focus:ring-emerald-500/20'
                          }`}
                        >
                          <option value="">Select State</option>
                          {STATES_OF_NIGERIA.map((st) => (
                            <option key={st} value={st}>
                              {st}
                            </option>
                          ))}
                        </select>
                        {errors.stateOfOrigin && (
                          <p className="text-xs text-red-500 font-medium mt-1">{errors.stateOfOrigin}</p>
                        )}
                      </div>
                    </div>
                  </motion.div>
                )}

                {/* STEP 2: CONTACT & OCCUPATION */}
                {step === 2 && (
                  <motion.div
                    key="step-2"
                    initial={{ opacity: 0, x: 10 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -10 }}
                    className="space-y-5"
                  >
                    <div>
                      <h3 className="text-base font-medium text-slate-900 mb-1">Contact & Occupation</h3>
                      <p className="text-xs text-slate-400 mb-4">How we can contact you and verify your occupation status.</p>
                    </div>

                    <div className="space-y-4">
                      {/* Email and Phone Grid */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <label htmlFor="email" className="block text-xs font-medium text-slate-700 mb-1.5">
                            Email Address <span className="text-red-500">*</span>
                          </label>
                          <div className="relative">
                            <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
                              <Mail className="w-4 h-4" />
                            </span>
                            <input
                              type="email"
                              name="email"
                              id="email"
                              required
                              value={formData.email}
                              onChange={handleChange}
                              placeholder="john@email.com"
                              className={`w-full pl-10 pr-4 py-2.5 rounded-lg border text-sm text-slate-800 bg-white placeholder-slate-400 focus:outline-none focus:ring-1 transition-all ${
                                errors.email
                                  ? 'border-red-300 focus:border-red-500 focus:ring-red-500/20'
                                  : 'border-slate-200 focus:border-emerald-500 focus:ring-emerald-500/20'
                              }`}
                            />
                          </div>
                          {errors.email && (
                            <p className="text-xs text-red-500 font-medium mt-1">{errors.email}</p>
                          )}
                        </div>

                        <div>
                          <label htmlFor="phoneNumber" className="block text-xs font-medium text-slate-700 mb-1.5">
                            Phone Number <span className="text-red-500">*</span>
                          </label>
                          <div className="relative">
                            <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
                              <Phone className="w-4 h-4" />
                            </span>
                            <input
                              type="tel"
                              name="phoneNumber"
                              id="phoneNumber"
                              required
                              value={formData.phoneNumber}
                              onChange={handleChange}
                              placeholder="e.g. 08031234567"
                              className={`w-full pl-10 pr-4 py-2.5 rounded-lg border text-sm text-slate-800 bg-white placeholder-slate-400 focus:outline-none focus:ring-1 transition-all ${
                                errors.phoneNumber
                                  ? 'border-red-300 focus:border-red-500 focus:ring-red-500/20'
                                  : 'border-slate-200 focus:border-emerald-500 focus:ring-emerald-500/20'
                              }`}
                            />
                          </div>
                          {errors.phoneNumber && (
                            <p className="text-xs text-red-500 font-medium mt-1">{errors.phoneNumber}</p>
                          )}
                        </div>
                      </div>

                      {/* Residential Address */}
                      <div>
                        <label htmlFor="address" className="block text-xs font-medium text-slate-700 mb-1.5">
                          Residential Address <span className="text-red-500">*</span>
                        </label>
                        <div className="relative">
                          <span className="absolute top-3 left-3 text-slate-400">
                            <Home className="w-4 h-4" />
                          </span>
                          <textarea
                            name="address"
                            id="address"
                            rows={3}
                            required
                            value={formData.address}
                            onChange={handleChange}
                            placeholder="Full residential street, city and local government area..."
                            className={`w-full pl-10 pr-4 py-2 rounded-lg border text-sm text-slate-800 bg-white placeholder-slate-400 focus:outline-none focus:ring-1 transition-all ${
                              errors.address
                                ? 'border-red-300 focus:border-red-500 focus:ring-red-500/20'
                                : 'border-slate-200 focus:border-emerald-500 focus:ring-emerald-500/20'
                            }`}
                          />
                        </div>
                        {errors.address && (
                          <p className="text-xs text-red-500 font-medium mt-1">{errors.address}</p>
                        )}
                      </div>

                      {/* Occupation */}
                      <div>
                        <label htmlFor="occupation" className="block text-xs font-medium text-slate-700 mb-1.5">
                          Occupation <span className="text-red-500">*</span>
                        </label>
                        <div className="relative">
                          <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
                            <Briefcase className="w-4 h-4" />
                          </span>
                          <input
                            type="text"
                            name="occupation"
                            id="occupation"
                            required
                            value={formData.occupation}
                            onChange={handleChange}
                            placeholder="e.g. Civil Servant, Engineer"
                            className={`w-full pl-10 pr-4 py-2.5 rounded-lg border text-sm text-slate-800 bg-white placeholder-slate-400 focus:outline-none focus:ring-1 transition-all ${
                              errors.occupation
                                ? 'border-red-300 focus:border-red-500 focus:ring-red-500/20'
                                : 'border-slate-200 focus:border-emerald-500 focus:ring-emerald-500/20'
                            }`}
                          />
                        </div>
                        {errors.occupation && (
                          <p className="text-xs text-red-500 font-medium mt-1">{errors.occupation}</p>
                        )}
                      </div>
                    </div>
                  </motion.div>
                )}

                {/* STEP 3: QUALIFICATIONS & UPLOADS */}
                {step === 3 && (
                  <motion.div
                    key="step-3"
                    initial={{ opacity: 0, x: 10 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -10 }}
                    className="space-y-5"
                  >
                    <div>
                      <h3 className="text-base font-medium text-slate-900 mb-1">Qualifications & Photograph</h3>
                      <p className="text-xs text-slate-400 mb-4">Optionally detail your training, and provide a required passport photograph.</p>
                    </div>

                    <div className="space-y-4">
                      {/* Education qualification */}
                      <div>
                        <label htmlFor="education" className="block text-xs font-medium text-slate-700 mb-1.5">
                          Education Qualification
                        </label>
                        <div className="relative">
                          <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
                            <GraduationCap className="w-4 h-4" />
                          </span>
                          <select
                            name="education"
                            id="education"
                            value={formData.education}
                            onChange={handleChange}
                            className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-slate-200 text-sm text-slate-800 bg-white focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500/20 transition-all"
                          >
                            <option value="">Select Highest Qualification</option>
                            <option value="SSCE / WAEC">SSCE / WAEC</option>
                            <option value="OND / ND">OND / ND</option>
                            <option value="HND">HND</option>
                            <option value="Bachelor's Degree">Bachelor's Degree</option>
                            <option value="Master's Degree">Master's Degree</option>
                            <option value="PhD">PhD</option>
                            <option value="Other">Other</option>
                          </select>
                        </div>
                      </div>

                      {/* Skills / Professional */}
                      <div>
                        <label htmlFor="skills" className="block text-xs font-medium text-slate-700 mb-1.5">
                          Skills & Professional Certifications
                        </label>
                        <div className="relative">
                          <span className="absolute top-3 left-3 text-slate-400">
                            <Award className="w-4 h-4" />
                          </span>
                          <textarea
                            name="skills"
                            id="skills"
                            rows={2}
                            value={formData.skills}
                            onChange={handleChange}
                            placeholder="e.g. Project Management, Chartered Accountant, Web Development"
                            className="w-full pl-10 pr-4 py-2 rounded-lg border border-slate-200 text-sm text-slate-800 bg-white placeholder-slate-400 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500/20 transition-all"
                          />
                        </div>
                      </div>

                      {/* Passport Photograph Drag & Drop */}
                      <div>
                        <label className="block text-xs font-medium text-slate-700 mb-1.5">
                          Passport Photograph <span className="text-red-500">*</span>
                        </label>

                        <div
                          onDragOver={handleDragOver}
                          onDragLeave={handleDragLeave}
                          onDrop={handleDrop}
                          className={`border-2 border-dashed rounded-xl p-5 text-center transition-all ${
                            isDragging
                              ? 'border-emerald-500 bg-emerald-50/20'
                              : formData.passportPhoto
                              ? 'border-slate-200 bg-slate-50/50'
                              : errors.passportPhoto
                              ? 'border-red-300 bg-red-50/10'
                              : 'border-slate-200 hover:border-slate-300'
                          }`}
                        >
                          {formData.passportPhoto ? (
                            <div className="flex flex-col items-center space-y-3">
                              <img
                                src={formData.passportPhoto}
                                alt="Passport Preview"
                                referrerPolicy="no-referrer"
                                className="w-24 h-24 object-cover rounded-lg border border-slate-200 shadow-xs"
                              />
                              <div className="flex space-x-2">
                                <label
                                  htmlFor="photo-upload-input"
                                  className="text-xs font-medium text-emerald-700 hover:text-emerald-800 bg-emerald-50 hover:bg-emerald-100 px-3 py-1.5 rounded-lg border border-emerald-100 cursor-pointer transition-all"
                                >
                                  Change Photo
                                </label>
                                <button
                                  type="button"
                                  onClick={() => setFormData((p) => ({ ...p, passportPhoto: '' }))}
                                  className="text-xs font-medium text-red-600 hover:text-red-700 bg-red-50 hover:bg-red-100 px-3 py-1.5 rounded-lg border border-red-100 cursor-pointer transition-all"
                                >
                                  Remove
                                </button>
                              </div>
                            </div>
                          ) : (
                            <div className="flex flex-col items-center space-y-2">
                              <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-500">
                                <Upload className="w-5 h-5" />
                              </div>
                              <div>
                                <label
                                  htmlFor="photo-upload-input"
                                  className="text-sm font-semibold text-emerald-600 hover:text-emerald-700 cursor-pointer"
                                >
                                  Click to upload
                                </label>
                                <span className="text-sm text-slate-500"> or drag and drop</span>
                              </div>
                              <p className="text-xs text-slate-400">JPG, PNG up to 1.5MB</p>
                            </div>
                          )}
                          <input
                            type="file"
                            id="photo-upload-input"
                            accept="image/*"
                            onChange={handleFileChange}
                            className="hidden"
                          />
                        </div>
                        {errors.passportPhoto && (
                          <p className="text-xs text-red-500 font-medium mt-1">{errors.passportPhoto}</p>
                        )}
                      </div>
                    </div>
                  </motion.div>
                )}

                {/* STEP 4: VERIFY DETAILS & CAPTCHA */}
                {step === 4 && (
                  <motion.div
                    key="step-4"
                    initial={{ opacity: 0, x: 10 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -10 }}
                    className="space-y-6"
                  >
                    <div>
                      <h3 className="text-base font-medium text-slate-900 mb-1">Verify Registration & Security</h3>
                      <p className="text-xs text-slate-400 mb-4">Review your entries and solve the security check to complete.</p>
                    </div>

                    {/* Summary Matrix */}
                    <div className="bg-slate-50 border border-slate-100 rounded-xl p-4 sm:p-5 space-y-3.5 text-xs text-slate-700">
                      <div className="flex items-center space-x-3.5 pb-2.5 border-b border-slate-200/50">
                        {formData.passportPhoto && (
                          <img
                            src={formData.passportPhoto}
                            alt="Preview"
                            referrerPolicy="no-referrer"
                            className="w-12 h-12 object-cover rounded-lg border border-slate-200 shadow-2xs"
                          />
                        )}
                        <div>
                          <p className="text-sm font-semibold text-slate-900">{formData.fullName}</p>
                          <p className="text-slate-500 font-mono text-[10px]">{formData.email}</p>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-x-4 gap-y-2.5">
                        <div>
                          <span className="text-slate-400 block mb-0.5">Phone Number</span>
                          <span className="font-medium text-slate-800">{formData.phoneNumber}</span>
                        </div>
                        <div>
                          <span className="text-slate-400 block mb-0.5">Date of Birth</span>
                          <span className="font-medium text-slate-800">{formData.dob}</span>
                        </div>
                        <div>
                          <span className="text-slate-400 block mb-0.5">State of Origin</span>
                          <span className="font-medium text-slate-800">{formData.stateOfOrigin}</span>
                        </div>
                        <div>
                          <span className="text-slate-400 block mb-0.5">Gender</span>
                          <span className="font-medium text-slate-800 capitalize">{formData.gender}</span>
                        </div>
                        <div className="col-span-2">
                          <span className="text-slate-400 block mb-0.5">Occupation</span>
                          <span className="font-medium text-slate-800">{formData.occupation}</span>
                        </div>
                        <div className="col-span-2">
                          <span className="text-slate-400 block mb-0.5">Address</span>
                          <span className="font-medium text-slate-800 leading-relaxed">{formData.address}</span>
                        </div>
                      </div>
                    </div>

                    {/* CAPTCHA Protection */}
                    <div className="border border-slate-200/60 rounded-xl p-4 bg-slate-50/50">
                      <div className="flex justify-between items-center mb-2.5">
                        <label htmlFor="captchaAnswer" className="block text-xs font-semibold text-slate-700">
                          Security CAPTCHA Verification <span className="text-red-500">*</span>
                        </label>
                        <button
                          type="button"
                          onClick={fetchCaptcha}
                          className="flex items-center space-x-1 text-slate-500 hover:text-slate-800 text-[11px] font-medium transition-all"
                        >
                          <RefreshCw className="w-3 h-3" />
                          <span>Reload</span>
                        </button>
                      </div>

                      <div className="flex items-center space-x-3 mb-2">
                        {/* CAPTCHA visual question display */}
                        <div className="bg-slate-900 text-slate-100 font-mono select-none text-sm font-bold tracking-wider px-4 py-2.5 rounded-lg border border-slate-800 shadow-inner flex items-center justify-center">
                          {captchaChallenge ? captchaChallenge.question : 'Loading...'}
                        </div>
                        <input
                          type="text"
                          name="captchaAnswer"
                          id="captchaAnswer"
                          required
                          value={captchaAnswer}
                          onChange={(e) => {
                            setCaptchaAnswer(e.target.value);
                            if (errors.captchaAnswer) {
                              setErrors((p) => {
                                const c = { ...p };
                                delete c.captchaAnswer;
                                return c;
                              });
                            }
                          }}
                          placeholder="Your answer"
                          className={`flex-1 px-3 py-2.5 rounded-lg border text-sm text-slate-800 bg-white placeholder-slate-400 focus:outline-none focus:ring-1 transition-all ${
                            errors.captchaAnswer
                              ? 'border-red-300 focus:border-red-500 focus:ring-red-500/20'
                              : 'border-slate-200 focus:border-emerald-500 focus:ring-emerald-500/20'
                          }`}
                        />
                      </div>
                      <p className="text-[10px] text-slate-400">
                        This protects our relational database constraints from machine automated form-spamming.
                      </p>
                      {errors.captchaAnswer && (
                        <p className="text-xs text-red-500 font-medium mt-1">{errors.captchaAnswer}</p>
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Navigation Actions */}
              <div className="flex justify-between items-center mt-8 pt-5 border-t border-slate-100">
                {step > 1 ? (
                  <button
                    type="button"
                    onClick={handlePrev}
                    className="flex items-center space-x-1 px-4 py-2.5 text-sm font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-all cursor-pointer"
                  >
                    <ChevronLeft className="w-4 h-4" />
                    <span>Back</span>
                  </button>
                ) : (
                  <div /> // spacer
                )}

                {step < 4 ? (
                  <button
                    type="button"
                    onClick={handleNext}
                    className="flex items-center space-x-1 bg-emerald-600 hover:bg-emerald-700 text-white px-5 py-2.5 rounded-lg text-sm font-medium shadow-xs transition-all cursor-pointer"
                  >
                    <span>Next step</span>
                    <ChevronRight className="w-4 h-4" />
                  </button>
                ) : (
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="flex items-center space-x-1.5 bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-600/60 text-white px-6 py-2.5 rounded-lg text-sm font-semibold shadow-xs hover:shadow-sm transition-all cursor-pointer"
                  >
                    {isSubmitting ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        <span>Submitting...</span>
                      </>
                    ) : (
                      <>
                        <span>Submit Registration</span>
                        <ArrowRight className="w-4 h-4" />
                      </>
                    )}
                  </button>
                )}
              </div>
            </form>
          </div>
        ) : (
          /* SUCCESS RESPONSE CARD */
          <motion.div
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            className="p-8 text-center flex flex-col items-center"
          >
            <div className="w-16 h-16 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center mb-5 border border-emerald-100">
              <CheckCircle2 className="w-10 h-10" />
            </div>

            <h2 className="text-2xl font-sans font-bold text-slate-900 mb-3">
              Congratulations!
            </h2>
            <p className="text-sm text-slate-600 font-medium mb-5 max-w-md leading-relaxed">
              {submitSuccess.message}
            </p>

            {/* Generated Receipt details */}
            <div className="w-full bg-slate-50 border border-slate-100 rounded-xl p-5 text-left text-xs text-slate-700 space-y-3 mb-6 max-w-md">
              <p className="font-semibold text-slate-800 border-b border-slate-200 pb-2 flex justify-between">
                <span>Candidate Slip</span>
                <span className="text-emerald-700 font-mono">{submitSuccess.registration.id}</span>
              </p>
              <div className="grid grid-cols-3 gap-2">
                <span className="text-slate-400">FullName:</span>
                <span className="col-span-2 font-medium text-slate-900">{submitSuccess.registration.fullName}</span>
                
                <span className="text-slate-400">Email:</span>
                <span className="col-span-2 font-mono text-slate-950 font-medium">{submitSuccess.registration.email}</span>
                
                <span className="text-slate-400">Phone:</span>
                <span className="col-span-2 font-medium text-slate-900">{submitSuccess.registration.phoneNumber}</span>
                
                <span className="text-slate-400">Created:</span>
                <span className="col-span-2 text-slate-500">{new Date(submitSuccess.registration.createdAt).toLocaleString()}</span>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-3 w-full justify-center">
              <button
                type="button"
                onClick={handleReset}
                className="bg-emerald-600 hover:bg-emerald-700 text-white px-5 py-2.5 rounded-lg text-sm font-semibold shadow-xs transition-all cursor-pointer text-center"
              >
                New Registration
              </button>
              <button
                type="button"
                onClick={onViewAdmin}
                className="bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700 px-5 py-2.5 rounded-lg text-sm font-medium transition-all cursor-pointer text-center"
              >
                Manage Records
              </button>
            </div>
          </motion.div>
        )}
      </div>

      {/* Safety Policy Margin Note */}
      <div className="text-center text-[10px] text-slate-400 font-medium flex items-center justify-center space-x-1.5">
        <span>🔒 Parameterized database constraints active. No duplicate record is permitted to enter the schemas.</span>
      </div>
    </div>
  );
}
