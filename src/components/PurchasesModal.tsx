import React, { useState } from 'react';
import { CustomerPurchase } from '../types';
import { X, Search, FileText, Download, ExternalLink, AlertCircle, BookOpen, Clock, ShieldCheck, RefreshCw, CheckCircle2 } from 'lucide-react';

interface PurchasesModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultEmail?: string;
}

interface PendingOrderItem {
  order_id: string;
  note_id: string;
  note_title: string;
  amount: number;
  status: string;
  created_at: string;
  cover_image?: string;
  utr_number?: string | null;
}

export const PurchasesModal: React.FC<PurchasesModalProps> = ({
  isOpen,
  onClose,
  defaultEmail = '',
}) => {
  const [email, setEmail] = useState(defaultEmail);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [purchases, setPurchases] = useState<CustomerPurchase[]>([]);
  const [pendingOrders, setPendingOrders] = useState<PendingOrderItem[]>([]);
  const [checkingOrderId, setCheckingOrderId] = useState<string | null>(null);
  const [statusFeedback, setStatusFeedback] = useState<{ [orderId: string]: string }>({});

  if (!isOpen) return null;

  const handleLookup = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const cleanQuery = email.trim();
    if (!cleanQuery) {
      setError('Please enter your email address or Order ID.');
      return;
    }

    setError(null);
    setLoading(true);

    try {
      const res = await fetch(`/api/purchases/lookup?query=${encodeURIComponent(cleanQuery)}`);
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to retrieve purchases.');
      }

      const uniquePurchases = Array.isArray(data.purchases)
        ? Array.from(new Map(data.purchases.map((p: any) => [p.order_id, p])).values())
        : [];
      const uniquePending = Array.isArray(data.pending_orders)
        ? Array.from(new Map(data.pending_orders.map((p: any) => [p.order_id, p])).values())
        : [];
      setPurchases(uniquePurchases);
      setPendingOrders(uniquePending);
      setSearched(true);
    } catch (err: any) {
      setError(err.message || 'Error looking up your notes.');
    } finally {
      setLoading(false);
    }
  };

  const handleCheckOrderStatus = async (orderId: string) => {
    setCheckingOrderId(orderId);
    setStatusFeedback((prev) => ({ ...prev, [orderId]: 'Checking payment with bank...' }));

    try {
      const res = await fetch('/api/checkout/check-status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ order_id: orderId }),
      });
      const data = await res.json();

      if (data.status === 'paid') {
        setStatusFeedback((prev) => ({ ...prev, [orderId]: 'Payment verified! Access unlocked.' }));
        // Refresh full list so paid item moves to verified purchases
        await handleLookup();
      } else if (data.status === 'expired') {
        setStatusFeedback((prev) => ({ ...prev, [orderId]: 'Session expired. Please start a new purchase.' }));
      } else if (data.status === 'pending_verification') {
        setStatusFeedback((prev) => ({ ...prev, [orderId]: 'Payment reference submitted, awaiting verification.' }));
      } else {
        setStatusFeedback((prev) => ({ ...prev, [orderId]: data.message || 'Payment not yet recorded in bank records.' }));
      }
    } catch (err: any) {
      setStatusFeedback((prev) => ({ ...prev, [orderId]: 'Network error while checking status.' }));
    } finally {
      setCheckingOrderId(null);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-stone-900/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
      <div 
        id="purchases-modal-container"
        className="bg-white rounded-3xl max-w-lg w-full overflow-hidden shadow-2xl border border-stone-100 flex flex-col max-h-[90vh]"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-stone-100 bg-stone-50/70">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-[#5C715E] text-white flex items-center justify-center shadow-xs">
              <BookOpen className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-[#2D3436]">My Purchased Notes</h3>
              <p className="text-[11px] text-stone-500">Access and re-download your notes anytime</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-stone-200/70 hover:bg-stone-300 flex items-center justify-center text-stone-700 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-4">
          <p className="text-xs text-stone-600 leading-relaxed">
            Enter the email address or Order ID you used during checkout to retrieve your purchased physiotherapy notes and instant download links.
          </p>

          {/* Search Form */}
          <form onSubmit={handleLookup} className="flex gap-2">
            <input
              type="text"
              required
              placeholder="Enter your email or Order ID (e.g. ord_...)"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="flex-1 px-3.5 py-2.5 rounded-xl border border-stone-300 text-sm focus:outline-none focus:ring-2 focus:ring-[#5C715E] bg-stone-50"
            />
            <button
              type="submit"
              disabled={loading}
              className="inline-flex items-center justify-center gap-1.5 px-4 py-2.5 bg-[#5C715E] hover:bg-[#4A5D4E] text-white rounded-xl font-bold text-xs shadow-sm transition-all disabled:opacity-50"
            >
              <Search className="w-3.5 h-3.5" />
              <span>{loading ? 'Searching...' : 'Find Notes'}</span>
            </button>
          </form>

          {error && (
            <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Results */}
          {searched && (
            <div className="pt-2">
              {purchases.length === 0 ? (
                <div className="text-center py-8 px-4 bg-stone-50 rounded-2xl border border-dashed border-stone-200">
                  <FileText className="w-10 h-10 text-stone-300 mx-auto mb-2" />
                  <div className="text-sm font-bold text-[#2D3436]">No Notes Found for This Email</div>
                  <p className="text-xs text-stone-500 max-w-xs mx-auto mt-1">
                    We could not find any completed purchases under <strong>{email}</strong>. Please verify that you typed the exact email used during checkout.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="flex items-center justify-between text-xs font-bold text-stone-500 uppercase tracking-wider">
                    <span>Found {purchases.length} {purchases.length === 1 ? 'Note' : 'Notes'}</span>
                    <span className="text-[#5C715E] flex items-center gap-1">
                      <ShieldCheck className="w-3.5 h-3.5" /> Verified Purchases
                    </span>
                  </div>

                  {purchases.map((item) => (
                    <div
                      key={item.order_id}
                      className="p-4 rounded-2xl border border-stone-200 bg-white hover:border-[#5C715E]/40 shadow-xs space-y-3 transition-all"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-start gap-3">
                          {item.cover_image ? (
                            <img
                              src={item.cover_image}
                              alt={item.note_title}
                              className="w-12 h-12 rounded-xl object-cover border border-stone-200 shrink-0"
                            />
                          ) : (
                            <div className="w-12 h-12 rounded-xl bg-[#D9E4DD] text-[#5C715E] flex items-center justify-center shrink-0">
                              <FileText className="w-6 h-6" />
                            </div>
                          )}
                          <div>
                            <h4 className="font-bold text-[#2D3436] text-sm leading-snug">
                              {item.note_title}
                            </h4>
                            <div className="flex items-center gap-2 mt-1 text-[11px] text-stone-500">
                              <span className="flex items-center gap-1">
                                <Clock className="w-3 h-3" />
                                {new Date(item.paid_at).toLocaleDateString()}
                              </span>
                              <span>•</span>
                              <span className="font-semibold text-stone-700">₹{item.amount}</span>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Action buttons */}
                      <div className="flex items-center gap-2 pt-1 border-t border-stone-100">
                        <a
                          href={`/api/view/${item.download_token}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex-1 inline-flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl border border-stone-200 hover:border-[#5C715E] text-stone-700 hover:text-[#5C715E] text-xs font-bold transition-colors bg-stone-50 hover:bg-white"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                          <span>Read Online</span>
                        </a>
                        <a
                          href={`/api/download/${item.download_token}`}
                          className="flex-1 inline-flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-[#5C715E] hover:bg-[#4A5D4E] text-white text-xs font-bold shadow-xs transition-colors"
                        >
                          <Download className="w-3.5 h-3.5" />
                          <span>Download PDF</span>
                        </a>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Pending Orders Awaiting Status Verification */}
              {pendingOrders.length > 0 && (
                <div className="mt-5 pt-4 border-t border-dashed border-stone-200 space-y-3">
                  <div className="flex items-center justify-between text-xs font-bold text-amber-700 uppercase tracking-wider">
                    <span>Pending Verification ({pendingOrders.length})</span>
                    <span className="text-[11px] font-medium text-stone-500 normal-case">
                      Paid in UPI app? Click "Check Status"
                    </span>
                  </div>

                  {pendingOrders.map((pending) => (
                    <div
                      key={pending.order_id}
                      className="p-3.5 rounded-2xl border border-amber-200/80 bg-amber-50/40 space-y-2.5"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <div className="font-bold text-stone-800 text-xs sm:text-sm leading-snug">
                            {pending.note_title}
                          </div>
                          <div className="flex items-center gap-2 mt-0.5 text-[11px] text-stone-500">
                            <span className="font-mono text-stone-600">{pending.order_id}</span>
                            <span>•</span>
                            <span className="font-semibold text-stone-700">₹{pending.amount}</span>
                            <span>•</span>
                            <span className="capitalize px-1.5 py-0.5 rounded-md text-[10px] font-bold bg-amber-100 text-amber-800">
                              {pending.status === 'pending_verification' ? 'Pending Review' : 'Payment Pending'}
                            </span>
                          </div>
                        </div>
                      </div>

                      {statusFeedback[pending.order_id] && (
                        <div className="p-2 rounded-xl bg-white border border-stone-200 text-[11px] text-stone-700 font-medium animate-in fade-in">
                          {statusFeedback[pending.order_id]}
                        </div>
                      )}

                      <button
                        type="button"
                        disabled={checkingOrderId === pending.order_id}
                        onClick={() => handleCheckOrderStatus(pending.order_id)}
                        className="w-full inline-flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold shadow-2xs transition-all active:scale-98 disabled:opacity-60 cursor-pointer"
                      >
                        {checkingOrderId === pending.order_id ? (
                          <>
                            <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                            <span>Checking with Bank Records...</span>
                          </>
                        ) : (
                          <>
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-300" />
                            <span>Check Payment Status</span>
                          </>
                        )}
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-stone-100 bg-stone-50 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-bold text-stone-600 hover:bg-stone-200/60 rounded-xl transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
