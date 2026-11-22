import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { SizeGuideSheet } from './SizeGuideSheet';
import { ShoppingBag, Truck, CreditCard, CheckCircle, ArrowLeft, ArrowRight, Ruler } from 'lucide-react';

export const UniformOrderSheet: React.FC<{ initialType?: 'uniform' | 'shoes' }> = ({
  initialType = 'uniform',
}) => {
  const { activeKid, createOrder, closeSheet, openSheet, t } = useApp();

  const [step, setStep] = useState<number>(0);
  const [orderType, setOrderType] = useState<'uniform' | 'shoes'>(initialType);

  // Items selection state
  const [uniformSelections, setUniformSelections] = useState({
    shirtQty: 2,
    shirtSize: 'M (14-15)',
    skirtQty: 1,
    skirtSize: 'M',
    sweaterQty: 1,
    sweaterSize: 'L',
  });

  const [shoesSelections, setShoesSelections] = useState({
    shoeSize: '39 EU',
    shoeQty: 1,
    shoeType: 'Black Leather Bata Toughies',
  });

  const [deliveryMethod, setDeliveryMethod] = useState<'school' | 'store' | 'home'>('school');
  const [homeAddress, setHomeAddress] = useState('KG 123 St, Kimironko, Kigali');
  const [paymentOption, setPaymentOption] = useState<'full' | 'instalment'>('full');

  const calculateTotal = () => {
    if (orderType === 'shoes') {
      return shoesSelections.shoeQty * 14000;
    }
    return (
      uniformSelections.shirtQty * 5500 +
      uniformSelections.skirtQty * 6500 +
      uniformSelections.sweaterQty * 7500
    );
  };

  const handlePlaceOrder = () => {
    const total = calculateTotal();
    const orderId = 'ORD-' + Math.floor(1000 + Math.random() * 9000);
    const trackingNumber = 'TRK-USS-' + Math.floor(10000 + Math.random() * 90000);

    const items =
      orderType === 'shoes'
        ? [
            {
              name: shoesSelections.shoeType,
              size: shoesSelections.shoeSize,
              qty: shoesSelections.shoeQty,
              price: 14000,
            },
          ]
        : [
            {
              name: 'White Crested Shirt',
              size: uniformSelections.shirtSize,
              qty: uniformSelections.shirtQty,
              price: 5500,
            },
            {
              name: 'Navy School Skirt / Trousers',
              size: uniformSelections.skirtSize,
              qty: uniformSelections.skirtQty,
              price: 6500,
            },
            {
              name: 'School Crested Sweater',
              size: uniformSelections.sweaterSize,
              qty: uniformSelections.sweaterQty,
              price: 7500,
            },
          ];

    createOrder({
      id: orderId,
      kidId: activeKid.id,
      type: orderType,
      items,
      total,
      deliveryMethod,
      deliveryAddress: deliveryMethod === 'home' ? homeAddress : undefined,
      status: 'Order placed',
      orderDate: new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }),
      expectedDelivery: deliveryMethod === 'home' ? '2-3 Business days' : 'School store on Monday',
      trackingNumber,
    });

    closeSheet();
  };

  const openSizeGuide = () => {
    openSheet(<SizeGuideSheet />, t('Size guide'));
  };

  const steps = [t('Select Items'), t('Delivery'), t('Payment terms'), t('Review')];

  return (
    <div className="space-y-4">
      {/* Progress header */}
      <div className="flex items-center justify-between text-xs">
        <span className="font-bold text-[#13213D]">
          {t('Step')} {step + 1} {t('of')} 4: {steps[step]}
        </span>
        <button
          type="button"
          onClick={openSizeGuide}
          className="text-[#F5A623] font-bold text-[11px] flex items-center gap-1 hover:underline"
        >
          <Ruler className="w-3.5 h-3.5" /> {t('Size guide')}
        </button>
      </div>

      <div className="flex gap-1.5 h-1.5">
        {steps.map((_, i) => (
          <div
            key={i}
            className={`flex-1 rounded-full transition-all ${
              i <= step ? 'bg-[#F5A623]' : 'bg-[#E5E8EF]'
            }`}
          />
        ))}
      </div>

      {/* Step 0: Items & Sizes */}
      {step === 0 && (
        <div className="space-y-3 text-xs">
          <div className="flex bg-slate-100 p-1 rounded-xl">
            <button
              onClick={() => setOrderType('uniform')}
              className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${
                orderType === 'uniform' ? 'bg-white text-[#13213D] shadow-sm' : 'text-[#6B7385]'
              }`}
            >
              {t('School Uniform')}
            </button>
            <button
              onClick={() => setOrderType('shoes')}
              className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${
                orderType === 'shoes' ? 'bg-white text-[#13213D] shadow-sm' : 'text-[#6B7385]'
              }`}
            >
              {t('Leather Shoes')}
            </button>
          </div>

          {orderType === 'uniform' ? (
            <div className="space-y-2.5">
              {/* Shirts */}
              <div className="bg-white p-3.5 rounded-2xl shadow-card border border-[#E5E8EF] flex items-center justify-between">
                <div>
                  <b className="text-xs text-[#13213D] block">{t('Crested White Shirts')}</b>
                  <span className="text-[#6B7385] text-[11px]">RWF 5,500 / {t('each')}</span>
                </div>
                <div className="flex items-center gap-2">
                  <select
                    value={uniformSelections.shirtSize}
                    onChange={(e) =>
                      setUniformSelections((s) => ({ ...s, shirtSize: e.target.value }))
                    }
                    className="bg-slate-50 border border-[#E5E8EF] rounded-lg px-2 py-1 text-xs font-bold"
                  >
                    <option>S (13-14)</option>
                    <option>M (14-15)</option>
                    <option>L (15-16)</option>
                    <option>XL (16+)</option>
                  </select>
                  <div className="flex items-center gap-1 bg-slate-100 rounded-lg p-0.5">
                    <button
                      type="button"
                      onClick={() =>
                        setUniformSelections((s) => ({
                          ...s,
                          shirtQty: Math.max(1, s.shirtQty - 1),
                        }))
                      }
                      className="w-6 h-6 rounded flex items-center justify-center font-bold text-slate-700"
                    >
                      -
                    </button>
                    <span className="px-1.5 font-bold">{uniformSelections.shirtQty}</span>
                    <button
                      type="button"
                      onClick={() =>
                        setUniformSelections((s) => ({ ...s, shirtQty: s.shirtQty + 1 }))
                      }
                      className="w-6 h-6 rounded flex items-center justify-center font-bold text-slate-700"
                    >
                      +
                    </button>
                  </div>
                </div>
              </div>

              {/* Skirt / Trousers */}
              <div className="bg-white p-3.5 rounded-2xl shadow-card border border-[#E5E8EF] flex items-center justify-between">
                <div>
                  <b className="text-xs text-[#13213D] block">{t('Navy Skirt / Trousers')}</b>
                  <span className="text-[#6B7385] text-[11px]">RWF 6,500 / {t('each')}</span>
                </div>
                <div className="flex items-center gap-2">
                  <select
                    value={uniformSelections.skirtSize}
                    onChange={(e) =>
                      setUniformSelections((s) => ({ ...s, skirtSize: e.target.value }))
                    }
                    className="bg-slate-50 border border-[#E5E8EF] rounded-lg px-2 py-1 text-xs font-bold"
                  >
                    <option>S</option>
                    <option>M</option>
                    <option>L</option>
                  </select>
                  <div className="flex items-center gap-1 bg-slate-100 rounded-lg p-0.5">
                    <button
                      type="button"
                      onClick={() =>
                        setUniformSelections((s) => ({
                          ...s,
                          skirtQty: Math.max(0, s.skirtQty - 1),
                        }))
                      }
                      className="w-6 h-6 rounded flex items-center justify-center font-bold text-slate-700"
                    >
                      -
                    </button>
                    <span className="px-1.5 font-bold">{uniformSelections.skirtQty}</span>
                    <button
                      type="button"
                      onClick={() =>
                        setUniformSelections((s) => ({ ...s, skirtQty: s.skirtQty + 1 }))
                      }
                      className="w-6 h-6 rounded flex items-center justify-center font-bold text-slate-700"
                    >
                      +
                    </button>
                  </div>
                </div>
              </div>

              {/* Sweater */}
              <div className="bg-white p-3.5 rounded-2xl shadow-card border border-[#E5E8EF] flex items-center justify-between">
                <div>
                  <b className="text-xs text-[#13213D] block">{t('Embroidered Sweater')}</b>
                  <span className="text-[#6B7385] text-[11px]">RWF 7,500 / {t('each')}</span>
                </div>
                <div className="flex items-center gap-2">
                  <select
                    value={uniformSelections.sweaterSize}
                    onChange={(e) =>
                      setUniformSelections((s) => ({ ...s, sweaterSize: e.target.value }))
                    }
                    className="bg-slate-50 border border-[#E5E8EF] rounded-lg px-2 py-1 text-xs font-bold"
                  >
                    <option>M</option>
                    <option>L</option>
                    <option>XL</option>
                  </select>
                  <div className="flex items-center gap-1 bg-slate-100 rounded-lg p-0.5">
                    <button
                      type="button"
                      onClick={() =>
                        setUniformSelections((s) => ({
                          ...s,
                          sweaterQty: Math.max(0, s.sweaterQty - 1),
                        }))
                      }
                      className="w-6 h-6 rounded flex items-center justify-center font-bold text-slate-700"
                    >
                      -
                    </button>
                    <span className="px-1.5 font-bold">{uniformSelections.sweaterQty}</span>
                    <button
                      type="button"
                      onClick={() =>
                        setUniformSelections((s) => ({ ...s, sweaterQty: s.sweaterQty + 1 }))
                      }
                      className="w-6 h-6 rounded flex items-center justify-center font-bold text-slate-700"
                    >
                      +
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-white p-4 rounded-2xl shadow-card border border-[#E5E8EF] space-y-3">
              <div className="flex justify-between items-center">
                <div>
                  <b className="text-sm text-[#13213D] block">{shoesSelections.shoeType}</b>
                  <span className="text-[#6B7385]">{t('Durable school shoes with warranty')}</span>
                </div>
                <b className="text-sm font-extrabold text-[#F5A623]">RWF 14,000</b>
              </div>
              <div className="pt-2 border-t border-[#E5E8EF] flex justify-between items-center">
                <span className="font-bold text-[#13213D]">{t('Select Shoe Size:')}</span>
                <select
                  value={shoesSelections.shoeSize}
                  onChange={(e) =>
                    setShoesSelections((s) => ({ ...s, shoeSize: e.target.value }))
                  }
                  className="bg-slate-50 border border-[#E5E8EF] rounded-lg px-3 py-1.5 text-xs font-extrabold text-[#13213D]"
                >
                  <option>37 EU</option>
                  <option>38 EU</option>
                  <option>39 EU</option>
                  <option>40 EU</option>
                  <option>41 EU</option>
                </select>
              </div>
            </div>
          )}

          <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 flex justify-between items-center">
            <span className="font-bold text-amber-950">{t('Subtotal:')}</span>
            <b className="text-base font-extrabold text-[#13213D]">
              RWF {calculateTotal().toLocaleString()}
            </b>
          </div>
        </div>
      )}

      {/* Step 1: Delivery Method */}
      {step === 1 && (
        <div className="space-y-3 text-xs">
          <label className="text-xs font-bold text-[#13213D] block">
            {t('Choose Delivery Method')}
          </label>
          {[
            {
              id: 'school',
              title: t('Deliver to school'),
              sub: t('Delivered to class teacher {{teacher}} · Free', { teacher: activeKid.ct }),
              icon: ShoppingBag,
            },

            {
              id: 'home',
              title: t('Home delivery in Kigali'),
              sub: t('Direct courier delivery · RWF 2,500'),
              icon: Truck,
            },
          ].map((m) => {
            const isSelected = deliveryMethod === m.id;
            const Icon = m.icon;
            return (
              <div
                key={m.id}
                onClick={() => setDeliveryMethod(m.id as any)}
                className={`p-3.5 rounded-2xl border cursor-pointer flex items-center justify-between transition-all ${
                  isSelected
                    ? 'bg-amber-50 border-amber-300 shadow-sm'
                    : 'bg-white border-[#E5E8EF] hover:border-slate-300'
                }`}
              >
                <div className="flex items-center gap-3">
                  <Icon className="w-4 h-4 text-[#F5A623]" />
                  <div>
                    <b className="text-xs text-[#13213D] block">{m.title}</b>
                    <small className="text-[#6B7385] text-[10px]">{m.sub}</small>
                  </div>
                </div>
                <div
                  className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${
                    isSelected ? 'border-[#F5A623] bg-[#F5A623]' : 'border-slate-300'
                  }`}
                >
                  {isSelected && <span className="w-1.5 h-1.5 rounded-full bg-white" />}
                </div>
              </div>
            );
          })}

          {deliveryMethod === 'home' && (
            <div className="mt-2">
              <label className="text-xs font-bold text-[#13213D] mb-1.5 block">
                {t('Home Address in Kigali')}
              </label>
              <input
                type="text"
                value={homeAddress}
                onChange={(e) => setHomeAddress(e.target.value)}
                className="w-full bg-white border border-[#E5E8EF] rounded-xl px-4 py-3 text-xs font-semibold text-[#13213D] focus:outline-none focus:border-[#F5A623]"
              />
            </div>
          )}
        </div>
      )}

      {/* Step 2: Payment Plan */}
      {step === 2 && (
        <div className="space-y-3 text-xs">
          <label className="text-xs font-bold text-[#13213D] block">
            {t('Payment Terms')}
          </label>
          {[
            {
              id: 'full',
              title: t('Pay in full now'),
              sub: t('Instant settlement via MoMo or Card'),
            },
            {
              id: 'instalment',
              title: t('Spread over 3 monthly instalments'),
              sub: t('0% interest with school approval'),
            },
          ].map((p) => {
            const isSelected = paymentOption === p.id;
            return (
              <div
                key={p.id}
                onClick={() => setPaymentOption(p.id as any)}
                className={`p-3.5 rounded-2xl border cursor-pointer flex items-center justify-between transition-all ${
                  isSelected
                    ? 'bg-amber-50 border-amber-300 shadow-sm'
                    : 'bg-white border-[#E5E8EF] hover:border-slate-300'
                }`}
              >
                <div>
                  <b className="text-xs text-[#13213D] block">{p.title}</b>
                  <small className="text-[#6B7385] text-[10px]">{p.sub}</small>
                </div>
                <div
                  className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${
                    isSelected ? 'border-[#F5A623] bg-[#F5A623]' : 'border-slate-300'
                  }`}
                >
                  {isSelected && <span className="w-1.5 h-1.5 rounded-full bg-white" />}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Step 3: Review & Place */}
      {step === 3 && (
        <div className="space-y-3 text-xs">
          <div className="bg-white p-4 rounded-2xl shadow-card border border-[#E5E8EF] space-y-2">
            <div className="flex justify-between">
              <span className="text-[#6B7385]">{t('Learner:')}</span>
              <b className="text-[#13213D]">{activeKid.n} ({activeKid.cls})</b>
            </div>
            <div className="flex justify-between">
              <span className="text-[#6B7385]">{t('Order Type:')}</span>
              <span className="text-[#13213D]">{t(orderType === 'uniform' ? 'Uniform Order' : 'Shoes Order')}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[#6B7385]">{t('Delivery:')}</span>
              <span className="text-[#13213D]">{t(deliveryMethod === 'school' ? 'School delivery' : deliveryMethod === 'home' ? 'Home delivery' : 'Store pickup')}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[#6B7385]">{t('Payment Plan:')}</span>
              <span className="text-[#13213D]">{t(paymentOption === 'full' ? 'Pay in full now' : 'Spread over 3 monthly instalments')}</span>
            </div>
            <div className="pt-2 border-t border-[#E5E8EF] flex justify-between items-center text-sm font-extrabold">
              <span>{t('Total Payable:')}</span>
              <span className="text-[#F5A623]">RWF {calculateTotal().toLocaleString()}</span>
            </div>
          </div>
        </div>
      )}

      {/* Navigation buttons */}
      <div className="flex gap-2 pt-2">
        {step > 0 && (
          <button
            type="button"
            onClick={() => setStep((s) => s - 1)}
            className="flex-1 py-3 rounded-xl bg-slate-200 text-slate-700 text-xs font-bold hover:bg-slate-300 transition-colors flex items-center justify-center gap-1"
          >
            <ArrowLeft className="w-3.5 h-3.5" /> {t('Back')}
          </button>
        )}
        {step < 3 ? (
          <button
            type="button"
            onClick={() => setStep((s) => s + 1)}
            className="flex-2 py-3 px-5 rounded-xl bg-[#13213D] text-white text-xs font-bold hover:bg-slate-900 active:scale-95 transition-all shadow-md flex items-center justify-center gap-1"
          >
            {t('Continue')} <ArrowRight className="w-3.5 h-3.5" />
          </button>
        ) : (
          <button
            type="button"
            onClick={handlePlaceOrder}
            className="flex-2 py-3 px-5 rounded-xl bg-[#F5A623] text-[#13213D] text-xs font-extrabold hover:bg-amber-400 active:scale-95 transition-all shadow-md"
          >
            {t('Place order · {{amount}}', { amount: `RWF ${calculateTotal().toLocaleString()}` })}
          </button>
        )}
      </div>
    </div>
  );
};
