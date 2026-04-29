/**
 * Public types surfaced by the SDK. Kept minimal — every resource
 * module defines only what it consumes / produces. Adding a new field
 * here without bumping the package version is OK; removing or renaming
 * one is a breaking change.
 */

export type CurrencyCode = string; // ISO 4217 — kept loose so new corridors don't require an SDK release

export interface Money {
  amount: string; // decimal as string to preserve precision
  currency: CurrencyCode;
}

export interface Payer {
  phone?: string;
  email?: string;
  name?: string;
}

export interface Recipient {
  phone?: string;
  accountNumber?: string;
  bankCode?: string;
  name?: string;
}

export type CollectionStatus = 'PENDING' | 'COMPLETED' | 'FAILED';

export interface Collection {
  id: string;
  merchantId: string;
  amount: string;
  currency: CurrencyCode;
  status: CollectionStatus;
  payer: Payer;
  paymentLinkId: string | null;
  createdAt: string;
  completedAt: string | null;
}

export interface CreateCollectionRequest {
  amount: string | number;
  currency: CurrencyCode;
  payer: Payer;
  description?: string;
  reference?: string;
  paymentLinkId?: string;
}

export type DisbursementStatus = 'PENDING' | 'COMPLETED' | 'FAILED';

export interface Disbursement {
  id: string;
  merchantId: string;
  amount: string;
  currency: CurrencyCode;
  status: DisbursementStatus;
  recipient: Recipient;
  createdAt: string;
  completedAt: string | null;
}

export interface CreateDisbursementRequest {
  amount: string | number;
  currency: CurrencyCode;
  recipient: Recipient;
  description?: string;
  reference?: string;
}

export interface WalletBalance {
  merchantId: string;
  currency: CurrencyCode;
  available: string;
  pending: string;
  asOf: string;
}

export interface PaymentLink {
  id: string;
  url: string;
  amount: string;
  currency: CurrencyCode;
  description: string | null;
  expiresAt: string | null;
  createdAt: string;
}

export interface CreatePaymentLinkRequest {
  amount: string | number;
  currency: CurrencyCode;
  description?: string;
  /** ISO-8601; if omitted, the backend default applies. */
  expiresAt?: string;
}

export interface InvoiceLineItem {
  description: string;
  quantity: number;
  unitPrice: string | number;
}

export interface Invoice {
  id: string;
  merchantId: string;
  amount: string;
  currency: CurrencyCode;
  dueDate: string;
  status: 'DRAFT' | 'SENT' | 'PAID' | 'OVERDUE' | 'CANCELLED';
  customerEmail: string;
  lineItems: InvoiceLineItem[];
  createdAt: string;
}

export interface CreateInvoiceRequest {
  customerEmail: string;
  currency: CurrencyCode;
  /** ISO-8601 date (YYYY-MM-DD). */
  dueDate: string;
  lineItems: InvoiceLineItem[];
  notes?: string;
}
