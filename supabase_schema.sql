-- ==========================================================
-- PHYSIOTHERAPY NOTES / PDF STORE - SUPABASE DATABASE SCHEMA
-- ==========================================================
-- Execute this script in your Supabase SQL Editor:
-- https://app.supabase.com/project/_/sql
--
-- This script creates:
-- 1. products (physiotherapy notes & study guides)
-- 2. orders (customer purchases & verification tracking)
-- 3. download_access (secure single-use / time-limited tokens)
-- 4. Row Level Security (RLS) policies
-- 5. Private Storage Bucket for secure PDFs
-- ==========================================================

-- Enable pgcrypto for UUID generation if needed
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ----------------------------------------------------------
-- 1. PRODUCTS TABLE
-- ----------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.products (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT DEFAULT '',
  price NUMERIC(10, 2) NOT NULL CHECK (price >= 0),
  cover_image TEXT DEFAULT '',
  preview_images JSONB DEFAULT '[]'::jsonb,
  pdf_file TEXT NOT NULL, -- Path inside private storage bucket
  pdf_original_name TEXT NOT NULL,
  pdf_size BIGINT DEFAULT 0,
  published BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for fast lookup of published notes
CREATE INDEX IF NOT EXISTS idx_products_published ON public.products(published);
CREATE INDEX IF NOT EXISTS idx_products_created_at ON public.products(created_at DESC);

-- ----------------------------------------------------------
-- 2. ORDERS TABLE
-- ----------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.orders (
  id TEXT PRIMARY KEY,
  product_id TEXT NOT NULL REFERENCES public.products(id) ON DELETE RESTRICT,
  product_title TEXT NOT NULL,
  customer_name TEXT NOT NULL,
  customer_email TEXT NOT NULL,
  customer_phone TEXT DEFAULT '',
  amount NUMERIC(10, 2) NOT NULL CHECK (amount >= 0),
  currency TEXT DEFAULT 'INR',
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'pending_verification', 'paid', 'rejected', 'expired')),
  payment_method TEXT DEFAULT 'upi',
  utr_number TEXT,
  screenshot_url TEXT,
  payment_submitted_at TIMESTAMPTZ,
  verified_at TIMESTAMPTZ,
  verified_by TEXT,
  rejection_reason TEXT,
  rejected_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for customer lookup and admin pending verification
CREATE INDEX IF NOT EXISTS idx_orders_customer_email ON public.orders(LOWER(customer_email));
CREATE INDEX IF NOT EXISTS idx_orders_status ON public.orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_utr ON public.orders(utr_number);
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON public.orders(created_at DESC);

-- ----------------------------------------------------------
-- 3. DOWNLOAD ACCESS TABLE (SECURE PDF ACCESS TOKENS)
-- ----------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.download_access (
  id TEXT PRIMARY KEY,
  order_id TEXT NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  product_id TEXT NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  customer_email TEXT NOT NULL,
  token TEXT UNIQUE NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  download_count INTEGER DEFAULT 0,
  max_downloads INTEGER DEFAULT 25,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  last_downloaded_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_download_access_token ON public.download_access(token);
CREATE INDEX IF NOT EXISTS idx_download_access_order ON public.download_access(order_id);

-- ----------------------------------------------------------
-- 4. ROW LEVEL SECURITY (RLS) POLICIES
-- ----------------------------------------------------------
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.download_access ENABLE ROW LEVEL SECURITY;

-- Products: Anyone can read published products
DROP POLICY IF EXISTS "Public can view published products" ON public.products;
CREATE POLICY "Public can view published products"
  ON public.products
  FOR SELECT
  USING (published = true);

-- Products: Service role (backend) has full access
DROP POLICY IF EXISTS "Service role full access products" ON public.products;
CREATE POLICY "Service role full access products"
  ON public.products
  FOR ALL
  USING (auth.role() = 'service_role');

-- Orders: Service role (backend) has full access
DROP POLICY IF EXISTS "Service role full access orders" ON public.orders;
CREATE POLICY "Service role full access orders"
  ON public.orders
  FOR ALL
  USING (auth.role() = 'service_role');

-- Orders: Anon role can insert checkout orders
DROP POLICY IF EXISTS "Public can create orders" ON public.orders;
CREATE POLICY "Public can create orders"
  ON public.orders
  FOR INSERT
  WITH CHECK (true);

-- Orders: Anon role can view order status
DROP POLICY IF EXISTS "Public can view orders" ON public.orders;
CREATE POLICY "Public can view orders"
  ON public.orders
  FOR SELECT
  USING (true);

-- Orders: Anon role can submit payment proof on pending orders
DROP POLICY IF EXISTS "Public can submit payment proof" ON public.orders;
CREATE POLICY "Public can submit payment proof"
  ON public.orders
  FOR UPDATE
  USING (status IN ('pending', 'pending_verification'));

-- Download Access: Service role (backend) has full access
DROP POLICY IF EXISTS "Service role full access download_access" ON public.download_access;
CREATE POLICY "Service role full access download_access"
  ON public.download_access
  FOR ALL
  USING (auth.role() = 'service_role');

-- Download Access: Public can verify access tokens
DROP POLICY IF EXISTS "Public can verify download tokens" ON public.download_access;
CREATE POLICY "Public can verify download tokens"
  ON public.download_access
  FOR SELECT
  USING (true);

-- ----------------------------------------------------------
-- 5. STORAGE BUCKETS
-- ----------------------------------------------------------
-- Run these statements in Supabase SQL Editor to configure storage:

-- Private Bucket for Protected PDFs:
INSERT INTO storage.buckets (id, name, public)
VALUES ('physio_notes_pdfs', 'physio_notes_pdfs', false)
ON CONFLICT (id) DO UPDATE SET public = false;

-- Public Bucket for Product Cover & Preview Images:
INSERT INTO storage.buckets (id, name, public)
VALUES ('covers', 'covers', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- Private Bucket for Payment Proof Screenshots:
INSERT INTO storage.buckets (id, name, public)
VALUES ('screenshots', 'screenshots', false)
ON CONFLICT (id) DO UPDATE SET public = false;

-- Storage RLS: Public can view covers
DROP POLICY IF EXISTS "Public can view covers" ON storage.objects;
CREATE POLICY "Public can view covers"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'covers');

-- Storage RLS: Service role has full access to all buckets
DROP POLICY IF EXISTS "Service role full storage access" ON storage.objects;
CREATE POLICY "Service role full storage access"
  ON storage.objects FOR ALL
  USING (auth.role() = 'service_role');
