import { createClient, SupabaseClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

// Configuration from environment variables, supporting direct project ID or URL
function resolveSupabaseUrl(): string {
  const raw = (
    process.env.SUPABASE_URL ||
    process.env.SUPABASE_PROJECT_ID ||
    process.env.VITE_SUPABASE_URL ||
    ''
  ).trim();
  if (!raw) return '';
  if (raw.startsWith('http://') || raw.startsWith('https://')) {
    return raw;
  }
  return `https://${raw}.supabase.co`;
}

function resolveSupabaseKey(): string {
  return (
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.SUPABASE_SECRET_KEY ||
    process.env.SUPABASE_ANON_KEY ||
    process.env.SUPABASE_PUBLISHABLE_KEY ||
    process.env.VITE_SUPABASE_ANON_KEY ||
    ''
  ).trim();
}

const SUPABASE_URL = resolveSupabaseUrl();
const SUPABASE_KEY = resolveSupabaseKey();

let supabaseClient: SupabaseClient | null = null;

export function getSupabaseClient(): SupabaseClient | null {
  if (!SUPABASE_URL || !SUPABASE_KEY) {
    return null;
  }
  if (!supabaseClient) {
    try {
      supabaseClient = createClient(SUPABASE_URL, SUPABASE_KEY, {
        auth: {
          persistSession: false,
          autoRefreshToken: false,
        },
      });
      console.log(`[SUPABASE] Initialized Supabase client for ${SUPABASE_URL}`);
    } catch (err) {
      console.log(`[SUPABASE] Notice initializing client:`, err);
      return null;
    }
  }
  return supabaseClient;
}

export function isSupabaseConfigured(): boolean {
  return Boolean(SUPABASE_URL && SUPABASE_KEY);
}

// --------------------------------------------------
// Schema Cache & Table Readiness Guard
// --------------------------------------------------
// When Supabase credentials are provided but supabase_schema.sql hasn't been
// executed in Supabase SQL Editor yet, PostgREST returns PGRST205:
// "Could not find the table 'public.<table_name>' in the schema cache".
// We track table availability so:
// 1. We don't flood logs with schema warnings.
// 2. We skip unmigrated tables and use local storage transparently.
// 3. We recheck periodically in case tables are created.
// --------------------------------------------------

interface TableStatus {
  available: boolean;
  lastChecked: number;
}

const tableAvailability = new Map<string, TableStatus>();
const UNAVAILABLE_RECHECK_INTERVAL = 60 * 1000; // Retry checking after 1 min if unavailable
const AVAILABLE_RECHECK_INTERVAL = 5 * 60 * 1000; // Cache 5 min if available

export function isSchemaCacheError(err: any): boolean {
  if (!err) return false;
  const msg = typeof err === 'string' ? err : (err.message || err.details || err.hint || '');
  const code = err.code || '';
  return (
    code === 'PGRST205' ||
    msg.includes('schema cache') ||
    msg.includes('Could not find the table') ||
    msg.includes('relation') ||
    msg.includes('does not exist')
  );
}

export function markTableUnavailable(tableName: string): void {
  tableAvailability.set(tableName, { available: false, lastChecked: Date.now() });
}

export function markTableAvailable(tableName: string): void {
  tableAvailability.set(tableName, { available: true, lastChecked: Date.now() });
}

export async function isTableReady(tableName: string): Promise<boolean> {
  const sb = getSupabaseClient();
  if (!sb) return false;

  const cached = tableAvailability.get(tableName);
  const now = Date.now();
  if (cached) {
    const ttl = cached.available ? AVAILABLE_RECHECK_INTERVAL : UNAVAILABLE_RECHECK_INTERVAL;
    if (now - cached.lastChecked < ttl) {
      return cached.available;
    }
  }

  try {
    const { error } = await sb.from(tableName).select('id').limit(1);
    if (error) {
      if (isSchemaCacheError(error)) {
        tableAvailability.set(tableName, { available: false, lastChecked: now });
        return false;
      }
      // If error is permission or RLS policy, table exists in schema cache
      if (
        error.code === '42501' ||
        error.code === 'PGRST301' ||
        error.message?.includes('policy') ||
        error.message?.includes('permission denied')
      ) {
        tableAvailability.set(tableName, { available: true, lastChecked: now });
        return true;
      }
      tableAvailability.set(tableName, { available: false, lastChecked: now });
      return false;
    }
    tableAvailability.set(tableName, { available: true, lastChecked: now });
    return true;
  } catch (err) {
    if (isSchemaCacheError(err)) {
      tableAvailability.set(tableName, { available: false, lastChecked: now });
      return false;
    }
    tableAvailability.set(tableName, { available: false, lastChecked: now });
    return false;
  }
}

export async function getSupabaseHealthStatus(): Promise<{
  configured: boolean;
  url: string;
  tables: {
    products: boolean;
    orders: boolean;
    download_access: boolean;
  };
  allTablesReady: boolean;
}> {
  const sb = getSupabaseClient();
  if (!sb) {
    return {
      configured: false,
      url: '',
      tables: { products: false, orders: false, download_access: false },
      allTablesReady: false,
    };
  }

  const [productsReady, ordersReady, downloadAccessReady] = await Promise.all([
    isTableReady('products'),
    isTableReady('orders'),
    isTableReady('download_access'),
  ]);

  return {
    configured: true,
    url: SUPABASE_URL,
    tables: {
      products: productsReady,
      orders: ordersReady,
      download_access: downloadAccessReady,
    },
    allTablesReady: productsReady && ordersReady && downloadAccessReady,
  };
}

// Local fallback file paths
const DATA_DIR = path.join(process.cwd(), 'data');
const UPLOADS_DIR = path.join(process.cwd(), 'uploads');
const NOTES_FILE = path.join(DATA_DIR, 'notes.json');
const ORDERS_FILE = path.join(DATA_DIR, 'orders.json');
const DOWNLOAD_ACCESS_FILE = path.join(DATA_DIR, 'download_access.json');
const PRIVATE_PDFS_DIR = path.join(UPLOADS_DIR, 'private_pdfs');
const SCREENSHOTS_DIR = path.join(UPLOADS_DIR, 'screenshots');

if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
if (!fs.existsSync(UPLOADS_DIR)) fs.mkdirSync(UPLOADS_DIR, { recursive: true });
if (!fs.existsSync(PRIVATE_PDFS_DIR)) fs.mkdirSync(PRIVATE_PDFS_DIR, { recursive: true });
if (!fs.existsSync(SCREENSHOTS_DIR)) fs.mkdirSync(SCREENSHOTS_DIR, { recursive: true });

function readJSON<T>(file: string, fallback: T): T {
  try {
    if (!fs.existsSync(file)) return fallback;
    const content = fs.readFileSync(file, 'utf-8');
    return JSON.parse(content);
  } catch {
    return fallback;
  }
}

function writeJSON<T>(file: string, data: T): void {
  try {
    fs.writeFileSync(file, JSON.stringify(data, null, 2), 'utf-8');
  } catch (err) {
    console.error(`[STORAGE] Error writing to ${file}:`, err);
  }
}

// ==========================================
// PRODUCTS / NOTES REPOSITORY
// ==========================================

export async function getAllProducts(onlyPublished = false): Promise<any[]> {
  const sb = getSupabaseClient();
  if (sb && (await isTableReady('products'))) {
    try {
      let query = sb.from('products').select('*').order('created_at', { ascending: false });
      if (onlyPublished) {
        query = query.eq('published', true);
      }
      const { data, error } = await query;
      if (!error && data) return data;
      if (error) {
        if (isSchemaCacheError(error)) {
          markTableUnavailable('products');
        } else {
          console.log('[SUPABASE] Products notice, falling back to local storage:', error.message);
        }
      }
    } catch (err: any) {
      if (isSchemaCacheError(err)) {
        markTableUnavailable('products');
      } else {
        console.log('[SUPABASE] Products notice, falling back to local storage:', err?.message || err);
      }
    }
  }

  const localNotes = readJSON<any[]>(NOTES_FILE, []);
  if (onlyPublished) {
    return localNotes.filter((n) => n.published);
  }
  return localNotes;
}

export async function getProductById(id: string): Promise<any | null> {
  const sb = getSupabaseClient();
  if (sb && (await isTableReady('products'))) {
    try {
      const { data, error } = await sb.from('products').select('*').eq('id', id).maybeSingle();
      if (!error && data) return data;
      if (error && isSchemaCacheError(error)) {
        markTableUnavailable('products');
      }
    } catch (err: any) {
      if (isSchemaCacheError(err)) {
        markTableUnavailable('products');
      }
    }
  }

  const localNotes = readJSON<any[]>(NOTES_FILE, []);
  return localNotes.find((n) => String(n.id).trim() === String(id).trim()) || null;
}

export async function saveProduct(product: any, isUpdate = false): Promise<any> {
  const sb = getSupabaseClient();
  if (sb && (await isTableReady('products'))) {
    try {
      const payload = {
        id: product.id,
        title: product.title,
        description: product.description || '',
        price: Number(product.price) || 0,
        cover_image: product.cover_image || '',
        preview_images: product.preview_images || [],
        pdf_file: product.pdf_file,
        pdf_original_name: product.pdf_original_name,
        pdf_size: product.pdf_size || 0,
        published: Boolean(product.published),
        updated_at: new Date().toISOString(),
      };

      if (isUpdate) {
        const { data, error } = await sb.from('products').update(payload).eq('id', product.id).select().single();
        if (!error && data) return data;
        if (error && isSchemaCacheError(error)) markTableUnavailable('products');
      } else {
        const { data, error } = await sb.from('products').insert({ ...payload, created_at: new Date().toISOString() }).select().single();
        if (!error && data) return data;
        if (error && isSchemaCacheError(error)) markTableUnavailable('products');
      }
    } catch (err: any) {
      if (isSchemaCacheError(err)) markTableUnavailable('products');
    }
  }

  // Local fallback
  const notes = readJSON<any[]>(NOTES_FILE, []);
  if (isUpdate) {
    const idx = notes.findIndex((n) => n.id === product.id);
    if (idx !== -1) {
      notes[idx] = { ...notes[idx], ...product, updated_at: new Date().toISOString() };
      writeJSON(NOTES_FILE, notes);
      return notes[idx];
    }
  } else {
    notes.push(product);
    writeJSON(NOTES_FILE, notes);
    return product;
  }
}

export async function deleteProduct(id: string): Promise<boolean> {
  const sb = getSupabaseClient();
  if (sb && (await isTableReady('products'))) {
    try {
      const { error } = await sb.from('products').delete().eq('id', id);
      if (error && isSchemaCacheError(error)) markTableUnavailable('products');
    } catch (err: any) {
      if (isSchemaCacheError(err)) markTableUnavailable('products');
    }
  }

  const notes = readJSON<any[]>(NOTES_FILE, []);
  const filtered = notes.filter((n) => String(n.id).trim() !== String(id).trim());
  writeJSON(NOTES_FILE, filtered);
  return true;
}

// ==========================================
// ORDERS REPOSITORY & ANTI-TAMPERING
// ==========================================

export async function getAllOrders(): Promise<any[]> {
  const sb = getSupabaseClient();
  if (sb && (await isTableReady('orders'))) {
    try {
      const { data, error } = await sb.from('orders').select('*').order('created_at', { ascending: false });
      if (!error && data) return data;
      if (error && isSchemaCacheError(error)) markTableUnavailable('orders');
    } catch (err: any) {
      if (isSchemaCacheError(err)) markTableUnavailable('orders');
    }
  }

  return readJSON<any[]>(ORDERS_FILE, []).sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  );
}

export async function getOrderById(id: string): Promise<any | null> {
  const sb = getSupabaseClient();
  if (sb && (await isTableReady('orders'))) {
    try {
      const { data, error } = await sb.from('orders').select('*').eq('id', id).maybeSingle();
      if (!error && data) return data;
      if (error && isSchemaCacheError(error)) markTableUnavailable('orders');
    } catch (err: any) {
      if (isSchemaCacheError(err)) markTableUnavailable('orders');
    }
  }

  const orders = readJSON<any[]>(ORDERS_FILE, []);
  return orders.find((o) => String(o.id).trim() === String(id).trim()) || null;
}

/**
 * Creates order with strict server-side price validation.
 * The price is NEVER trusted from client; it is retrieved directly from the product record.
 */
export async function createOrderSecure(params: {
  note_id: string;
  customer_name: string;
  customer_email: string;
  customer_phone?: string;
  payment_method?: string;
}): Promise<any> {
  // Fetch product from authoritative source
  const product = await getProductById(params.note_id);
  if (!product) {
    throw new Error('Product not found. Order creation rejected.');
  }

  const orderId = 'ORD-' + Date.now().toString(36).toUpperCase() + '-' + crypto.randomBytes(3).toString('hex').toUpperCase();
  const order: any = {
    id: orderId,
    product_id: product.id,
    note_id: product.id,
    note_title: product.title,
    customer_name: params.customer_name.trim(),
    customer_email: params.customer_email.trim().toLowerCase(),
    customer_phone: (params.customer_phone || '').trim(),
    amount: Number(product.price), // Server-validated price
    currency: 'INR',
    status: 'pending', // Strict initial state
    payment_method: params.payment_method || 'upi',
    utr_number: null,
    screenshot_url: null,
    download_token: null,
    download_token_expires_at: null,
    download_count: 0,
    expires_at: new Date(Date.now() + 20 * 60 * 1000).toISOString(),
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  const sb = getSupabaseClient();
  if (sb && (await isTableReady('orders'))) {
    try {
      const { error } = await sb.from('orders').insert({
        id: order.id,
        product_id: order.product_id,
        product_title: order.note_title,
        customer_name: order.customer_name,
        customer_email: order.customer_email,
        customer_phone: order.customer_phone,
        amount: order.amount,
        currency: order.currency,
        status: 'pending',
        payment_method: order.payment_method,
        expires_at: order.expires_at,
        created_at: order.created_at,
      });
      if (error) {
        if (isSchemaCacheError(error)) {
          markTableUnavailable('orders');
        } else {
          console.log('[SUPABASE] Notice creating order, stored locally:', error.message);
        }
      }
    } catch (err: any) {
      if (isSchemaCacheError(err)) {
        markTableUnavailable('orders');
      } else {
        console.log('[SUPABASE] Notice creating order, stored locally:', err?.message || err);
      }
    }
  }

  // Always save locally as well for immediate redundancy
  const orders = readJSON<any[]>(ORDERS_FILE, []);
  orders.push(order);
  writeJSON(ORDERS_FILE, orders);

  return order;
}

/**
 * Customer submits payment reference for manual verification.
 * Does NOT mark order as paid.
 * Sets status to 'pending_verification' and awaits admin approval.
 */
export async function submitPaymentReference(
  orderId: string,
  utrNumber: string,
  screenshotUrl?: string
): Promise<any> {
  const cleanUtr = utrNumber.trim().replace(/[^a-zA-Z0-9]/g, '');
  const submissionTime = new Date().toISOString();

  const sb = getSupabaseClient();
  if (sb && (await isTableReady('orders'))) {
    try {
      const { error } = await sb
        .from('orders')
        .update({
          status: 'pending_verification',
          utr_number: cleanUtr || null,
          screenshot_url: screenshotUrl || null,
          payment_submitted_at: submissionTime,
          updated_at: submissionTime,
        })
        .eq('id', orderId);
      if (error) {
        if (isSchemaCacheError(error)) {
          markTableUnavailable('orders');
        } else {
          console.log('[SUPABASE] Notice updating payment reference:', error.message);
        }
      }
    } catch (err: any) {
      if (isSchemaCacheError(err)) {
        markTableUnavailable('orders');
      } else {
        console.log('[SUPABASE] Notice updating payment reference:', err?.message || err);
      }
    }
  }

  const orders = readJSON<any[]>(ORDERS_FILE, []);
  const idx = orders.findIndex((o) => String(o.id).trim() === String(orderId).trim());
  if (idx === -1) {
    throw new Error('Order not found');
  }

  orders[idx].status = 'pending_verification';
  if (cleanUtr) {
    orders[idx].utr_number = cleanUtr;
  }
  if (screenshotUrl) orders[idx].screenshot_url = screenshotUrl;
  orders[idx].payment_submitted_at = submissionTime;
  orders[idx].updated_at = submissionTime;

  writeJSON(ORDERS_FILE, orders);
  return orders[idx];
}

/**
 * Admin manual payment approval.
 * 1. Changes order status from pending_verification to 'paid'
 * 2. Sets verified_at and verified_by
 * 3. Creates secure download_access token record
 * 4. Unlocks customer PDF access
 */
export async function approvePaymentSecure(
  orderId: string,
  verifiedBy = 'admin',
  existingDownloadToken?: string
): Promise<{ order: any; downloadToken: string; expiresAt: string }> {
  const verifiedAt = new Date().toISOString();
  const downloadToken = existingDownloadToken || ('dl_' + crypto.randomBytes(24).toString('hex'));
  const expiresAt = new Date(Date.now() + 48 * 3600 * 1000).toISOString(); // 48-hour valid access window

  const orders = readJSON<any[]>(ORDERS_FILE, []);
  const idx = orders.findIndex((o) => String(o.id).trim() === String(orderId).trim());
  if (idx === -1) {
    throw new Error('Order not found');
  }

  const order = orders[idx];
  const accessId = 'acc_' + crypto.randomBytes(12).toString('hex');

  const sb = getSupabaseClient();
  if (sb) {
    if (await isTableReady('orders')) {
      try {
        const { error } = await sb
          .from('orders')
          .update({
            status: 'paid',
            verified_at: verifiedAt,
            verified_by: verifiedBy,
            updated_at: verifiedAt,
          })
          .eq('id', orderId);
        if (error && isSchemaCacheError(error)) markTableUnavailable('orders');
      } catch (err: any) {
        if (isSchemaCacheError(err)) markTableUnavailable('orders');
      }
    }

    if (await isTableReady('download_access')) {
      try {
        const { error } = await sb.from('download_access').insert({
          id: accessId,
          order_id: order.id,
          product_id: order.product_id || order.note_id,
          customer_email: order.customer_email,
          token: downloadToken,
          expires_at: expiresAt,
          download_count: 0,
          max_downloads: 25,
          created_at: verifiedAt,
        });
        if (error && isSchemaCacheError(error)) markTableUnavailable('download_access');
      } catch (err: any) {
        if (isSchemaCacheError(err)) markTableUnavailable('download_access');
      }
    }
  }

  // Update local order
  order.status = 'paid';
  order.verified_at = verifiedAt;
  order.paid_at = verifiedAt;
  order.verified_by = verifiedBy;
  order.approved_by = verifiedBy;
  order.download_token = downloadToken;
  order.download_token_expires_at = expiresAt;
  orders[idx] = order;
  writeJSON(ORDERS_FILE, orders);

  // Store download_access locally
  const accesses = readJSON<any[]>(DOWNLOAD_ACCESS_FILE, []);
  accesses.push({
    id: accessId,
    order_id: order.id,
    product_id: order.product_id || order.note_id,
    customer_email: order.customer_email,
    token: downloadToken,
    expires_at: expiresAt,
    download_count: 0,
    max_downloads: 25,
    created_at: verifiedAt,
  });
  writeJSON(DOWNLOAD_ACCESS_FILE, accesses);

  return { order, downloadToken, expiresAt };
}

/**
 * Admin rejects payment.
 * Status changed to 'rejected'. Never unlock PDF.
 */
export async function rejectPaymentSecure(
  orderId: string,
  reason = 'Payment could not be verified in bank/UPI records.'
): Promise<any> {
  const rejectedAt = new Date().toISOString();

  const sb = getSupabaseClient();
  if (sb && (await isTableReady('orders'))) {
    try {
      const { error } = await sb
        .from('orders')
        .update({
          status: 'rejected',
          rejection_reason: reason,
          rejected_at: rejectedAt,
          updated_at: rejectedAt,
        })
        .eq('id', orderId);
      if (error && isSchemaCacheError(error)) markTableUnavailable('orders');
    } catch (err: any) {
      if (isSchemaCacheError(err)) markTableUnavailable('orders');
    }
  }

  const orders = readJSON<any[]>(ORDERS_FILE, []);
  const idx = orders.findIndex((o) => String(o.id).trim() === String(orderId).trim());
  if (idx === -1) {
    throw new Error('Order not found');
  }

  orders[idx].status = 'rejected';
  orders[idx].rejection_reason = reason;
  orders[idx].rejected_at = rejectedAt;
  orders[idx].download_token = null;
  writeJSON(ORDERS_FILE, orders);

  return orders[idx];
}

// ==========================================
// SECURE DOWNLOAD & SIGNED URL ACCESS
// ==========================================

export async function verifyDownloadToken(token: string): Promise<{
  valid: boolean;
  order?: any;
  product?: any;
  error?: string;
}> {
  if (!token || typeof token !== 'string') {
    return { valid: false, error: 'Access token is required' };
  }

  // Check download_access table or orders
  const sb = getSupabaseClient();
  if (sb && (await isTableReady('download_access'))) {
    try {
      const { data: accessRecord, error } = await sb
        .from('download_access')
        .select('*')
        .eq('token', token)
        .maybeSingle();

      if (error && isSchemaCacheError(error)) markTableUnavailable('download_access');

      if (accessRecord) {
        if (new Date(accessRecord.expires_at).getTime() < Date.now()) {
          return { valid: false, error: 'Download token has expired' };
        }
        if (accessRecord.download_count >= (accessRecord.max_downloads || 25)) {
          return { valid: false, error: 'Maximum download limit exceeded' };
        }

        const { data: order } = await sb
          .from('orders')
          .select('*')
          .eq('id', accessRecord.order_id)
          .maybeSingle();

        if (!order || order.status !== 'paid') {
          return { valid: false, error: 'Payment has not been approved' };
        }

        const { data: product } = await sb
          .from('products')
          .select('*')
          .eq('id', accessRecord.product_id)
          .maybeSingle();

        return { valid: true, order, product };
      }
    } catch (err: any) {
      if (isSchemaCacheError(err)) markTableUnavailable('download_access');
    }
  }

  // Check local fallback
  const accesses = readJSON<any[]>(DOWNLOAD_ACCESS_FILE, []);
  const access = accesses.find((a) => a.token === token);

  const orders = readJSON<any[]>(ORDERS_FILE, []);
  const order = orders.find((o) => o.download_token === token || (access && o.id === access.order_id));

  if (!order) {
    return { valid: false, error: 'Invalid or unrecognized download token' };
  }

  if (order.status !== 'paid') {
    return { valid: false, error: 'Order is not marked as paid by administrator' };
  }

  const expiresAt = access?.expires_at || order.download_token_expires_at;
  if (expiresAt && new Date(expiresAt).getTime() < Date.now()) {
    return { valid: false, error: 'Download token has expired for security' };
  }

  const products = readJSON<any[]>(NOTES_FILE, []);
  const product = products.find((p) => p.id === (order.product_id || order.note_id));

  return { valid: true, order, product };
}

export async function incrementDownloadCounter(token: string): Promise<void> {
  const sb = getSupabaseClient();
  if (sb && (await isTableReady('download_access'))) {
    try {
      const { data: access, error } = await sb
        .from('download_access')
        .select('download_count')
        .eq('token', token)
        .maybeSingle();

      if (error && isSchemaCacheError(error)) markTableUnavailable('download_access');

      if (access) {
        await sb
          .from('download_access')
          .update({
            download_count: (access.download_count || 0) + 1,
            last_downloaded_at: new Date().toISOString(),
          })
          .eq('token', token);
      }
    } catch (err: any) {
      if (isSchemaCacheError(err)) markTableUnavailable('download_access');
    }
  }

  const accesses = readJSON<any[]>(DOWNLOAD_ACCESS_FILE, []);
  const aIdx = accesses.findIndex((a) => a.token === token);
  if (aIdx !== -1) {
    accesses[aIdx].download_count = (accesses[aIdx].download_count || 0) + 1;
    accesses[aIdx].last_downloaded_at = new Date().toISOString();
    writeJSON(DOWNLOAD_ACCESS_FILE, accesses);
  }

  const orders = readJSON<any[]>(ORDERS_FILE, []);
  const oIdx = orders.findIndex((o) => o.download_token === token);
  if (oIdx !== -1) {
    orders[oIdx].download_count = (orders[oIdx].download_count || 0) + 1;
    orders[oIdx].last_downloaded_at = new Date().toISOString();
    writeJSON(ORDERS_FILE, orders);
  }
}

/**
 * Generates signed download URL from private Supabase Storage bucket,
 * or returns null if not using Supabase Storage.
 */
export async function getSignedPdfUrl(filePath: string, expiresIn = 3600): Promise<string | null> {
  const sb = getSupabaseClient();
  if (!sb) return null;

  try {
    const { data, error } = await sb.storage
      .from('physio_notes_pdfs')
      .createSignedUrl(filePath, expiresIn);

    if (error || !data?.signedUrl) {
      return null;
    }
    return data.signedUrl;
  } catch (err) {
    return null;
  }
}
