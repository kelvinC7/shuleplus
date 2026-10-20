'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  Search,
  Globe,
  ChevronDown,
  ChevronRight,
  ShieldCheck,
  X,
  ArrowRight,
} from 'lucide-react';

const menuData = {
  suppliers: {
    title: 'Certified Suppliers',
    heading: 'CERTIFIED PARTNERS',
    items: [
      { name: 'Global Grains Ltd', desc: 'Certified wheat and maize distributor', link: '#' },
      { name: 'Farm Fresh Co.', desc: 'Organic fruit and vegetable sourcing', link: '#' },
      { name: 'Prime Meat Suppliers', desc: 'High-quality poultry and beef', link: '#' },
      { name: 'Dairy Gold Africa', desc: 'Milk and dairy product logistics', link: '#' },
      { name: 'Crystal Springs', desc: 'Mineral water and juice distribution', link: '#' },
      { name: 'Vitality Drinks', desc: 'Nutritional school beverage partner', link: '#' },
      { name: 'Sunrise Oil Mills', desc: 'Cooking oil and wholesale fat supplies', link: '#' },
      { name: 'Staple Foods Group', desc: 'Bulk rice, beans, and pulse distribution', link: '#' },
      { name: 'Kitchen Essentials', desc: 'Industrial school kitchen equipment', link: '#' },
      { name: 'Ecosystem Partners', desc: 'Digital and hardware logistics support', link: '#' },
    ],
  },
  schools: {
    title: 'School Ecosystem',
    heading: 'OPERATIONAL NODES',
    items: [
      { name: 'Canteen Management', desc: 'Total control over facilities', link: '/register-canteen' },
      { name: 'Pocket Money Hub', desc: 'Digital wallet for students', link: '#' },
      { name: 'Expense Tracking', desc: 'Comprehensive auditing tools', link: '#' },
      { name: 'Meal Planning', desc: 'Nutritional tracking & scheduling', link: '#' },
      { name: 'Instant Payments', desc: 'Contactless student commerce', link: '#' },
      { name: 'Attendance Sync', desc: 'Logistics-linked presence', link: '#' },
    ],
  },
};

export default function LandingLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [isAnnouncementVisible, setIsAnnouncementVisible] = useState(true);
  const [activeMenu, setActiveMenu] = useState<'suppliers' | 'schools' | null>(null);

  return (
    <div className="flex flex-col min-h-screen bg-navblue font-outfit text-white overflow-x-hidden">
      {/* 1. Global Announcement Bar (Premium Blue Gradient) */}
      {isAnnouncementVisible && (
        <div className="bg-gradient-to-r from-blue-900 to-navblue py-3 px-6 relative z-[90] border-b border-white/5 shadow-lg">
          <div className="max-w-[1400px] mx-auto flex items-center justify-center gap-4">
            <p className="text-[13px] mr-10 md:mr-0 md:text-sm font-medium tracking-tight">
              Unlock efficient school logistics with{' '}
              <span className="font-black italic text-shuleamber">ShuleCanteen</span>. Here&apos;s
              everything you need to know.
            </p>
            <button className="hidden md:flex px-6 py-1.5 rounded-full border border-white/30 text-xs font-black hover:bg-white hover:text-navblue transition-all">
              Learn more
            </button>
            <button
              onClick={() => setIsAnnouncementVisible(false)}
              className="absolute right-4 top-1/2 -translate-y-1/2 w-8 h-8 rounded-lg bg-white/5 hover:bg-white/10 flex items-center justify-center transition-all"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* 2. Main High-Fidelity Navigation (Glassmorphism) */}
      <div className="sticky top-0 z-[100] w-full">
        <nav className="bg-navblue/80 backdrop-blur-2xl border-b border-white/10 relative">
          <div className="max-w-[1400px] ml-auto p-3 flex items-center justify-between md:pl-6 pr-0">
            {/* Logo Section */}
            <div className="flex items-center gap-10">
              <div className="flex items-center gap-1 md:gap-3 cursor-pointer" onClick={() => router.push('/')}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src="/logo_white.png" alt="Logo" className="w-9 h-9" />
                <div className="hidden md:block h-6 w-[1px] bg-white/20 mx-1"></div>
                <h1 className="text-xl font-black italic tracking-tighter text-white">
                  Shule<span className="text-shuleamber">Canteen</span>
                </h1>
              </div>

              {/* Nav Links (Desktop) */}
              <div className="hidden lg:flex items-center gap-8">
                <button
                  className={`text-sm font-bold hover:text-shuleamber transition-all ${pathname === '/' ? 'text-shuleamber' : ''}`}
                  onClick={() => router.push('/')}
                >
                  Home
                </button>
                <div
                  className={`flex items-center gap-1 group cursor-pointer transition-all ${activeMenu === 'suppliers' ? 'text-shuleamber' : ''}`}
                  onClick={() => setActiveMenu(activeMenu === 'suppliers' ? null : 'suppliers')}
                >
                  <span className="text-sm font-bold group-hover:text-shuleamber">Suppliers</span>
                  <ChevronDown
                    className={`w-4 h-4 opacity-40 group-hover:text-shuleamber transition-transform ${activeMenu === 'suppliers' ? 'rotate-180 opacity-100' : ''}`}
                  />
                </div>
                <div
                  className={`flex items-center gap-1 group cursor-pointer transition-all ${activeMenu === 'schools' ? 'text-shuleamber' : ''}`}
                  onClick={() => setActiveMenu(activeMenu === 'schools' ? null : 'schools')}
                >
                  <span className="text-sm font-bold group-hover:text-shuleamber">Schools</span>
                  <ChevronDown
                    className={`w-4 h-4 opacity-40 group-hover:text-shuleamber transition-transform ${activeMenu === 'schools' ? 'rotate-180 opacity-100' : ''}`}
                  />
                </div>
                <button className="text-sm font-bold hover:text-shuleamber transition-all">
                  About Us
                </button>
              </div>
            </div>

            {/* Mega Menu Dropdown */}
            {activeMenu && (
              <div
                className="absolute top-full left-0 w-full bg-white border-b border-slate-200 shadow-2xl animate-in fade-in slide-in-from-top-2 duration-300 z-[110]"
                onMouseLeave={() => setActiveMenu(null)}
              >
                <div className="max-w-[1400px] mx-auto p-12">
                  <div className="mb-10">
                    <div className="flex items-center gap-4 mb-2">
                      <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center text-blue-600 shadow-sm">
                        <ShieldCheck className="w-6 h-6" />
                      </div>
                      <h3 className="text-sm font-black text-slate-800 tracking-widest uppercase">
                        {menuData[activeMenu].heading}
                      </h3>
                    </div>
                    <div className="h-[1px] w-full bg-slate-100"></div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-16 gap-y-8">
                    {menuData[activeMenu].items.map((item, idx) => (
                      <div
                        key={idx}
                        className="group cursor-pointer flex items-center justify-between hover:bg-slate-50/50 p-3 -m-3 rounded-xl transition-all"
                        onClick={() => {
                          if (item.link.startsWith('/')) router.push(item.link);
                          setActiveMenu(null);
                        }}
                      >
                        <div className="space-y-1">
                          <h4 className="text-[15px] font-black text-slate-700 group-hover:text-blue-600 transition-colors">
                            {item.name}
                          </h4>
                          <p className="text-xs text-slate-400 font-medium group-hover:text-slate-600">
                            {item.desc}
                          </p>
                        </div>
                        <ChevronRight className="w-4 h-4 text-slate-200 group-hover:text-blue-600 group-hover:translate-x-1 transition-all" />
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Action Section */}
            <div className="flex items-center gap-6 ml-auto pr-6 md:pr-[240px]">
              <div className="hidden md:flex items-center gap-4 border-r border-white/10 pr-6">
                <div className="flex items-center gap-2 cursor-pointer group">
                  <Globe className="w-5 h-5 opacity-60 group-hover:opacity-100 transition-all" />
                  <span className="text-[11px] font-black uppercase tracking-widest group-hover:text-shuleamber transition-all">
                    ENG
                  </span>
                  <ChevronDown className="w-3 h-3 opacity-40" />
                </div>
              </div>

              <Link
                href="/login"
                className="px-8 py-3 bg-white/5 hover:bg-white text-white hover:text-navblue rounded-2xl text-[13px] font-black tracking-wide transition-all flex items-center gap-2"
              >
                Login
                <ChevronDown className="w-4 h-4 opacity-40" />
              </Link>
            </div>

            {/* Absolutely Positioned Edge Button */}
            <Link
              href="/register-supplier"
              className="hidden md:flex absolute -top-1 right-0 items-center justify-center px-6 h-20 bg-shuleamber hover:bg-white text-navblue rounded-l-[18px] rounded-r-none text-sm font-black tracking-tight shadow-[-10px_0_30px_rgba(0,0,0,0.1)] hover:scale-[1.02] active:scale-[0.98] transition-all min-w-[180px] z-[120]"
            >
              Onboard as a Supplier
            </Link>
          </div>
        </nav>
      </div>

      {/* 3. Background Patterns & Main Content */}
      <div className="relative flex-1 flex flex-col">
        <main className="relative z-10 flex-1 flex flex-col items-center">{children}</main>

        {/* Footer Section */}
        <footer className="relative z-20 flex flex-col items-center space-y-6 mt-12 pb-12">
          <div className="flex items-center space-x-4">
            <div className="h-[1px] w-12 bg-gradient-to-r from-transparent to-white/10"></div>
            <div className="flex items-center space-x-1.5 whitespace-nowrap">
              <span className="text-white/40 text-xs font-bold">Managed by</span>
              <span className="text-white font-black text-lg leading-none tracking-tighter">
                EDU<span className="text-shuleamber">POTO</span>
              </span>
            </div>
            <div className="h-[1px] w-12 bg-gradient-to-l from-transparent to-white/10"></div>
          </div>
          <div className="flex flex-col items-center space-y-4 px-4 text-center">
            <div className="flex items-center space-x-2 opacity-30">
              <div className="w-1 h-1 rounded-full bg-shuleamber"></div>
              <p className="text-white text-[10px] sm:text-xs font-bold leading-relaxed">
                © {new Date().getFullYear()} Edupoto Global. All rights reserved.
              </p>
              <div className="w-1 h-1 rounded-full bg-shuleamber"></div>
            </div>
          </div>
        </footer>
      </div>

      {/* Minimal Footer Decor */}
      <div className="relative z-10 py-12 px-6 border-t border-white/5 mt-auto">
        <div className="max-w-[1400px] mx-auto flex flex-col md:flex-row justify-between items-center gap-8">
          <div className="flex items-center gap-3 opacity-40">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logo_white.png" alt="Logo" className="w-6 h-6" />
            <span className="text-sm font-bold tracking-tighter italic">
              ShuleCanteen Ecosystem
            </span>
          </div>
          <div className="flex flex-wrap gap-4 md:gap-8 text-xs text-white/30">
            <Link
              href="/track-application"
              className="cursor-pointer whitespace-nowrap hover:text-white transition-all"
            >
              Track Application
            </Link>
            <span className="cursor-pointer whitespace-nowrap hover:text-white transition-all">
              Privacy Policy
            </span>
            <span className="cursor-pointer whitespace-nowrap hover:text-white transition-all">
              Terms of Service
            </span>
            <span className="cursor-pointer whitespace-nowrap hover:text-white transition-all">
              Institutional Help
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
