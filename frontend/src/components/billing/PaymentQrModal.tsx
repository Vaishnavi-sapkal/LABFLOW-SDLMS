import { useEffect, useState } from 'react';
import { getInvoicePaymentQr, type InvoicePaymentQr } from '../../api/billing';
import { formatInr } from '../../lib/currency';
import { Button } from '../ui/Button';
import { Modal } from '../ui/Modal';

type PaymentQrModalProps = {
  invoiceId: string;
  onClose: () => void;
  onMarkAsPaid?: () => void;
  markingPaid?: boolean;
};

export function PaymentQrModal({ invoiceId, onClose, onMarkAsPaid, markingPaid = false }: PaymentQrModalProps) {
  const [paymentQr, setPaymentQr] = useState<InvoicePaymentQr | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    async function loadPaymentQr() {
      try {
        const data = await getInvoicePaymentQr(invoiceId);
        if (active) setPaymentQr(data);
      } catch (loadError) {
        if (active) setError(loadError instanceof Error ? loadError.message : 'Unable to generate the payment QR code. Please try again.');
      }
    }
    void loadPaymentQr();
    return () => { active = false; };
  }, [invoiceId]);

  return (
    <Modal onClose={onClose} title="Pay via UPI">
      <div className="grid gap-4 p-5">
        {error && <p className="text-sm text-danger">{error}</p>}
        {!paymentQr && !error && <p className="text-sm text-ink-muted">Generating payment QR code…</p>}
        {paymentQr && <>
          <div className="flex justify-center rounded-ui border border-border bg-white p-3"><img alt={`UPI payment QR code for ${paymentQr.invoiceId}`} className="h-60 w-60" src={paymentQr.qrCode} /></div>
          <div className="grid gap-2 text-sm"><p className="flex justify-between gap-4"><span className="text-ink-muted">Amount due</span><strong>{formatInr(paymentQr.amountDue)}</strong></p><p className="flex justify-between gap-4"><span className="text-ink-muted">UPI ID</span><span className="font-mono text-xs text-ink">{paymentQr.upiId}</span></p></div>
        </>}
        <div className="flex justify-end gap-3"><Button onClick={onClose} type="button" variant="outline">Close</Button>{onMarkAsPaid && <Button disabled={!paymentQr || markingPaid} onClick={onMarkAsPaid} type="button">Mark as paid</Button>}</div>
      </div>
    </Modal>
  );
}
