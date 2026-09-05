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
  Mail
} from 'lucide-react';

interface CheckoutModalProps {
  note: Note | null;
  onClose: () => void;
}

type CheckoutStep = 'customer_info' | 'payment_process' | 'payment_success';
type PaymentTab = 'upi_qr' | 'razorpay' | 'instant_test';

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
  const [activeTab, setActiveTab] = useState<PaymentTab>('upi_qr');
  
  // Gateway & Store details returned from server
  const [storeName, setStoreName] = useState('MEDICOS⛑️MINDS');
  const [upiId, setUpiId] = useState('restorehealthphysio@okaxis');
  const [razorpayKeyId, setRazorpayKeyId] = useState('');
  const [razorpayOrderId, setRazorpayOrderId] = useState<string | null>(null);
  const [paymentMode, setPaymentMode] = useState<'test' | 'live'>('test');
  const [whatsappNumber, setWhatsappNumber] = useState('+91 83407 49923');
  const [supportEmail, setSupportEmail] = useState('restorehealthphysio@gmail.com');
  const [instagramHandle, setInstagramHandle] = useState('restore_healthphysio');
  const [instagramUrl, setInstagramUrl] = useState('');

  // UPI QR Code State
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const [utrNumber, setUtrNumber] = useState('');
  const [copiedUpi, setCopiedUpi] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  // Generate dynamic UPI URL & QR code whenever order or UPI details change
  useEffect(() => {
    if (!note || !createdOrderId) return;

    const targetUpi = upiId || 'restorehealthphysio@okaxis';
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

  // Handle Step 1: Submit info and create order on server
  const handleProceedToPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!note) return;
    if (!customerName.trim() || !customerEmail.trim()) {
      setError('Please provide your name and email address for access.');
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
          customer_name: customerName,
          customer_email: customerEmail,
          customer_phone: customerPhone,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to initialize order');
      }

      setCreatedOrderId(data.order_id);
      if (data.razorpay_order_id) setRazorpayOrderId(data.razorpay_order_id);
      if (data.store_name) setStoreName(data.store_name);
      if (data.upi_id) setUpiId(data.upi_id);
      if (data.key_id) setRazorpayKeyId(data.key_id);
      if (data.payment_mode) setPaymentMode(data.payment_mode);
      if (data.whatsapp_number) setWhatsappNumber(data.whatsapp_number);
      if (data.support_email) setSupportEmail(data.support_email);
      if (data.instagram_handle) setInstagramHandle(data.instagram_handle);
      if (data.instagram_url) setInstagramUrl(data.instagram_url);

      // If live Razorpay key is present, default to Razorpay tab, else UPI QR
      if (data.key_id && data.payment_mode === 'live') {
        setActiveTab('razorpay');
      } else {
        setActiveTab('upi_qr');
      }

      setStep('payment_process');
    } catch (err: any) {
      setError(err.message || 'Network error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Handle UPI Payment Confirmation with UTR
  const handleConfirmUpiPayment = async () => {
    if (!createdOrderId) return;
    setLoading(true);
    setError(null);

    try {
      const effectiveUtr = utrNumber.trim() || `upi_${Date.now().toString().slice(-8)}`;

      const verifyRes = await fetch('/api/checkout/verify-payment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          order_id: createdOrderId,
          payment_id: `upi_${effectiveUtr}`,
          payment_method: 'upi',
          utr_number: effectiveUtr,
          test_mode: paymentMode === 'test',
        }),
      });

      const verifyData = await verifyRes.json();
      if (!verifyRes.ok || !verifyData.success) {
        throw new Error(verifyData.message || 'Payment verification failed.');
      }

      setDownloadToken(verifyData.download_token);
      setPaidOrder(verifyData.order);
      setStep('payment_success');
    } catch (err: any) {
      setError(err.message || 'Payment verification failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Dynamically load Razorpay SDK if not present
  const loadRazorpayScript = (): Promise<boolean> => {
    return new Promise((resolve) => {
      if ((window as any).Razorpay) {
        resolve(true);
        return;
      }
      const existingScript = document.querySelector('script[src*="checkout.razorpay.com"]');
      if (existingScript) {
        existingScript.addEventListener('load', () => resolve(true));
        existingScript.addEventListener('error', () => resolve(false));
        return;
      }
      const script = document.createElement('script');
      script.src = 'https://checkout.razorpay.com/v1/checkout.js';
      script.async = true;
      script.onload = () => resolve(true);
      script.onerror = () => resolve(false);
      document.body.appendChild(script);
    });
  };

  // Handle Razorpay Standard Checkout
  const handleRazorpayCheckout = async () => {
    if (!note || !createdOrderId) return;

    setLoading(true);
    setError(null);

    const isLoaded = await loadRazorpayScript();
    if (!isLoaded || !(window as any).Razorpay) {
      setError('Razorpay SDK could not load (network or ad-blocker). Please switch to Direct UPI QR.');
      setLoading(false);
      return;
    }

    const keyToUse = razorpayKeyId || 'rzp_test_placeholder';

    const options: any = {
      key: keyToUse,
      amount: Math.round(note.price * 100), // in paise
      currency: 'INR',
      name: storeName || 'MEDICOS⛑️MINDS',
      description: note.title,
      image: 'https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?w=128&auto=format&fit=crop&q=80',
      handler: async function (response: any) {
        // Successful payment callback from Razorpay
        try {
          const verifyRes = await fetch('/api/checkout/verify-payment', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              order_id: createdOrderId,
              razorpay_order_id: response.razorpay_order_id || razorpayOrderId,
              payment_id: response.razorpay_payment_id,
              signature: response.razorpay_signature,
              payment_method: 'razorpay',
              test_mode: paymentMode === 'test' || !razorpayKeyId,
            }),
          });

          const verifyData = await verifyRes.json();
          if (!verifyRes.ok || !verifyData.success) {
            throw new Error(verifyData.message || 'Signature verification failed.');
          }

          setDownloadToken(verifyData.download_token);
          setPaidOrder(verifyData.order);
          setStep('payment_success');
        } catch (err: any) {
          setError(err.message || 'Verification error after payment.');
        } finally {
          setLoading(false);
        }
      },
      prefill: {
        name: customerName,
        email: customerEmail,
        contact: customerPhone,
      },
      theme: {
        color: '#5C715E',
      },
      modal: {
        ondismiss: function () {
          setLoading(false);
        },
      },
    };

    // Attach order_id if generated by Razorpay Orders API
    if (razorpayOrderId) {
      options.order_id = razorpayOrderId;
    }

    try {
      const rzp = new (window as any).Razorpay(options);
      rzp.on('payment.failed', function (resp: any) {
        setError(resp.error?.description || 'Payment was declined by bank or gateway.');
        setLoading(false);
      });
      rzp.open();
    } catch (err: any) {
      setError('Could not open Razorpay checkout modal. Try Direct UPI QR.');
      setLoading(false);
    }
  };

  // Instant Test Simulator (Zero friction preview testing)
  const handleInstantTestPayment = async () => {
    if (!createdOrderId) return;
    setLoading(true);
    setError(null);

    try {
      const simPaymentId = 'sim_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6);

      const verifyRes = await fetch('/api/checkout/verify-payment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          order_id: createdOrderId,
          payment_id: simPaymentId,
          test_mode: true,
          payment_method: 'test',
        }),
      });

      const verifyData = await verifyRes.json();
      if (!verifyRes.ok || !verifyData.success) {
        throw new Error(verifyData.message || 'Verification failed on server.');
      }

      setDownloadToken(verifyData.download_token);
      setPaidOrder(verifyData.order);
      setStep('payment_success');
    } catch (err: any) {
      setError(err.message || 'Error completing test verification.');
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
              <img
                src={note.cover_image}
                alt={note.title}
                referrerPolicy="no-referrer"
                className="w-11 h-11 rounded-xl object-cover border border-stone-200 shrink-0"
              />
            ) : (
              <div className="w-11 h-11 rounded-xl bg-[#D9E4DD] text-[#5C715E] flex items-center justify-center font-bold shrink-0">
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
                <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-1">
                  Email Address <span className="text-red-500">*</span>
                </label>
                <input
                  id="checkout-customer-email"
                  type="email"
                  required
                  placeholder="student@example.com"
                  value={customerEmail}
                  onChange={(e) => setCustomerEmail(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-stone-300 text-sm focus:outline-none focus:ring-2 focus:ring-[#5C715E] bg-stone-50"
                />
                <span className="text-[11px] text-stone-500 mt-1 block">
                  Your PDF download link and receipt will be sent to this email.
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
                <span>Encrypted 256-Bit SSL Checkout • Instant PDF Access</span>
              </div>
            </form>
          )}

          {/* STEP 2: PAYMENT CHOICES */}
          {step === 'payment_process' && (
            <div className="space-y-4">
              {/* Payment Tabs */}
              <div className="flex rounded-xl bg-stone-100 p-1 gap-1">
                <button
                  type="button"
                  onClick={() => setActiveTab('upi_qr')}
                  className={`flex-1 py-2 px-2 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                    activeTab === 'upi_qr'
                      ? 'bg-white text-[#2D3436] shadow-xs'
                      : 'text-stone-500 hover:text-stone-800'
                  }`}
                >
                  <QrCode className="w-3.5 h-3.5 text-[#5C715E]" />
                  <span>UPI / QR Code</span>
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('razorpay')}
                  className={`flex-1 py-2 px-2 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                    activeTab === 'razorpay'
                      ? 'bg-white text-[#2D3436] shadow-xs'
                      : 'text-stone-500 hover:text-stone-800'
                  }`}
                >
                  <CreditCard className="w-3.5 h-3.5 text-[#5C715E]" />
                  <span>Cards / Gateway</span>
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('instant_test')}
                  className={`flex-1 py-2 px-2 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                    activeTab === 'instant_test'
                      ? 'bg-white text-[#2D3436] shadow-xs'
                      : 'text-stone-500 hover:text-stone-800'
                  }`}
                >
                  <Sparkles className="w-3.5 h-3.5 text-amber-600" />
                  <span>Quick Test</span>
                </button>
              </div>

              {/* TAB 1: DIRECT UPI QR CODE & MOBILE INTENT */}
              {activeTab === 'upi_qr' && (
                <div className="space-y-3.5">
                  <div className="bg-[#F9F7F2] p-4 rounded-2xl border border-[#5C715E]/20 text-center flex flex-col items-center">
                    <span className="text-[11px] font-bold text-stone-500 uppercase tracking-wider">
                      Scan & Pay with Any UPI App
                    </span>
                    <div className="text-xl font-black text-[#2D3436] mt-0.5">
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
                        className="inline-flex items-center gap-1 text-[11px] font-bold text-[#5C715E] hover:text-[#4A5D4E] shrink-0 ml-2"
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

                  {/* UTR input & Confirm */}
                  <div className="bg-stone-50 p-3.5 rounded-2xl border border-stone-200 space-y-2">
                    <label className="block text-xs font-bold text-stone-700">
                      Enter UPI 12-Digit Reference / UTR Number <span className="text-stone-400 font-normal">(Optional)</span>:
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. 329847192834"
                      value={utrNumber}
                      onChange={(e) => setUtrNumber(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-stone-300 text-xs font-mono focus:outline-none focus:ring-2 focus:ring-[#5C715E] bg-white"
                    />
                    <button
                      id="confirm-upi-payment-btn"
                      type="button"
                      disabled={loading}
                      onClick={handleConfirmUpiPayment}
                      className="w-full inline-flex items-center justify-center gap-2 py-3 px-4 bg-[#5C715E] hover:bg-[#4A5D4E] text-white rounded-xl font-bold text-sm shadow-md shadow-[#5C715E]/20 transition-all active:scale-98 disabled:opacity-50 mt-1"
                    >
                      {loading ? (
                        <div className="flex items-center gap-2">
                          <RefreshCw className="w-4 h-4 animate-spin" />
                          <span>Verifying Payment...</span>
                        </div>
                      ) : (
                        <>
                          <CheckCircle2 className="w-4 h-4" />
                          <span>I Have Paid — Get My PDF</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              )}

              {/* TAB 2: RAZORPAY GATEWAY CHECKOUT */}
              {activeTab === 'razorpay' && (
                <div className="space-y-3.5">
                  <div className="bg-stone-50 p-4 rounded-2xl border border-stone-200 text-center space-y-2">
                    <CreditCard className="w-8 h-8 text-[#5C715E] mx-auto" />
                    <h4 className="text-sm font-bold text-[#2D3436]">Razorpay Payment Gateway</h4>
                    <p className="text-xs text-stone-600 leading-relaxed">
                      Pay via Credit/Debit Cards, NetBanking, UPI, CRED, or Wallets with automatic bank verification.
                    </p>
                    <div className="py-2">
                      <div className="text-2xl font-black text-[#2D3436]">₹{note.price}</div>
                      <span className="text-[11px] text-[#5C715E] font-semibold">
                        {paymentMode === 'live' ? 'Live Production Mode' : 'Sandbox Gateway Mode'}
                      </span>
                    </div>
                  </div>

                  <button
                    id="launch-razorpay-btn"
                    type="button"
                    disabled={loading}
                    onClick={handleRazorpayCheckout}
                    className="w-full inline-flex items-center justify-center gap-2 py-3.5 px-4 bg-[#5C715E] hover:bg-[#4A5D4E] text-white rounded-xl font-bold text-sm shadow-md shadow-[#5C715E]/20 transition-all active:scale-98 disabled:opacity-50"
                  >
                    {loading ? (
                      <div className="flex items-center gap-2">
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        <span>Opening Gateway...</span>
                      </div>
                    ) : (
                      <>
                        <Lock className="w-4 h-4" />
                        <span>Open Razorpay Checkout</span>
                      </>
                    )}
                  </button>
                </div>
              )}

              {/* TAB 3: INSTANT TEST SIMULATOR */}
              {activeTab === 'instant_test' && (
                <div className="space-y-3.5">
                  <div className="bg-amber-50/60 p-4 rounded-2xl border border-amber-200/80 text-center space-y-1.5">
                    <Sparkles className="w-8 h-8 text-amber-600 mx-auto" />
                    <h4 className="text-sm font-bold text-amber-900">Instant Test & Demo Simulator</h4>
                    <p className="text-xs text-amber-800/80 leading-relaxed">
                      Experience the full post-purchase student flow instantly without charging real money.
                    </p>
                  </div>

                  <button
                    id="simulate-instant-pay-btn"
                    type="button"
                    disabled={loading}
                    onClick={handleInstantTestPayment}
                    className="w-full inline-flex items-center justify-center gap-2 py-3.5 px-4 bg-[#5C715E] hover:bg-[#4A5D4E] text-white rounded-xl font-bold text-sm shadow-md shadow-[#5C715E]/20 transition-all active:scale-98 disabled:opacity-50"
                  >
                    {loading ? (
                      <div className="flex items-center gap-2">
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        <span>Verifying Simulator...</span>
                      </div>
                    ) : (
                      <>
                        <CheckCircle2 className="w-4 h-4" />
                        <span>Simulate Instant Payment (₹{note.price})</span>
                      </>
                    )}
                  </button>
                </div>
              )}

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
                  className="text-xs text-stone-500 hover:text-stone-800 font-medium"
                >
                  ← Edit details ({customerName})
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
