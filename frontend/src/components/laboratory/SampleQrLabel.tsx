import { useEffect, useState } from 'react';
import { getSampleQr, type SampleQrLabel as SampleQrLabelData } from '../../api/samples';
import { Button } from '../ui/Button';
import { Modal } from '../ui/Modal';

export function SampleQrLabel({ sampleId, onClose }: { sampleId: string; onClose: () => void }) {
  const [label, setLabel] = useState<SampleQrLabelData | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    async function loadLabel() {
      try {
        const data = await getSampleQr(sampleId);
        if (active) setLabel(data);
      } catch (loadError) {
        if (active) setError(loadError instanceof Error ? loadError.message : 'Unable to generate the QR label. Please try again.');
      }
    }
    void loadLabel();
    return () => { active = false; };
  }, [sampleId]);

  return (
    <Modal onClose={onClose} title="Sample QR label">
      <div className="p-5">
        {error && <p className="text-sm text-danger">{error}</p>}
        {!label && !error && <p className="text-sm text-ink-muted">Generating QR label…</p>}
        {label && (
          <div className="grid gap-4">
            <div className="flex justify-center rounded-ui border border-border bg-white p-3"><img alt={`QR code for ${label.sampleId}`} className="h-48 w-48" src={label.qrCode} /></div>
            <dl className="grid gap-3 text-sm">
              <div><dt className="text-xs text-ink-muted">Sample ID</dt><dd className="font-mono font-semibold text-ink">{label.sampleId}</dd></div>
              <div><dt className="text-xs text-ink-muted">Patient</dt><dd className="font-medium text-ink">{label.patientName}</dd></div>
              <div><dt className="text-xs text-ink-muted">Test</dt><dd className="font-medium text-ink">{label.testDisplayName}</dd></div>
              <div className="grid grid-cols-2 gap-3"><div><dt className="text-xs text-ink-muted">Sample type</dt><dd className="font-medium text-ink">{label.sampleType}</dd></div><div><dt className="text-xs text-ink-muted">Collected</dt><dd className="font-medium text-ink">{new Date(label.collectedAt).toLocaleString()}</dd></div></div>
            </dl>
          </div>
        )}
        <div className="mt-5 flex justify-end gap-3 print:hidden"><Button disabled={!label} onClick={() => window.print()} type="button">Print label</Button><Button onClick={onClose} type="button" variant="outline">Close</Button></div>
      </div>
    </Modal>
  );
}
