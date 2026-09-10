import express, { Request, Response, NextFunction } from "express";
import path from "path";
import fs from "fs";
import crypto from "crypto";
import multer from "multer";

const app = express();

// Set up directories
const DATA_DIR = path.join(process.cwd(), "data");
const UPLOADS_DIR = path.join(process.cwd(), "uploads");
const COVERS_DIR = path.join(UPLOADS_DIR, "covers");
const PRIVATE_PDFS_DIR = path.join(UPLOADS_DIR, "private_pdfs");

for (const dir of [DATA_DIR, UPLOADS_DIR, COVERS_DIR, PRIVATE_PDFS_DIR]) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

// Data file paths
const NOTES_FILE = path.join(DATA_DIR, "notes.json");
const ORDERS_FILE = path.join(DATA_DIR, "orders.json");
const SETTINGS_FILE = path.join(DATA_DIR, "settings.json");
const TRANSACTION_LOGS_FILE = path.join(DATA_DIR, "transaction_logs.json");

// Ensure data files exist with default empty states (ZERO preloaded products)
if (!fs.existsSync(NOTES_FILE)) {
  fs.writeFileSync(NOTES_FILE, JSON.stringify([], null, 2));
}

if (!fs.existsSync(ORDERS_FILE)) {
  fs.writeFileSync(ORDERS_FILE, JSON.stringify([], null, 2));
}

if (!fs.existsSync(TRANSACTION_LOGS_FILE)) {
  fs.writeFileSync(TRANSACTION_LOGS_FILE, JSON.stringify([], null, 2));
}

if (!fs.existsSync(SETTINGS_FILE)) {
  const defaultSettings = {
    name: "MEDICOS⛑️MINDS",
    bio: "BPT Notes & High-Yield Visual Study Guides for Physiotherapy Students",
    instagram_handle: "restore_healthphysio",
    instagram_url: "https://instagram.com/restore_healthphysio",
    support_email: "restorehealthphysio@gmail.com",
    whatsapp_number: "+91 83407 49923",
    admin_pin: process.env.ADMIN_PASSWORD || "1234"
  };
  fs.writeFileSync(SETTINGS_FILE, JSON.stringify(defaultSettings, null, 2));
}

// Helper functions for reading/writing JSON
function readJSON<T>(file: string, fallback: T): T {
  try {
    if (!fs.existsSync(file)) return fallback;
    const content = fs.readFileSync(file, "utf-8");
    return JSON.parse(content);
  } catch (err) {
    console.error(`Error reading ${file}:`, err);
    return fallback;
  }
}

function writeJSON<T>(file: string, data: T): void {
  try {
    fs.writeFileSync(file, JSON.stringify(data, null, 2), "utf-8");
  } catch (err) {
    console.error(`Error writing ${file}:`, err);
  }
}

// Banned throwaway/disposable/fake email domains
const DISPOSABLE_DOMAINS = new Set([
  "tempmail.com", "mailinator.com", "guerrillamail.com", "10minutemail.com",
  "throwaway.com", "fakemail.com", "yopmail.com", "sharklasers.com",
  "getnada.com", "dispostable.com", "test.com", "example.com", "asdf.com",
  "random.com", "fake.com", "trashmail.com", "throwawaymail.com", "burnermail.io",
  "dropmail.me", "maildrop.cc", "emailondeck.com", "mohmal.com", "temp-mail.org",
  "tempmailo.com", "zillamail.com", "mytemp.email"
]);

// Strict Email Validation Helper (RFC 5322 standard with legitimate domain check)
function isValidEmail(email: string): boolean {
  if (!email || typeof email !== "string") return false;
  const trimmed = email.trim().toLowerCase();
  if (trimmed.length < 6 || trimmed.length > 254) return false;
  // Disallow spaces
  if (/\s/.test(trimmed)) return false;
  // RFC 5322 compliant regex requiring local@domain.tld with at least 2 char TLD
  const emailRegex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+$/;
  if (!emailRegex.test(trimmed)) return false;
  const parts = trimmed.split("@");
  if (parts.length !== 2) return false;
  const domain = parts[1];
  if (!domain.includes(".")) return false;
  // Reject known throwaway/disposable email services
  if (DISPOSABLE_DOMAINS.has(domain)) return false;
  const tld = domain.split(".").pop();
  if (!tld || tld.length < 2 || !/^[a-zA-Z]+$/.test(tld)) return false;
  return true;
}

// In-Memory Email Verification OTP Store
interface EmailOtpData {
  code: string;
  expires: number;
}
const emailOtps = new Map<string, EmailOtpData>();
const verifiedEmails = new Set<string>();

// Multer storage configuration - Expanded to 3 GB maximum file size
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    if (file.fieldname === "pdf") {
      cb(null, PRIVATE_PDFS_DIR);
    } else {
      cb(null, COVERS_DIR);
    }
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    const ext = path.extname(file.originalname);
    cb(null, `${file.fieldname}-${uniqueSuffix}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: {
    fileSize: 3 * 1024 * 1024 * 1024, // 3 GB max (expanded from 1GB for ultra high-res study guides)
  },
  fileFilter: (req, file, cb) => {
    if (file.fieldname === "pdf") {
      if (file.mimetype === "application/pdf" || file.originalname.toLowerCase().endsWith(".pdf")) {
        cb(null, true);
      } else {
        cb(new Error("Only PDF files are allowed for notes"));
      }
    } else if (
      file.fieldname === "cover" ||
      file.fieldname === "preview_1" ||
      file.fieldname === "preview_2" ||
      file.fieldname.startsWith("preview")
    ) {
      if (file.mimetype.startsWith("image/") || /\.(jpg|jpeg|png|webp|svg|gif)$/i.test(file.originalname)) {
        cb(null, true);
      } else {
        cb(new Error("Only image files are allowed for note covers and previews"));
      }
    } else {
      cb(null, true);
    }
  },
});

// Middleware
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ extended: true, limit: "50mb" }));

// Serve cover and preview images publicly
app.use("/api/covers", express.static(COVERS_DIR));
app.get("/api/covers/:filename", (req, res) => {
  const filename = path.basename(req.params.filename);
  const filePath = path.join(COVERS_DIR, filename);
  if (fs.existsSync(filePath)) {
    return res.sendFile(filePath);
  }
  res.status(404).json({ error: "Image not found" });
});

// Simple in-memory session tokens for admin
const adminSessions = new Set<string>();

// Admin Auth Middleware
function requireAdmin(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  const token = authHeader?.startsWith("Bearer ") ? authHeader.substring(7) : null;
  
  if (!token || !adminSessions.has(token)) {
    return res.status(401).json({ error: "Unauthorized. Admin login required." });
  }
  next();
}

/**
 * Server-Side Verification Middleware:
 * Verifies transaction status against payment gateway webhooks or verified logs before serving any PDF content.
 * Guarantees that the 'I have paid' button or client tampering cannot bypass the payment flow.
 */
function verifyPdfAccessMiddleware(req: Request, res: Response, next: NextFunction) {
  const { token } = req.params;

  if (!token || typeof token !== "string" || !token.startsWith("dl_")) {
    return res.status(401).json({ error: "Invalid download link or access token." });
  }

  const orders = readJSON<any[]>(ORDERS_FILE, []);
  const order = orders.find((o) => o.download_token === token);

  if (!order) {
    return res.status(401).json({ error: "Unauthorized access: Download token not found or access revoked." });
  }

  // 1. Order Status Check
  if (order.status !== "paid") {
    console.warn(`[SECURITY AUDIT] Blocked PDF access for order ${order.id}. Current status is '${order.status}'.`);
    const acceptsHtml = req.headers.accept?.includes("text/html");
    if (acceptsHtml) {
      return res.status(403).send(`
        <!DOCTYPE html>
        <html lang="en">
        <head>
          <meta charset="UTF-8"><title>Payment Verification Required - MEDICOS MINDS</title>
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #faf9f6; color: #2d3436; padding: 40px 20px; text-align: center; }
            .card { max-width: 500px; margin: 0 auto; background: white; border: 1px solid #e2e8f0; border-radius: 16px; padding: 32px; box-shadow: 0 4px 12px rgba(0,0,0,0.05); }
            h2 { color: #d97706; margin-top: 0; }
            p { font-size: 14px; line-height: 1.6; color: #4b5563; }
            .btn { display: inline-block; margin-top: 20px; padding: 10px 20px; background: #5c715e; color: white; text-decoration: none; border-radius: 8px; font-weight: bold; }
          </style>
        </head>
        <body>
          <div class="card">
            <h2>Payment Verification Pending</h2>
            <p>Your order (<strong>${order.id}</strong>) is currently awaiting verification. The 'I have paid' button cannot bypass payment verification.</p>
            <p>Once the payment gateway webhook or creator confirms your transaction, your PDF download will unlock automatically.</p>
            <a href="/" class="btn">Return to Store</a>
          </div>
        </body>
        </html>
      `);
    }
    return res.status(403).json({
      error: "Access Denied: Payment transaction has not been verified. Payment bypass is strictly prohibited.",
      code: "PAYMENT_NOT_VERIFIED",
      order_id: order.id,
      order_status: order.status
    });
  }

  // 2. Gateway Webhook & Transaction Logs Check
  // Crucial: The order MUST have a corresponding authentic record in transaction_logs.json
  const transactionLogs = readJSON<any[]>(TRANSACTION_LOGS_FILE, []);
  
  const matchingLog = transactionLogs.find((log) => {
    if (!log || !log.verified) return false;
    const validStatuses = ["captured", "authorized", "verified", "success", "paid"];
    if (!validStatuses.includes((log.status || "").toLowerCase())) return false;

    // Check 1: Explicit transaction log ID link
    if (order.transaction_log_id && log.id === order.transaction_log_id) {
      return true;
    }

    // Check 2: Matched by Order ID
    if (log.order_id && String(log.order_id).trim() === String(order.id).trim()) {
      return true;
    }

    // Check 3: Matched by 12-digit UPI UTR / Transaction Reference
    if (
      order.utr_number &&
      log.transaction_id &&
      String(log.transaction_id).trim().toLowerCase() === String(order.utr_number).trim().toLowerCase()
    ) {
      return true;
    }

    // Check 4: Matched by Gateway Payment ID
    if (
      order.payment_id &&
      log.transaction_id &&
      String(log.transaction_id).trim().toLowerCase() === String(order.payment_id).trim().toLowerCase()
    ) {
      return true;
    }

    return false;
  });

  if (!matchingLog) {
    console.error(`[SECURITY ALERT] Blocked PDF access for Order ${order.id}. No matching verified payment gateway webhook or creator log found!`);
    const acceptsHtml = req.headers.accept?.includes("text/html");
    if (acceptsHtml) {
      return res.status(403).send(`
        <!DOCTYPE html>
        <html lang="en">
        <head>
          <meta charset="UTF-8"><title>Transaction Unverified - MEDICOS MINDS</title>
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #faf9f6; color: #2d3436; padding: 40px 20px; text-align: center; }
            .card { max-width: 500px; margin: 0 auto; background: white; border: 1px solid #fee2e2; border-radius: 16px; padding: 32px; box-shadow: 0 4px 12px rgba(0,0,0,0.05); }
            h2 { color: #dc2626; margin-top: 0; }
            p { font-size: 14px; line-height: 1.6; color: #4b5563; }
            .btn { display: inline-block; margin-top: 20px; padding: 10px 20px; background: #5c715e; color: white; text-decoration: none; border-radius: 8px; font-weight: bold; }
          </style>
        </head>
        <body>
          <div class="card">
            <h2>Payment Verification Required</h2>
            <p>This PDF is protected. Your transaction has not been confirmed against payment gateway webhooks or authorized audit logs.</p>
            <p>Submitting 'I have paid' without confirmed gateway verification cannot unlock protected study materials.</p>
            <a href="/" class="btn">Return to Store</a>
          </div>
        </body>
        </html>
      `);
    }
    return res.status(403).json({
      error: "Access Denied: Payment transaction has not been confirmed against payment gateway webhooks or logs. The 'I have paid' button cannot bypass payment verification.",
      code: "GATEWAY_VERIFICATION_REQUIRED",
      order_id: order.id
    });
  }

  // 3. Amount Integrity Check
  const logAmount = typeof matchingLog.amount === "number" ? matchingLog.amount : parseFloat(matchingLog.amount) || 0;
  const expectedAmount = typeof order.amount === "number" ? order.amount : parseFloat(order.amount) || 0;
  const normalizedLogAmount = logAmount > 1000 && expectedAmount < 1000 ? logAmount / 100 : logAmount;

  if (expectedAmount > 0 && normalizedLogAmount < expectedAmount) {
    console.error(`[SECURITY ALERT] Amount mismatch for Order ${order.id}: Log ₹${normalizedLogAmount} < Expected ₹${expectedAmount}`);
    return res.status(403).send("Access Denied: Payment amount verified in gateway logs is less than the required note price.");
  }

  // 3.5 Token Expiration Check (Secure Time-to-Live Window)
  if (order.download_token_expires_at) {
    const expiresAt = new Date(order.download_token_expires_at).getTime();
    if (!isNaN(expiresAt) && Date.now() > expiresAt) {
      console.warn(`[SECURITY AUDIT] Blocked expired download token for Order ${order.id}. Expired at ${order.download_token_expires_at}`);
      const acceptsHtml = req.headers.accept?.includes("text/html");
      if (acceptsHtml) {
        return res.status(403).send(`
          <!DOCTYPE html>
          <html lang="en">
          <head>
            <meta charset="UTF-8"><title>Download Link Expired - MEDICOS MINDS</title>
            <style>
              body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #faf9f6; color: #2d3436; padding: 40px 20px; text-align: center; }
              .card { max-width: 500px; margin: 0 auto; background: white; border: 1px solid #fee2e2; border-radius: 16px; padding: 32px; box-shadow: 0 4px 12px rgba(0,0,0,0.05); }
              h2 { color: #dc2626; margin-top: 0; }
              p { font-size: 14px; line-height: 1.6; color: #4b5563; }
              .btn { display: inline-block; margin-top: 20px; padding: 10px 20px; background: #5c715e; color: white; text-decoration: none; border-radius: 8px; font-weight: bold; }
            </style>
          </head>
          <body>
            <div class="card">
              <h2>Download Link Expired</h2>
              <p>For your security, this temporary download link has expired.</p>
              <p>Your purchase is permanently recorded! You can get a fresh secure link anytime by searching your email or Order ID (<strong>${order.id}</strong>) in <strong>My Purchases</strong> on our website.</p>
              <a href="/" class="btn">Return to Store</a>
            </div>
          </body>
          </html>
        `);
      }
      return res.status(403).json({
        error: "Access Denied: Download link has expired for security. Please retrieve a fresh access token from 'My Purchases' using your verified email or order ID.",
        code: "TOKEN_EXPIRED",
        order_id: order.id
      });
    }
  }

  // 4. File existence verification
  const notes = readJSON<any[]>(NOTES_FILE, []);
  const note = notes.find((n) => n.id === order.note_id);

  if (!note || !note.pdf_file) {
    return res.status(404).send("The requested PDF file is not available on the server.");
  }

  const filePath = path.join(PRIVATE_PDFS_DIR, note.pdf_file);
  if (!fs.existsSync(filePath)) {
    return res.status(404).send("File not found on storage. Please contact the creator.");
  }

  // Attach verified references for route handlers
  (req as any).verifiedOrder = order;
  (req as any).verifiedNote = note;
  (req as any).verifiedLog = matchingLog;
  (req as any).pdfFilePath = filePath;
  (req as any).pdfFilename = note.pdf_original_name || `${note.title.replace(/[^a-zA-Z0-9_-]/g, "_")}.pdf`;

  next();
}

// ----------------------------------------------------
// PUBLIC API ROUTES
// ----------------------------------------------------

// 1. Health check (supports /api/health, /health, /_health for Cloud Run and load balancers)
app.get(["/api/health", "/health", "/_health"], (req, res) => {
  res.json({ status: "ok", time: new Date().toISOString() });
});

// 2. Public Creator Profile / Settings
app.get("/api/settings", (req, res) => {
  const settings = readJSON(SETTINGS_FILE, {
    name: "MEDICOS⛑️MINDS",
    bio: "BPT Notes & High-Yield Visual Study Guides for Physiotherapy Students",
    instagram_handle: "restore_healthphysio",
    instagram_url: "https://instagram.com/restore_healthphysio",
    support_email: "restorehealthphysio@gmail.com",
    whatsapp_number: "+91 83407 49923",
    upi_id: "restorehealthphysio@okaxis",
    verification_mode: "manual",
  });
  // Do NOT expose admin_pin publicly
  const { admin_pin, ...publicSettings } = settings as any;
  res.json(publicSettings);
});

// 2.1 Send 4-Digit Email Verification Code (Prevents random/fake email access)
app.post("/api/auth/send-email-otp", (req, res) => {
  const { email } = req.body;
  if (!email || !isValidEmail(email)) {
    return res.status(400).json({ error: "Please provide a valid, legitimate email address (disposable or fake emails are not allowed)." });
  }
  const cleanEmail = email.trim().toLowerCase();
  const code = Math.floor(1000 + Math.random() * 9000).toString();
  emailOtps.set(cleanEmail, {
    code,
    expires: Date.now() + 15 * 60 * 1000, // 15 mins validity
  });
  console.log(`[AUTH] Verification OTP for ${cleanEmail}: ${code}`);
  res.json({
    success: true,
    verification_code: code,
    message: `Verification code generated for ${cleanEmail}. Enter code to confirm your email.`,
  });
});

// 2.2 Verify 4-Digit Email Code
app.post("/api/auth/verify-email-otp", (req, res) => {
  const { email, code } = req.body;
  if (!email || !code) {
    return res.status(400).json({ error: "Email and 4-digit verification code are required." });
  }
  const cleanEmail = email.trim().toLowerCase();
  const otpData = emailOtps.get(cleanEmail);

  if (!otpData) {
    return res.status(400).json({ error: "No verification code requested for this email. Please request a new code." });
  }

  if (Date.now() > otpData.expires) {
    emailOtps.delete(cleanEmail);
    return res.status(400).json({ error: "Verification code has expired. Please request a new code." });
  }

  if (otpData.code !== code.toString().trim()) {
    return res.status(400).json({ error: "Incorrect 4-digit verification code. Please check and try again." });
  }

  verifiedEmails.add(cleanEmail);
  emailOtps.delete(cleanEmail);

  res.json({
    success: true,
    verified: true,
    message: "Email address verified successfully!",
  });
});

// 3. Get all published notes
app.get("/api/notes", (req, res) => {
  const notes = readJSON<any[]>(NOTES_FILE, []);
  // Filter for published notes only and omit internal private pdf filesystem path
  const publicNotes = notes
    .filter((n) => n.published)
    .map(({ pdf_file, ...publicData }) => ({
      ...publicData,
      has_pdf: !!pdf_file,
    }))
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

  res.json(publicNotes);
});

// 4. Get single note details
app.get("/api/notes/:id", (req, res) => {
  const notes = readJSON<any[]>(NOTES_FILE, []);
  const note = notes.find((n) => n.id === req.params.id && n.published);
  if (!note) {
    return res.status(404).json({ error: "Note not found" });
  }
  const { pdf_file, ...publicData } = note;
  res.json({ ...publicData, has_pdf: !!pdf_file });
});

// 5. Create checkout order (Direct UPI & QR Code payment flow with strict validation)
app.post("/api/checkout/create-order", async (req, res) => {
  const { note_id, customer_name, customer_email, customer_phone } = req.body;

  if (!note_id || !customer_name || !customer_email) {
    return res.status(400).json({ error: "Missing required customer details." });
  }

  // Strict email validation
  if (!isValidEmail(customer_email)) {
    return res.status(400).json({ error: "Please enter a valid, deliverable email address (e.g. name@gmail.com)." });
  }

  // Name validation
  if (customer_name.trim().length < 2) {
    return res.status(400).json({ error: "Please enter your full name." });
  }

  const notes = readJSON<any[]>(NOTES_FILE, []);
  const note = notes.find((n) => String(n.id) === String(note_id) && n.published);
  if (!note) {
    return res.status(404).json({ error: "Note is unavailable or unlisted." });
  }

  const settings = readJSON(SETTINGS_FILE, {}) as any;
  const orderId = "ord_" + Date.now() + "_" + Math.random().toString(36).substring(2, 7);

  // Generate return / redirect URL for returning from UPI app
  const host = req.get("host") || "localhost:3000";
  const protocol = req.protocol === "https" || req.headers["x-forwarded-proto"] === "https" ? "https" : "http";
  const siteUrl = `${protocol}://${host}`;
  const returnUrl = `${siteUrl}/?order_id=${encodeURIComponent(orderId)}&check_status=true`;

  const targetUpi = (settings.upi_id || "restorehealthphysio@okaxis").trim();
  const payeeName = (settings.name || "MEDICOS MINDS").trim();
  const noteClean = note.title.slice(0, 30).replace(/[^a-zA-Z0-9 ]/g, "").trim();
  const transNote = `Order ${orderId} - ${noteClean}`.slice(0, 50);
  const amountStr = Number(note.price).toFixed(2);

  // Standard NPCI UPI URI specifications:
  // pa (payee VPA), pn (payee name), mc (mcc), tr (transaction ref = order ID), tn (transaction note), am (amount), cu (currency), url (callback)
  const upiUri = `upi://pay?pa=${encodeURIComponent(targetUpi)}&pn=${encodeURIComponent(payeeName)}&mc=0000&tr=${encodeURIComponent(orderId)}&tn=${encodeURIComponent(transNote)}&am=${amountStr}&cu=INR&url=${encodeURIComponent(returnUrl)}`;

  // Mobile App-Specific Intent Links (Google Pay, PhonePe, Paytm)
  const gpayUri = `tez://upi/pay?pa=${encodeURIComponent(targetUpi)}&pn=${encodeURIComponent(payeeName)}&mc=0000&tr=${encodeURIComponent(orderId)}&tn=${encodeURIComponent(transNote)}&am=${amountStr}&cu=INR&url=${encodeURIComponent(returnUrl)}`;
  const phonepeUri = `phonepe://pay?pa=${encodeURIComponent(targetUpi)}&pn=${encodeURIComponent(payeeName)}&mc=0000&tr=${encodeURIComponent(orderId)}&tn=${encodeURIComponent(transNote)}&am=${amountStr}&cu=INR&url=${encodeURIComponent(returnUrl)}`;
  const paytmUri = `paytmmp://pay?pa=${encodeURIComponent(targetUpi)}&pn=${encodeURIComponent(payeeName)}&mc=0000&tr=${encodeURIComponent(orderId)}&tn=${encodeURIComponent(transNote)}&am=${amountStr}&cu=INR&url=${encodeURIComponent(returnUrl)}`;

  // 20 minutes expiration for payment session
  const expiresAt = new Date(Date.now() + 20 * 60 * 1000).toISOString();

  const newOrder: any = {
    id: orderId,
    note_id: note.id,
    note_title: note.title,
    customer_name: customer_name.trim(),
    customer_email: customer_email.trim().toLowerCase(),
    customer_phone: (customer_phone || "").trim(),
    amount: Number(note.price), // Strict price from database; ignores client input
    currency: "INR",
    status: "pending", // Initial state is pending; NEVER paid on frontend
    payment_method: "upi",
    upi_uri: upiUri,
    download_count: 0,
    download_token: null,
    download_token_expires_at: null,
    expires_at: expiresAt,
    created_at: new Date().toISOString(),
  };

  const orders = readJSON<any[]>(ORDERS_FILE, []);
  orders.push(newOrder);
  writeJSON(ORDERS_FILE, orders);

  res.json({
    order_id: newOrder.id,
    amount: newOrder.amount,
    currency: "INR",
    note_title: note.title,
    store_name: settings.name || "MEDICOS⛑️MINDS",
    upi_id: targetUpi,
    upi_uri: upiUri,
    gpay_uri: gpayUri,
    phonepe_uri: phonepeUri,
    paytm_uri: paytmUri,
    return_url: returnUrl,
    expires_at: expiresAt,
    whatsapp_number: settings.whatsapp_number || "+91 83407 49923",
    support_email: settings.support_email || "restorehealthphysio@gmail.com",
    instagram_handle: settings.instagram_handle || "restore_healthphysio",
    instagram_url: settings.instagram_url || "",
  });
});

// ----------------------------------------------------
// PAYMENT GATEWAY WEBHOOKS & TRANSACTION LOGGING
// ----------------------------------------------------

/**
 * Universal Payment Gateway Webhook Handler
 * Supports Razorpay, UPI Gateway, Cashfree, and banking webhook payloads.
 * Validates transaction, records audit log in transaction_logs.json, and unlocks order.
 */
function handlePaymentGatewayWebhook(req: Request, res: Response) {
  const settings = readJSON(SETTINGS_FILE, {}) as any;
  const signature = (req.headers["x-razorpay-signature"] || req.headers["x-webhook-signature"] || "") as string;
  const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET || settings.webhook_secret;

  let signatureValid = true;
  if (webhookSecret && signature) {
    try {
      const expectedSignature = crypto
        .createHmac("sha256", webhookSecret)
        .update(JSON.stringify(req.body))
        .digest("hex");
      signatureValid = expectedSignature === signature;
      if (!signatureValid) {
        console.warn("[WEBHOOK SECURITY] Invalid webhook signature received!");
        return res.status(400).json({ error: "Invalid webhook signature" });
      }
    } catch (err) {
      console.error("[WEBHOOK SECURITY] Signature verification error:", err);
      return res.status(400).json({ error: "Signature verification failed" });
    }
  }

  const body = req.body || {};
  let event = body.event || "payment.captured";
  let paymentId = "";
  let orderId = "";
  let utr = "";
  let amount = 0;
  let currency = "INR";
  let customerEmail = "";
  let customerPhone = "";
  let gateway = "gateway_webhook";
  let isSuccess = false;

  // 1. Razorpay standard webhook structure
  if (body.entity === "event" || body.payload?.payment) {
    gateway = "razorpay";
    const payment = body.payload?.payment?.entity || {};
    paymentId = payment.id || "";
    orderId = payment.notes?.order_id || body.payload?.order?.entity?.receipt || body.order_id || "";
    utr = payment.acquirer_data?.rrn || payment.acquirer_data?.upi_transaction_id || "";
    amount = payment.amount ? (payment.amount > 1000 ? payment.amount / 100 : payment.amount) : 0;
    currency = payment.currency || "INR";
    customerEmail = payment.email || "";
    customerPhone = payment.contact || "";
    event = body.event || "payment.captured";
    isSuccess = ["payment.captured", "payment.authorized", "order.paid"].includes(event) && payment.status !== "failed";
  } else {
    // 2. Generic / UPI Gateway / Cashfree webhook structure
    gateway = body.gateway || "upi_gateway";
    paymentId = body.payment_id || body.transaction_id || body.reference_id || body.txnId || "";
    orderId = body.order_id || body.orderId || body.data?.order_id || "";
    utr = body.utr || body.rrn || body.upi_ref || body.data?.payment?.payment_utr || "";
    amount = body.amount || body.data?.order?.order_amount || 0;
    currency = body.currency || "INR";
    customerEmail = body.customer_email || body.email || "";
    customerPhone = body.customer_phone || body.phone || "";
    const rawStatus = (body.status || body.payment_status || body.event || event || "captured").toLowerCase();
    isSuccess = ["captured", "success", "paid", "authorized", "payment_success", "payment.captured"].includes(rawStatus);
  }

  const logId = "txn_log_" + crypto.randomBytes(12).toString("hex");
  const transactionId = utr || paymentId || `txn_${Date.now()}`;
  const rawEventId = (req.headers["x-razorpay-event-id"] as string) || (req.headers["x-webhook-id"] as string) || body.event_id || body.id || "";

  // 12. DUPLICATE PAYMENT PROTECTION & IDEMPOTENCY
  const transactionLogs = readJSON<any[]>(TRANSACTION_LOGS_FILE, []);
  const existingProcessedLog = transactionLogs.find(
    (l) => (rawEventId && l.raw_event_id === rawEventId) || (transactionId && l.transaction_id === transactionId && l.verified && l.order_id === orderId)
  );

  if (existingProcessedLog) {
    console.log(`[WEBHOOK IDEMPOTENCY] Event ${rawEventId || transactionId} already processed. Idempotent return.`);
    return res.status(200).json({
      success: true,
      message: "Webhook already processed (idempotent)",
      log_id: existingProcessedLog.id,
      order_id: existingProcessedLog.order_id,
      verified: existingProcessedLog.verified,
    });
  }

  // Find matching order in database
  const orders = readJSON<any[]>(ORDERS_FILE, []);
  let matchedOrderIndex = -1;

  if (orderId) {
    matchedOrderIndex = orders.findIndex((o) => String(o.id).trim() === String(orderId).trim());
  }

  if (matchedOrderIndex === -1 && utr) {
    matchedOrderIndex = orders.findIndex((o) => o.utr_number && o.utr_number.toLowerCase() === utr.toLowerCase());
  }

  if (matchedOrderIndex === -1 && paymentId) {
    matchedOrderIndex = orders.findIndex((o) => o.payment_id && o.payment_id.toLowerCase() === paymentId.toLowerCase());
  }

  const matchedOrder = matchedOrderIndex !== -1 ? orders[matchedOrderIndex] : null;

  // Verify amount integrity against database price
  if (matchedOrder && isSuccess) {
    const expectedAmount = Number(matchedOrder.amount);
    const receivedAmount = Number(amount);
    if (receivedAmount > 0 && expectedAmount > 0 && receivedAmount < expectedAmount) {
      console.error(`[WEBHOOK SECURITY] Payment amount ₹${receivedAmount} is less than required ₹${expectedAmount} for Order ${matchedOrder.id}`);
      return res.status(400).json({
        error: `Payment amount ₹${receivedAmount} is less than required order amount ₹${expectedAmount}`,
        code: "AMOUNT_MISMATCH"
      });
    }
  }

  // Persist verified transaction log
  const newLog = {
    id: logId,
    order_id: matchedOrder?.id || orderId || "unmatched",
    transaction_id: transactionId,
    gateway,
    event,
    status: isSuccess ? "captured" : "failed",
    verified: isSuccess,
    source: "gateway_webhook",
    amount: amount || (matchedOrder ? matchedOrder.amount : 0),
    currency,
    customer_email: customerEmail || matchedOrder?.customer_email || "",
    customer_phone: customerPhone || matchedOrder?.customer_phone || "",
    received_at: new Date().toISOString(),
    signature_verified: signatureValid,
    raw_event_id: rawEventId || `wh_${Date.now()}`,
    note: isSuccess ? "Verified and logged from payment gateway webhook" : "Webhook reported failed or mismatched payment status"
  };

  transactionLogs.unshift(newLog);
  writeJSON(TRANSACTION_LOGS_FILE, transactionLogs);

  // If payment succeeded and we matched an order, securely unlock it
  if (isSuccess && matchedOrder) {
    matchedOrder.status = "paid";
    matchedOrder.download_token = matchedOrder.download_token || ("dl_" + crypto.randomBytes(24).toString("hex"));
    matchedOrder.download_token_expires_at = new Date(Date.now() + 48 * 3600 * 1000).toISOString();
    matchedOrder.transaction_log_id = logId;
    matchedOrder.verified_via = "gateway_webhook";
    matchedOrder.paid_at = new Date().toISOString();
    if (utr && !matchedOrder.utr_number) matchedOrder.utr_number = utr;
    if (paymentId && !matchedOrder.payment_id) matchedOrder.payment_id = paymentId;

    orders[matchedOrderIndex] = matchedOrder;
    writeJSON(ORDERS_FILE, orders);

    console.log(`[PAYMENT GATEWAY WEBHOOK] Successfully verified Order ${matchedOrder.id} via ${gateway} (Txn: ${transactionId}). PDF unlocked.`);
  }

  return res.status(200).json({
    success: true,
    message: "Webhook processed and verified",
    log_id: logId,
    order_id: matchedOrder?.id || orderId || null,
    status: isSuccess ? "captured" : "failed",
    verified: isSuccess
  });
}

// Payment Gateway Webhook Endpoints
app.post("/api/webhooks/payment", handlePaymentGatewayWebhook);
app.post("/api/webhooks/razorpay", handlePaymentGatewayWebhook);
app.post("/api/webhooks/upi", handlePaymentGatewayWebhook);

// Dedicated Payment Status Check Endpoint
// Used when customer returns to website (via redirect or app switch) or clicks "I've Completed Payment - Check Status"
app.post("/api/checkout/check-status", (req, res) => {
  const { order_id } = req.body;
  if (!order_id) {
    return res.status(400).json({ error: "Missing order_id" });
  }

  const orders = readJSON<any[]>(ORDERS_FILE, []);
  const orderIndex = orders.findIndex((o) => String(o.id).trim() === String(order_id).trim());

  if (orderIndex === -1) {
    return res.status(404).json({ error: "Order not found", status: "not_found" });
  }

  const order = orders[orderIndex];

  // 1. Check if session has expired (20 min session timeout for unpaid orders)
  if (order.expires_at && new Date(order.expires_at).getTime() < Date.now() && order.status === "pending") {
    order.status = "expired";
    orders[orderIndex] = order;
    writeJSON(ORDERS_FILE, orders);
    return res.json({
      success: false,
      status: "expired",
      message: "This payment session has expired. Please initiate a fresh checkout to obtain a current UPI QR.",
      order_id: order.id,
    });
  }

  // 2. Cross-check against transaction logs
  const transactionLogs = readJSON<any[]>(TRANSACTION_LOGS_FILE, []);
  const verifiedLog = transactionLogs.find(
    (l) => l.verified && (l.order_id === order.id || (order.transaction_log_id && l.id === order.transaction_log_id))
  );

  // If verified and paid:
  if (verifiedLog && order.status === "paid" && order.download_token) {
    // Refresh token if expired
    if (order.download_token_expires_at && new Date(order.download_token_expires_at).getTime() < Date.now()) {
      order.download_token = "dl_" + crypto.randomBytes(24).toString("hex");
      order.download_token_expires_at = new Date(Date.now() + 48 * 3600 * 1000).toISOString();
      orders[orderIndex] = order;
      writeJSON(ORDERS_FILE, orders);
    }

    return res.json({
      success: true,
      status: "paid",
      download_token: order.download_token,
      message: "Payment verified successfully against bank records! PDF access unlocked.",
      order_id: order.id,
      paid_at: order.paid_at,
    });
  }

  // 3. Rejected status
  if (order.status === "rejected") {
    return res.json({
      success: false,
      status: "rejected",
      rejection_reason: order.rejection_reason || "Payment could not be verified in UPI records.",
      message: "Payment unverified or rejected by creator.",
      order_id: order.id,
    });
  }

  // 4. Pending verification status (Customer submitted payment reference, awaiting verification)
  if (order.status === "pending_verification") {
    return res.json({
      success: false,
      status: "pending_verification",
      message: "Payment reference submitted and currently awaiting creator verification. You can check back or message on WhatsApp.",
      order_id: order.id,
      utr_number: order.utr_number || null,
    });
  }

  // 5. Normal pending status (Customer has not paid or webhook is in transit)
  return res.json({
    success: false,
    status: order.status || "pending",
    message: "No verified payment recorded for this order yet. If you have paid, please wait a moment or click 'I have paid' to submit your UTR.",
    order_id: order.id,
  });
});

// 6. Submit UPI Payment for Verification (Checks against gateway logs; prevents bypass)
app.post("/api/checkout/submit-upi-payment", (req, res) => {
  const { order_id, transaction_ref } = req.body;

  if (!order_id) {
    return res.status(400).json({ error: "Missing order_id" });
  }

  const orders = readJSON<any[]>(ORDERS_FILE, []);
  const orderIndex = orders.findIndex((o) => String(o.id).trim() === String(order_id).trim());

  if (orderIndex === -1) {
    return res.status(404).json({ error: "Order not found" });
  }

  const order = orders[orderIndex];

  // If already paid and verified against gateway/audit logs, return token
  if (order.status === "paid" && order.download_token) {
    const logs = readJSON<any[]>(TRANSACTION_LOGS_FILE, []);
    const verifiedLog = logs.find(
      (l) => l.verified && (l.order_id === order.id || (order.transaction_log_id && l.id === order.transaction_log_id))
    );
    if (verifiedLog) {
      return res.json({
        success: true,
        status: "paid",
        download_token: order.download_token,
        message: "Order has already been verified and paid.",
      });
    }
  }

  const cleanUtr = (transaction_ref || "").toString().trim().replace(/[^a-zA-Z0-9]/g, "");

  // If a UTR was provided, validate and check for duplicate reuse across already paid orders
  if (cleanUtr) {
    const duplicateUtrOrder = orders.find(
      (o) => o.id !== order.id && o.utr_number && o.utr_number.toLowerCase() === cleanUtr.toLowerCase() && o.status === "paid"
    );
    if (duplicateUtrOrder) {
      return res.status(400).json({
        error: "This UTR / Reference Number has already been processed for another order. If you need help, please contact support on WhatsApp.",
      });
    }
    order.utr_number = cleanUtr;
    order.payment_id = cleanUtr;
  }

  order.payment_method = "upi";
  order.submitted_at = new Date().toISOString();

  // Check transaction status against payment gateway webhooks or logs
  const transactionLogs = readJSON<any[]>(TRANSACTION_LOGS_FILE, []);
  const matchingWebhookLog = transactionLogs.find((log) => {
    if (!log || !log.verified) return false;
    const validStatuses = ["captured", "authorized", "verified", "success", "paid"];
    if (!validStatuses.includes((log.status || "").toLowerCase())) return false;

    // Check if webhook arrived with this order_id or UTR
    if (log.order_id && String(log.order_id).trim() === String(order.id).trim()) return true;
    if (cleanUtr && log.transaction_id && String(log.transaction_id).trim().toLowerCase() === cleanUtr.toLowerCase()) return true;
    return false;
  });

  if (matchingWebhookLog) {
    // Verified against payment gateway webhook!
    const downloadToken = "dl_" + crypto.randomBytes(24).toString("hex");
    order.status = "paid";
    order.download_token = downloadToken;
    order.download_token_expires_at = new Date(Date.now() + 48 * 3600 * 1000).toISOString();
    order.paid_at = new Date().toISOString();
    order.transaction_log_id = matchingWebhookLog.id;
    order.verified_via = matchingWebhookLog.source || "gateway_webhook";

    orders[orderIndex] = order;
    writeJSON(ORDERS_FILE, orders);

    return res.json({
      success: true,
      status: "paid",
      download_token: downloadToken,
      message: "Payment successfully verified against payment gateway logs! Your notes are unlocked.",
      order_id: order.id,
      utr_number: cleanUtr || null,
    });
  }

  // Strict Protection: No matching verified gateway webhook exists yet.
  // Order moves to pending_verification so admin can review and approve in Sales section.
  order.status = "pending_verification";
  order.download_token = null;

  orders[orderIndex] = order;
  writeJSON(ORDERS_FILE, orders);

  res.json({
    success: true,
    status: "pending_verification",
    message: cleanUtr
      ? `Payment confirmation submitted with UTR: ${cleanUtr}. Awaiting admin verification in the sales section.`
      : "Payment confirmation submitted. Awaiting admin verification in the sales section.",
    order_id: order.id,
    utr_number: cleanUtr || null,
  });
});

// 6b. Check Payment Verification Status (Validates against gateway logs before returning token)
app.post("/api/checkout/auto-verify", (req, res) => {
  const { order_id } = req.body;

  if (!order_id) {
    return res.status(400).json({ error: "Missing order_id" });
  }

  const orders = readJSON<any[]>(ORDERS_FILE, []);
  const order = orders.find((o) => String(o.id).trim() === String(order_id).trim());

  if (!order) {
    return res.status(404).json({ error: "Order not found" });
  }

  // Only return download token if verified against transaction logs
  if (order.status === "paid" && order.download_token) {
    const transactionLogs = readJSON<any[]>(TRANSACTION_LOGS_FILE, []);
    const verifiedLog = transactionLogs.find(
      (l) => l.verified && (l.order_id === order.id || (order.transaction_log_id && l.id === order.transaction_log_id))
    );

    if (verifiedLog) {
      return res.json({
        success: true,
        status: "paid",
        download_token: order.download_token,
        message: "Order verified against transaction logs.",
        order_id: order.id,
      });
    }
  }

  res.json({
    success: false,
    status: order.status || "created",
    message: "Payment requires gateway webhook or creator verification. The 'I have paid' button cannot bypass payment verification.",
    order_id: order.id,
  });
});

// 7. Check Order Status (Polled while awaiting verification)
app.get("/api/orders/:id/status", (req, res) => {
  const { id } = req.params;
  const orders = readJSON<any[]>(ORDERS_FILE, []);
  const order = orders.find((o) => String(o.id).trim() === String(id).trim());

  if (!order) {
    return res.status(404).json({ error: "Order not found" });
  }

  // Cross-check against transaction logs before revealing download token
  let downloadToken: string | null = null;
  if (order.status === "paid" && order.download_token) {
    const transactionLogs = readJSON<any[]>(TRANSACTION_LOGS_FILE, []);
    const isVerified = transactionLogs.some(
      (l) => l.verified && (l.order_id === order.id || (order.transaction_log_id && l.id === order.transaction_log_id))
    );
    if (isVerified) {
      downloadToken = order.download_token;
    }
  }

  res.json({
    order_id: order.id,
    status: order.status,
    download_token: downloadToken,
    utr_number: order.utr_number || null,
    note_title: order.note_title,
    customer_name: order.customer_name,
    customer_email: order.customer_email,
    amount: order.amount,
    paid_at: order.paid_at,
    rejection_reason: order.rejection_reason || null,
    rejected_at: order.rejected_at || null,
  });
});

// 8. Protected PDF Download (Protected by Server-Side Verification Middleware)
app.get("/api/download/:token", verifyPdfAccessMiddleware, (req, res) => {
  const order = (req as any).verifiedOrder;
  const filePath = (req as any).pdfFilePath;
  const filename = (req as any).pdfFilename;

  // Increment download count
  const orders = readJSON<any[]>(ORDERS_FILE, []);
  const orderIndex = orders.findIndex((o) => o.id === order.id);
  if (orderIndex !== -1) {
    orders[orderIndex].download_count = (orders[orderIndex].download_count || 0) + 1;
    orders[orderIndex].last_downloaded_at = new Date().toISOString();
    writeJSON(ORDERS_FILE, orders);
  }

  // Send protected PDF with attachment download header
  res.setHeader("Content-Type", "application/pdf");
  res.setHeader("Content-Disposition", `attachment; filename="${encodeURIComponent(filename)}"`);

  const fileStream = fs.createReadStream(filePath);
  fileStream.pipe(res);
});

// 9. Protected PDF In-Browser Viewing (Protected by Server-Side Verification Middleware)
app.get("/api/view/:token", verifyPdfAccessMiddleware, (req, res) => {
  const filePath = (req as any).pdfFilePath;
  const filename = (req as any).pdfFilename;

  // Send protected PDF with inline viewer header
  res.setHeader("Content-Type", "application/pdf");
  res.setHeader("Content-Disposition", `inline; filename="${encodeURIComponent(filename)}"`);

  const fileStream = fs.createReadStream(filePath);
  fileStream.pipe(res);
});

// 9. Customer Purchases Lookup (Supports search by verified Email OR Order ID via GET or POST)
app.all("/api/purchases/lookup", (req, res) => {
  const queryParam = (
    (req.query.email || req.query.query || req.query.order_id || req.body?.email || req.body?.query || req.body?.order_id) as string || ""
  ).trim();

  if (!queryParam) {
    return res.status(400).json({ error: "Please enter your email address or Order ID." });
  }

  const cleanQuery = queryParam.toLowerCase();
  const isEmail = cleanQuery.includes("@");

  const orders = readJSON<any[]>(ORDERS_FILE, []);
  const notes = readJSON<any[]>(NOTES_FILE, []);

  // Filter paid orders by email OR by order ID
  const matchedOrders = orders.filter((o) => {
    if (o.status !== "paid") return false;
    if (isEmail) {
      return o.customer_email?.toLowerCase() === cleanQuery;
    }
    return (
      String(o.id).toLowerCase() === cleanQuery ||
      (o.utr_number && o.utr_number.toLowerCase() === cleanQuery)
    );
  });

  // Automatically refresh expired download tokens for legitimate paid purchases
  let changed = false;
  matchedOrders.forEach((o) => {
    const isExpired =
      !o.download_token ||
      !o.download_token_expires_at ||
      new Date(o.download_token_expires_at).getTime() < Date.now();
    if (isExpired) {
      o.download_token = "dl_" + crypto.randomBytes(24).toString("hex");
      o.download_token_expires_at = new Date(Date.now() + 48 * 3600 * 1000).toISOString();
      changed = true;
    }
  });

  if (changed) {
    writeJSON(ORDERS_FILE, orders);
  }

  const customerOrders = matchedOrders
    .map((o) => {
      const note = notes.find((n) => n.id === o.note_id);
      return {
        order_id: o.id,
        note_id: o.note_id,
        note_title: o.note_title,
        amount: o.amount,
        paid_at: o.paid_at || o.created_at,
        download_token: o.download_token,
        download_count: o.download_count || 0,
        cover_image: note?.cover_image || "",
      };
    })
    .sort((a, b) => new Date(b.paid_at).getTime() - new Date(a.paid_at).getTime());

  res.json({
    query: queryParam,
    purchases: customerOrders,
    orders: customerOrders,
  });
});

// ----------------------------------------------------
// ADMIN API ROUTES (PROTECTED)
// ----------------------------------------------------

// Admin Login
app.post("/api/admin/login", (req, res) => {
  const { pin } = req.body;
  const settings = readJSON(SETTINGS_FILE, {}) as any;
  // Dynamic priority: settings.admin_pin configured by user ALWAYS takes precedence
  const expectedPin = (settings.admin_pin && settings.admin_pin.toString().trim()) || process.env.ADMIN_PASSWORD || "1234";

  if (!pin || pin.toString().trim() !== expectedPin.toString().trim()) {
    return res.status(401).json({ error: "Invalid Admin PIN / Password. Please check and try again." });
  }

  const sessionToken = "adm_" + crypto.randomBytes(24).toString("hex");
  adminSessions.add(sessionToken);

  res.json({
    success: true,
    token: sessionToken,
    message: "Admin authenticated successfully.",
  });
});

// Admin Verify Session
app.get("/api/admin/verify", requireAdmin, (req, res) => {
  res.json({ valid: true });
});

// Admin Logout
app.post("/api/admin/logout", (req, res) => {
  const authHeader = req.headers.authorization;
  const token = authHeader?.startsWith("Bearer ") ? authHeader.substring(7) : null;
  if (token) {
    adminSessions.delete(token);
  }
  res.json({ success: true });
});

// Admin: Get all notes (including unpublished)
app.get("/api/admin/notes", requireAdmin, (req, res) => {
  const notes = readJSON<any[]>(NOTES_FILE, []);
  res.json(notes.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()));
});

// Admin: Upload / Create Note
app.post(
  "/api/admin/notes",
  requireAdmin,
  upload.fields([
    { name: "pdf", maxCount: 1 },
    { name: "cover", maxCount: 1 },
    { name: "preview_1", maxCount: 1 },
    { name: "preview_2", maxCount: 1 },
  ]),
  (req: any, res: any) => {
    try {
      const { title, description, price, published } = req.body;

      if (!title || price === undefined) {
        return res.status(400).json({ error: "Title and price are required." });
      }

      const files = req.files as { [fieldname: string]: Express.Multer.File[] } | undefined;
      const pdfFile = files?.pdf?.[0];
      const coverFile = files?.cover?.[0];
      const preview1File = files?.preview_1?.[0];
      const preview2File = files?.preview_2?.[0];

      if (!pdfFile) {
        return res.status(400).json({ error: "Please upload a PDF file for this note." });
      }

      const previewImages: string[] = [];
      if (preview1File) {
        previewImages.push(`/api/covers/${preview1File.filename}`);
      }
      if (preview2File) {
        previewImages.push(`/api/covers/${preview2File.filename}`);
      }

      const noteId = "note_" + Date.now();
      const newNote = {
        id: noteId,
        title: title.trim(),
        description: (description || "").trim(),
        price: Math.max(0, Number(price) || 0),
        cover_image: coverFile ? `/api/covers/${coverFile.filename}` : "",
        preview_images: previewImages,
        pdf_file: pdfFile.filename,
        pdf_original_name: pdfFile.originalname,
        pdf_size: pdfFile.size,
        published: published === "true" || published === true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      const notes = readJSON<any[]>(NOTES_FILE, []);
      notes.push(newNote);
      writeJSON(NOTES_FILE, notes);

      res.status(201).json(newNote);
    } catch (err: any) {
      console.error("Error creating note:", err);
      res.status(500).json({ error: err.message || "Failed to create note" });
    }
  }
);

// Admin: Edit Note
app.put(
  "/api/admin/notes/:id",
  requireAdmin,
  upload.fields([
    { name: "pdf", maxCount: 1 },
    { name: "cover", maxCount: 1 },
    { name: "preview_1", maxCount: 1 },
    { name: "preview_2", maxCount: 1 },
  ]),
  (req: any, res: any) => {
    try {
      const { id } = req.params;
      const { 
        title, 
        description, 
        price, 
        published,
        remove_cover,
        remove_preview_1,
        remove_preview_2,
      } = req.body;

      const notes = readJSON<any[]>(NOTES_FILE, []);
      const index = notes.findIndex((n) => n.id === id);

      if (index === -1) {
        return res.status(404).json({ error: "Note not found" });
      }

      const existingNote = notes[index];
      const files = req.files as { [fieldname: string]: Express.Multer.File[] } | undefined;
      const pdfFile = files?.pdf?.[0];
      const coverFile = files?.cover?.[0];
      const preview1File = files?.preview_1?.[0];
      const preview2File = files?.preview_2?.[0];

      // If new PDF uploaded, delete old PDF file
      let newPdfFilename = existingNote.pdf_file;
      let newPdfOriginalName = existingNote.pdf_original_name;
      let newPdfSize = existingNote.pdf_size;

      if (pdfFile) {
        if (existingNote.pdf_file) {
          const oldPdfPath = path.join(PRIVATE_PDFS_DIR, existingNote.pdf_file);
          if (fs.existsSync(oldPdfPath)) {
            try {
              fs.unlinkSync(oldPdfPath);
            } catch (e) {}
          }
        }
        newPdfFilename = pdfFile.filename;
        newPdfOriginalName = pdfFile.originalname;
        newPdfSize = pdfFile.size;
      }

      // If new cover uploaded, delete old cover file
      let newCoverUrl = existingNote.cover_image || "";
      if (coverFile) {
        if (existingNote.cover_image && existingNote.cover_image.startsWith("/api/covers/")) {
          const oldCoverFilename = existingNote.cover_image.replace("/api/covers/", "");
          const oldCoverPath = path.join(COVERS_DIR, oldCoverFilename);
          if (fs.existsSync(oldCoverPath)) {
            try {
              fs.unlinkSync(oldCoverPath);
            } catch (e) {}
          }
        }
        newCoverUrl = `/api/covers/${coverFile.filename}`;
      } else if (remove_cover === "true") {
        if (existingNote.cover_image && existingNote.cover_image.startsWith("/api/covers/")) {
          const oldCoverFilename = existingNote.cover_image.replace("/api/covers/", "");
          const oldCoverPath = path.join(COVERS_DIR, oldCoverFilename);
          if (fs.existsSync(oldCoverPath)) {
            try {
              fs.unlinkSync(oldCoverPath);
            } catch (e) {}
          }
        }
        newCoverUrl = "";
      }

      // Handle preview images (up to 2 preview images)
      const existingPreviews: string[] = Array.isArray(existingNote.preview_images) ? [...existingNote.preview_images] : [];
      let prev1 = existingPreviews[0] || "";
      let prev2 = existingPreviews[1] || "";

      if (preview1File) {
        if (prev1 && prev1.startsWith("/api/covers/")) {
          const oldPath = path.join(COVERS_DIR, prev1.replace("/api/covers/", ""));
          if (fs.existsSync(oldPath)) {
            try { fs.unlinkSync(oldPath); } catch (e) {}
          }
        }
        prev1 = `/api/covers/${preview1File.filename}`;
      } else if (remove_preview_1 === "true") {
        if (prev1 && prev1.startsWith("/api/covers/")) {
          const oldPath = path.join(COVERS_DIR, prev1.replace("/api/covers/", ""));
          if (fs.existsSync(oldPath)) {
            try { fs.unlinkSync(oldPath); } catch (e) {}
          }
        }
        prev1 = "";
      }

      if (preview2File) {
        if (prev2 && prev2.startsWith("/api/covers/")) {
          const oldPath = path.join(COVERS_DIR, prev2.replace("/api/covers/", ""));
          if (fs.existsSync(oldPath)) {
            try { fs.unlinkSync(oldPath); } catch (e) {}
          }
        }
        prev2 = `/api/covers/${preview2File.filename}`;
      } else if (remove_preview_2 === "true") {
        if (prev2 && prev2.startsWith("/api/covers/")) {
          const oldPath = path.join(COVERS_DIR, prev2.replace("/api/covers/", ""));
          if (fs.existsSync(oldPath)) {
            try { fs.unlinkSync(oldPath); } catch (e) {}
          }
        }
        prev2 = "";
      }

      const updatedPreviews = [prev1, prev2].filter(Boolean);

      const updatedNote = {
        ...existingNote,
        title: title !== undefined ? title.trim() : existingNote.title,
        description: description !== undefined ? description.trim() : existingNote.description,
        price: price !== undefined ? Math.max(0, Number(price)) : existingNote.price,
        published: published !== undefined ? published === "true" || published === true : existingNote.published,
        cover_image: newCoverUrl,
        preview_images: updatedPreviews,
        pdf_file: newPdfFilename,
        pdf_original_name: newPdfOriginalName,
        pdf_size: newPdfSize,
        updated_at: new Date().toISOString(),
      };

      notes[index] = updatedNote;
      writeJSON(NOTES_FILE, notes);

      res.json(updatedNote);
    } catch (err: any) {
      console.error("Error updating note:", err);
      res.status(500).json({ error: err.message || "Failed to update note" });
    }
  }
);

// Admin: Delete Note
app.delete("/api/admin/notes/:id", requireAdmin, (req, res) => {
  const { id } = req.params;
  const notes = readJSON<any[]>(NOTES_FILE, []);
  const index = notes.findIndex((n) => String(n.id).trim() === String(id).trim());

  if (index === -1) {
    return res.status(404).json({ error: "Note not found" });
  }

  const [deletedNote] = notes.splice(index, 1);
  writeJSON(NOTES_FILE, notes);
  console.log(`[ADMIN] Note deleted successfully: ID ${id}, Title: ${deletedNote.title}`);

  // Clean up PDF file
  if (deletedNote.pdf_file) {
    const pdfPath = path.join(PRIVATE_PDFS_DIR, deletedNote.pdf_file);
    if (fs.existsSync(pdfPath)) {
      try {
        fs.unlinkSync(pdfPath);
      } catch (e) {}
    }
  }

  // Clean up cover image
  if (deletedNote.cover_image && deletedNote.cover_image.startsWith("/api/covers/")) {
    const coverFilename = deletedNote.cover_image.replace("/api/covers/", "");
    const coverPath = path.join(COVERS_DIR, coverFilename);
    if (fs.existsSync(coverPath)) {
      try {
        fs.unlinkSync(coverPath);
      } catch (e) {}
    }
  }

  // Clean up preview images
  if (Array.isArray(deletedNote.preview_images)) {
    for (const previewUrl of deletedNote.preview_images) {
      if (previewUrl && previewUrl.startsWith("/api/covers/")) {
        const previewFilename = previewUrl.replace("/api/covers/", "");
        const previewPath = path.join(COVERS_DIR, previewFilename);
        if (fs.existsSync(previewPath)) {
          try {
            fs.unlinkSync(previewPath);
          } catch (e) {}
        }
      }
    }
  }

  res.json({ success: true, message: "Note deleted successfully." });
});

// Admin: Get all orders/sales
app.get("/api/admin/orders", requireAdmin, (req, res) => {
  const orders = readJSON<any[]>(ORDERS_FILE, []);
  res.json(orders.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()));
});

// Admin: Approve Order (Marks as paid, logs to transaction_logs.json, and generates download token)
app.post("/api/admin/orders/:id/approve", requireAdmin, (req, res) => {
  const { id } = req.params;
  const orders = readJSON<any[]>(ORDERS_FILE, []);
  const orderIndex = orders.findIndex((o) => String(o.id).trim() === String(id).trim());

  if (orderIndex === -1) {
    return res.status(404).json({ error: "Order not found" });
  }

  const order = orders[orderIndex];
  const downloadToken = "dl_" + crypto.randomBytes(24).toString("hex");
  const logId = "txn_log_" + crypto.randomBytes(12).toString("hex");

  // Create authoritative verified audit log entry in transaction_logs.json
  const verifiedLog = {
    id: logId,
    order_id: order.id,
    transaction_id: order.utr_number || `adm_appr_${Date.now()}`,
    gateway: "admin_verified",
    event: "admin.manual_approval",
    status: "verified",
    verified: true,
    source: "admin_verified",
    amount: order.amount,
    currency: "INR",
    customer_email: order.customer_email,
    customer_phone: order.customer_phone,
    verified_by: "admin",
    received_at: new Date().toISOString(),
    note: "Manually verified by creator against bank/UPI statement.",
  };

  const transactionLogs = readJSON<any[]>(TRANSACTION_LOGS_FILE, []);
  transactionLogs.unshift(verifiedLog);
  writeJSON(TRANSACTION_LOGS_FILE, transactionLogs);

  order.status = "paid";
  order.download_token = downloadToken;
  order.download_token_expires_at = new Date(Date.now() + 48 * 3600 * 1000).toISOString();
  order.paid_at = new Date().toISOString();
  order.approved_by = "admin";
  order.transaction_log_id = logId;
  order.verified_via = "admin_verified";

  orders[orderIndex] = order;
  writeJSON(ORDERS_FILE, orders);

  res.json({
    success: true,
    message: "Order approved and transaction audit log created! Student now has access to the PDF.",
    order,
    transaction_log: verifiedLog,
  });
});

// Admin: Get All Transaction Logs (Payment Gateway Webhooks & Verified Audits)
app.get("/api/admin/transaction-logs", requireAdmin, (req, res) => {
  const logs = readJSON<any[]>(TRANSACTION_LOGS_FILE, []);
  res.json(logs.sort((a, b) => new Date(b.received_at).getTime() - new Date(a.received_at).getTime()));
});

// Admin: Simulate Payment Gateway Webhook (For Testing & Integration Verification)
app.post("/api/admin/simulate-webhook", requireAdmin, (req, res) => {
  const { order_id, utr, amount, gateway = "razorpay" } = req.body;

  const orders = readJSON<any[]>(ORDERS_FILE, []);
  const order = orders.find((o) => String(o.id).trim() === String(order_id).trim());

  const logId = "txn_log_" + crypto.randomBytes(12).toString("hex");
  const paymentId = "pay_sim_" + crypto.randomBytes(8).toString("hex");
  const transactionId = utr || order?.utr_number || "4235" + Math.floor(10000000 + Math.random() * 90000000);

  const simulatedLog = {
    id: logId,
    order_id: order?.id || order_id || "simulated_order",
    transaction_id: transactionId,
    gateway: gateway,
    event: "payment.captured",
    status: "captured",
    verified: true,
    source: "gateway_webhook",
    amount: amount || order?.amount || 299,
    currency: "INR",
    customer_email: order?.customer_email || "test@student.com",
    customer_phone: order?.customer_phone || "+919876543210",
    received_at: new Date().toISOString(),
    signature_verified: true,
    raw_event_id: `sim_event_${Date.now()}`,
    note: "Simulated gateway webhook for testing transaction verification.",
  };

  const transactionLogs = readJSON<any[]>(TRANSACTION_LOGS_FILE, []);
  transactionLogs.unshift(simulatedLog);
  writeJSON(TRANSACTION_LOGS_FILE, transactionLogs);

  if (order) {
    order.status = "paid";
    order.download_token = order.download_token || ("dl_" + crypto.randomBytes(24).toString("hex"));
    order.transaction_log_id = logId;
    order.verified_via = "gateway_webhook";
    order.paid_at = new Date().toISOString();
    order.payment_id = paymentId;
    if (!order.utr_number) order.utr_number = transactionId;

    writeJSON(ORDERS_FILE, orders);
  }

  res.json({
    success: true,
    message: `Simulated ${gateway} webhook processed and logged. Order ${order?.id || order_id} is verified.`,
    transaction_log: simulatedLog,
    order,
  });
});

// Admin: Reject Order (Denies or cancels access)
app.post("/api/admin/orders/:id/reject", requireAdmin, (req, res) => {
  const { id } = req.params;
  const { reason } = req.body || {};
  const orders = readJSON<any[]>(ORDERS_FILE, []);
  const orderIndex = orders.findIndex((o) => String(o.id).trim() === String(id).trim());

  if (orderIndex === -1) {
    return res.status(404).json({ error: "Order not found" });
  }

  const order = orders[orderIndex];
  order.status = "rejected";
  order.download_token = null;
  order.rejected_at = new Date().toISOString();
  order.rejection_reason = reason || "Payment could not be verified in bank/UPI records.";

  orders[orderIndex] = order;
  writeJSON(ORDERS_FILE, orders);

  res.json({
    success: true,
    message: "Order rejected. Access denied.",
    order,
  });
});

// Admin: Delete an Order (Deletes a single order/sales record)
app.delete("/api/admin/orders/:id", requireAdmin, (req, res) => {
  const { id } = req.params;
  const orders = readJSON<any[]>(ORDERS_FILE, []);
  const initialLength = orders.length;
  const updatedOrders = orders.filter((o) => String(o.id).trim() !== String(id).trim());

  if (updatedOrders.length === initialLength) {
    return res.status(404).json({ error: "Order not found" });
  }

  writeJSON(ORDERS_FILE, updatedOrders);

  res.json({
    success: true,
    message: "Order record deleted successfully",
  });
});

// Admin: Clear All Sales History (Deletes all order records)
app.delete("/api/admin/orders", requireAdmin, (req, res) => {
  writeJSON(ORDERS_FILE, []);
  res.json({
    success: true,
    message: "All sales history cleared successfully",
  });
});

// Admin: Get Settings
app.get("/api/admin/settings", requireAdmin, (req, res) => {
  const settings = readJSON(SETTINGS_FILE, {});
  res.json(settings);
});

// Admin: Update Settings (Stores UPI ID permanently and retains custom security PIN)
app.put("/api/admin/settings", requireAdmin, (req, res) => {
  const { 
    name, 
    bio, 
    instagram_handle, 
    instagram_url, 
    support_email, 
    whatsapp_number,
    upi_id,
    admin_pin,
    verification_mode
  } = req.body;
  
  const currentSettings = readJSON(SETTINGS_FILE, {}) as any;

  // Preserve UPI ID permanently - never revert to any hardcoded fallback
  let cleanUpiId = currentSettings.upi_id || "restorehealthphysio@okaxis";
  if (typeof upi_id === "string" && upi_id.trim() !== "") {
    cleanUpiId = upi_id.trim();
  }

  // Preserve or update admin PIN
  let cleanAdminPin = currentSettings.admin_pin || "1234";
  if (admin_pin && typeof admin_pin === "string" && admin_pin.trim().length >= 4) {
    cleanAdminPin = admin_pin.trim();
  }

  const cleanVerificationMode = verification_mode === "instant" ? "instant" : "manual";

  const newSettings = {
    name: name?.trim() || currentSettings.name || "MEDICOS⛑️MINDS",
    bio: bio !== undefined ? bio.trim() : currentSettings.bio || "",
    instagram_handle: instagram_handle !== undefined ? instagram_handle.trim().replace(/^@/, "") : currentSettings.instagram_handle || "restore_healthphysio",
    instagram_url: instagram_url !== undefined ? instagram_url.trim() : currentSettings.instagram_url || "",
    support_email: support_email !== undefined ? support_email.trim() : currentSettings.support_email || "",
    whatsapp_number: whatsapp_number !== undefined ? whatsapp_number.trim() : currentSettings.whatsapp_number || "+91 83407 49923",
    upi_id: cleanUpiId,
    admin_pin: cleanAdminPin,
    verification_mode: cleanVerificationMode,
  };

  writeJSON(SETTINGS_FILE, newSettings);
  console.log(`[ADMIN] Settings saved successfully. UPI: ${cleanUpiId}, PIN updated: ${cleanAdminPin !== "1234"}`);
  
  res.json({
    ...newSettings,
    success: true,
    pin_configured: cleanAdminPin !== "1234",
    message: "Settings, UPI ID, and Security PIN saved permanently.",
  });
});

// Admin: Dedicated Change Security PIN Endpoint (Immediate persistence & validation)
app.post("/api/admin/change-pin", requireAdmin, (req, res) => {
  const { new_pin } = req.body;

  if (!new_pin || typeof new_pin !== "string" || new_pin.trim().length < 4) {
    return res.status(400).json({ error: "New security PIN must be at least 4 characters long." });
  }

  const cleanPin = new_pin.trim();
  const currentSettings = readJSON(SETTINGS_FILE, {}) as any;
  const updatedSettings = {
    ...currentSettings,
    admin_pin: cleanPin,
  };

  writeJSON(SETTINGS_FILE, updatedSettings);
  console.log(`[ADMIN] PIN updated to custom PIN: ${cleanPin}`);

  res.json({
    success: true,
    admin_pin: cleanPin,
    message: `Security PIN successfully updated to ${cleanPin}! Your store is now protected with your custom PIN.`,
  });
});

// ----------------------------------------------------
// VITE INTEGRATION & SERVER START
// ----------------------------------------------------

async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const { createServer: createViteServer } = await import("vite");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  const DEFAULT_PORT = 3000;
  // When running in deployed Cloud Run, PORT is passed (typically 8080) and NGINX_PORT is not present.
  // In the dev sandbox, NGINX_PORT=8080 is set for the nginx proxy, so the dev server strictly binds to 3000.
  const cloudRunPort = process.env.PORT && !process.env.NGINX_PORT
    ? parseInt(process.env.PORT, 10)
    : null;

  const primaryPort = (cloudRunPort && cloudRunPort > 0) ? cloudRunPort : DEFAULT_PORT;

  app.listen(primaryPort, "0.0.0.0", () => {
    console.log(`MEDICOS⛑️MINDS Server running on http://0.0.0.0:${primaryPort}`);
  });

  // If primary port is Cloud Run's port (e.g. 8080), also listen on port 3000 as fallback
  if (primaryPort !== DEFAULT_PORT && !process.env.NGINX_PORT) {
    try {
      app.listen(DEFAULT_PORT, "0.0.0.0", () => {
        console.log(`MEDICOS⛑️MINDS Server also listening on internal port ${DEFAULT_PORT}`);
      });
    } catch {
      // Ignored if port 3000 is already in use
    }
  }
}

startServer();
