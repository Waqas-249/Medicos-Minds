import React, { useState, useEffect } from 'react';
import QRCode from 'qrcode';
import { Note, Order } from '../types';
import { 
  X, 
  CheckCircle2, 
  Download, 
  Lock, 
  Smartphone, 
  AlertCircle, 
  CreditCard, 
  ArrowRight, 
  FileText, 
  ShieldCheck,
  Check,
  ExternalLink,
  QrCode,
  Copy,
  BookOpen,
  Sparkles,
  RefreshCw,
  Send,
  MessageCircle,
  Phone,
  Mail,
  Clock,
  XCircle
} from 'lucide-react';

interface CheckoutModalProps {
  note: Note | null;
  onClose: () => void;
}

type CheckoutStep = 'customer_info' | 'payment_process' | 'verification_pending' | 'payment_success' | 'payment_rejected';

// Strict Email Validation Helper
const isValidEmail = (email: string): boolean => {
  if (!email) return false;
  const trimmed = email.trim();
  if (trimmed.length < 6 || trimmed.length > 254 || /\s/.test(trimmed)) return false;
  const emailRegex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+$/;
  if (!emailRegex.test(trimmed)) return false;
  const parts = trimmed.split('@');
  if (parts.length !== 2) return false;
  const domain = parts[1];
  if (!domain.includes('.')) return false;
  const tld = domain.split('.').pop();
  if (!tld || tld.length < 2 || !/^[a-zA-Z]+$/.test(tld)) return false;
  return true;
};

export const CheckoutModal: React.FC<CheckoutModalProps> = ({ note, onClose }) => {
  // Step & Customer Details State
  const [step, setStep] = useState<CheckoutStep>('customer_info');
  const [customerName, setCustomerName] = useState(() => {
    try {
      const saved = localStorage.getItem('physionotes_customer_info');
      if (saved) return JSON.parse(saved).name || '';
    } catch (e) {}
    return '';
  });
  const [customerEmail, setCustomerEmail] = useState(() => {
    try {
      const saved = localStorage.getItem('physionotes_customer_info');
      if (saved) return JSON.parse(saved).email || '';
    } catch (e) {}
    return '';
  });
  const [customerPhone, setCustomerPhone] = useState(() => {
    try {
      const saved = localStorage.getItem('physionotes_customer_info');
      if (saved) return JSON.parse(saved).phone || '';
    } catch (e) {}
    return '';
  });

  // Order & Payment State
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [createdOrderId, setCreatedOrderId] = useState<string | null>(null);
  const [downloadToken, setDownloadToken] = useState<string | null>(null);
  const [paidOrder, setPaidOrder] = useState<Order | null>(null);
  
  // Store & UPI details returned from server
  const [storeName, setStoreName] = useState('MEDICOS⛑️MINDS');
  const [upiId, setUpiId] = useState('kamranalam8340749923-1@okhdfcbank');
  const [whatsappNumber, setWhatsappNumber] = useState('+91 83407 49923');
  const [supportEmail, setSupportEmail] = useState('restorehealthphysio@gmail.com');
  const [instagramHandle, setInstagramHandle] = useState('restore_healthphysio');
  const [instagramUrl, setInstagramUrl] = useState('');

  // UPI QR Code State
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const [copiedUpi, setCopiedUpi] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [checkingStatus, setCheckingStatus] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  // Generate dynamic UPI URL & QR code whenever order or UPI details change
  useEffect(() => {
    if (!note || !createdOrderId) return;

    const targetUpi = upiId || 'kamranalam8340749923-1@okhdfcbank';
    const noteNameClean = note.title.slice(0, 30).replace(/[^a-zA-Z0-9 ]/g, '');
    const upiUri = `upi://pay?pa=${targetUpi}&pn=${encodeURIComponent(storeName)}&am=${note.price}&cu=INR&tn=${encodeURIComponent(noteNameClean)}`;

    QRCode.toDataURL(upiUri, {
      width: 260,
      margin: 2,
      color: {
        dark: '#2D3436',
        light: '#FFFFFF',
      },
    })
      .then((url) => setQrDataUrl(url))
      .catch((err) => console.error('Error generating QR code', err));
  }, [note, createdOrderId, upiId, storeName]);

  // Status polling hook: when awaiting verification, check order status automatically every 4 seconds
  useEffect(() => {
    if (step !== 'verification_pending' || !createdOrderId) return;
    const interval = setInterval(() => {
      checkOrderStatus(true);
    }, 4000);
    return () => clearInterval(interval);
  }, [step, createdOrderId]);

  // Check Order Status function
  const checkOrderStatus = async (silent = false) => {
    if (!createdOrderId || !note) return;
    if (!silent) setCheckingStatus(true);

    try {
      const res = await fetch(`/api/orders/${createdOrderId}/status`);
      const data = await res.json();
      if (res.ok && data) {
        if (data.status === 'paid' && data.download_token) {
          setDownloadToken(data.download_token);
          setPaidOrder({
            id: data.order_id,
            note_id: note.id,
            note_title: data.note_title || note.title,
            customer_name: data.customer_name || customerName,
            customer_email: data.customer_email || customerEmail,
            customer_phone: customerPhone,
            amount: data.amount || note.price,
            status: 'paid',
            download_token: data.download_token,
            download_count: 0,
            paid_at: data.paid_at || new Date().toISOString(),
            created_at: new Date().toISOString(),
          });
          setError(null);
          setStep('payment_success');
        } else if (data.status === 'rejected') {
          setError(null);
          setDownloadToken('');
          setStep('payment_rejected');
        } else if (!silent) {
          setStatusMessage('Status checked: Awaiting creator verification.');
          setTimeout(() => setStatusMessage(null), 3500);
        }
      }
    } catch (err) {
      console.warn('Status poll error:', err);
    } finally {
      if (!silent) setCheckingStatus(false);
    }
  };

  // WhatsApp verification helper
  const getWhatsappVerificationUrl = () => {
    const rawNumber = whatsappNumber || '+91 83407 49923';
    let digits = rawNumber.replace(/[^0-9]/g, '');
    if (digits.length === 10) digits = '91' + digits;
    const msg = encodeURIComponent(
      `Hi MEDICOS MINDS! I have transferred ₹${note?.price} via UPI for "${note?.title}".\n\nOrder ID: ${createdOrderId}\nName: ${customerName}\nEmail: ${customerEmail}\n\nPlease verify my payment and unlock my PDF.`
    );
    return `https://wa.me/${digits}?text=${msg}`;
  };

  // WhatsApp rejected verification inquiry helper
  const getWhatsappRejectedUrl = () => {
    const rawNumber = whatsappNumber || '+91 83407 49923';
    let digits = rawNumber.replace(/[^0-9]/g, '');
    if (digits.length === 10) digits = '91' + digits;
    const msg = encodeURIComponent(
      `Hi MEDICOS MINDS! My order (${createdOrderId}) for "${note?.title}" was marked unverified.\n\nName: ${customerName}\nEmail: ${customerEmail}\nAmount: ₹${note?.price}\n\nHere is my payment proof screenshot. Please verify and unlock my PDF.`
    );
    return `https://wa.me/${digits}?text=${msg}`;
  };

  // Handle Step 1: Submit info and create order on server with strict email check
  const handleProceedToPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!note) return;

    if (!customerName.trim() || customerName.trim().length < 2) {
      setError('Please provide your full name (minimum 2 characters).');
      return;
    }

    if (!customerEmail.trim()) {
      setError('Please provide your email address.');
      return;
    }

    if (!isValidEmail(customerEmail)) {
      setError('Please enter a valid, deliverable email address (e.g. yourname@gmail.com). We will use this to verify and link your notes.');
      return;
    }

    // Save info for future checkout ease
    try {
      localStorage.setItem('physionotes_customer_info', JSON.stringify({
        name: customerName.trim(),
        email: customerEmail.trim(),
        phone: customerPhone.trim(),
      }));
    } catch (e) {}

    setError(null);
    setLoading(true);

    try {
      const res = await fetch('/api/checkout/create-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          note_id: note.id,
          customer_name: customerName.trim(),
          customer_email: customerEmail.trim(),
          customer_phone: customerPhone.trim(),
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to initialize order');
      }

      setCreatedOrderId(data.order_id);
      if (data.store_name) setStoreName(data.store_name);
      if (data.upi_id) setUpiId(data.upi_id);
      if (data.whatsapp_number) setWhatsappNumber(data.whatsapp_number);
      if (data.support_email) setSupportEmail(data.support_email);
      if (data.instagram_handle) setInstagramHandle(data.instagram_handle);
      if (data.instagram_url) setInstagramUrl(data.instagram_url);

      setStep('payment_process');
    } catch (err: any) {
      setError(err.message || 'Network error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Handle Submit UPI Payment Confirmation (Marks order as pending verification - NO instant access!)
  const handleSubmitUpiPayment = async () => {
    if (!createdOrderId) return;
    setLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/checkout/submit-upi-payment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          order_id: createdOrderId,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.message || data.error || 'Submission failed.');
      }

      // Transition to verification pending screen
      setStep('verification_pending');
    } catch (err: any) {
      setError(err.message || 'Error submitting payment confirmation. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Copy UPI ID to clipboard
  const handleCopyUpi = () => {
    if (!upiId) return;
    navigator.clipboard.writeText(upiId);
    setCopiedUpi(true);
    setTimeout(() => setCopiedUpi(false), 2000);
  };

  // Copy Permanent Download Link
  const handleCopyLink = () => {
    if (!downloadToken) return;
    const fullUrl = `${window.location.origin}/api/download/${downloadToken}`;
    navigator.clipboard.writeText(fullUrl);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2500);
  };

  // Direct download trigger
  const handleDownload = () => {
    if (!downloadToken) return;
    window.location.href = `/api/download/${downloadToken}`;
  };

  if (!note) return null;

  const directUpiLink = `upi://pay?pa=${upiId}&pn=${encodeURIComponent(storeName)}&am=${note.price}&cu=INR&tn=${encodeURIComponent(note.title.slice(0, 30))}`;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-stone-900/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-150">
      <div 
        id="checkout-modal-container"
        className="bg-white rounded-3xl max-w-md w-full overflow-hidden shadow-2xl border border-stone-100 flex flex-col max-h-[92vh]"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-stone-100 bg-stone-50/70">
          <div className="flex items-center gap-2">
            <span className="text-xs font-extrabold uppercase tracking-wider text-[#5C715E] bg-[#F9F7F2] px-2.5 py-0.5 rounded-md border border-[#5C715E]/20">
              {step === 'customer_info' && 'Step 1: Your Details'}
              {step === 'payment_process' && 'Step 2: Pay & Download'}
              {step === 'payment_success' && 'Purchase Confirmed'}
            </span>
          </div>
          {step !== 'payment_success' && (
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-stone-200/70 hover:bg-stone-300 flex items-center justify-center text-stone-700 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Note Mini Summary */}
        <div className="p-3.5 bg-stone-50/80 border-b border-stone-100 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 min-w-0">
            {note.cover_image ? (
              <div className="w-14 h-12 rounded-lg border border-stone-200 shrink-0 bg-stone-950 flex items-center justify-center p-0.5 overflow-hidden">
                <img
                  src={note.cover_image}
                  alt={note.title}
                  referrerPolicy="no-referrer"
                  className="max-h-full max-w-full object-contain"
                />
              </div>
            ) : (
              <div className="w-14 h-12 rounded-lg bg-[#D9E4DD] text-[#5C715E] flex items-center justify-center font-bold shrink-0">
                <FileText className="w-5 h-5" />
              </div>
            )}
            <div className="min-w-0">
              <h4 className="font-bold text-[#2D3436] text-xs sm:text-sm truncate">
                {note.title}
              </h4>
              <span className="text-[11px] text-stone-500 block">Instant PDF Notes Delivery</span>
            </div>
          </div>
          <div className="text-right shrink-0">
            <div className="text-base sm:text-lg font-black text-[#5C715E]">₹{note.price}</div>
            <span className="text-[9px] text-stone-400 font-bold uppercase tracking-wider">Zero Fee</span>
          </div>
        </div>

        {/* Modal Scrollable Body */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-4">
          {error && (
            <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-start gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {/* STEP 1: CUSTOMER INFO */}
          {step === 'customer_info' && (
            <form onSubmit={handleProceedToPayment} className="space-y-3.5">
              <div>
                <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-1">
                  Full Name <span className="text-red-500">*</span>
                </label>
                <input
                  id="checkout-customer-name"
                  type="text"
                  required
                  placeholder="e.g. Rahul Sharma"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-stone-300 text-sm focus:outline-none focus:ring-2 focus:ring-[#5C715E] bg-stone-50"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider">
                    Email Address <span className="text-red-500">*</span>
                  </label>
                  {customerEmail.trim() && (
                    <span className={`text-[11px] font-semibold ${isValidEmail(customerEmail) ? 'text-emerald-600' : 'text-amber-600'}`}>
                      {isValidEmail(customerEmail) ? '✓ Valid format' : 'Must be valid (e.g. name@gmail.com)'}
                    </span>
                  )}
                </div>
                <input
                  id="checkout-customer-email"
                  type="email"
                  required
                  placeholder="e.g. student@gmail.com"
                  value={customerEmail}
                  onChange={(e) => {
                    setCustomerEmail(e.target.value);
                    if (error) setError(null);
                  }}
                  className={`w-full px-3.5 py-2.5 rounded-xl border text-sm focus:outline-none focus:ring-2 bg-stone-50 ${
                    customerEmail.trim() && !isValidEmail(customerEmail)
                      ? 'border-amber-400 focus:ring-amber-400'
                      : 'border-stone-300 focus:ring-[#5C715E]'
                  }`}
                />
                <span className="text-[11px] text-stone-500 mt-1 block">
                  Your PDF access and order receipt will be securely sent to this email.
                </span>
              </div>

              <div>
                <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-1">
                  WhatsApp / Mobile Number <span className="text-stone-400 font-normal">(Optional)</span>
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-xs font-bold text-stone-400">
                    +91
                  </div>
                  <input
                    id="checkout-customer-phone"
                    type="tel"
                    placeholder="98765 43210"
                    value={customerPhone}
                    onChange={(e) => setCustomerPhone(e.target.value)}
                    className="w-full pl-11 pr-3.5 py-2.5 rounded-xl border border-stone-300 text-sm focus:outline-none focus:ring-2 focus:ring-[#5C715E] bg-stone-50"
                  />
                </div>
              </div>

              <div className="pt-2">
                <button
                  id="proceed-to-pay-btn"
                  type="submit"
                  disabled={loading}
                  className="w-full inline-flex items-center justify-center gap-2 py-3.5 px-4 bg-[#5C715E] hover:bg-[#4A5D4E] text-white rounded-xl font-bold text-sm shadow-md shadow-[#5C715E]/20 transition-all active:scale-98 disabled:opacity-50"
                >
                  {loading ? (
                    <span>Preparing Secure Order...</span>
                  ) : (
                    <>
                      <span>Proceed to Pay ₹{note.price}</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </div>

              <div className="flex items-center justify-center gap-2 text-stone-400 text-xs pt-1">
                <ShieldCheck className="w-3.5 h-3.5 text-[#5C715E]" />
                <span>Verified Email Security • Direct UPI Payment</span>
              </div>
            </form>
          )}

          {/* STEP 2: DIRECT UPI PAYMENT & QR SCANNER */}
          {step === 'payment_process' && (
            <div className="space-y-4">
              <div className="space-y-3.5">
                <div className="bg-[#F9F7F2] p-4 rounded-2xl border border-[#5C715E]/20 text-center flex flex-col items-center">
                  <span className="text-[11px] font-bold text-stone-500 uppercase tracking-wider">
                    Scan & Pay with Any UPI App
                  </span>
                  <div className="text-2xl font-black text-[#2D3436] mt-0.5">
                    ₹{note.price}
                  </div>

                  {/* QR Code Container */}
                  <div className="mt-3 p-2 bg-white rounded-2xl border border-stone-200 shadow-xs">
                    {qrDataUrl ? (
                      <img
                        src={qrDataUrl}
                        alt="UPI QR Code"
                        className="w-48 h-48 sm:w-52 sm:h-52 rounded-xl object-contain mx-auto"
                      />
                    ) : (
                      <div className="w-48 h-48 flex items-center justify-center text-stone-400 text-xs">
                        Generating QR...
                      </div>
                    )}
                  </div>

                  {/* Mobile 1-Tap UPI Intent Button */}
                  <div className="mt-3 w-full">
                    <a
                      href={directUpiLink}
                      className="w-full inline-flex items-center justify-center gap-2 py-2.5 px-4 bg-[#5C715E] hover:bg-[#4A5D4E] text-white rounded-xl font-bold text-xs shadow-sm transition-colors"
                    >
                      <Smartphone className="w-4 h-4" />
                      <span>Tap to Pay on Mobile (GPay / PhonePe / Paytm)</span>
                    </a>
                  </div>

                  {/* UPI ID & Copy button */}
                  <div className="mt-2.5 flex items-center justify-between w-full max-w-xs px-3 py-1.5 bg-white rounded-xl border border-stone-200 text-xs">
                    <span className="font-mono text-stone-700 truncate">{upiId}</span>
                    <button
                      type="button"
                      onClick={handleCopyUpi}
                      className="inline-flex items-center gap-1 text-[11px] font-bold text-[#5C715E] hover:text-[#4A5D4E] shrink-0 ml-2 cursor-pointer"
                    >
                      {copiedUpi ? (
                        <>
                          <Check className="w-3.5 h-3.5 text-emerald-600" />
                          <span className="text-emerald-600">Copied</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5" />
                          <span>Copy UPI</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>

                {/* Confirm Payment Action */}
                <div className="pt-1">
                  <button
                    id="confirm-upi-payment-btn"
                    type="button"
                    disabled={loading}
                    onClick={handleSubmitUpiPayment}
                    className="w-full inline-flex items-center justify-center gap-2 py-3.5 px-4 bg-[#5C715E] hover:bg-[#4A5D4E] text-white rounded-xl font-bold text-sm shadow-md shadow-[#5C715E]/20 transition-all active:scale-98 disabled:opacity-50 cursor-pointer"
                  >
                    {loading ? (
                      <div className="flex items-center gap-2">
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        <span>Submitting Confirmation...</span>
                      </div>
                    ) : (
                      <>
                        <CheckCircle2 className="w-4 h-4" />
                        <span>I Have Paid ₹{note.price} — Submit Confirmation</span>
                      </>
                    )}
                  </button>
                  <p className="text-[11px] text-center text-stone-500 mt-2">
                    After scanning the QR code and completing your UPI transfer, click above to submit for verification.
                  </p>
                </div>
              </div>

              {/* Payment Support Help */}
              <div className="p-3 bg-emerald-50/70 rounded-xl border border-emerald-200 text-xs text-emerald-950 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="flex items-center gap-1.5 font-medium">
                  <MessageCircle className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                  <span>Contact Support:</span>
                  <a
                    href={`https://wa.me/${(whatsappNumber || '+91 83407 49923').replace(/[^0-9]/g, '')}?text=${encodeURIComponent(`Hi MEDICOS MINDS, I need help with payment for note: ${note?.title || ''}`)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-bold text-emerald-800 hover:text-emerald-950 underline shrink-0 inline-flex items-center gap-1 font-mono"
                  >
                    <span>{whatsappNumber || '+91 83407 49923'}</span>
                  </a>
                </div>

                <a
                  href={`mailto:${supportEmail || 'restorehealthphysio@gmail.com'}`}
                  className="inline-flex items-center gap-1 text-emerald-900 hover:underline font-mono text-[11px] font-semibold shrink-0"
                  title="Email Support"
                >
                  <Mail className="w-3 h-3 text-emerald-700" />
                  <span>{supportEmail || 'restorehealthphysio@gmail.com'}</span>
                </a>
              </div>

              {/* Back to Step 1 */}
              <div className="text-center pt-1">
                <button
                  type="button"
                  onClick={() => setStep('customer_info')}
                  className="text-xs text-stone-500 hover:text-stone-800 font-medium cursor-pointer"
                >
                  ← Edit details ({customerName})
                </button>
              </div>
            </div>
          )}

          {/* STEP 2.5: VERIFICATION PENDING (Security Protected - Awaiting Creator Approval) */}
          {step === 'verification_pending' && (
            <div className="space-y-4 py-1 text-center">
              <div className="w-14 h-14 rounded-2xl bg-amber-100 text-amber-700 mx-auto flex items-center justify-center shadow-xs">
                <Clock className="w-7 h-7 animate-pulse" />
              </div>

              <div>
                <h3 className="text-xl font-black text-[#2D3436]">
                  Payment Submitted
                </h3>
                <p className="text-xs text-amber-700 font-bold uppercase tracking-wider mt-0.5">
                  Awaiting Creator Verification
                </p>
                <p className="text-xs text-stone-500 mt-1">
                  Order ID: <span className="font-mono font-bold text-stone-700">{createdOrderId}</span>
                </p>
              </div>

              <div className="p-3.5 bg-amber-50/80 rounded-2xl border border-amber-200 text-left text-xs space-y-2">
                <div className="flex items-center gap-1.5 font-bold text-amber-900">
                  <Lock className="w-4 h-4 text-amber-700 shrink-0" />
                  <span>Secure Content Protection</span>
                </div>
                <p className="text-amber-900/90 leading-relaxed text-[11px]">
                  All premium PDFs and notes are encrypted and securely protected. Once the creator approves your UPI transfer, your PDF download link will unlock automatically right on this screen.
                </p>
              </div>

              {/* Status checking bar */}
              <div className="p-3 bg-stone-50 rounded-xl border border-stone-200 flex items-center justify-between gap-3 text-xs">
                <div className="flex items-center gap-2 text-stone-600">
                  <span className="relative flex h-2.5 w-2.5">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
                  </span>
                  <span className="text-[11px] font-medium">Auto-refreshing every few seconds...</span>
                </div>
                <button
                  type="button"
                  disabled={checkingStatus}
                  onClick={() => checkOrderStatus(false)}
                  className="px-2.5 py-1 text-[11px] font-bold text-[#5C715E] hover:bg-stone-200 rounded-lg transition-colors inline-flex items-center gap-1 shrink-0"
                >
                  <RefreshCw className={`w-3 h-3 ${checkingStatus ? 'animate-spin' : ''}`} />
                  <span>{checkingStatus ? 'Checking...' : 'Check Status'}</span>
                </button>
              </div>

              {statusMessage && (
                <div className="text-xs font-semibold text-stone-600 bg-stone-100 py-1.5 px-3 rounded-lg animate-fade-in">
                  {statusMessage}
                </div>
              )}

              {/* Fast-Track Verification WhatsApp Button */}
              <div className="pt-1 space-y-2">
                <a
                  href={getWhatsappVerificationUrl()}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full inline-flex items-center justify-center gap-2 py-3 px-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-xs shadow-md shadow-emerald-600/20 transition-all active:scale-98"
                >
                  <MessageCircle className="w-4 h-4" />
                  <span>Send Screenshot on WhatsApp (Fast Approval)</span>
                </a>
                <p className="text-[11px] text-stone-500">
                  Sending payment proof on WhatsApp gets your PDF approved in minutes!
                </p>
              </div>

              {/* Back to payment choices or close */}
              <div className="pt-2 flex items-center justify-center gap-4 text-xs">
                <button
                  type="button"
                  onClick={() => setStep('payment_process')}
                  className="text-stone-500 hover:text-stone-800 font-medium"
                >
                  ← Back to payment methods
                </button>
                <span className="text-stone-300">•</span>
                <button
                  type="button"
                  onClick={onClose}
                  className="text-stone-500 hover:text-stone-800 font-medium"
                >
                  Close window
                </button>
              </div>
            </div>
          )}

          {/* STEP: PAYMENT REJECTED / UNVERIFIED */}
          {step === 'payment_rejected' && (
            <div className="text-center space-y-4 py-1 animate-in fade-in duration-200">
              <div className="w-14 h-14 rounded-2xl bg-red-100 text-red-600 mx-auto flex items-center justify-center shadow-xs">
                <XCircle className="w-8 h-8" />
              </div>

              <div>
                <h3 className="text-xl font-black text-[#2D3436]">
                  Payment Unverified / Rejected
                </h3>
                <p className="text-xs text-red-700 font-bold uppercase tracking-wider mt-0.5">
                  Order Not Approved by Creator
                </p>
                <div className="inline-block mt-2 px-2.5 py-1 bg-stone-100 text-stone-600 rounded-lg text-[11px] font-mono">
                  Order ID: {createdOrderId}
                </div>
              </div>

              {/* Information Notice Box */}
              <div className="p-3.5 bg-red-50/80 rounded-2xl border border-red-200 text-left text-xs text-red-950 space-y-1.5">
                <div className="flex items-center gap-1.5 font-bold text-red-800">
                  <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
                  <span>Transaction not found in UPI records</span>
                </div>
                <p className="text-[11px] text-red-800/90 leading-relaxed">
                  The store admin checked their UPI records and could not match a completed transaction for this request. PDF access is currently withheld.
                </p>
              </div>

              {/* Resolution options */}
              <div className="space-y-2 pt-1 text-left">
                <div className="text-xs font-bold text-stone-700 px-1">
                  Did you already make the payment?
                </div>
                
                <a
                  href={getWhatsappRejectedUrl()}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full inline-flex items-center justify-center gap-2 py-3 px-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-xs shadow-md shadow-emerald-600/20 transition-all active:scale-98"
                >
                  <MessageCircle className="w-4 h-4" />
                  <span>Send Payment Screenshot on WhatsApp</span>
                </a>

                <div className="grid grid-cols-2 gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => checkOrderStatus(false)}
                    disabled={checkingStatus}
                    className="inline-flex items-center justify-center gap-1.5 py-2.5 px-3 bg-stone-100 hover:bg-stone-200 text-stone-700 rounded-xl font-bold text-xs transition-colors border border-stone-200 cursor-pointer disabled:opacity-50"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${checkingStatus ? 'animate-spin text-[#5C715E]' : ''}`} />
                    <span>{checkingStatus ? 'Checking...' : 'Check Status Again'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setError(null);
                      setStep('payment_process');
                    }}
                    className="inline-flex items-center justify-center gap-1.5 py-2.5 px-3 bg-white hover:bg-stone-50 text-stone-700 rounded-xl font-bold text-xs transition-colors border border-stone-200 cursor-pointer"
                  >
                    <ArrowRight className="w-3.5 h-3.5" />
                    <span>Pay Again / New UTR</span>
                  </button>
                </div>
              </div>

              <div className="pt-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="w-full py-2.5 text-xs font-bold text-stone-500 hover:bg-stone-100 rounded-xl transition-colors cursor-pointer"
                >
                  Close Window
                </button>
              </div>
            </div>
          )}

          {/* STEP 3: PAYMENT SUCCESS & POST-PURCHASE EXPERIENCE (UX) */}
          {step === 'payment_success' && (
            <div className="text-center space-y-4 py-1">
              <div className="w-14 h-14 rounded-2xl bg-[#D9E4DD] text-[#5C715E] mx-auto flex items-center justify-center shadow-xs">
                <CheckCircle2 className="w-8 h-8" />
              </div>

              <div>
                <h3 className="text-xl font-black text-[#2D3436]">
                  Payment Verified!
                </h3>
                <p className="text-xs text-[#5C715E] font-bold uppercase tracking-wider mt-0.5">
                  Lifetime Access Confirmed
                </p>
                <p className="text-xs text-stone-500 mt-1">
                  Access ready for <strong>{customerName}</strong> ({customerEmail})
                </p>
              </div>

              {/* Core Delivery Actions: 1) Download PDF, 2) Read Online In-Browser */}
              <div className="space-y-2 pt-1">
                <button
                  id="download-pdf-btn"
                  onClick={handleDownload}
                  className="w-full inline-flex items-center justify-center gap-2 py-3.5 px-5 bg-[#5C715E] hover:bg-[#4A5D4E] text-white rounded-xl font-black text-sm shadow-lg shadow-[#5C715E]/25 transition-all active:scale-98"
                >
                  <Download className="w-4 h-4" />
                  <span>DOWNLOAD PDF NOW</span>
                </button>

                <a
                  id="read-online-btn"
                  href={`/api/view/${downloadToken}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full inline-flex items-center justify-center gap-2 py-2.5 px-4 bg-stone-100 hover:bg-stone-200 text-stone-800 rounded-xl font-bold text-xs transition-colors border border-stone-200"
                >
                  <ExternalLink className="w-3.5 h-3.5 text-[#5C715E]" />
                  <span>Read Online In-Browser</span>
                </a>
              </div>

              {/* Copy Permanent Link Box */}
              <div className="p-3 bg-stone-50 rounded-xl border border-stone-200 text-left space-y-2">
                <div className="flex items-center justify-between text-xs font-semibold text-stone-700">
                  <span>Your Permanent Download Link:</span>
                  <button
                    onClick={handleCopyLink}
                    className="inline-flex items-center gap-1 text-[11px] font-bold text-[#5C715E] hover:underline"
                  >
                    {copiedLink ? (
                      <>
                        <Check className="w-3 h-3 text-emerald-600" />
                        <span className="text-emerald-600">Copied!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3 h-3" />
                        <span>Copy Link</span>
                      </>
                    )}
                  </button>
                </div>
                <div className="font-mono text-[10px] text-stone-500 bg-white p-2 rounded-lg border border-stone-200 break-all select-all">
                  {`${window.location.origin}/api/download/${downloadToken}`}
                </div>
              </div>

              {/* Order Meta & Receipt Confirmation */}
              <div className="p-3 bg-emerald-50/70 rounded-xl border border-emerald-200 text-left text-xs text-emerald-900 space-y-1">
                <div className="flex items-center gap-1.5 font-bold text-emerald-800">
                  <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>Receipt logged & Access Token Activated</span>
                </div>
                <p className="text-[11px] text-emerald-700/90 leading-relaxed pl-5">
                  We've recorded this purchase under <strong>{customerEmail}</strong>. You can re-access your notes anytime via the "My Purchases" button in the menu.
                </p>
              </div>

              {/* Instagram / WhatsApp / Email Creator Support */}
              <div className="pt-1 flex flex-wrap items-center justify-center gap-2 text-xs">
                <a
                  href={`https://wa.me/${(whatsappNumber || '+91 83407 49923').replace(/[^0-9]/g, '')}?text=${encodeURIComponent(`Hi MEDICOS MINDS, I just purchased ${note?.title || 'notes'} (Order: ${createdOrderId || ''})`)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 font-semibold transition-colors"
                >
                  <MessageCircle className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Support: <span className="font-mono">{whatsappNumber || '+91 83407 49923'}</span></span>
                </a>

                <a
                  href={`mailto:${supportEmail || 'restorehealthphysio@gmail.com'}`}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-700 border border-stone-200 font-semibold transition-colors"
                  title="Email Support"
                >
                  <Mail className="w-3.5 h-3.5 text-stone-500" />
                  <span className="font-mono">{supportEmail || 'restorehealthphysio@gmail.com'}</span>
                </a>

                <a
                  href={instagramUrl || `https://instagram.com/${(instagramHandle || 'restore_healthphysio').replace('@', '')}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-stone-600 hover:text-[#5C715E] font-medium"
                >
                  <Send className="w-3.5 h-3.5 text-[#5C715E]" />
                  <span>DM @{(instagramHandle || 'restore_healthphysio').replace('@', '')}</span>
                </a>
              </div>

              <div className="pt-1">
                <button
                  onClick={onClose}
                  className="w-full py-2.5 text-xs font-bold text-stone-500 hover:bg-stone-100 rounded-xl transition-colors"
                >
                  Close Window
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
