export interface Note {
  id: string;
  title: string;
  description: string;
  price: number; // In INR (₹)
  cover_image: string; // URL / API endpoint (Main 16:9 thumbnail)
  preview_images?: string[]; // Up to 2 inside-page preview images (16:9)
  pdf_file: string; // Internal filename
  pdf_original_name: string;
  pdf_size: number; // In bytes
  published: boolean;
  created_at: string;
  updated_at: string;
}

export interface CreatorProfile {
  name: string;
  bio: string;
  instagram_handle: string;
  instagram_url: string;
  support_email: string;
  whatsapp_number?: string;
  upi_id?: string;
  admin_pin?: string;
  verification_mode?: 'manual' | 'instant';
}

export interface Order {
  id: string;
  note_id: string;
  note_title: string;
  customer_name: string;
  customer_email: string;
  customer_phone: string;
  amount: number;
  currency: string;
  status: 'created' | 'pending' | 'pending_verification' | 'paid' | 'failed' | 'cancelled' | 'expired' | 'rejected';
  payment_id?: string;
  payment_method?: string;
  payment_provider?: string;
  utr_number?: string;
  download_token?: string | null;
  download_token_expires_at?: string | null;
  download_count: number;
  last_downloaded_at?: string;
  submitted_at?: string;
  paid_at?: string;
  approved_by?: string;
  rejection_reason?: string;
  rejected_at?: string;
  transaction_log_id?: string;
  verified_via?: string;
  created_at: string;
}

export interface TransactionLog {
  id: string;
  order_id: string;
  transaction_id: string;
  gateway: string;
  event: string;
  status: 'captured' | 'authorized' | 'verified' | 'success' | 'failed';
  verified: boolean;
  source: 'gateway_webhook' | 'admin_verified';
  amount: number;
  currency: string;
  customer_email?: string;
  customer_phone?: string;
  received_at: string;
  signature_verified?: boolean;
  raw_event_id?: string;
  verified_by?: string;
  note?: string;
}

export interface CreateOrderRequest {
  note_id: string;
  customer_name: string;
  customer_email: string;
  customer_phone: string;
}

export interface VerifyPaymentRequest {
  order_id: string;
  payment_id: string;
  signature?: string;
  test_mode?: boolean;
  payment_method?: 'razorpay' | 'upi' | 'test';
  utr_number?: string;
}

export interface VerifyPaymentResponse {
  success: boolean;
  message: string;
  download_token?: string;
  order?: Order;
}

export interface CustomerPurchase {
  order_id: string;
  note_id: string;
  note_title: string;
  amount: number;
  paid_at: string;
  download_token: string;
  download_count: number;
  cover_image?: string;
}
