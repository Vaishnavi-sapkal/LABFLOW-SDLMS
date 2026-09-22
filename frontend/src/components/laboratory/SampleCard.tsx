import { FlaskConical, QrCode } from 'lucide-react';
import { useState } from 'react';
import { StatusBadge } from '../ui/StatusBadge';
import { SampleQrLabel } from './SampleQrLabel';

export function SampleCard({ code, patient, test, status, sampleId }: { code: string; patient: string; test: string; status: string; sampleId?: string }) {
  const [showQrLabel, setShowQrLabel] = useState(false);

  return (
    <>
      <article className="rounded-card border border-border bg-white p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="grid h-9 w-9 place-items-center rounded-ui bg-brand-50 text-brand-700"><FlaskConical size={18} /></div>
            <div>
              <h3 className="font-mono text-xs font-semibold text-ink">{code}</h3>
              <p className="text-xs text-ink-muted">{patient}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <StatusBadge tone={status === 'Collected' ? 'success' : status === 'Delayed' ? 'danger' : 'info'}>{status}</StatusBadge>
            <button aria-label={`Show QR label for ${code}`} className="grid h-7 w-7 place-items-center rounded-ui text-ink-muted hover:bg-brand-50 hover:text-brand-700" onClick={() => setShowQrLabel(true)} title="Print QR label" type="button"><QrCode size={16} /></button>
          </div>
        </div>
        <p className="mt-4 text-sm text-ink-muted">{test}</p>
      </article>
      {showQrLabel && <SampleQrLabel onClose={() => setShowQrLabel(false)} sampleId={sampleId ?? code} />}
    </>
  );
}
