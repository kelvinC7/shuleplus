import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { UniformOrder } from '../../types';
import { UniformOrderSheet } from './UniformOrderSheet';
import {
  ShoppingBag,
  Package,
  QrCode,
  RefreshCw,
  Plus,
  ArrowRight,
  CheckCircle2,
  Clock,
  Check,
} from 'lucide-react';

export const OrdersPanel: React.FC = () => {
  const { orders, activeKid, openSheet, closeSheet, requestOrderExchange, showToast, t } = useApp();

  const [filter, setFilter] = useState<'all' | 'uniform' | 'shoes'>('all');
  const [exchangingOrder, setExchangingOrder] = useState<UniformOrder | null>(null);
  const [exchangeItem, setExchangeItem] = useState<string>('');
  const [exchangeOldSize, setExchangeOldSize] = useState<string>('');
  const [exchangeNewSize, setExchangeNewSize] = useState<string>('');

  const filteredOrders = orders.filter((o) => {
    if (filter === 'all') return true;
    return o.type === filter;
  });

  const handleOpenNewOrder = (type: 'uniform' | 'shoes') => {
    openSheet(<UniformOrderSheet initialType={type} />, t('Order uniform'));
  };

  const handleStartExchange = (order: UniformOrder) => {
    setExchangingOrder(order);
    const firstItem = order.items[0];
    if (firstItem) {
      setExchangeItem(firstItem.name);
      setExchangeOldSize(firstItem.size);
      // Default suggested next size
      if (order.type === 'shoes') {
        const num = parseInt(firstItem.size);
        setExchangeNewSize(num ? `${num + 1} EU` : '40 EU');
      } else {
        setExchangeNewSize(firstItem.size === 'M' ? 'L' : 'M');
      }
    }
  };

  const handleConfirmExchange = () => {
    if (!exchangingOrder) return;
    requestOrderExchange(exchangingOrder.id, exchangeItem, exchangeOldSize, exchangeNewSize);
    setExchangingOrder(null);
  };

  return (
    <div className="space-y-4 text-xs select-none">
      {/* Top CTA buttons */}
      <div className="grid grid-cols-2 gap-2">
        <button
          onClick={() => handleOpenNewOrder('uniform')}
          className="py-3 px-3 bg-[#13213D] hover:bg-slate-900 text-white font-extrabold rounded-2xl flex items-center justify-center gap-1.5 shadow-sm active:scale-95 transition-all"
        >
          <ShoppingBag className="w-3.5 h-3.5 text-[#F5A623]" />
          {t('Order Uniform')}
        </button>
        <button
          onClick={() => handleOpenNewOrder('shoes')}
          className="py-3 px-3 bg-white border border-[#E5E8EF] hover:border-slate-300 text-[#13213D] font-extrabold rounded-2xl flex items-center justify-center gap-1.5 shadow-sm active:scale-95 transition-all"
        >
          <Package className="w-3.5 h-3.5 text-[#F5A623]" />
          {t('Order Shoes')}
        </button>
      </div>

      {/* Filter Tabs */}
      <div className="flex bg-slate-100 p-1 rounded-xl gap-1 text-xs">
        {[
          { id: 'all', label: t('All Orders') },
          { id: 'uniform', label: t('Uniforms') },
          { id: 'shoes', label: t('Shoes') },
        ].map((f) => (
          <button
            key={f.id}
            onClick={() => setFilter(f.id as any)}
            className={`flex-1 py-1.5 font-bold rounded-lg transition-all text-center ${
              filter === f.id ? 'bg-white text-[#13213D] shadow-sm' : 'text-[#6B7385]'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Orders List */}
      <div className="space-y-3">
        {filteredOrders.length === 0 ? (
          <div className="text-center py-10 text-[#6B7385] bg-white rounded-3xl border border-[#E5E8EF]">
            <Package className="w-8 h-8 mx-auto text-slate-300 mb-2" />
            <b className="block text-sm text-[#13213D]">{t('No orders yet')}</b>
            <span className="text-xs">{t('Place an order for official school uniforms or leather shoes.')}</span>
          </div>
        ) : (
          filteredOrders.map((ord) => (
            <div
              key={ord.id}
              className="bg-white p-5 rounded-3xl shadow-card border border-[#E5E8EF] space-y-3"
            >
              <div className="flex items-center justify-between border-b border-[#E5E8EF] pb-2.5">
                <div>
                  <span className="text-[10px] uppercase font-bold text-[#F5A623] block">
                    {ord.trackingNumber}
                  </span>
                  <b className="text-sm font-extrabold text-[#13213D] block">
                    {ord.type === 'uniform' ? t('School Uniform Set') : t('Official Leather Shoes')}
                  </b>
                  <span className="text-[10.5px] text-[#6B7385]">
                    {t('Ordered:')} {ord.orderDate} · {t(ord.deliveryMethod === 'school' ? 'Pickup at School Store' : 'Home Delivery')}
                  </span>
                </div>

                <span
                  className={`px-2.5 py-1 text-[10px] font-extrabold rounded-full ${
                    ord.status === 'Delivered'
                      ? 'bg-emerald-100 text-emerald-800'
                      : ord.status === 'Collected'
                      ? 'bg-blue-100 text-blue-800'
                      : 'bg-amber-100 text-amber-800'
                  }`}
                >
                  {t(ord.status)}
                </span>
              </div>

              {/* Items List */}
              <div className="space-y-1.5 text-xs">
                {ord.items.map((it, idx) => (
                  <div key={idx} className="flex justify-between items-center bg-slate-50 p-2.5 rounded-xl">
                    <div>
                      <b className="text-[#13213D] block">{it.name}</b>
                      <span className="text-[10.5px] text-[#6B7385]">
                        {t('Size:')} <b className="text-slate-800">{it.size}</b> · {t('Qty:')} {it.qty}
                      </span>
                    </div>
                    <b className="text-[#13213D]">RWF {(it.price * it.qty).toLocaleString()}</b>
                  </div>
                ))}
              </div>

              {/* Exchange status banner if requested */}
              {ord.exchange && (
                <div className="p-3 bg-amber-50 rounded-2xl border border-amber-200 text-xs text-amber-950 flex items-start gap-2">
                  <RefreshCw className="w-4 h-4 text-[#F5A623] flex-shrink-0 mt-0.5" />
                  <div>
                    <b>{t('Size Exchange Requested:')}</b>
                    <span className="block mt-0.5 text-[11px]">
                      {ord.exchange.item}: {t('Size')} {ord.exchange.oldSize} ➔ {t('Size')} {ord.exchange.newSize}
                    </span>
                    <small className="opacity-80 block text-[10px] mt-0.5">
                      {ord.exchange.status}
                    </small>
                  </div>
                </div>
              )}

              {/* Total & Action Buttons */}
              <div className="pt-2 flex items-center justify-between">
                <div>
                  <span className="text-[10px] text-[#6B7385] block">{t('Total Amount:')}</span>
                  <b className="text-sm font-black text-[#F5A623]">
                    RWF {ord.total.toLocaleString()}
                  </b>
                </div>

                <div className="flex gap-2">
                  {!ord.exchange && (
                    <button
                      onClick={() => handleStartExchange(ord)}
                      className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-[#13213D] text-[11px] font-bold rounded-xl flex items-center gap-1 transition-colors"
                    >
                      <RefreshCw className="w-3 h-3 text-[#F5A623]" />
                      {t('Exchange Size')}
                    </button>
                  )}
                  <div className="w-8 h-8 bg-slate-100 rounded-xl flex items-center justify-center text-slate-700">
                    <QrCode className="w-4 h-4" />
                  </div>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Size Exchange Modal Overlay */}
      {exchangingOrder && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-end justify-center p-4">
          <div className="bg-white text-[#13213D] w-full max-w-sm rounded-3xl p-5 shadow-2xl space-y-4 animate-in slide-in-from-bottom-5">
            <div className="flex justify-between items-center border-b border-[#E5E8EF] pb-3">
              <div>
                <b className="text-sm font-extrabold block">{t('Exchange a Size')}</b>
                <span className="text-xs text-[#6B7385]">{t('Free size exchange at school store')}</span>
              </div>
              <button
                onClick={() => setExchangingOrder(null)}
                className="w-7 h-7 rounded-full bg-slate-100 flex items-center justify-center text-xs font-bold text-slate-600"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="text-[11px] font-bold text-[#6B7385] uppercase block mb-1.5">
                  {t('Select Item to Exchange')}
                </label>
                <div className="space-y-1.5">
                  {exchangingOrder.items.map((it, idx) => (
                    <div
                      key={idx}
                      onClick={() => {
                        setExchangeItem(it.name);
                        setExchangeOldSize(it.size);
                      }}
                      className={`p-2.5 rounded-xl border cursor-pointer font-bold flex justify-between items-center ${
                        exchangeItem === it.name
                          ? 'bg-amber-50 border-amber-300 text-amber-950'
                          : 'bg-slate-50 border-slate-200 text-slate-700'
                      }`}
                    >
                      <span>{it.name}</span>
                      <span className="text-[11px] opacity-70">{t('Current:')} {it.size}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-[11px] font-bold text-[#6B7385] uppercase block mb-1.5">
                  {t('Choose New Size')}
                </label>
                <div className="flex gap-2 flex-wrap">
                  {(exchangingOrder.type === 'shoes'
                    ? ['37 EU', '38 EU', '39 EU', '40 EU', '41 EU', '42 EU']
                    : ['S', 'M', 'L', 'XL', 'XXL']
                  ).map((sz) => (
                    <button
                      key={sz}
                      type="button"
                      onClick={() => setExchangeNewSize(sz)}
                      className={`px-3 py-2 rounded-xl text-xs font-extrabold border transition-all ${
                        exchangeNewSize === sz
                          ? 'bg-[#13213D] text-white border-[#13213D]'
                          : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      {sz}
                    </button>
                  ))}
                </div>
              </div>

              <div className="p-3 bg-emerald-50 rounded-2xl border border-emerald-200 text-[11px] text-emerald-950">
                <b>{t('Policy:')}</b> {t('Unworn items with tags can be exchanged at the school store within 14 days of receipt.')}
              </div>
            </div>

            <button
              onClick={handleConfirmExchange}
              className="w-full py-3.5 bg-[#F5A623] hover:bg-amber-400 text-[#13213D] font-extrabold text-xs rounded-2xl shadow-md active:scale-98 transition-all"
            >
              {t('Confirm Size Exchange')}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
