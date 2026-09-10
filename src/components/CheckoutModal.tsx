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
  XCircle,
  KeyRound,
  Timer,
  Zap,
  Camera,
  ChevronDown,
  ChevronUp
} from 'lucide-react';

interface CheckoutModalProps {
  note: Note | null;
  onClose: () => void;
  initialOrderId?: string | null;
}

type CheckoutStep = 'customer_info' | 'payment_process' | 'verification_pending' | 'payment_success' | 'payment_rejected';

// Known fake / disposable email domain blocklist to prevent random/fake email access
const DISPOSABLE_DOMAINS = new Set([
  'tempmail.com', 'mailinator.com', 'guerrillamail.com', '10minutemail.com',
  'throwaway.com', 'fakemail.com', 'yopmail.com', 'sharklasers.com',
  'getnada.com', 'dispostable.com', 'test.com', 'example.com', 'asdf.com',
  'random.com', 'fake.com', 'trashmail.com', 'throwawaymail.com', 'burnermail.io',
  'dropmail.me', 'maildrop.cc', 'emailondeck.com', 'mohmal.com', 'temp-mail.org',
  'tempmailo.com', 'zillamail.com', 'mytemp.email', 'crazymailing.com'
]);

// Strict Email Validation Helper
const isValidEmail = (email: string): boolean => {
  if (!email) return false;
  const trimmed = email.trim().toLowerCase();
  if (trimmed.length < 6 || trimmed.length > 254 || /\s/.test(trimmed)) return false;
  const emailRegex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+$/;
  if (!emailRegex.test(trimmed)) return false;
  const parts = trimmed.split('@');
  if (parts.length !== 2) return false;
  const domain = parts[1];
  if (!domain.includes('.')) return false;
  if (DISPOSABLE_DOMAINS.has(domain)) return false;
  const tld = domain.split('.').pop();
  if (!tld || tld.length < 2 || !/^[a-zA-Z]+$/.test(tld)) return false;
  return true;
};

export const CheckoutModal: React.FC<CheckoutModalProps> = ({ note, onClose, initialOrderId }) => {
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

  // Email OTP verification state
  const [emailOtpSent, setEmailOtpSent] = useState(false);
  const [emailOtpCode, setEmailOtpCode] = useState('');
  const [emailVerified, setEmailVerified] = useState(false);
  const [verifyingOtp, setVerifyingOtp] = useState(false);
  const [otpNotice, setOtpNotice] = useState<string | null>(null);

  // UTR / Transaction Reference
  const [utrNumber, setUtrNumber] = useState('');

  // 5-Minute QR Session Timer & Verification State
  const [cooldownSeconds, setCooldownSeconds] = useState(300); // 300s = 5 minutes
  const [isExpired, setIsExpired] = useState(false);
  const [returnedFromUpi, setReturnedFromUpi] = useState(false);
  const hasLeftToUpiAppRef = React.useRef(false);

  // Order & Payment State
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [rejectionReason, setRejectionReason] = useState<string | null>(null);
  const [createdOrderId, setCreatedOrderId] = useState<string | null>(initialOrderId || null);
  const [downloadToken, setDownloadToken] = useState<string | null>(null);
  const [paidOrder, setPaidOrder] = useState<Order | null>(null);
  
  // Store & UPI details returned from server
  const [storeName, setStoreName] = useState('MEDICOS⛑️MINDS');
  const [upiId, setUpiId] = useState('restorehealthphysio@okaxis');
  const [whatsappNumber, setWhatsappNumber] = useState('+91 83407 49923');
  const [supportEmail, setSupportEmail] = useState('restorehealthphysio@gmail.com');
  const [instagramHandle, setInstagramHandle] = useState('restore_healthphysio');
  const [instagramUrl, setInstagramUrl] = useState('');

  // Server-provided NPCI UPI URIs
  const [serverUpiUri, setServerUpiUri] = useState<string>('');
  const [serverGpayUri, setServerGpayUri] = useState<string>('');
  const [serverPhonepeUri, setServerPhonepeUri] = useState<string>('');
  const [serverPaytmUri, setServerPaytmUri] = useState<string>('');
  const [returnUrl, setReturnUrl] = useState<string>('');

  // UPI QR Code State
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const [copiedUpi, setCopiedUpi] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [checkingStatus, setCheckingStatus] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  // Generate dynamic NPCI UPI URL & QR code whenever order or UPI details change
  useEffect(() => {
    if (!note || !createdOrderId) return;

    const targetUpi = upiId || 'kamranalam8340749923-1@okhdfcbank';
    const noteNameClean = note.title.slice(0, 30).replace(/[^a-zA-Z0-9 ]/g, '');
    const currentReturnUrl = returnUrl || `${window.location.origin}/?order_id=${encodeURIComponent(createdOrderId)}&check_status=true`;
    
    // NPCI standard UPI URI with tr (Order ID) and url callback parameters
    const upiUri = serverUpiUri || `upi://pay?pa=${encodeURIComponent(targetUpi)}&pn=${encodeURIComponent(storeName)}&mc=0000&tr=${encodeURIComponent(createdOrderId)}&tn=${encodeURIComponent(`Order ${createdOrderId} - ${noteNameClean}`)}&am=${Number(note.price).toFixed(2)}&cu=INR&url=${encodeURIComponent(currentReturnUrl)}`;

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
  }, [note, createdOrderId, upiId, storeName, serverUpiUri, returnUrl]);

  // If opened with initialOrderId from URL redirect, auto-check status
  useEffect(() => {
    if (initialOrderId) {
      setCreatedOrderId(initialOrderId);
      setStep('payment_process');
      checkOrderStatus(false, initialOrderId);
    }
  }, [initialOrderId]);

  // Status polling hook: when awaiting verification, check order status automatically every 3 seconds
  useEffect(() => {
    if (step !== 'verification_pending' || !createdOrderId) return;
    const interval = setInterval(() => {
      checkOrderStatus(true);
    }, 3000);
    return () => clearInterval(interval);
  }, [step, createdOrderId]);

  // Check Order Status function - Calls dedicated backend /api/checkout/check-status endpoint
  const checkOrderStatus = async (silent = false, orderIdOverride?: string) => {
    const targetId = orderIdOverride || createdOrderId;
    if (!targetId || !note) return;
    if (!silent) setCheckingStatus(true);

    try {
      const res = await fetch('/api/checkout/check-status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ order_id: targetId }),
      });
      const data = await res.json();
      if (res.ok && data) {
        if (data.status === 'paid' && data.download_token) {
          setDownloadToken(data.download_token);
          setPaidOrder({
            id: data.order_id || targetId,
            note_id: note.id,
            note_title: note.title,
            customer_name: customerName,
            customer_email: customerEmail,
            customer_phone: customerPhone,
            amount: note.price,
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
          setRejectionReason(data.rejection_reason || 'Payment could not be verified in bank/UPI records.');
          setStep('payment_rejected');
        } else if (data.status === 'expired') {
          setError('This payment session has expired. Please initiate a fresh checkout.');
          setIsExpired(true);
        } else if (data.status === 'pending_verification') {
          if (!silent) {
            setStatusMessage('Payment confirmation received! Awaiting creator verification.');
            setTimeout(() => setStatusMessage(null), 4000);
          }
        } else {
          if (!silent) {
            setStatusMessage('No confirmed payment detected yet. If you completed the UPI transfer, please wait a moment or click "I have paid" to submit your UTR.');
            setTimeout(() => setStatusMessage(null), 4500);
          }
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
      `Hi MEDICOS MINDS! I have transferred ₹${note?.price} via UPI for "${note?.title}".\n\nOrder ID: ${createdOrderId}\nUTR Number: ${utrNumber || 'Submitted'}\nName: ${customerName}\nEmail: ${customerEmail}\n\nPlease verify my payment and unlock my PDF.`
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

  // 5-Minute Session Timer: Starts counting down when in payment process
  useEffect(() => {
    if (step !== 'payment_process') return;

    setCooldownSeconds(300); // 5 minutes
    setIsExpired(false);
    hasLeftToUpiAppRef.current = false;
    setReturnedFromUpi(false);

    const timer = setInterval(() => {
      setCooldownSeconds((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          setIsExpired(true);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [step, createdOrderId]);

  // Format MM:SS
  const formatCooldown = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  // When returning from external UPI app, show helpful guidance to submit UTR
  useEffect(() => {
    if (step !== 'payment_process' || !createdOrderId || isExpired) return;

    const handleReturnToTab = () => {
      if (document.visibilityState === 'visible' && hasLeftToUpiAppRef.current) {
        setReturnedFromUpi(true);
      }
    };

    document.addEventListener('visibilitychange', handleReturnToTab);
    window.addEventListener('focus', handleReturnToTab);

    return () => {
      document.removeEventListener('visibilitychange', handleReturnToTab);
      window.removeEventListener('focus', handleReturnToTab);
    };
  }, [step, createdOrderId, isExpired]);

  // Regenerate fresh QR when expired
  const handleRegenerateQr = async () => {
    if (!note) return;
    setLoading(true);
    setError(null);
    setIsExpired(false);
    setCooldownSeconds(300);
    hasLeftToUpiAppRef.current = false;
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
      if (!res.ok) throw new Error(data.error || 'Failed to refresh QR');
      setCreatedOrderId(data.order_id);
    } catch (err: any) {
      setError('Could not generate a fresh QR. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Download QR code image to gallery for scanner upload
  const handleDownloadQr = () => {
    if (!qrDataUrl) return;
    const a = document.createElement('a');
    a.href = qrDataUrl;
    a.download = `UPI-QR-MEDICOS-MINDS-${createdOrderId || 'Payment'}.png`;
    a.click();
  };

  // Send Email OTP for instant verification
  const handleSendEmailOtp = async () => {
    if (!customerEmail.trim()) {
      setError('Please enter your email address first.');
      return;
    }
    if (!isValidEmail(customerEmail)) {
      setError('Please enter a valid personal or university email address (disposable or temporary emails are blocked).');
      return;
    }
    setError(null);
    setVerifyingOtp(true);
    setOtpNotice(null);
    try {
      const res = await fetch('/api/auth/send-email-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: customerEmail.trim() }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to send verification code.');
      }
      setEmailOtpSent(true);
      if (data.verification_code) {
        setOtpNotice(`Verification Code: ${data.verification_code} (Enter below to confirm valid email)`);
      } else {
        setOtpNotice('Verification code sent! Please check your inbox and enter the 4-digit code.');
      }
    } catch (err: any) {
      setError(err.message || 'Error generating email verification code.');
    } finally {
      setVerifyingOtp(false);
    }
  };

  // Verify Email OTP
  const handleVerifyEmailOtp = async () => {
    if (!emailOtpCode.trim()) {
      setError('Please enter the 4-digit code.');
      return;
    }
    setError(null);
    setVerifyingOtp(true);
    try {
      const res = await fetch('/api/auth/verify-email-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: customerEmail.trim(), code: emailOtpCode.trim() }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Invalid verification code.');
      }
      setEmailVerified(true);
      setOtpNotice('Email successfully verified! ✓');
    } catch (err: any) {
      setError(err.message || 'Incorrect verification code. Please check and re-enter.');
    } finally {
      setVerifyingOtp(false);
    }
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
      setError('Please enter a valid, legitimate email address (e.g. yourname@gmail.com). Disposable or temporary emails like tempmail/mailinator are not accepted.');
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
      if (data.upi_uri) setServerUpiUri(data.upi_uri);
      if (data.gpay_uri) setServerGpayUri(data.gpay_uri);
      if (data.phonepe_uri) setServerPhonepeUri(data.phonepe_uri);
      if (data.paytm_uri) setServerPaytmUri(data.paytm_uri);
      if (data.return_url) setReturnUrl(data.return_url);
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

  // Handle Submit UPI Payment Confirmation (UTR is optional; sends for confirmation in sales section)
  const handleSubmitUpiPayment = async () => {
    if (!createdOrderId || !note) return;
    const cleanUtr = utrNumber.trim().replace(/[^a-zA-Z0-9]/g, '');
    setLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/checkout/submit-upi-payment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          order_id: createdOrderId,
          transaction_ref: cleanUtr || '',
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || data.message || 'Submission failed. Please try again.');
      }

      // If instant verification was triggered and download token is returned
      if (data.status === 'paid' && data.download_token) {
        setDownloadToken(data.download_token);
        setPaidOrder({
          id: createdOrderId,
          note_id: note.id,
          note_title: note.title,
          customer_name: customerName,
          customer_email: customerEmail,
          customer_phone: customerPhone,
          amount: note.price,
          status: 'paid',
          download_token: data.download_token,
          download_count: 0,
          paid_at: new Date().toISOString(),
          created_at: new Date().toISOString(),
        });
        setStep('payment_success');
      } else {
        // Transition to verification pending screen (Security Protected - Awaiting Creator Approval)
        setStep('verification_pending');
      }
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

  const currentReturnUrl = returnUrl || (createdOrderId ? `${window.location.origin}/?order_id=${encodeURIComponent(createdOrderId)}&check_status=true` : '');
  const directUpiLink = serverUpiUri || `upi://pay?pa=${encodeURIComponent(upiId || 'kamranalam8340749923-1@okhdfcbank')}&pn=${encodeURIComponent(storeName)}&mc=0000${createdOrderId ? `&tr=${encodeURIComponent(createdOrderId)}` : ''}&am=${Number(note.price).toFixed(2)}&cu=INR${currentReturnUrl ? `&url=${encodeURIComponent(currentReturnUrl)}` : ''}&tn=${encodeURIComponent(`Order ${createdOrderId || ''} - ${note.title.slice(0, 20)}`)}`;

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
                    <span className={`text-[11px] font-semibold ${emailVerified ? 'text-emerald-700 font-bold' : isValidEmail(customerEmail) ? 'text-emerald-600' : 'text-red-500'}`}>
                      {emailVerified ? '✓ Verified Email' : isValidEmail(customerEmail) ? 'Valid Format' : 'Invalid / Disposable Blocked'}
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
                    setEmailVerified(false);
                    setEmailOtpSent(false);
                    setOtpNotice(null);
                    if (error) setError(null);
                  }}
                  className={`w-full px-3.5 py-2.5 rounded-xl border text-sm focus:outline-none focus:ring-2 bg-stone-50 ${
                    customerEmail.trim() && !isValidEmail(customerEmail)
                      ? 'border-red-400 focus:ring-red-400'
                      : emailVerified
                      ? 'border-emerald-500 bg-emerald-50/30 focus:ring-emerald-500'
                      : 'border-stone-300 focus:ring-[#5C715E]'
                  }`}
                />
                
                {/* Email Verification Action: Click to verify email address */}
                <div className="mt-2">
                  {!emailVerified && (
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[11px] text-stone-500">
                        {emailOtpSent ? 'Enter code sent for this email:' : 'Confirm your genuine email address:'}
                      </span>
                      {!emailOtpSent ? (
                        <button
                          type="button"
                          onClick={handleSendEmailOtp}
                          disabled={verifyingOtp || !customerEmail.trim() || !isValidEmail(customerEmail)}
                          className="text-[11px] font-bold text-[#5C715E] hover:text-[#4A5D4E] underline cursor-pointer disabled:opacity-40 shrink-0"
                        >
                          {verifyingOtp ? 'Sending code...' : 'Verify Email (Get Code)'}
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={handleSendEmailOtp}
                          disabled={verifyingOtp}
                          className="text-[11px] text-stone-500 hover:text-stone-700 underline cursor-pointer shrink-0"
                        >
                          Resend Code
                        </button>
                      )}
                    </div>
                  )}

                  {otpNotice && (
                    <div className="mt-1.5 p-2 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center gap-1.5">
                      <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                      <span className="font-semibold text-[11px]">{otpNotice}</span>
                    </div>
                  )}

                  {emailOtpSent && !emailVerified && (
                    <div className="mt-2 flex items-center gap-2">
                      <input
                        type="text"
                        maxLength={6}
                        placeholder="Enter 4-digit code"
                        value={emailOtpCode}
                        onChange={(e) => setEmailOtpCode(e.target.value.replace(/[^0-9]/g, ''))}
                        className="px-3 py-1.5 w-36 rounded-xl border border-stone-300 text-xs font-mono text-center tracking-widest focus:outline-none focus:ring-2 focus:ring-[#5C715E]"
                      />
                      <button
                        type="button"
                        onClick={handleVerifyEmailOtp}
                        disabled={verifyingOtp || !emailOtpCode.trim()}
                        className="px-3 py-1.5 rounded-xl bg-[#5C715E] hover:bg-[#4A5D4E] text-white text-xs font-bold transition-colors cursor-pointer disabled:opacity-50"
                      >
                        {verifyingOtp ? 'Verifying...' : 'Confirm'}
                      </button>
                    </div>
                  )}
                </div>

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

          {/* STEP 2: DIRECT UPI PAYMENT, 5-MIN COOLDOWN & REDIRECT VERIFICATION */}
          {step === 'payment_process' && (
            <div className="space-y-4">
              {/* 5-Minute Cooldown Timer Bar */}
              <div className={`p-3.5 rounded-2xl border transition-all ${
                isExpired 
                  ? 'bg-red-50 border-red-200 text-red-900' 
                  : cooldownSeconds < 60 
                    ? 'bg-red-50 border-red-300 text-red-900' 
                    : 'bg-amber-50/90 border-amber-200 text-amber-950'
              }`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="relative flex h-3 w-3">
                      {!isExpired && (
                        <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${
                          cooldownSeconds < 60 ? 'bg-red-400' : 'bg-amber-400'
                        }`}></span>
                      )}
                      <span className={`relative inline-flex rounded-full h-3 w-3 ${
                        isExpired ? 'bg-red-500' : cooldownSeconds < 60 ? 'bg-red-500' : 'bg-amber-500'
                      }`}></span>
                    </span>
                    <div>
                      <div className="text-xs font-bold flex items-center gap-1.5">
                        <Timer className="w-3.5 h-3.5" />
                        <span>{isExpired ? 'Payment Session Expired' : '5-Minute Active Session'}</span>
                      </div>
                      <div className="text-[11px] opacity-80">
                        {isExpired 
                          ? 'Please refresh to generate a new QR' 
                          : 'Auto-verifies upon return from UPI app'}
                      </div>
                    </div>
                  </div>
                  <div className={`font-mono text-sm font-black px-2.5 py-1 rounded-xl border ${
                    isExpired 
                      ? 'bg-red-100 border-red-300 text-red-700' 
                      : cooldownSeconds < 60 
                        ? 'bg-red-100 border-red-300 text-red-700 animate-pulse' 
                        : 'bg-white border-amber-300 text-amber-900 shadow-xs'
                  }`}>
                    {isExpired ? '00:00' : formatCooldown(cooldownSeconds)}
                  </div>
                </div>

                {/* Progress bar */}
                {!isExpired && (
                  <div className="w-full bg-stone-200/80 h-1.5 rounded-full overflow-hidden mt-2.5">
                    <div 
                      className={`h-full transition-all duration-1000 ${
                        cooldownSeconds < 60 ? 'bg-red-500' : 'bg-[#5C715E]'
                      }`}
                      style={{ width: `${Math.max(0, (cooldownSeconds / 300) * 100)}%` }}
                    />
                  </div>
                )}
              </div>

              {/* Expired State UI */}
              {isExpired ? (
                <div className="bg-white p-5 rounded-2xl border border-stone-200 text-center space-y-3 shadow-xs">
                  <AlertCircle className="w-10 h-10 text-red-500 mx-auto" />
                  <div>
                    <h4 className="font-bold text-stone-900 text-sm">QR Code Expired</h4>
                    <p className="text-xs text-stone-500 mt-1 leading-relaxed">
                      For your payment security, UPI QR sessions are valid for 5 minutes. Click below to regenerate a fresh QR code.
                    </p>
                  </div>
                  <button
                    type="button"
                    disabled={loading}
                    onClick={handleRegenerateQr}
                    className="w-full inline-flex items-center justify-center gap-2 py-3 px-4 bg-[#5C715E] hover:bg-[#4A5D4E] text-white rounded-xl font-bold text-xs shadow-md transition-all cursor-pointer"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
                    <span>Generate Fresh QR Code</span>
                  </button>
                </div>
              ) : (
                <div className="space-y-3.5">
                  {/* QR Code Container & Amount */}
                  <div className="bg-[#F9F7F2] p-4 rounded-2xl border border-[#5C715E]/20 text-center flex flex-col items-center">
                    <span className="text-[11px] font-bold text-stone-500 uppercase tracking-wider">
                      Scan with GPay / PhonePe / Paytm
                    </span>
                    <div className="text-2xl font-black text-[#2D3436] mt-0.5">
                      ₹{note.price}
                    </div>

                    {/* QR Code Graphic */}
                    <div className="mt-3 p-2.5 bg-white rounded-2xl border border-stone-200 shadow-xs relative group">
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

                    {/* Screenshot / Download QR Helper */}
                    <div className="mt-2 flex items-center gap-2">
                      <button
                        type="button"
                        onClick={handleDownloadQr}
                        className="inline-flex items-center gap-1.5 px-3 py-1 bg-white hover:bg-stone-50 border border-stone-200 rounded-lg text-[11px] font-semibold text-stone-600 shadow-2xs transition-colors cursor-pointer"
                        title="Download or screenshot QR to scan in GPay/Paytm scanner"
                      >
                        <Camera className="w-3.5 h-3.5 text-[#5C715E]" />
                        <span>Screenshot / Save QR</span>
                      </button>
                    </div>

                    {/* Quick 1-Tap Mobile App Buttons */}
                    <div className="mt-3 w-full space-y-2">
                      <div className="text-[10px] font-bold text-stone-400 uppercase tracking-wider">
                        Or Tap Your UPI App to Pay Directly
                      </div>
                      
                      <div className="grid grid-cols-2 gap-2">
                        {/* Google Pay */}
                        <a
                          href={serverGpayUri || directUpiLink}
                          onClick={() => { hasLeftToUpiAppRef.current = true; }}
                          className="inline-flex items-center justify-center gap-1.5 py-2.5 px-3 bg-white hover:bg-stone-50 text-stone-800 border border-stone-200 rounded-xl font-bold text-xs shadow-2xs transition-all active:scale-98"
                        >
                          <Smartphone className="w-3.5 h-3.5 text-blue-600" />
                          <span>Google Pay</span>
                        </a>

                        {/* PhonePe */}
                        <a
                          href={serverPhonepeUri || directUpiLink}
                          onClick={() => { hasLeftToUpiAppRef.current = true; }}
                          className="inline-flex items-center justify-center gap-1.5 py-2.5 px-3 bg-white hover:bg-stone-50 text-stone-800 border border-stone-200 rounded-xl font-bold text-xs shadow-2xs transition-all active:scale-98"
                        >
                          <Smartphone className="w-3.5 h-3.5 text-purple-600" />
                          <span>PhonePe</span>
                        </a>

                        {/* Paytm */}
                        <a
                          href={serverPaytmUri || directUpiLink}
                          onClick={() => { hasLeftToUpiAppRef.current = true; }}
                          className="inline-flex items-center justify-center gap-1.5 py-2.5 px-3 bg-white hover:bg-stone-50 text-stone-800 border border-stone-200 rounded-xl font-bold text-xs shadow-2xs transition-all active:scale-98"
                        >
                          <Smartphone className="w-3.5 h-3.5 text-sky-600" />
                          <span>Paytm</span>
                        </a>

                        {/* Other UPI Apps */}
                        <a
                          href={serverUpiUri || directUpiLink}
                          onClick={() => { hasLeftToUpiAppRef.current = true; }}
                          className="inline-flex items-center justify-center gap-1.5 py-2.5 px-3 bg-white hover:bg-stone-50 text-stone-800 border border-stone-200 rounded-xl font-bold text-xs shadow-2xs transition-all active:scale-98"
                        >
                          <Smartphone className="w-3.5 h-3.5 text-emerald-600" />
                          <span>Any UPI App</span>
                        </a>
                      </div>
                    </div>

                    {/* Prominent Check Status Action (Instant verification from bank/webhook records) */}
                    <div className="mt-3.5 w-full space-y-1.5">
                      <button
                        id="check-payment-status-btn"
                        type="button"
                        disabled={checkingStatus}
                        onClick={() => checkOrderStatus(false)}
                        className="w-full inline-flex items-center justify-center gap-2 py-3 px-4 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl font-bold text-xs sm:text-sm shadow-sm transition-all active:scale-98 disabled:opacity-60 cursor-pointer"
                      >
                        {checkingStatus ? (
                          <>
                            <RefreshCw className="w-4 h-4 animate-spin" />
                            <span>Checking Payment Status with Bank...</span>
                          </>
                        ) : (
                          <>
                            <CheckCircle2 className="w-4 h-4 text-emerald-300" />
                            <span>I've Completed Payment — Check Status</span>
                          </>
                        )}
                      </button>

                      {statusMessage && (
                        <div className="p-2.5 bg-stone-100 border border-stone-200 rounded-xl text-[11px] text-stone-700 font-medium text-center animate-in fade-in">
                          {statusMessage}
                        </div>
                      )}
                    </div>

                    {/* UPI ID & Copy button */}
                    <div className="mt-2.5 flex items-center justify-between w-full max-w-xs px-3 py-1.5 bg-white rounded-xl border border-stone-200 text-xs">
                      <span className="font-mono text-stone-700 truncate text-[11px]">{upiId}</span>
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

                  {/* Notice when returning from UPI app */}
                  {returnedFromUpi && (
                    <div className="p-3 bg-emerald-50 border border-emerald-300 rounded-2xl flex items-center gap-2.5 text-emerald-950 text-xs font-semibold animate-in fade-in">
                      <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                      <span>Returned from UPI app? Click "Check Status" above to verify, or enter the 12-digit UTR from your receipt below.</span>
                    </div>
                  )}

                  {/* Optional UTR / UPI Reference Number Input Section */}
                  <div className="p-4 bg-stone-50/90 rounded-2xl border border-stone-200 space-y-3 text-left">
                    <div className="flex items-center justify-between">
                      <label htmlFor="checkout-utr-number" className="text-xs font-bold text-[#2D3436] flex items-center gap-1.5">
                        <ShieldCheck className="w-4 h-4 text-[#5C715E]" />
                        <span>Step 2: UPI Reference / UTR Number</span>
                      </label>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-stone-500 bg-stone-200/80 px-2 py-0.5 rounded-full">
                        Optional
                      </span>
                    </div>

                    <div className="relative">
                      <input
                        id="checkout-utr-number"
                        type="text"
                        maxLength={25}
                        placeholder="e.g. 423589123456 (Optional)"
                        value={utrNumber}
                        onChange={(e) => {
                          setUtrNumber(e.target.value.replace(/[^a-zA-Z0-9]/g, ''));
                          if (error) setError(null);
                        }}
                        className="w-full px-3.5 py-2.5 rounded-xl border border-stone-300 text-sm font-mono tracking-wider focus:outline-none focus:ring-2 focus:ring-[#5C715E] bg-white placeholder:text-stone-400 placeholder:tracking-normal placeholder:font-sans"
                      />
                    </div>

                    <div className="text-[11px] text-stone-500 space-y-0.5">
                      <p className="font-semibold text-stone-600">Have your 12-digit number? (Optional)</p>
                      <p className="text-[10px] text-stone-500 leading-relaxed">
                        If available on your receipt, entering it speeds up verification. If you don't know it or can't find it, you can leave it blank and tap the button below directly!
                      </p>
                    </div>
                  </div>

                  {/* Submit Verification Action Button */}
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
                          <span>Submitting for Confirmation...</span>
                        </div>
                      ) : (
                        <>
                          <ShieldCheck className="w-4 h-4" />
                          <span>I have transferred money, get my PDF</span>
                        </>
                      )}
                    </button>
                    <p className="text-[11px] text-center text-stone-500 mt-2">
                      Tapping this sends your transfer for confirmation in the creator's sales section. Once approved, your PDF will unlock automatically!
                    </p>
                  </div>
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
                <div className="flex items-center justify-center gap-2 mt-2 flex-wrap text-xs">
                  <span className="text-stone-500 font-mono">Order: <strong className="text-stone-800">{createdOrderId}</strong></span>
                  {utrNumber && (
                    <>
                      <span className="text-stone-300">•</span>
                      <span className="text-stone-500 font-mono">UTR: <strong className="text-stone-800 bg-amber-100 px-1.5 py-0.5 rounded">{utrNumber}</strong></span>
                    </>
                  )}
                  <span className="text-stone-300">•</span>
                  <span className="font-bold text-[#5C715E]">₹{note.price}</span>
                </div>
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
                  <span>{rejectionReason || "Transaction could not be verified in UPI records"}</span>
                </div>
                <p className="text-[11px] text-red-800/90 leading-relaxed">
                  The store admin checked their UPI records and could not confirm a completed transaction matching this request. PDF access is currently withheld. If money was deducted from your account, please send your payment screenshot on WhatsApp so the admin can verify and unlock your PDF.
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
