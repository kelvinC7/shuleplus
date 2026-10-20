'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { User, Store, Phone, Tag } from 'lucide-react';
import { PROVINCES, districtsFor, type LocationState } from '@/lib/rwanda';
import { api } from '@/services/api';

const RegisterSupplierPage = () => {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [location, setLocation] = useState<LocationState>({
    province: '',
    district: '',
  });

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    const formData = new FormData(e.target as HTMLFormElement);
    const data = {
      fullName: formData.get('fullName'),
      phone: formData.get('phone'),
      businessName: formData.get('businessName'),
      category: formData.get('category'),
      location,
    };

    try {
      const response = await api.post('/register/supplier', data);
      if (response.data.success) {
        setSubmitted(true);
      }
    } catch (err: unknown) {
      console.error('Registration failed:', err);
      setError(
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
          'Something went wrong. Please try again.'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleLocationChange = (field: 'province' | 'district', value: string) => {
    const updated = { ...location, [field]: value };
    if (field === 'province') {
      updated.district = '';
    }
    setLocation(updated);
  };

  if (submitted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-navblue p-4 text-white font-outfit">
        <div className="flex flex-col items-center space-y-8 max-w-md text-center">
          <div className="w-20 h-20 bg-shuleamber/20 rounded-full flex items-center justify-center animate-pulse">
            <Store className="text-shuleamber text-3xl" />
          </div>
          <div className="space-y-4">
            <h1 className="text-4xl font-black italic tracking-tighter">SUCCESSFULLY SUBMITTED</h1>
            <p className="text-white/60 text-sm leading-relaxed">
              Your request to join the ShuleCanteen ecosystem has been received.
              Our team will review your application and contact you via phone shortly.
            </p>
          </div>
          <button
            onClick={() => router.push('/')}
            className="bg-white text-navblue font-black py-4 px-12 rounded-full hover:bg-shuleamber hover:text-white transition-all transform active:scale-95 shadow-2xl uppercase text-xs tracking-widest"
          >
            Return Home
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-navblue p-4 text-xs font-outfit py-20">
      <div className="flex flex-col space-y-10 w-full max-w-[450px]">
        {/* Brand Identity */}
        <div
          className="flex items-center justify-center space-x-3 cursor-pointer group mb-12"
          onClick={() => router.push('/')}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo_white.png" alt="Logo" className="w-10 h-10 transition-transform duration-500" />
          <h1 className="text-white text-3xl font-black italic tracking-tighter">
            Shule<span className="text-shuleamber">Canteen</span>
          </h1>
        </div>

        {/* Onboarding Form */}
        <form onSubmit={handleSubmit} className="flex flex-col space-y-6">
          <div className="space-y-1 mb-4">
            <h2 className="text-white text-2xl font-black tracking-tight italic">Supplier Onboarding</h2>
            <p className="text-white/40 text-[10px] uppercase tracking-widest font-bold">
              Join the digital school logistics network
            </p>
          </div>

          {error && (
            <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-4 rounded-2xl text-[10px] font-bold uppercase tracking-widest text-center animate-in fade-in slide-in-from-top-2">
              {error}
            </div>
          )}

          {/* Full Name */}
          <div className="flex flex-col space-y-1">
            <label className="text-white text-lg md:text-sm">Full Name</label>
            <div className="flex items-center space-x-3 border-b border-white/30 pb-1 focus-within:border-shuleamber transition-all duration-300">
              <User className="text-white text-base" />
              <input
                type="text"
                name="fullName"
                placeholder="Enter your full name"
                className="bg-transparent text-white outline-none w-full placeholder:text-white/20 text-sm py-1"
                required
              />
            </div>
          </div>

          {/* Business Name */}
          <div className="flex flex-col space-y-1">
            <label className="text-white text-lg md:text-sm">Business Name</label>
            <div className="flex items-center space-x-3 border-b border-white/30 pb-1 focus-within:border-shuleamber transition-all duration-300">
              <Store className="text-white text-base" />
              <input
                type="text"
                name="businessName"
                placeholder="Company or Trading Name"
                className="bg-transparent text-white outline-none w-full placeholder:text-white/20 text-sm py-1"
                required
              />
            </div>
          </div>

          {/* Phone Number */}
          <div className="flex flex-col space-y-1">
            <label className="text-white text-lg md:text-sm">Phone Number</label>
            <div className="flex items-center space-x-3 border-b border-white/30 pb-1 focus-within:border-shuleamber transition-all duration-300">
              <Phone className="text-white text-base" />
              <input
                type="tel"
                name="phone"
                placeholder="+250 7 -- --- ---"
                className="bg-transparent text-white outline-none w-full placeholder:text-white/20 text-sm py-1"
                required
              />
            </div>
          </div>

          {/* Product Category */}
          <div className="flex flex-col space-y-1">
            <label className="text-white text-lg md:text-sm">Product Category</label>
            <div className="flex items-center space-x-3 border-b border-white/30 pb-1 focus-within:border-shuleamber transition-all duration-300">
              <Tag className="text-white text-base" />
              <select
                name="category"
                className="bg-transparent text-white outline-none w-full text-sm py-1 [&>option]:bg-navblue [&>option]:text-white cursor-pointer"
                required
              >
                <option value="produce">Fresh Food & Produce</option>
                <option value="grains">Grains, Flour & Dry Goods</option>
                <option value="beverages">Beverages & Drinks</option>
                <option value="bakery">Bakery & Bread Products</option>
                <option value="poultry">Meat, Poultry & Fish</option>
                <option value="dairy">Dairy & Eggs</option>
                <option value="kitchen">Kitchen Utilities & Packaging</option>
              </select>
            </div>
          </div>

          {/* Dynamic Location Selection */}
          <div className="flex flex-col space-y-3">
            <label className="text-white text-lg md:text-sm">Business Location</label>
            <div className="grid grid-cols-2 gap-4">
              {/* Province */}
              <div className="flex items-center space-x-2 border-b border-white/30 pb-1 focus-within:border-shuleamber transition-all duration-300">
                <select
                  className="bg-transparent text-white outline-none w-full text-xs py-1 [&>option]:bg-navblue [&>option]:text-white cursor-pointer"
                  value={location.province}
                  onChange={(e) => handleLocationChange('province', e.target.value)}
                  required
                >
                  <option value="">Province</option>
                  {PROVINCES.map((p) => (
                    <option key={p} value={p}>{p}</option>
                  ))}
                </select>
              </div>

              {/* District */}
              <div className="flex items-center space-x-2 border-b border-white/30 pb-1 focus-within:border-shuleamber transition-all duration-300">
                <select
                  className="bg-transparent text-white outline-none w-full text-xs py-1 [&>option]:bg-navblue [&>option]:text-white cursor-pointer disabled:opacity-30"
                  value={location.district}
                  onChange={(e) => handleLocationChange('district', e.target.value)}
                  disabled={!location.province}
                  required
                >
                  <option value="">District</option>
                  {location.province &&
                    districtsFor(location.province).map((d) => (
                      <option key={d} value={d}>{d}</option>
                    ))}
                </select>
              </div>
            </div>
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="bg-white text-navblue font-black py-4 px-6 rounded-full hover:bg-shuleamber hover:text-white active:scale-[0.98] transition-all transform duration-300 shadow-xl text-xs uppercase tracking-widest mt-6 flex items-center justify-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSubmitting ? (
              <>
                <div className="w-4 h-4 border-2 border-navblue border-t-transparent rounded-full animate-spin"></div>
                Submitting Request...
              </>
            ) : (
              'Request Onboarding'
            )}
          </button>

          <div className="flex justify-center mt-4">
            <button
              type="button"
              onClick={() => router.push('/login')}
              className="group flex flex-col items-center space-y-1"
            >
              <span className="text-white/40 text-lg font-bold">Already have an account?</span>
              <span className="text-white text-xs tracking-widest group-hover:text-shuleamber transition-colors">
                LOGIN HERE
              </span>
            </button>
          </div>

          <footer className="flex flex-col items-center space-y-6 mt-12 pb-8">
            <div className="flex items-center space-x-4">
              <div className="h-[1px] w-12 bg-linear-to-r from-transparent to-white/10"></div>
              <div className="flex items-center space-x-1.5 whitespace-nowrap">
                <span className="text-white/40 text-[10px] font-bold uppercase tracking-widest">Managed by</span>
                <span className="text-white font-black text-lg leading-none tracking-tighter">
                  EDU<span className="text-shuleamber">POTO</span>
                </span>
              </div>
              <div className="h-[1px] w-12 bg-linear-to-l from-transparent to-white/10"></div>
            </div>
            <div className="flex flex-col items-center space-y-4">
              <div className="flex items-center space-x-2 opacity-30">
                <div className="w-1 h-1 rounded-full bg-shuleamber"></div>
                <p className="text-white text-xs font-bold leading-relaxed">
                  © {new Date().getFullYear()} Edupoto Global. All rights reserved.
                </p>
                <div className="w-1 h-1 rounded-full bg-shuleamber"></div>
              </div>
            </div>
          </footer>
        </form>
      </div>
    </div>
  );
};

export default RegisterSupplierPage;
