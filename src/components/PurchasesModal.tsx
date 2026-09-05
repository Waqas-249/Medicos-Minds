import React, { useState } from 'react';
import { CustomerPurchase } from '../types';
import { X, Search, FileText, Download, ExternalLink, AlertCircle, BookOpen, Clock, ShieldCheck } from 'lucide-react';

interface PurchasesModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultEmail?: string;
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

  if (!isOpen) return null;

  const handleLookup = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail || !cleanEmail.includes('@')) {
      setError('Please enter a valid email address.');
      return;
    }

    setError(null);
    setLoading(true);

    try {
      const res = await fetch(`/api/purchases/lookup?email=${encodeURIComponent(cleanEmail)}`);
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to retrieve purchases.');
      }

      setPurchases(data.purchases || []);
      setSearched(true);
    } catch (err: any) {
      setError(err.message || 'Error looking up your notes.');
    } finally {
      setLoading(false);
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
            Enter the email address you used during checkout to retrieve your purchased physiotherapy notes and instant download links.
          </p>

          {/* Search Form */}
          <form onSubmit={handleLookup} className="flex gap-2">
            <input
              type="email"
              required
              placeholder="Enter your email address"
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
