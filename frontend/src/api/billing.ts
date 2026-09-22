import { isAxiosError } from 'axios';
import client from './client';

export type PaymentMethod = 'cash' | 'upi' | 'card' | 'insurance';

export interface InvoiceItem {
  testId: string;
  code: string;
  name: string;
  category: string;
  qty: number;
  rate: number;
  amount: number;
}

export interface Invoice {
  _id: string;
  invoiceNo: string;
  bookingId: string;
  patientId: string;
  patientName: string;
  patientDisplayId: string;
  doctorId: string;
  doctorName: string;
  items: InvoiceItem[];
  subtotal: number;
  discountPercent: number;
  discountAmount: number;
  gstPercent: number;
  gstAmount: number;
  totalAmount: number;
  paymentMethod?: PaymentMethod;
  upiId?: string;
  status: 'draft' | 'paid' | 'cancelled';
}

export interface InvoicePaymentQr {
  invoiceId: string;
  amountDue: number;
  upiId: string;
  qrCode: string;
}

function rethrowApiError(error: unknown, fallback: string): never {
  if (isAxiosError(error)) {
    const message = error.response?.data?.message;
    throw new Error(typeof message === 'string' ? message : fallback);
  }

  throw error;
}

export async function createInvoice(bookingId: string): Promise<Invoice> {
  try {
    const { data } = await client.post<Invoice>('/billing', { bookingId });
    return data;
  } catch (error) {
    return rethrowApiError(error, 'Unable to create invoice. Please try again.');
  }
}

export async function updateDiscount(id: string, discountPercent: number): Promise<Invoice> {
  try {
    const { data } = await client.patch<Invoice>(`/billing/${id}/discount`, { discountPercent });
    return data;
  } catch (error) {
    return rethrowApiError(error, 'Unable to update discount. Please try again.');
  }
}

export async function confirmPayment(id: string, paymentMethod: PaymentMethod, upiId?: string): Promise<Invoice> {
  try {
    const { data } = await client.patch<Invoice>(`/billing/${id}/confirm-payment`, { paymentMethod, upiId });
    return data;
  } catch (error) {
    return rethrowApiError(error, 'Unable to collect payment. Please try again.');
  }
}

export async function getInvoicePaymentQr(id: string): Promise<InvoicePaymentQr> {
  try {
    const { data } = await client.get<InvoicePaymentQr>(`/billing/${id}/payment-qr`);
    return data;
  } catch (error) {
    return rethrowApiError(error, 'Unable to generate the payment QR code. Please try again.');
  }
}

export async function cancelInvoice(id: string): Promise<Invoice> {
  try {
    const { data } = await client.patch<Invoice>(`/billing/${id}/cancel`);
    return data;
  } catch (error) {
    return rethrowApiError(error, 'Unable to cancel invoice. Please try again.');
  }
}

export async function listInvoices(filters?: { patientId?: string; status?: string }): Promise<Invoice[]> {
  try {
    const { data } = await client.get<Invoice[]>('/billing', { params: filters });
    return data;
  } catch (error) {
    return rethrowApiError(error, 'Unable to load invoices. Please try again.');
  }
}
