import express, { Request, Response, NextFunction } from "express";
import path from "path";
import fs from "fs";
import crypto from "crypto";
import multer from "multer";
import { createServer as createViteServer } from "vite";

const app = express();
const PORT = 3000;

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

// Ensure data files exist with default empty states (ZERO preloaded products)
if (!fs.existsSync(NOTES_FILE)) {
  fs.writeFileSync(NOTES_FILE, JSON.stringify([], null, 2));
}

if (!fs.existsSync(ORDERS_FILE)) {
  fs.writeFileSync(ORDERS_FILE, JSON.stringify([], null, 2));
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

// Multer storage configuration
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
    fileSize: 50 * 1024 * 1024, // 50 MB max
  },
  fileFilter: (req, file, cb) => {
    if (file.fieldname === "pdf") {
      if (file.mimetype === "application/pdf" || file.originalname.toLowerCase().endsWith(".pdf")) {
        cb(null, true);
      } else {
        cb(new Error("Only PDF files are allowed for notes"));
      }
    } else if (file.fieldname === "cover") {
      if (file.mimetype.startsWith("image/") || /\.(jpg|jpeg|png|webp|svg)$/i.test(file.originalname)) {
        cb(null, true);
      } else {
        cb(new Error("Only image files are allowed for note covers"));
      }
    } else {
      cb(null, true);
    }
  },
});

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve cover images publicly (covers are promotional visuals)
app.use("/api/covers", express.static(COVERS_DIR));

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

// ----------------------------------------------------
// PUBLIC API ROUTES
// ----------------------------------------------------

// 1. Health check
app.get("/api/health", (req, res) => {
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
    razorpay_key_id: "",
    payment_mode: "test",
  });
  // Do NOT expose admin_pin or razorpay_key_secret publicly
  const { admin_pin, razorpay_key_secret, ...publicSettings } = settings as any;
  res.json(publicSettings);
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

// 5. Create checkout order
app.post("/api/checkout/create-order", async (req, res) => {
  const { note_id, customer_name, customer_email, customer_phone } = req.body;

  if (!note_id || !customer_name || !customer_email) {
    return res.status(400).json({ error: "Missing required customer details." });
  }

  const notes = readJSON<any[]>(NOTES_FILE, []);
  const note = notes.find((n) => n.id === note_id && n.published);
  if (!note) {
    return res.status(404).json({ error: "Note is unavailable or unlisted." });
  }

  const settings = readJSON(SETTINGS_FILE, {}) as any;
  const orderId = "ord_" + Date.now() + "_" + Math.random().toString(36).substring(2, 7);
  
  const keyId = settings.razorpay_key_id || process.env.RAZORPAY_KEY_ID || "";
  const keySecret = settings.razorpay_key_secret || process.env.RAZORPAY_KEY_SECRET || "";

  let razorpayOrderId: string | null = null;

  // If live or valid Razorpay credentials are configured, create order on Razorpay servers
  if (keyId && keySecret) {
    try {
      const authHeader = "Basic " + Buffer.from(`${keyId}:${keySecret}`).toString("base64");
      const rzpRes = await fetch("https://api.razorpay.com/v1/orders", {
        method: "POST",
        headers: {
          "Authorization": authHeader,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          amount: Math.round(note.price * 100), // paise
          currency: "INR",
          receipt: orderId,
          notes: {
            note_title: note.title,
            customer_email: customer_email.trim().toLowerCase(),
            customer_name: customer_name.trim(),
          },
        }),
      });

      if (rzpRes.ok) {
        const rzpData = (await rzpRes.json()) as any;
        razorpayOrderId = rzpData.id;
      } else {
        const errText = await rzpRes.text();
        console.warn("Razorpay API order creation notice:", errText);
      }
    } catch (err) {
      console.error("Failed to connect to Razorpay API:", err);
    }
  }

  const newOrder: any = {
    id: orderId,
    razorpay_order_id: razorpayOrderId,
    note_id: note.id,
    note_title: note.title,
    customer_name: customer_name.trim(),
    customer_email: customer_email.trim().toLowerCase(),
    customer_phone: (customer_phone || "").trim(),
    amount: note.price,
    status: "created",
    download_count: 0,
    created_at: new Date().toISOString(),
  };

  const orders = readJSON<any[]>(ORDERS_FILE, []);
  orders.push(newOrder);
  writeJSON(ORDERS_FILE, orders);

  res.json({
    order_id: newOrder.id,
    razorpay_order_id: razorpayOrderId,
    amount: newOrder.amount,
    currency: "INR",
    note_title: note.title,
    store_name: settings.name || "MEDICOS⛑️MINDS",
    key_id: keyId,
    upi_id: settings.upi_id || "restorehealthphysio@okaxis",
    payment_mode: settings.payment_mode || "test",
    whatsapp_number: settings.whatsapp_number || "+91 83407 49923",
    support_email: settings.support_email || "restorehealthphysio@gmail.com",
    instagram_handle: settings.instagram_handle || "restore_healthphysio",
    instagram_url: settings.instagram_url || "",
  });
});

// 6. Verify Payment (Server-side verification)
app.post("/api/checkout/verify-payment", (req, res) => {
  const { 
    order_id, 
    payment_id, 
    razorpay_order_id,
    signature, 
    test_mode, 
    payment_method, 
    utr_number 
  } = req.body;

  if (!order_id) {
    return res.status(400).json({ error: "Missing order_id" });
  }

  const orders = readJSON<any[]>(ORDERS_FILE, []);
  const orderIndex = orders.findIndex((o) => o.id === order_id);

  if (orderIndex === -1) {
    return res.status(404).json({ error: "Order not found" });
  }

  const order = orders[orderIndex];
  const settings = readJSON(SETTINGS_FILE, {}) as any;
  const keySecret = settings.razorpay_key_secret || process.env.RAZORPAY_KEY_SECRET;

  let isVerified = false;
  const actualMethod = payment_method || (utr_number ? "upi" : "test");
  const actualPaymentId = payment_id || (utr_number ? `upi_${utr_number}` : `sim_${Date.now()}`);

  if (actualMethod === "razorpay" && keySecret && signature && !test_mode) {
    // Cryptographic HMAC SHA-256 verification
    try {
      const orderIdForVerification = razorpay_order_id || order.razorpay_order_id || order_id;
      const expectedSignature = crypto
        .createHmac("sha256", keySecret)
        .update(`${orderIdForVerification}|${actualPaymentId}`)
        .digest("hex");
      isVerified = expectedSignature === signature;
    } catch (e) {
      isVerified = false;
    }
  } else if (actualMethod === "upi") {
    // UPI payment verification: ensure UTR or transaction ID format is provided
    if (utr_number && utr_number.trim().length >= 4) {
      isVerified = true;
    } else if (actualPaymentId && actualPaymentId.length >= 4) {
      isVerified = true;
    }
  } else {
    // Test / Demo / Instant verification mode
    if (actualPaymentId && actualPaymentId.length >= 4) {
      isVerified = true;
    }
  }

  if (!isVerified) {
    order.status = "failed";
    writeJSON(ORDERS_FILE, orders);
    return res.status(400).json({ success: false, message: "Payment verification failed. Please check details." });
  }

  // Payment verified! Generate cryptographically protected token for file retrieval
  const downloadToken = "dl_" + crypto.randomBytes(24).toString("hex");

  order.status = "paid";
  order.payment_id = actualPaymentId;
  order.payment_method = actualMethod;
  if (utr_number) order.utr_number = utr_number.trim();
  order.download_token = downloadToken;
  order.paid_at = new Date().toISOString();

  orders[orderIndex] = order;
  writeJSON(ORDERS_FILE, orders);

  res.json({
    success: true,
    message: "Payment verified successfully!",
    download_token: downloadToken,
    order: {
      id: order.id,
      note_id: order.note_id,
      note_title: order.note_title,
      customer_name: order.customer_name,
      customer_email: order.customer_email,
      amount: order.amount,
      status: order.status,
      payment_method: order.payment_method,
      payment_id: order.payment_id,
      utr_number: order.utr_number,
      download_token: order.download_token,
      paid_at: order.paid_at,
    },
  });
});

// 7. Protected PDF Download (Attachment)
app.get("/api/download/:token", (req, res) => {
  const { token } = req.params;

  if (!token) {
    return res.status(400).send("Invalid download link.");
  }

  const orders = readJSON<any[]>(ORDERS_FILE, []);
  const order = orders.find((o) => o.download_token === token && o.status === "paid");

  if (!order) {
    return res.status(403).send("Unauthorized or invalid download token. Please contact support.");
  }

  const notes = readJSON<any[]>(NOTES_FILE, []);
  const note = notes.find((n) => n.id === order.note_id);

  if (!note || !note.pdf_file) {
    return res.status(404).send("The requested PDF file is not available on the server.");
  }

  const filePath = path.join(PRIVATE_PDFS_DIR, note.pdf_file);

  if (!fs.existsSync(filePath)) {
    return res.status(404).send("File not found on storage. Please contact the creator.");
  }

  // Increment download count
  order.download_count = (order.download_count || 0) + 1;
  order.last_downloaded_at = new Date().toISOString();
  writeJSON(ORDERS_FILE, orders);

  // Send protected PDF with attachment download header
  const filename = note.pdf_original_name || `${note.title.replace(/[^a-zA-Z0-9_-]/g, "_")}.pdf`;
  res.setHeader("Content-Type", "application/pdf");
  res.setHeader("Content-Disposition", `attachment; filename="${encodeURIComponent(filename)}"`);

  const fileStream = fs.createReadStream(filePath);
  fileStream.pipe(res);
});

// 8. Protected PDF In-Browser Viewing (Read Online UX)
app.get("/api/view/:token", (req, res) => {
  const { token } = req.params;

  if (!token) {
    return res.status(400).send("Invalid preview link.");
  }

  const orders = readJSON<any[]>(ORDERS_FILE, []);
  const order = orders.find((o) => o.download_token === token && o.status === "paid");

  if (!order) {
    return res.status(403).send("Unauthorized or invalid access token. Please contact support.");
  }

  const notes = readJSON<any[]>(NOTES_FILE, []);
  const note = notes.find((n) => n.id === order.note_id);

  if (!note || !note.pdf_file) {
    return res.status(404).send("The requested PDF file is not available on the server.");
  }

  const filePath = path.join(PRIVATE_PDFS_DIR, note.pdf_file);

  if (!fs.existsSync(filePath)) {
    return res.status(404).send("File not found on storage. Please contact the creator.");
  }

  // Send protected PDF with inline viewer header
  const filename = note.pdf_original_name || `${note.title.replace(/[^a-zA-Z0-9_-]/g, "_")}.pdf`;
  res.setHeader("Content-Type", "application/pdf");
  res.setHeader("Content-Disposition", `inline; filename="${encodeURIComponent(filename)}"`);

  const fileStream = fs.createReadStream(filePath);
  fileStream.pipe(res);
});

// 9. Customer Purchases Lookup (Retrieve past orders UX)
app.get("/api/purchases/lookup", (req, res) => {
  const email = (req.query.email as string || "").trim().toLowerCase();

  if (!email || !email.includes("@")) {
    return res.status(400).json({ error: "Please provide a valid email address." });
  }

  const orders = readJSON<any[]>(ORDERS_FILE, []);
  const notes = readJSON<any[]>(NOTES_FILE, []);

  const customerOrders = orders
    .filter((o) => o.customer_email?.toLowerCase() === email && o.status === "paid")
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
    email,
    purchases: customerOrders,
  });
});

// ----------------------------------------------------
// ADMIN API ROUTES (PROTECTED)
// ----------------------------------------------------

// Admin Login
app.post("/api/admin/login", (req, res) => {
  const { pin } = req.body;
  const settings = readJSON(SETTINGS_FILE, { admin_pin: "1234" }) as any;
  const expectedPin = settings.admin_pin || process.env.ADMIN_PASSWORD || "1234";

  if (!pin || pin.toString().trim() !== expectedPin.toString().trim()) {
    return res.status(401).json({ error: "Invalid Admin PIN / Password." });
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

      if (!pdfFile) {
        return res.status(400).json({ error: "Please upload a PDF file for this note." });
      }

      const noteId = "note_" + Date.now();
      const newNote = {
        id: noteId,
        title: title.trim(),
        description: (description || "").trim(),
        price: Math.max(0, Number(price) || 0),
        cover_image: coverFile ? `/api/covers/${coverFile.filename}` : "",
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
  ]),
  (req: any, res: any) => {
    try {
      const { id } = req.params;
      const { title, description, price, published } = req.body;

      const notes = readJSON<any[]>(NOTES_FILE, []);
      const index = notes.findIndex((n) => n.id === id);

      if (index === -1) {
        return res.status(404).json({ error: "Note not found" });
      }

      const existingNote = notes[index];
      const files = req.files as { [fieldname: string]: Express.Multer.File[] } | undefined;
      const pdfFile = files?.pdf?.[0];
      const coverFile = files?.cover?.[0];

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
      let newCoverUrl = existingNote.cover_image;
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
      }

      const updatedNote = {
        ...existingNote,
        title: title !== undefined ? title.trim() : existingNote.title,
        description: description !== undefined ? description.trim() : existingNote.description,
        price: price !== undefined ? Math.max(0, Number(price)) : existingNote.price,
        published: published !== undefined ? published === "true" || published === true : existingNote.published,
        cover_image: newCoverUrl,
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
  const index = notes.findIndex((n) => n.id === id);

  if (index === -1) {
    return res.status(404).json({ error: "Note not found" });
  }

  const [deletedNote] = notes.splice(index, 1);
  writeJSON(NOTES_FILE, notes);

  // Clean up files
  if (deletedNote.pdf_file) {
    const pdfPath = path.join(PRIVATE_PDFS_DIR, deletedNote.pdf_file);
    if (fs.existsSync(pdfPath)) {
      try {
        fs.unlinkSync(pdfPath);
      } catch (e) {}
    }
  }
  if (deletedNote.cover_image && deletedNote.cover_image.startsWith("/api/covers/")) {
    const coverFilename = deletedNote.cover_image.replace("/api/covers/", "");
    const coverPath = path.join(COVERS_DIR, coverFilename);
    if (fs.existsSync(coverPath)) {
      try {
        fs.unlinkSync(coverPath);
      } catch (e) {}
    }
  }

  res.json({ success: true, message: "Note deleted successfully." });
});

// Admin: Get all orders/sales
app.get("/api/admin/orders", requireAdmin, (req, res) => {
  const orders = readJSON<any[]>(ORDERS_FILE, []);
  res.json(orders.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()));
});

// Admin: Get Settings
app.get("/api/admin/settings", requireAdmin, (req, res) => {
  const settings = readJSON(SETTINGS_FILE, {});
  res.json(settings);
});

// Admin: Update Settings
app.put("/api/admin/settings", requireAdmin, (req, res) => {
  const { 
    name, 
    bio, 
    instagram_handle, 
    instagram_url, 
    support_email, 
    whatsapp_number,
    upi_id,
    razorpay_key_id,
    razorpay_key_secret,
    payment_mode,
    admin_pin 
  } = req.body;
  
  const currentSettings = readJSON(SETTINGS_FILE, {}) as any;

  const newSettings = {
    ...currentSettings,
    name: name?.trim() || currentSettings.name || "MEDICOS⛑️MINDS",
    bio: bio !== undefined ? bio.trim() : currentSettings.bio || "",
    instagram_handle: instagram_handle !== undefined ? instagram_handle.trim().replace(/^@/, "") : currentSettings.instagram_handle || "restore_healthphysio",
    instagram_url: instagram_url !== undefined ? instagram_url.trim() : currentSettings.instagram_url || "",
    support_email: support_email !== undefined ? support_email.trim() : currentSettings.support_email || "",
    whatsapp_number: whatsapp_number !== undefined ? whatsapp_number.trim() : currentSettings.whatsapp_number || "+91 83407 49923",
    upi_id: upi_id !== undefined ? upi_id.trim() : currentSettings.upi_id || "restorehealthphysio@okaxis",
    razorpay_key_id: razorpay_key_id !== undefined ? razorpay_key_id.trim() : currentSettings.razorpay_key_id || "",
    razorpay_key_secret: razorpay_key_secret !== undefined && razorpay_key_secret.trim() !== "" 
      ? razorpay_key_secret.trim() 
      : currentSettings.razorpay_key_secret || "",
    payment_mode: payment_mode === "live" ? "live" : "test",
    admin_pin: admin_pin ? admin_pin.toString().trim() : currentSettings.admin_pin || "1234",
  };

  writeJSON(SETTINGS_FILE, newSettings);
  
  // Return settings without sensitive secret
  const { razorpay_key_secret: _, ...safeSettings } = newSettings;
  res.json(safeSettings);
});

// ----------------------------------------------------
// VITE INTEGRATION & SERVER START
// ----------------------------------------------------

async function startServer() {
  if (process.env.NODE_ENV !== "production") {
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

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`PhysioNotes Server running on http://localhost:${PORT}`);
  });
}

startServer();
