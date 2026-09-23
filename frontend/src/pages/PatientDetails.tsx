import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { Link, useParams } from 'react-router-dom';
import { CalendarDays, CreditCard, FlaskConical, UserRound } from 'lucide-react';
import { PageContainer } from '../components/layout/PageContainer';
import { DataCell, DataTable } from '../components/ui/DataTable';
import { StatCard } from '../components/ui/StatCard';
import { StatusBadge } from '../components/ui/StatusBadge';
import { Tabs } from '../components/ui/Tabs';
import { useAuth } from '../app/AuthContext';
import { getPatientDetails, type Patient360Data } from '../api/patients';
import { formatInr } from '../lib/currency';

type PatientTab = 'Profile' | 'Bookings' | 'Samples' | 'Results & Reports' | 'Billing' | 'Account';

const date = (value?: string) => value ? new Date(value).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '-';

export function PatientDetails() {
  const { id } = useParams();
  const { role } = useAuth();
  const [data, setData] = useState<Patient360Data | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const allowedTabs = useMemo<PatientTab[]>(() => role === 'Admin'
    ? ['Profile', 'Bookings', 'Samples', 'Results & Reports', 'Billing', 'Account']
    : ['Profile', 'Bookings', 'Billing', 'Account'], [role]);
  const [tab, setTab] = useState<PatientTab>('Profile');

  useEffect(() => { setTab((current) => allowedTabs.includes(current) ? current : 'Profile'); }, [allowedTabs]);
  useEffect(() => {
    if (!id) return;
    let active = true;
    setLoading(true); setError('');
    void getPatientDetails(id)
      .then((response) => { if (active) setData(response); })
      .catch((requestError) => { if (active) setError(requestError instanceof Error ? requestError.message : 'Unable to load Patient 360 details.'); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [id]);

  if (loading) return <PageContainer><div className="card p-10 text-center text-sm text-ink-muted">Loading Patient 360...</div></PageContainer>;
  if (error || !data) return <PageContainer><div className="card p-10 text-center"><p className="text-sm text-danger">{error || 'Patient details are unavailable.'}</p><Link className="mt-4 inline-block text-sm font-semibold text-brand-700 underline" to="/patients/register">Back to patient search</Link></div></PageContainer>;

  const samples = data.samples ? Object.values(data.samples).flat() : [];
  return <PageContainer>
    <div className="mb-6 flex flex-wrap items-start justify-between gap-3"><div><p className="text-xs font-semibold uppercase tracking-wide text-brand-700">Patient 360</p><h1 className="mt-1 text-2xl font-bold text-ink">{data.profile.fullName}</h1><p className="mt-1 text-sm text-ink-muted">{data.profile.patientId} | {data.profile.mobile}</p></div><Link className="text-sm font-semibold text-brand-700 underline" to="/patients/register">Search patients</Link></div>
    <div className="mb-6 grid gap-4 sm:grid-cols-3"><StatCard detail="All scheduled visits" icon={<CalendarDays size={20} />} label="Bookings" value={String(data.bookings.length)} /><StatCard detail="Invoices on file" icon={<CreditCard size={20} />} label="Billing" value={String(data.billing.length)} />{role === 'Admin' && <StatCard detail="Collected and processed" icon={<FlaskConical size={20} />} label="Samples" value={String(samples.length)} />}</div>
    <Tabs items={allowedTabs} onChange={setTab} value={tab} />
    <section className="card mt-4 p-4 sm:p-5">
      {tab === 'Profile' && <div className="grid gap-4 text-sm sm:grid-cols-2 lg:grid-cols-3"><Info label="Date of birth" value={date(data.profile.dateOfBirth)} /><Info label="Gender" value={data.profile.gender} /><Info label="Blood group" value={data.profile.bloodGroup ?? 'Not specified'} /><Info label="Email" value={data.profile.email ?? 'Not provided'} /><Info label="Address" value={[data.profile.address, data.profile.city, data.profile.state, data.profile.pincode].filter(Boolean).join(', ') || 'Not provided'} /><Info label="Emergency contact" value={data.profile.emergencyContact ?? 'Not provided'} /></div>}
      {tab === 'Bookings' && <TableOrEmpty empty="No bookings found." columns={['Booking', 'Date', 'Tests', 'Status']} rows={data.bookings.map((booking) => <tr key={booking._id ?? booking.bookingId}><DataCell className="font-semibold">{booking.bookingId}</DataCell><DataCell>{date(booking.scheduledDate)} {booking.scheduledSlot}</DataCell><DataCell>{booking.items.map((item) => item.name).join(', ')}</DataCell><DataCell><StatusBadge tone="info">{booking.status}</StatusBadge></DataCell></tr>)} />}
      {tab === 'Samples' && <TableOrEmpty empty="No samples found." columns={['Sample', 'Test', 'Type', 'Status']} rows={samples.map((sample) => <tr key={sample._id}><DataCell className="font-semibold">{sample.sampleId}</DataCell><DataCell>{sample.testDisplayName}</DataCell><DataCell>{sample.sampleType}</DataCell><DataCell><StatusBadge tone="info">{sample.status}</StatusBadge></DataCell></tr>)} />}
      {tab === 'Results & Reports' && <div className="grid gap-6"><div><h2 className="mb-3 text-base font-semibold">Results</h2><TableOrEmpty empty="No results found." columns={['Sample', 'Status', 'Remarks']} rows={(data.results ?? []).map((result) => <tr key={result._id}><DataCell>{result.sampleId}</DataCell><DataCell><StatusBadge tone="info">{result.status}</StatusBadge></DataCell><DataCell>{result.remarks ?? '-'}</DataCell></tr>)} /></div><div><h2 className="mb-3 text-base font-semibold">Reports</h2><TableOrEmpty empty="No reports found." columns={['Report', 'Test', 'Date']} rows={(data.reports ?? []).map((report) => <tr key={report._id}><DataCell className="font-semibold">{report.reportNo}</DataCell><DataCell>{report.testName}</DataCell><DataCell>{date(report.reportDate)}</DataCell></tr>)} /></div></div>}
      {tab === 'Billing' && <TableOrEmpty empty="No invoices found." columns={['Invoice', 'Amount', 'Method', 'Status']} rows={data.billing.map((invoice) => <tr key={invoice._id}><DataCell className="font-semibold">{invoice.invoiceNo}</DataCell><DataCell>{formatInr(invoice.totalAmount)}</DataCell><DataCell>{invoice.paymentMethod ?? '-'}</DataCell><DataCell><StatusBadge tone={invoice.status === 'paid' ? 'success' : invoice.status === 'cancelled' ? 'danger' : 'warning'}>{invoice.status}</StatusBadge></DataCell></tr>)} />}
      {tab === 'Account' && <div className="flex items-center gap-3 text-sm"><UserRound className="text-brand-700" size={20} /><div><p className="font-semibold">Patient portal account</p><p className="text-ink-muted">{data.account.portalAccountLinked ? 'A patient portal account is linked.' : 'No patient portal account is linked.'}</p></div></div>}
    </section>
  </PageContainer>;
}

function Info({ label, value }: { label: string; value: string }) { return <div><p className="text-xs font-medium text-ink-muted">{label}</p><p className="mt-1 font-medium text-ink">{value}</p></div>; }
function TableOrEmpty({ columns, rows, empty }: { columns: string[]; rows: ReactNode[]; empty: string }) { return rows.length ? <DataTable columns={columns}>{rows}</DataTable> : <p className="py-6 text-center text-sm text-ink-muted">{empty}</p>; }
