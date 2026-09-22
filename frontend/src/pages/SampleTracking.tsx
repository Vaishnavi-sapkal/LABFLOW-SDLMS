import { useEffect, useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { KanbanColumn } from '../components/laboratory/KanbanColumn';
import { SampleCard } from '../components/laboratory/SampleCard';
import { useAuth } from '../app/AuthContext';
import { Button } from '../components/ui/Button';
import { Input, Select } from '../components/ui/Input';
import { PageContainer } from '../components/layout/PageContainer';
import {
  advanceSample,
  createSample,
  listSamples,
  rejectSample,
  type CreateSampleDto,
  type GroupedSamples,
  type SampleDocument,
} from '../api/samples';
import { listBookings, type CreatedBooking } from '../api/bookings';
import { listPatients, type CreatedPatient } from '../api/patients';

const columns = [
  { key: 'collected', title: 'Collected' },
  { key: 'inTransit', title: 'In Transit' },
  { key: 'processing', title: 'Processing' },
  { key: 'completed', title: 'Completed' },
  { key: 'rejected', title: 'Rejected' },
] as const;

const emptySamples: GroupedSamples = {
  collected: [],
  inTransit: [],
  processing: [],
  completed: [],
  rejected: [],
};

const initialSampleForm: Omit<CreateSampleDto, 'handledBy'> = {
  bookingId: '',
  patientId: '',
  patientName: '',
  testDisplayName: '',
  sampleType: '',
  priority: 'routine',
};

export function SampleTracking() {
  const { user } = useAuth();
  const handledBy = user?.name ?? 'Lab staff';
  const [samples, setSamples] = useState<GroupedSamples>(emptySamples);
  const [bookings, setBookings] = useState<CreatedBooking[]>([]);
  const [patients, setPatients] = useState<CreatedPatient[]>([]);
  const [bookingsLoading, setBookingsLoading] = useState(true);
  const [bookingsError, setBookingsError] = useState('');
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [actionError, setActionError] = useState<{ id: string; message: string } | null>(null);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [sampleForm, setSampleForm] = useState(initialSampleForm);
  const [createError, setCreateError] = useState('');

  const loadSamples = async () => {
    setLoading(true);
    setLoadError('');
    try {
      setSamples(await listSamples());
    } catch (error) {
      setLoadError(error instanceof Error ? error.message : 'Unable to load samples. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadSamples();
  }, []);

  useEffect(() => {
    let active = true;
    async function loadBookingsAwaitingCollection() {
      setBookingsLoading(true);
      setBookingsError('');
      try {
        const [loadedBookings, loadedPatients] = await Promise.all([listBookings(), listPatients()]);
        if (!active) return;
        setBookings(loadedBookings.filter((booking) => booking.status === 'pending' || booking.status === 'confirmed'));
        setPatients(loadedPatients);
      } catch (error) {
        if (active) setBookingsError(error instanceof Error ? error.message : 'Unable to load bookings awaiting collection.');
      } finally {
        if (active) setBookingsLoading(false);
      }
    }
    void loadBookingsAwaitingCollection();
    return () => { active = false; };
  }, []);

  const openSampleFormForBooking = (booking: CreatedBooking) => {
    const patient = patients.find((item) => item._id === booking.patientId);
    setSampleForm({
      bookingId: booking._id ?? '',
      patientId: booking.patientId,
      patientName: patient?.fullName ?? 'Patient name unavailable',
      testDisplayName: booking.items.map((item) => item.name).join(', '),
      sampleType: '',
      priority: 'routine',
    });
    setShowCreateForm(true);
    setCreateError('');
  };

  const handleAdvance = async (sample: SampleDocument) => {
    setActionError(null);
    setUpdatingId(sample._id);
    try {
      await advanceSample(sample._id, handledBy);
      await loadSamples();
    } catch (error) {
      setActionError({ id: sample._id, message: error instanceof Error ? error.message : 'Unable to advance sample status.' });
    } finally {
      setUpdatingId(null);
    }
  };

  const handleReject = async (sample: SampleDocument) => {
    const rejectionReason = window.prompt(`Reason for rejecting ${sample.sampleId}:`);
    if (!rejectionReason?.trim()) return;

    setActionError(null);
    setUpdatingId(sample._id);
    try {
      await rejectSample(sample._id, handledBy, rejectionReason.trim());
      await loadSamples();
    } catch (error) {
      setActionError({ id: sample._id, message: error instanceof Error ? error.message : 'Unable to reject sample.' });
    } finally {
      setUpdatingId(null);
    }
  };

  const handleCreate = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setCreateError('');
    try {
      await createSample({ ...sampleForm, handledBy });
      setSampleForm(initialSampleForm);
      setShowCreateForm(false);
      await loadSamples();
    } catch (error) {
      setCreateError(error instanceof Error ? error.message : 'Unable to create sample. Please try again.');
    }
  };

  return (
    <PageContainer>
      <div className="grid gap-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-[22px] font-extrabold leading-tight text-ink">Sample Tracking</h1>
            <p className="text-sm text-ink-muted">Track collection and processing with live laboratory workflow data.</p>
          </div>
          <Button onClick={() => setShowCreateForm((visible) => !visible)}>{showCreateForm ? 'Close form' : 'Log new sample'}</Button>
        </div>

        {showCreateForm && (
          <form className="card grid gap-3 p-5 md:grid-cols-2" onSubmit={handleCreate}>
            <Input onChange={(event) => setSampleForm((current) => ({ ...current, bookingId: event.target.value }))} placeholder="Booking ID" required value={sampleForm.bookingId} />
            <Input onChange={(event) => setSampleForm((current) => ({ ...current, patientId: event.target.value }))} placeholder="Patient ID" required value={sampleForm.patientId} />
            <Input onChange={(event) => setSampleForm((current) => ({ ...current, patientName: event.target.value }))} placeholder="Patient name" required value={sampleForm.patientName} />
            <Input onChange={(event) => setSampleForm((current) => ({ ...current, testDisplayName: event.target.value }))} placeholder="Test display name" required value={sampleForm.testDisplayName} />
            <Input onChange={(event) => setSampleForm((current) => ({ ...current, sampleType: event.target.value }))} placeholder="Sample type (for example, Blood)" required value={sampleForm.sampleType} />
            <Select onChange={(event) => setSampleForm((current) => ({ ...current, priority: event.target.value as CreateSampleDto['priority'] }))} value={sampleForm.priority}>
              <option value="routine">Routine</option>
              <option value="urgent">Urgent</option>
              <option value="stat">Stat</option>
            </Select>
            <div className="flex items-center gap-3"><Button type="submit">Create sample</Button><span className="text-xs text-ink-muted">Handled by {handledBy}</span></div>
            {createError && <p className="text-sm text-danger md:col-span-2">{createError}</p>}
          </form>
        )}

        <section className="card p-5">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div><h2 className="text-base font-semibold">Bookings awaiting sample collection</h2><p className="mt-1 text-sm text-ink-muted">Choose a booking to prefill a new collected sample.</p></div>
            <span className="rounded-full bg-brand-50 px-2.5 py-1 text-xs font-semibold text-brand-700">{bookings.length} awaiting</span>
          </div>
          {bookingsError && <p className="text-sm text-danger">{bookingsError}</p>}
          {bookingsLoading ? <p className="text-sm text-ink-muted">Loading bookings…</p> : bookings.length === 0 ? <p className="text-sm text-ink-muted">No pending or confirmed bookings await collection.</p> : (
            <div className="grid gap-3 lg:grid-cols-2">
              {bookings.map((booking) => {
                const patient = patients.find((item) => item._id === booking.patientId);
                return <article className="rounded-ui border border-border p-4" key={booking._id}>
                  <div className="flex items-start justify-between gap-3"><div><p className="font-semibold text-ink">{patient?.fullName ?? 'Patient name unavailable'}</p><p className="mt-1 font-mono text-xs text-ink-muted">{booking.bookingId}</p></div><span className="rounded bg-muted px-2 py-1 text-xs font-medium capitalize text-ink-muted">{booking.status}</span></div>
                  <p className="mt-3 text-sm text-ink-muted">{booking.items.map((item) => item.name).join(', ')}</p>
                  <p className="mt-1 text-xs text-ink-muted">{booking.scheduledDate.slice(0, 10)} · {booking.scheduledSlot}</p>
                  <Button className="mt-4" onClick={() => openSampleFormForBooking(booking)} size="sm">Collect sample</Button>
                </article>;
              })}
            </div>
          )}
        </section>

        {loadError && <p className="text-sm text-danger">{loadError}</p>}
        {loading ? (
          <div className="card p-8 text-center text-sm text-ink-muted">Loading samples…</div>
        ) : (
          <div className="overflow-x-auto pb-2">
            <div className="grid min-w-[1400px] gap-5 xl:grid-cols-5">
              {columns.map((column) => {
                const columnSamples = samples[column.key];
                return (
                  <KanbanColumn count={columnSamples.length} key={column.key} title={column.title}>
                    {columnSamples.map((sample) => {
                      const terminal = sample.status === 'completed' || sample.status === 'rejected';
                      const actionFailed = actionError?.id === sample._id;
                      return (
                        <div className="grid gap-2" key={sample._id}>
                          <SampleCard code={sample.sampleId} patient={`${sample.patientName} | ${sample.priority}`} sampleId={sample._id} status={column.title} test={sample.testDisplayName} />
                          {!terminal && (
                            <div className="grid grid-cols-2 gap-2">
                              <button className="h-8 rounded-ui border border-border bg-white text-xs font-semibold text-brand-700 hover:bg-brand-50 disabled:cursor-not-allowed disabled:opacity-60" disabled={updatingId === sample._id} onClick={() => void handleAdvance(sample)} type="button">Advance status</button>
                              <button className="h-8 rounded-ui border border-danger/30 bg-white text-xs font-semibold text-danger hover:bg-danger-light disabled:cursor-not-allowed disabled:opacity-60" disabled={updatingId === sample._id} onClick={() => void handleReject(sample)} type="button">Reject</button>
                            </div>
                          )}
                          {sample.status === 'processing' && <Link className="flex h-8 items-center justify-center rounded-ui border border-brand-600 bg-brand-600 text-xs font-semibold text-white hover:bg-brand-700" to={`/results/entry/${sample._id}`}>Enter results</Link>}
                          {sample.rejectionReason && <p className="text-xs text-danger">Reason: {sample.rejectionReason}</p>}
                          {actionFailed && <p className="text-xs text-danger">{actionError.message}</p>}
                        </div>
                      );
                    })}
                  </KanbanColumn>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </PageContainer>
  );
}
