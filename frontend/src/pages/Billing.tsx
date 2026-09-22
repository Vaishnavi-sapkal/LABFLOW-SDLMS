import { useEffect, useState } from 'react';
import { CreditCard, Printer, QrCode } from 'lucide-react';
import { useSearchParams } from 'react-router-dom';
import { ReceiptPreview } from '../components/laboratory/ReceiptPreview';
import { PaymentQrModal } from '../components/billing/PaymentQrModal';
import { Button } from '../components/ui/Button';
import { DataCell, DataTable } from '../components/ui/DataTable';
import { Input, Select } from '../components/ui/Input';
import { Tabs } from '../components/ui/Tabs';
import { PageContainer } from '../components/layout/PageContainer';
import { cancelInvoice, confirmPayment, createInvoice, listInvoices, updateDiscount, type Invoice, type PaymentMethod } from '../api/billing';
import { listBookings, type CreatedBooking } from '../api/bookings';
import { formatInr } from '../lib/currency';

const methods = ['Card', 'UPI', 'Cash', 'Insurance'] as const;
const paymentMethodByTab: Record<(typeof methods)[number], PaymentMethod> = {
  Card: 'card',
  UPI: 'upi',
  Cash: 'cash',
  Insurance: 'insurance',
};

export function Billing() {
  const [searchParams] = useSearchParams();
  const requestedBookingId = searchParams.get('bookingId');
  const [method, setMethod] = useState<(typeof methods)[number]>('UPI');
  const [bookings, setBookings] = useState<CreatedBooking[]>([]);
  const [bookingsError, setBookingsError] = useState('');
  const [selectedBookingId, setSelectedBookingId] = useState(bookings[0]?._id ?? '');
  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [loadingInvoice, setLoadingInvoice] = useState(false);
  const [discountPercent, setDiscountPercent] = useState('0');
  const [upiId, setUpiId] = useState('');
  const [error, setError] = useState('');
  const [processing, setProcessing] = useState(false);
  const [showPaymentQr, setShowPaymentQr] = useState(false);

  const selectedBooking = bookings.find((booking) => booking._id === selectedBookingId);
  const paid = invoice?.status === 'paid';

  useEffect(() => {
    let active = true;

    async function loadBookings() {
      try {
        const loadedBookings = await listBookings();
        if (!active) return;

        setBookings(loadedBookings);
        setSelectedBookingId((current) => (
          requestedBookingId && loadedBookings.some((booking) => booking._id === requestedBookingId)
            ? requestedBookingId
            : current || loadedBookings[0]?._id || ''
        ));
      } catch (requestError) {
        if (active) setBookingsError(requestError instanceof Error ? requestError.message : 'Unable to load bookings. Please try again.');
      }
    }

    void loadBookings();
    return () => { active = false; };
  }, [requestedBookingId]);

  useEffect(() => {
    if (!selectedBooking) {
      setInvoice(null);
      return;
    }
    const booking = selectedBooking;

    let active = true;

    async function loadInvoice() {
      setLoadingInvoice(true);
      setError('');
      try {
        const patientInvoices = await listInvoices({ patientId: booking.patientId });
        const existingDraft = patientInvoices.find((item) => item.bookingId === booking._id && item.status === 'draft');
        const nextInvoice = existingDraft ?? await createInvoice(booking._id!);
        if (!active) return;

        setInvoice(nextInvoice);
        setDiscountPercent(String(nextInvoice.discountPercent));
        setUpiId(nextInvoice.upiId ?? '');
      } catch (requestError) {
        if (active) setError(requestError instanceof Error ? requestError.message : 'Unable to load invoice. Please try again.');
      } finally {
        if (active) setLoadingInvoice(false);
      }
    }

    void loadInvoice();
    return () => { active = false; };
  }, [selectedBooking]);

  const applyDiscount = async () => {
    if (!invoice) return;
    const value = Number(discountPercent);
    if (!Number.isFinite(value) || value < 0 || value > 100) {
      setError('Discount must be between 0 and 100.');
      return;
    }

    setProcessing(true);
    setError('');
    try {
      const updatedInvoice = await updateDiscount(invoice._id, value);
      setInvoice(updatedInvoice);
      setDiscountPercent(String(updatedInvoice.discountPercent));
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Unable to update discount. Please try again.');
    } finally {
      setProcessing(false);
    }
  };

  const collectPayment = async () => {
    if (!invoice) return;
    if (method === 'UPI' && !upiId.trim()) {
      setError('Enter a UPI ID before collecting a UPI payment.');
      return;
    }

    setProcessing(true);
    setError('');
    try {
      const updatedInvoice = await confirmPayment(invoice._id, paymentMethodByTab[method], method === 'UPI' ? upiId.trim() : undefined);
      setInvoice(updatedInvoice);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Unable to collect payment. Please try again.');
    } finally {
      setProcessing(false);
    }
  };

  const markUpiPaymentAsPaid = async () => {
    if (!invoice || !upiId.trim()) return;

    setProcessing(true);
    setError('');
    try {
      setInvoice(await confirmPayment(invoice._id, 'upi', upiId.trim()));
      setShowPaymentQr(false);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Unable to collect payment. Please try again.');
    } finally {
      setProcessing(false);
    }
  };

  const handleCancelInvoice = async () => {
    if (!invoice || !window.confirm(`Cancel invoice ${invoice.invoiceNo}?`)) return;

    setProcessing(true);
    setError('');
    try {
      setInvoice(await cancelInvoice(invoice._id));
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Unable to cancel invoice. Please try again.');
    } finally {
      setProcessing(false);
    }
  };

  return (
    <PageContainer>
      <div className="grid gap-4 sm:gap-6 2xl:grid-cols-[minmax(0,1fr)_360px]">
        <section className="card p-4 sm:p-5">
          <div className="mb-4 grid gap-3 sm:flex sm:flex-wrap sm:items-center sm:justify-between"><h2 className="text-base font-semibold">Itemized bill</h2><Tabs items={[...methods]} onChange={setMethod} value={method} /></div>
          {bookingsError && <p className="mb-4 text-sm text-danger">{bookingsError}</p>}
          <label className="mb-5 grid max-w-md gap-1.5 text-xs font-medium text-ink-muted">Booking to bill
            <Select onChange={(event) => setSelectedBookingId(event.target.value)} value={selectedBookingId}>
              {bookings.map((booking) => <option key={booking._id} value={booking._id}>{booking.bookingId} · {booking.scheduledDate.slice(0, 10)} {booking.scheduledSlot}</option>)}
            </Select>
          </label>
          {loadingInvoice ? <p className="py-10 text-center text-sm text-ink-muted">Loading invoice…</p> : invoice ? <>
            <DataTable columns={['Test', 'Qty', 'Price', 'Discount', 'Amount']}>
              {invoice.items.map((item) => <tr className="hover:bg-surface-muted" key={item.testId}><DataCell>{item.name}</DataCell><DataCell>{item.qty}</DataCell><DataCell>{formatInr(item.rate)}</DataCell><DataCell>{formatInr(item.rate * item.qty - item.amount)}</DataCell><DataCell className="font-semibold">{formatInr(item.amount)}</DataCell></tr>)}
            </DataTable>
            <div className="mt-5 grid max-w-sm gap-2 sm:flex sm:items-end"><label className="grid gap-1.5 text-xs font-medium text-ink-muted sm:flex-1">Discount (%)<Input disabled={paid || processing} max="100" min="0" onChange={(event) => setDiscountPercent(event.target.value)} type="number" value={discountPercent} /></label><Button className="w-full sm:w-auto" disabled={paid || processing} onClick={() => void applyDiscount()} size="sm" variant="outline">Apply</Button></div>
            {method === 'UPI' && <label className="mt-4 grid max-w-sm gap-1.5 text-xs font-medium text-ink-muted">UPI ID<Input disabled={paid || processing} onChange={(event) => setUpiId(event.target.value)} placeholder="name@bank" value={upiId} /></label>}
            <div className="ml-auto mt-5 grid max-w-sm gap-2 text-sm">
              <div className="flex justify-between"><span className="text-ink-muted">Subtotal</span><span>{formatInr(invoice.subtotal)}</span></div>
              <div className="flex justify-between"><span className="text-ink-muted">Discount</span><span>{formatInr(invoice.discountAmount)}</span></div>
              <div className="flex justify-between"><span className="text-ink-muted">GST ({invoice.gstPercent}%)</span><span>{formatInr(invoice.gstAmount)}</span></div>
              <div className="flex justify-between border-t border-border pt-3 text-base font-semibold"><span>Total</span><span>{formatInr(invoice.totalAmount)}</span></div>
            </div>
            {error && <p className="mt-4 text-sm text-danger">{error}</p>}
            <div className="mt-5 grid gap-2 sm:flex sm:flex-wrap sm:justify-end"><Button className="w-full sm:w-auto" icon={<Printer size={16} />} variant="outline">Print</Button>{invoice.status === 'draft' && <Button aria-label={`Pay invoice ${invoice.invoiceNo} via UPI`} className="w-full sm:w-auto" icon={<QrCode size={16} />} onClick={() => setShowPaymentQr(true)} title="Pay via UPI" variant="outline">Pay via UPI</Button>}{invoice.status !== 'paid' && invoice.status !== 'cancelled' && <Button className="w-full sm:w-auto" disabled={processing} onClick={() => void handleCancelInvoice()} variant="danger-outline">Cancel invoice</Button>}<Button className="w-full sm:w-auto" disabled={paid || processing || (method === 'UPI' && !upiId.trim())} icon={<CreditCard size={16} />} onClick={() => void collectPayment()}>{paid ? 'Payment Collected' : `Collect via ${method}`}</Button></div>
          </> : <p className="py-10 text-center text-sm text-ink-muted">Select a booking to create an invoice.</p>}
          {!invoice && error && <p className="mt-4 text-sm text-danger">{error}</p>}
        </section>
        <ReceiptPreview invoice={invoice?.invoiceNo ?? 'Invoice pending'} items={(invoice?.items ?? []).map((item) => ({ name: item.name, price: formatInr(item.amount) }))} patient={invoice?.patientName ?? 'Select a booking'} total={formatInr(invoice?.totalAmount ?? 0)} />
      </div>
      {showPaymentQr && invoice && <PaymentQrModal invoiceId={invoice._id} markingPaid={processing} onClose={() => setShowPaymentQr(false)} onMarkAsPaid={upiId.trim() ? () => void markUpiPaymentAsPaid() : undefined} />}
    </PageContainer>
  );
}
