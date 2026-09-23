import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { CalendarDays, Download, FileText, IndianRupee } from 'lucide-react';
import { Button } from '../components/ui/Button';
import { DataCell, DataTable } from '../components/ui/DataTable';
import { StatCard } from '../components/ui/StatCard';
import { StatusBadge } from '../components/ui/StatusBadge';
import { PageContainer } from '../components/layout/PageContainer';
import { useAuth } from '../app/AuthContext';
import type { CreatedBooking } from '../api/bookings';
import type { CreatedPatient } from '../api/patients';
import { getMyPatientPortal } from '../api/patients';
import type { ReportDocument } from '../api/reports';
import type { Invoice } from '../api/billing';

const formatInr = (value: number) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(value);
const today = () => new Date().toISOString().slice(0, 10);
const toDate = (value: string) => new Date(value).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });

export function PatientPortal() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [patient, setPatient] = useState<CreatedPatient | null>(null);
  const [bookings, setBookings] = useState<CreatedBooking[]>([]);
  const [reports, setReports] = useState<ReportDocument[]>([]);
  const [selectedReport, setSelectedReport] = useState<ReportDocument | null>(null);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [upcomingDoctor, setUpcomingDoctor] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;

    async function loadPortal() {
      setLoading(true);
      setError('');
      try {
        const portal = await getMyPatientPortal();
        if (active) { setPatient(portal.patient); setBookings(portal.bookings); setReports(portal.reports); setInvoices(portal.invoices); setUpcomingDoctor(portal.bookings[0]?.doctorId ?? ''); }
      } catch (requestError) {
        if (active) setError(requestError instanceof Error ? requestError.message : 'Unable to load your patient profile.');
      } finally {
        if (active) setLoading(false);
      }
    }

    void loadPortal();
    return () => { active = false; };
  }, [user?.id]);

  const upcomingBookings = bookings
    .filter((booking) => (booking.status === 'pending' || booking.status === 'confirmed') && booking.scheduledDate.slice(0, 10) >= today())
    .sort((left, right) => left.scheduledDate.localeCompare(right.scheduledDate));
  const nextBooking = upcomingBookings[0];
  const totalSpend = invoices.filter((invoice) => invoice.status === 'paid').reduce((sum, invoice) => sum + invoice.totalAmount, 0);

  if (loading) return <PageContainer><div className="card p-10 text-center text-sm text-ink-muted">Loading patient portal…</div></PageContainer>;
  if (error) return <PageContainer><div className="card p-10 text-center text-sm text-danger">{error}</div></PageContainer>;
  if (!patient) return <PageContainer><div className="card p-10 text-center"><h2 className="text-lg font-semibold text-ink">Patient profile not linked</h2><p className="mt-2 text-sm text-ink-muted">Your account is not linked to a patient profile yet. Please contact the laboratory.</p></div></PageContainer>;

  return (
    <PageContainer>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4 rounded-card border border-border bg-white p-5">
        <div><h2 className="text-lg font-semibold">Welcome, {patient.fullName}</h2><p className="mt-1 text-sm text-ink-muted">View diagnostic reports, upcoming appointments, and billing history.</p></div>
        <Button onClick={() => navigate('/patient/book')}>Book a Test</Button>
      </div>
      <div className="grid gap-6 xl:grid-cols-[1fr_330px]">
        <section className="grid gap-5">
          <div className="grid gap-4 sm:grid-cols-3">
            <StatCard detail="Verified and ready" icon={<FileText size={20} />} label="Reports" value={String(reports.length)} />
            <StatCard detail={nextBooking ? `Next: ${toDate(nextBooking.scheduledDate)}` : 'No upcoming bookings'} icon={<CalendarDays size={20} />} label="Upcoming Bookings" value={String(upcomingBookings.length)} />
            <StatCard detail="All bookings" icon={<IndianRupee size={20} />} label="Total Spend" value={formatInr(totalSpend)} />
          </div>
          <section className="card p-5">
            <h2 className="mb-4 text-base font-semibold">Reports</h2>
            {reports.length ? <DataTable columns={['Report', 'Test', 'Date', 'Status', 'Details']}>
              {reports.map((report) => <tr className="hover:bg-surface-muted" key={report._id}><DataCell className="font-semibold">{report.reportNo}</DataCell><DataCell>{report.testName}</DataCell><DataCell>{toDate(report.reportDate)}</DataCell><DataCell><StatusBadge tone="success">Verified</StatusBadge></DataCell><DataCell><Button onClick={() => setSelectedReport(report)} size="sm" variant="outline"><Download size={14} /> View</Button></DataCell></tr>)}
            </DataTable> : <p className="py-6 text-center text-sm text-ink-muted">No verified reports are available yet.</p>}
          </section>
          {selectedReport && <section className="card p-5">
            <div className="flex flex-wrap items-start justify-between gap-3 border-b border-border pb-4">
              <div><h2 className="text-base font-semibold">{selectedReport.testName}</h2><p className="mt-1 text-sm text-ink-muted">{selectedReport.reportNo} · Verified {toDate(selectedReport.verifiedAt)}</p></div>
              <Button onClick={() => setSelectedReport(null)} size="sm" variant="outline">Close</Button>
            </div>
            <div className="mt-4 grid gap-2 text-sm sm:grid-cols-2"><p><span className="text-ink-muted">Sample type:</span> {selectedReport.sampleType}</p><p><span className="text-ink-muted">Method:</span> {selectedReport.testMethod}</p><p><span className="text-ink-muted">Verified by:</span> {selectedReport.doctorName}</p>{selectedReport.clinicalRemarks && <p><span className="text-ink-muted">Doctor remarks:</span> {selectedReport.clinicalRemarks}</p>}</div>
            <div className="mt-5 overflow-x-auto"><DataTable columns={['Parameter', 'Result', 'Unit', 'Reference range', 'Flag']}>
              {selectedReport.values.map((value) => <tr className="hover:bg-surface-muted" key={value.parameterName}><DataCell className="font-medium">{value.parameterName}</DataCell><DataCell>{value.value ?? '—'}</DataCell><DataCell>{value.unit}</DataCell><DataCell>{value.referenceMin} – {value.referenceMax}</DataCell><DataCell><StatusBadge tone={value.flag === 'normal' ? 'success' : value.flag === 'high' ? 'danger' : 'warning'}>{value.flag}</StatusBadge></DataCell></tr>)}
            </DataTable></div>
          </section>}
        </section>
        <aside className="card h-fit p-5 xl:sticky xl:top-24">
          <div className="flex items-center justify-between"><h2 className="text-base font-semibold">Upcoming Booking</h2>{nextBooking && <StatusBadge tone="info">{nextBooking.status}</StatusBadge>}</div>
          {nextBooking ? <>
            <div className="mt-5 grid gap-3 text-sm">
              {upcomingDoctor && <p><span className="text-ink-muted">Doctor:</span> {upcomingDoctor}</p>}
              <p><span className="text-ink-muted">Test:</span> {nextBooking.items.map((item) => item.name).join(', ')}</p>
              <p><span className="text-ink-muted">Date:</span> {toDate(nextBooking.scheduledDate)}</p>
              <p><span className="text-ink-muted">Time:</span> {nextBooking.scheduledSlot}</p>
            </div>
            <Button className="mt-6 w-full" variant="outline">Reschedule</Button>
          </> : <p className="mt-5 text-sm text-ink-muted">No upcoming booking is scheduled.</p>}
        </aside>
      </div>
    </PageContainer>
  );
}
