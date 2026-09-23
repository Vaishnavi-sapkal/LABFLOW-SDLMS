import { useEffect, useState } from 'react';
import { CheckCircle2, Clock3, UserRound } from 'lucide-react';
import { Button } from '../components/ui/Button';
import { Input, Select } from '../components/ui/Input';
import { PageContainer } from '../components/layout/PageContainer';
import { createMyBooking, getAvailability, type CreatedBooking, type SlotAvailability } from '../api/bookings';
import { listDoctors, type DoctorDocument } from '../api/doctors';
import { getMyPatientProfile, type CreatedPatient } from '../api/patients';
import { listTests, type TestDocument } from '../api/tests';
import { formatInr } from '../lib/currency';

function todayIsoDate() {
  const now = new Date();
  return new Date(now.getTime() - now.getTimezoneOffset() * 60_000).toISOString().slice(0, 10);
}

export function PatientBooking() {
  const [patient, setPatient] = useState<CreatedPatient | null>(null);
  const [tests, setTests] = useState<TestDocument[]>([]);
  const [doctors, setDoctors] = useState<DoctorDocument[]>([]);
  const [selectedTestId, setSelectedTestId] = useState('');
  const [doctorId, setDoctorId] = useState('');
  const [scheduledDate, setScheduledDate] = useState(todayIsoDate);
  const [slot, setSlot] = useState('');
  const [availability, setAvailability] = useState<SlotAvailability[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState<CreatedBooking | null>(null);

  useEffect(() => {
    let active = true;
    void Promise.all([getMyPatientProfile(), listTests(), listDoctors()])
      .then(([profile, catalog, staff]) => {
        if (!active) return;
        const activeDoctors = staff.filter((doctor) => doctor.isActive !== false);
        setPatient(profile); setTests(catalog); setDoctors(activeDoctors);
        setSelectedTestId(catalog[0]?._id ?? ''); setDoctorId(activeDoctors[0]?._id ?? '');
      })
      .catch((requestError) => { if (active) setError(requestError instanceof Error ? requestError.message : 'Unable to load booking options.'); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    if (!doctorId || !scheduledDate) { setAvailability([]); return; }
    let active = true;
    setLoadingSlots(true); setSlot('');
    void getAvailability(scheduledDate, doctorId)
      .then((slots) => { if (active) setAvailability(slots); })
      .catch((requestError) => { if (active) setError(requestError instanceof Error ? requestError.message : 'Unable to load available slots.'); })
      .finally(() => { if (active) setLoadingSlots(false); });
    return () => { active = false; };
  }, [doctorId, scheduledDate]);

  const selectedTest = tests.find((test) => test._id === selectedTestId);
  const submit = async () => {
    if (!selectedTestId || !doctorId || !scheduledDate || !slot) { setError('Select a test, date, doctor, and available time slot.'); return; }
    setSubmitting(true); setError('');
    try { setSuccess(await createMyBooking({ testIds: [selectedTestId], doctorId, scheduledDate, scheduledSlot: slot })); }
    catch (requestError) { setError(requestError instanceof Error ? requestError.message : 'Unable to create your booking.'); }
    finally { setSubmitting(false); }
  };

  if (loading) return <PageContainer><div className="card p-10 text-center text-sm text-ink-muted">Loading booking options...</div></PageContainer>;
  if (success) return <PageContainer><section className="card mx-auto max-w-2xl p-6 sm:p-8"><CheckCircle2 className="text-success" size={36} /><h1 className="mt-4 text-2xl font-bold">Booking confirmed</h1><p className="mt-2 text-sm text-ink-muted">Your booking is pending confirmation by the laboratory.</p><div className="mt-6 grid gap-3 rounded-ui border border-border p-4 text-sm sm:grid-cols-2"><Detail label="Booking ID" value={success.bookingId} /><Detail label="Status" value={success.status} /><Detail label="Test" value={success.items.map((item) => item.name).join(', ')} /><Detail label="Date and time" value={`${success.scheduledDate.slice(0, 10)} ${success.scheduledSlot}`} /></div><Button className="mt-6" onClick={() => { setSuccess(null); setSlot(''); }} variant="outline">Book another test</Button></section></PageContainer>;

  return <PageContainer><div className="mx-auto max-w-4xl"><div className="mb-6"><h1 className="text-2xl font-bold">Book a Test</h1><p className="mt-1 text-sm text-ink-muted">Choose a laboratory test and preferred appointment slot.</p></div>{error && <p className="mb-4 rounded-ui border border-danger/30 bg-danger-light p-3 text-sm text-danger">{error}</p>}<div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_300px]"><section className="card p-4 sm:p-5"><h2 className="text-base font-semibold">Test and appointment</h2><label className="mt-5 grid gap-1.5 text-sm font-medium">Laboratory test<Select onChange={(event) => setSelectedTestId(event.target.value)} value={selectedTestId}>{tests.map((test) => <option key={test._id} value={test._id}>{test.name} - {formatInr(test.price)}</option>)}</Select></label>{selectedTest && <p className="mt-2 text-sm text-ink-muted">{selectedTest.category} | Results in about {selectedTest.turnaroundHours} hours{selectedTest.fastingRequired ? ' | Fasting required' : ''}</p>}<div className="mt-5 grid gap-4 sm:grid-cols-2"><label className="grid gap-1.5 text-sm font-medium">Preferred date<Input min={todayIsoDate()} onChange={(event) => setScheduledDate(event.target.value)} type="date" value={scheduledDate} /></label><label className="grid gap-1.5 text-sm font-medium">Doctor<Select onChange={(event) => setDoctorId(event.target.value)} value={doctorId}>{doctors.map((doctor) => <option key={doctor._id} value={doctor._id}>{doctor.fullName}{doctor.specialization ? ` - ${doctor.specialization}` : ''}</option>)}</Select></label></div><div className="mt-5"><div className="flex items-center gap-2"><Clock3 size={16} /><h3 className="font-semibold">Available time slots</h3></div>{loadingSlots ? <p className="mt-3 text-sm text-ink-muted">Loading slots...</p> : <div className="mt-3 grid grid-cols-3 gap-2 sm:grid-cols-4">{availability.map((item) => <button className={`rounded-ui border px-2 py-2 text-xs font-semibold ${slot === item.slot ? 'border-brand-600 bg-brand-600 text-white' : item.available ? 'border-border hover:bg-brand-50' : 'cursor-not-allowed border-border bg-muted text-ink-muted line-through'}`} disabled={!item.available} key={item.slot} onClick={() => setSlot(item.slot)} type="button">{item.slot}</button>)}</div>}</div><Button className="mt-6" disabled={submitting || !slot || !selectedTestId || !doctorId} onClick={() => void submit()}>{submitting ? 'Confirming...' : 'Confirm Booking'}</Button></section><aside className="card h-fit p-4 sm:p-5"><div className="flex items-center gap-2"><UserRound size={18} /><h2 className="font-semibold">Patient information</h2></div>{patient ? <div className="mt-4 grid gap-2 text-sm"><Detail label="Name" value={patient.fullName} /><Detail label="Patient ID" value={patient.patientId} /><Detail label="Mobile" value={patient.mobile} /><Detail label="Email" value={patient.email ?? 'Not provided'} /></div> : <p className="mt-4 text-sm text-danger">Patient profile unavailable.</p>}<div className="mt-5 border-t border-border pt-4 text-sm"><p className="font-semibold">Booking summary</p><p className="mt-2 text-ink-muted">{selectedTest?.name ?? 'Select a test'}</p><p className="mt-1 text-ink-muted">{scheduledDate} {slot ? `at ${slot}` : ''}</p></div></aside></div></div></PageContainer>;
}

function Detail({ label, value }: { label: string; value: string }) { return <p><span className="text-ink-muted">{label}:</span> <span className="font-medium">{value}</span></p>; }
