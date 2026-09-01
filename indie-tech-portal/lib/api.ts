export type TicketStatus =
  | 'received'
  | 'dispatched'
  | 'in_progress'
  | 'resolved'
  | 'cancelled';

export type MaintenanceType = 'preventive' | 'corrective';

export interface Ticket {
  id: string;
  ticket_code: string;
  client_id: string;
  device_id?: string;
  issue_desc: string;
  priority: 'low' | 'normal' | 'high' | 'emergency';
  maintenance_type: MaintenanceType;
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
  serial_number?: string;
  issue_desc: string;
  priority?: 'low' | 'normal' | 'high' | 'emergency';
  maintenance_type?: MaintenanceType;
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

export interface JobCard {
  id: string;
  job_card_code: string;
  ticket_id: string;
  device_id?: string;
  technician_name?: string;
  work_done?: string;
  parts_used?: string[];
  status: 'opened' | 'in_progress' | 'awaiting_parts' | 'completed' | 'signed_off';
  service_report?: string;
  completed_at?: string;
  created_at: string;
  updated_at: string;
}

export interface RecordTelemetryInput {
  event_type: 'click' | 'purchase' | 'recall' | 'blog_view';
  target_type: 'part' | 'package' | 'blog_post';
  target_id: string;
  metadata?: Record<string, unknown>;
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
      // response wasn't JSON — keep generic message
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

export function listPackages(): Promise<ServicePackage[]> {
  return request<ServicePackage[]>('/api/v1/packages');
}

export function listParts(): Promise<Part[]> {
  return request<Part[]>('/api/v1/parts');
}

export function listBlogPosts(): Promise<BlogPost[]> {
  return request<BlogPost[]>('/api/v1/blog');
}

export function getBlogPost(slug: string): Promise<BlogPost> {
  return request<BlogPost>(`/api/v1/blog/${slug}`);
}

export function recordTelemetry(input: RecordTelemetryInput): Promise<{ status: string }> {
  return request<{ status: string }>('/api/v1/telemetry', {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

export function getJobCard(code: string): Promise<JobCard> {
  return request<JobCard>(`/api/v1/jobcards/${code}`);
}

export function getJobCardsByTicket(ticketId: string): Promise<JobCard[]> {
  return request<JobCard[]>(`/api/v1/jobcards/ticket/${ticketId}`);
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
