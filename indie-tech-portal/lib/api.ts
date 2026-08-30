import { createClient, SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export const supabase: SupabaseClient | null =
  supabaseUrl && supabaseAnonKey ? createClient(supabaseUrl, supabaseAnonKey) : null;

export type TicketStatus =
  | 'received'
  | 'dispatched'
  | 'in_progress'
  | 'resolved'
  | 'cancelled';

export interface Ticket {
  id: string;
  ticket_code: string;
  client_id: string;
  device_id?: string;
  issue_desc: string;
  priority: 'low' | 'normal' | 'high' | 'emergency';
  status: TicketStatus;
  scheduled_at?: string;
  resolved_at?: string;
  created_at: string;
  updated_at: string;
}

export interface CreateTicketInput {
  client_phone: string;
  client_name?: string;
  business_type?: string;
  device_type: string;
  brand?: string;
  model?: string;
  issue_desc: string;
  priority?: 'low' | 'normal' | 'high' | 'emergency';
}

export interface ServicePackage {
  id: string;
  name: string;
  description?: string;
  price_kes: number;
  cadence: 'one_time' | 'monthly' | 'quarterly' | 'annual';
  active: boolean;
  created_at: string;
}

export interface Part {
  id: string;
  sku: string;
  name: string;
  description?: string;
  price_kes: number;
  stock_qty: number;
  active: boolean;
  created_at: string;
  updated_at: string;
}

export interface BlogPost {
  id: string;
  slug: string;
  title: string;
  body_md: string;
  excerpt?: string;
  published_at?: string;
  created_at: string;
  updated_at: string;
}

export interface CheckoutInput {
  client_phone: string;
  client_name?: string;
  item_type: 'spare_part' | 'service_package' | 'digital_download';
  item_ref?: string;
  description: string;
  amount_kes: number;
}

export interface CheckoutResponse {
  order_id: string;
  checkout_request: string;
  customer_message: string;
}

export type OrderStatus = 'pending' | 'paid' | 'failed' | 'refunded';

export interface OrderStatusResponse {
  order_id: string;
  status: OrderStatus;
  amount_kes: number;
  mpesa_receipt?: string;
}

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8080';

class APIError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
  });

  if (!res.ok) {
    let message = `Request failed (${res.status})`;
    try {
      const body = await res.json();
      if (body?.message) message = body.message;
    } catch {
      // response wasn't JSON — keep the generic message
    }
    throw new APIError(message, res.status);
  }

  return res.json() as Promise<T>;
}

export function createTicket(input: CreateTicketInput): Promise<Ticket> {
  return request<Ticket>('/api/v1/tickets', {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

export function lookupTicket(code: string, phone: string): Promise<Ticket> {
  const params = new URLSearchParams({ code, phone });
  return request<Ticket>(`/api/v1/tickets/lookup?${params.toString()}`);
}

export async function listPackages(): Promise<ServicePackage[]> {
  if (supabase) {
    try {
      const { data, error } = await supabase
        .from('service_packages')
        .select('*')
        .eq('active', true);
      if (!error && data) {
        return data as ServicePackage[];
      }
    } catch {
      // Fallback to API base if Supabase request fails
    }
  }
  return request<ServicePackage[]>('/api/v1/packages');
}

export async function listParts(): Promise<Part[]> {
  if (supabase) {
    try {
      const { data, error } = await supabase
        .from('parts')
        .select('*')
        .eq('active', true);
      if (!error && data) {
        return data as Part[];
      }
    } catch {
      // Fallback to API base if Supabase request fails
    }
  }
  return request<Part[]>('/api/v1/parts');
}

export async function listBlogPosts(): Promise<BlogPost[]> {
  if (supabase) {
    try {
      const { data, error } = await supabase
        .from('blog_posts')
        .select('*')
        .not('published_at', 'is', null)
        .order('published_at', { ascending: false });
      if (!error && data) {
        return data as BlogPost[];
      }
    } catch {
      // Fallback to API base if Supabase request fails
    }
  }
  return request<BlogPost[]>('/api/v1/blog');
}

export async function getBlogPost(slug: string): Promise<BlogPost> {
  if (supabase) {
    try {
      const { data, error } = await supabase
        .from('blog_posts')
        .select('*')
        .eq('slug', slug)
        .single();
      if (!error && data) {
        return data as BlogPost;
      }
    } catch {
      // Fallback to API base if Supabase request fails
    }
  }
  return request<BlogPost>(`/api/v1/blog/${slug}`);
}

export function checkout(input: CheckoutInput): Promise<CheckoutResponse> {
  return request<CheckoutResponse>('/api/v1/orders/checkout', {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

export function getOrderStatus(orderId: string): Promise<OrderStatusResponse> {
  return request<OrderStatusResponse>(`/api/v1/orders/${orderId}/status`);
}

export { APIError };
