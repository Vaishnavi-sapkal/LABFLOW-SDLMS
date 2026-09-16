import { useEffect, useState } from 'react';
import { Check, Clock3, Plus, Search, UserRound, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { PageContainer } from '../components/layout/PageContainer';
import { formatInr } from '../lib/currency';
import { listDoctors, type DoctorDocument } from '../api/doctors';
import { getSavings, listTests, type TestDocument } from '../api/tests';
import { BookingRequestError, createBooking, getAvailability, getPendingCounts, type CreatedBooking, type SlotAvailability } from '../api/bookings';
import { listPatients, type CreatedPatient } from '../api/patients';

type CatalogTest = {
  id: string;
  name: string;
  category: string;
  price: number;
  duration: string;
  fasting: boolean;
};

type TestPackage = {
  id: string;
  name: string;
  tests: string[];
  price: number;
  savings: number;
};

function todayIsoDate() {
  const today = new Date();
  const localTime = new Date(today.getTime() - (today.getTimezoneOffset() * 60_000));
  return localTime.toISOString().slice(0, 10);
}

function calculateAge(dateOfBirth: string): number {
  const dob = new Date(dateOfBirth);
  const diff = Date.now() - dob.getTime();
  return Math.abs(new Date(diff).getUTCFullYear() - 1970);
}

export function TestBooking() {
  const navigate = useNavigate();
  const [patients, setPatients] = useState<CreatedPatient[]>([]);
  const [testDocuments, setTestDocuments] = useState<TestDocument[]>([]);
  const [doctorDocuments, setDoctorDocuments] = useState<DoctorDocument[]>([]);
  const [packageSavings, setPackageSavings] = useState<Record<string, number>>({});
  const [slotAvailability, setSlotAvailability] = useState<SlotAvailability[]>([]);
  const [pendingCounts, setPendingCounts] = useState<Record<string, number>>({});
  const [dataError, setDataError] = useState('');
  const [search, setSearch] = useState('');
  const [cart, setCart] = useState<string[]>([]);
  const [scheduledDate, setScheduledDate] = useState(todayIsoDate);
  const [selectedSlot, setSelectedSlot] = useState('09:00 AM');
  const [activeTab, setActiveTab] = useState<'tests' | 'packages'>('tests');
  const [selectedDoctorId, setSelectedDoctorId] = useState('');
  const [selectedPatientId, setSelectedPatientId] = useState(patients[0]?._id ?? '');
  const [showPatientSelect, setShowPatientSelect] = useState(false);
  const [createdBooking, setCreatedBooking] = useState<CreatedBooking | null>(null);
  const [bookingError, setBookingError] = useState('');
  const [category, setCategory] = useState('All');
  const [patientSearch, setPatientSearch] = useState('');
  const [categories, setCategories] = useState<string[]>([]);

  useEffect(() => {
    let active = true;

    async function loadCatalog() {
      try {
        const [doctors, loadedPatients] = await Promise.all([listDoctors(), listPatients()]);
        if (!active) return;

        setDoctorDocuments(doctors);
        setPatients(loadedPatients);
        setSelectedDoctorId((current) => current || doctors.find((doctor) => doctor.isActive !== false)?._id || '');
        setSelectedPatientId((current) => current || loadedPatients[0]?._id || '');
      } catch (error) {
        if (active) setDataError(error instanceof Error ? error.message : 'Unable to load booking data. Please try again.');
      }
    }

    void loadCatalog();
    return () => { active = false; };
  }, []);

  useEffect(() => {
    let active = true;
    const timer = window.setTimeout(() => {
      void listPatients(patientSearch.trim() || undefined)
        .then((loadedPatients) => {
          if (!active) return;
          setPatients(loadedPatients);
          setSelectedPatientId((current) => loadedPatients.some((patient) => patient._id === current) ? current : loadedPatients[0]?._id || '');
        })
        .catch((error) => { if (active) setDataError(error instanceof Error ? error.message : 'Unable to search patients.'); });
    }, 300);
    return () => { active = false; window.clearTimeout(timer); };
  }, [patientSearch]);

  useEffect(() => {
    let active = true;
    const timer = window.setTimeout(() => {
      void listTests({ search: search.trim() || undefined, category: category === 'All' ? undefined : category })
        .then((tests) => {
          if (!active) return;
          setTestDocuments(tests);
          if (category === 'All') setCategories([...new Set(tests.filter((test) => !test.isPackage).map((test) => test.category))]);
        })
        .catch((error) => { if (active) setDataError(error instanceof Error ? error.message : 'Unable to search tests.'); });
    }, 300);
    return () => { active = false; window.clearTimeout(timer); };
  }, [search, category]);

  useEffect(() => {
    let active = true;
    const packageIds = testDocuments.filter((test) => test.isPackage).map((test) => test._id);

    const loadPackageSavings = async () => {
      try {
        const savings = await Promise.all(packageIds.map(async (id) => [id, (await getSavings(id)).savings] as const));
        if (active) setPackageSavings(Object.fromEntries(savings));
      } catch {
        if (active) setPackageSavings({});
      }
    };

    void loadPackageSavings();
    return () => { active = false; };
  }, [testDocuments]);

  useEffect(() => {
    let active = true;

    const loadPendingCounts = async () => {
      try {
        const counts = await getPendingCounts();
        if (active) setPendingCounts(Object.fromEntries(counts.map(({ doctorId, pendingCount }) => [doctorId, pendingCount])));
      } catch {
        if (active) setPendingCounts({});
      }
    };

    void loadPendingCounts();
    return () => { active = false; };
  }, []);

  useEffect(() => {
    if (!selectedDoctorId) {
      setSlotAvailability([]);
      return;
    }

    let active = true;

    const loadAvailability = async () => {
      try {
        const availability = await getAvailability(scheduledDate, selectedDoctorId);
        if (!active) return;
        setSlotAvailability(availability);
        setSelectedSlot((current) => availability.find((item) => item.slot === current && item.available)?.slot ?? availability.find((item) => item.available)?.slot ?? '');
      } catch {
        if (active) setSlotAvailability([]);
      }
    };

    void loadAvailability();
    return () => { active = false; };
  }, [scheduledDate, selectedDoctorId]);

  const catalogTests: CatalogTest[] = testDocuments
    .filter((test) => !test.isPackage)
    .map((test) => ({
      id: test._id,
      name: test.name,
      category: test.category,
      price: test.price,
      duration: `${test.turnaroundHours}h`,
      fasting: Boolean(test.fastingRequired),
    }));
  const packages: TestPackage[] = testDocuments
    .filter((test) => test.isPackage)
    .map((test) => {
      const tests = test.includedTestIds ?? [];
      return {
        id: test._id,
        name: test.name,
        tests,
        price: test.price,
        savings: packageSavings[test._id] ?? 0,
      };
    });
  const categoryOptions = ['All', ...categories];

  const selectedPatient = patients.find((patient) => patient._id === selectedPatientId) ?? patients[0];
  const cartItems = catalogTests.filter((test) => cart.includes(test.id));
  const filteredTests = catalogTests.filter((test) => {
    const matchesCategory = category === 'All' || test.category === category;
    const query = search.toLowerCase();
    const matchesSearch = test.name.toLowerCase().includes(query) || test.category.toLowerCase().includes(query);
    return matchesCategory && matchesSearch;
  });
  const catalogTotal = cartItems.reduce((sum, test) => sum + test.price, 0);

  const toggleCart = (id: string) => setCart((current) => current.includes(id) ? current.filter((item) => item !== id) : [...current, id]);
  const addPackage = (pkg: TestPackage) => setCart((current) => [...new Set([...current, ...pkg.tests])]);

  const handleConfirm = async () => {
    if (!cart.length || !selectedPatient || !selectedDoctorId) {
      setBookingError('Select a patient, an active doctor, and at least one test before confirming.');
      return;
    }

    setBookingError('');
    try {
      const booking = await createBooking({
        patientId: selectedPatientId,
        doctorId: selectedDoctorId,
        testIds: cart,
        scheduledDate,
        scheduledSlot: selectedSlot,
      });

      setCreatedBooking(booking);
    } catch (error) {
      if (error instanceof BookingRequestError && error.status === 409) {
        setBookingError('This doctor is already booked for that time. Please pick a different slot.');
        return;
      }

      setBookingError(error instanceof Error ? error.message : 'Unable to create booking. Please try again.');
    }
  };

  if (createdBooking) {
    return (
      <PageContainer>
        <div className="flex justify-center px-2 py-8 lg:py-12">
          <div className="w-full max-w-[480px] text-center">
            <div className="mx-auto mb-6 grid h-16 w-16 place-items-center rounded-full border-2 border-success bg-success-light text-success">
              <Check size={30} strokeWidth={3} />
            </div>
            <h1 className="mb-2 text-[22px] font-extrabold leading-tight text-ink">Tests Booked Successfully!</h1>
            <p className="mb-6 text-sm leading-6 text-ink-muted">Booking confirmed for {createdBooking.scheduledSlot} on {createdBooking.scheduledDate.slice(0, 10)}. Sample collection instructions sent to patient.</p>
            <div className="mb-5 rounded-card bg-muted px-5 py-4 text-left">
              <div className="mb-1 font-mono text-xs text-ink-muted">BOOKING ID</div>
              <div className="font-mono text-lg font-bold text-brand-600">{createdBooking.bookingId}</div>
              <div className="mt-2 text-sm font-semibold text-ink">Total amount: {formatInr(createdBooking.totalAmount)}</div>
            </div>
            <div className="flex justify-center gap-2.5">
              <Button variant="secondary" onClick={() => setCreatedBooking(null)}>New Booking</Button>
              <Button onClick={() => navigate(createdBooking._id ? `/billing?bookingId=${createdBooking._id}` : '/billing')}>Generate Bill</Button>
            </div>
          </div>
        </div>
      </PageContainer>
    );
  }

  return (
    <PageContainer>
      <div className="grid gap-6">
        <header>
          <h1 className="mb-1 text-[22px] font-extrabold leading-tight text-ink">Test Booking</h1>
          <p className="text-[13.5px] text-ink-muted">Search and select tests or packages, assign a doctor, and schedule a collection slot</p>
          {dataError && <p className="mt-2 text-sm text-danger">{dataError}</p>}
        </header>

        <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_340px]">
          <section className="min-w-0">
            <div className="mb-4 rounded-card border border-border bg-white px-5 py-4">
              <div className="flex items-center gap-3">
                <div className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-brand-50 text-brand-600">
                  <UserRound size={17} />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-bold text-ink">{selectedPatient?.fullName ?? 'Select patient'}</div>
                  <div className="truncate text-xs text-ink-muted">
                    {selectedPatient ? `${selectedPatient.patientId} | ${calculateAge(selectedPatient.dateOfBirth)}y ${selectedPatient.gender} | ${selectedPatient.bloodGroup ?? 'N/A'}` : 'No patient selected'}
                  </div>
                </div>
                <Button size="sm" variant="outline" onClick={() => setShowPatientSelect((value) => !value)}>Change Patient</Button>
              </div>
              {showPatientSelect && (
                <div className="mt-3 grid gap-2"><div className="relative"><Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-muted" size={14} /><Input aria-label="Search patients" className="h-9 pl-8 text-sm" onChange={(event) => setPatientSearch(event.target.value)} placeholder="Search name, patient ID, or mobile" value={patientSearch} /></div><select className="focus-ring h-9 w-full rounded-ui border border-border bg-white px-3 text-sm text-ink" onChange={(event) => setSelectedPatientId(event.target.value)} value={selectedPatientId}>{patients.map((patient) => <option key={patient._id} value={patient._id}>{patient.fullName} · {patient.patientId} · {patient.mobile}</option>)}</select></div>
              )}
            </div>

            <div className="mb-4 flex border-b border-border">
              {(['tests', 'packages'] as const).map((tab) => (
                <button
                  className={`mb-[-1px] border-b-2 px-5 py-2.5 text-sm capitalize transition ${activeTab === tab ? 'border-brand-600 font-bold text-brand-600' : 'border-transparent font-medium text-ink-muted hover:text-ink'}`}
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  type="button"
                >
                  {tab}
                </button>
              ))}
            </div>

            {activeTab === 'tests' && (
              <div className="grid gap-3.5">
                <div className="flex flex-col gap-2.5 lg:flex-row">
                  <div className="relative min-w-0 flex-1">
                    <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-muted" size={14} />
                    <Input className="h-9 rounded-[7px] pl-8 text-[13px]" onChange={(event) => setSearch(event.target.value)} placeholder="Search tests..." value={search} />
                  </div>
                  <div className="flex gap-1.5 overflow-x-auto pb-1 lg:pb-0">
                    {categoryOptions.map((item) => (
                      <button
                        className={`h-9 whitespace-nowrap rounded-md border px-3 text-[11.5px] font-semibold transition ${category === item ? 'border-brand-600 bg-brand-50 text-brand-600' : 'border-border bg-white text-ink-muted hover:bg-surface-muted'}`}
                        key={item}
                        onClick={() => setCategory(item)}
                        type="button"
                      >
                        {item}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="grid gap-2.5 lg:grid-cols-2">
                  {filteredTests.map((test) => {
                    const inCart = cart.includes(test.id);
                    return <TestCatalogCard inCart={inCart} key={test.id} onToggle={() => toggleCart(test.id)} test={test} />;
                  })}
                </div>
              </div>
            )}

            {activeTab === 'packages' && (
              <div className="grid gap-3">
                {packages.map((pkg) => (
                  <article className="rounded-card border border-border bg-white p-5" key={pkg.id}>
                    <div className="mb-3 flex items-start justify-between gap-4">
                      <div>
                        <h2 className="mb-1 text-[15px] font-bold text-ink">{pkg.name}</h2>
                        <p className="text-xs text-ink-muted">{pkg.tests.length} tests included</p>
                      </div>
                      <div className="text-right">
                        <div className="text-lg font-extrabold text-brand-600">{formatInr(pkg.price)}</div>
                        <div className="text-[11px] font-semibold text-success">Save {formatInr(pkg.savings)}</div>
                      </div>
                    </div>
                    <div className="mb-3.5 flex flex-wrap gap-1.5">
                      {pkg.tests.map((testId) => <span className="rounded bg-muted px-2 py-0.5 font-mono text-[11px] text-ink-muted" key={testId}>{testId}</span>)}
                    </div>
                    <Button icon={<Plus size={14} />} onClick={() => addPackage(pkg)} size="sm">Add Package</Button>
                  </article>
                ))}
              </div>
            )}
          </section>

          <aside className="grid h-fit gap-4 xl:sticky xl:top-24">
            <CartPanel cartItems={cartItems} onRemove={toggleCart} total={catalogTotal} />
            <DoctorPanel doctors={doctorDocuments.filter((doctor) => doctor.isActive !== false)} pendingCounts={pendingCounts} selectedDoctorId={selectedDoctorId} onSelect={setSelectedDoctorId} />
            <SlotPanel availability={slotAvailability} scheduledDate={scheduledDate} onDateChange={setScheduledDate} selectedSlot={selectedSlot} onSelect={setSelectedSlot} />
            <Button className="h-[46px] w-full rounded-card text-[15px] font-bold" disabled={!cart.length} onClick={handleConfirm}>
              Confirm Booking - {formatInr(catalogTotal)}
            </Button>
            {bookingError && <p className="text-sm text-danger">{bookingError}</p>}
          </aside>
        </div>
      </div>
    </PageContainer>
  );
}

function TestCatalogCard({ inCart, onToggle, test }: { inCart: boolean; onToggle: () => void; test: CatalogTest }) {
  return (
    <button
      className={`rounded-card border p-4 text-left transition ${inCart ? 'border-brand-600 bg-brand-50' : 'border-border bg-white hover:border-brand-600/60 hover:bg-surface-muted'}`}
      onClick={onToggle}
      type="button"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="mb-1 text-[13.5px] font-bold leading-5 text-ink">{test.name}</div>
          <div className="mb-2 text-[11.5px] text-ink-muted">{test.category}</div>
          <div className="flex flex-wrap gap-1.5">
            <span className="inline-flex items-center gap-1 rounded bg-muted px-2 py-0.5 text-[10.5px] text-ink-muted">
              <Clock3 size={11} />
              {test.duration}
            </span>
            {test.fasting && <span className="rounded bg-warning-light px-2 py-0.5 text-[10.5px] text-warning">Fasting</span>}
          </div>
        </div>
        <div className="shrink-0 text-right">
          <div className="text-sm font-extrabold text-ink">{formatInr(test.price)}</div>
          <div className={`ml-auto mt-2 grid h-6 w-6 place-items-center rounded-full ${inCart ? 'bg-brand-600 text-white' : 'bg-muted text-ink-muted'}`}>
            {inCart ? <Check size={14} strokeWidth={3} /> : <Plus size={14} />}
          </div>
        </div>
      </div>
    </button>
  );
}

function CartPanel({ cartItems, onRemove, total }: { cartItems: CatalogTest[]; onRemove: (id: string) => void; total: number }) {
  return (
    <section className="rounded-card border border-border bg-white p-5">
      <h2 className="mb-3.5 text-[15px] font-bold text-ink">Cart ({cartItems.length} test{cartItems.length === 1 ? '' : 's'})</h2>
      {cartItems.length === 0 ? (
        <div className="py-6 text-center text-[13px] text-ink-muted">No tests added yet</div>
      ) : (
        <div>
          {cartItems.map((item) => (
            <div className="flex items-center justify-between gap-3 border-b border-border py-2 last:border-b-0" key={item.id}>
              <div className="min-w-0">
                <div className="truncate text-[13px] font-semibold text-ink">{item.name}</div>
                <div className="text-[11px] text-ink-muted">{item.category}</div>
              </div>
              <div className="flex shrink-0 items-center gap-2.5">
                <span className="text-[13px] font-bold text-ink">{formatInr(item.price)}</span>
                <button className="grid h-5 w-5 place-items-center rounded-full bg-danger-light text-danger" onClick={() => onRemove(item.id)} type="button" aria-label={`Remove ${item.name}`}>
                  <X size={12} />
                </button>
              </div>
            </div>
          ))}
          <div className="mt-3 flex items-center justify-between border-t-2 border-ink pt-3">
            <span className="text-sm font-bold text-ink">Total</span>
            <span className="text-base font-extrabold text-brand-600">{formatInr(total)}</span>
          </div>
        </div>
      )}
    </section>
  );
}

function DoctorPanel({ doctors, pendingCounts, selectedDoctorId, onSelect }: { doctors: DoctorDocument[]; pendingCounts: Record<string, number>; selectedDoctorId: string; onSelect: (id: string) => void }) {
  return (
    <section className="rounded-card border border-border bg-white p-5">
      <h2 className="mb-3 text-sm font-bold text-ink">Assign Doctor</h2>
      <div className="grid gap-1.5">
        {doctors.slice(0, 3).map((doctor) => {
          const selected = selectedDoctorId === doctor._id;
          return (
            <button
              className={`flex items-center gap-2.5 rounded-ui border p-2 text-left transition ${selected ? 'border-brand-600 bg-brand-50' : 'border-transparent bg-transparent hover:bg-surface-muted'}`}
              key={doctor._id}
              onClick={() => onSelect(doctor._id)}
              type="button"
            >
              <div className="grid h-[30px] w-[30px] shrink-0 place-items-center rounded-full bg-gradient-to-br from-brand-600 to-accent text-xs font-bold text-white">
                {doctor.fullName.replace('Dr. ', '').charAt(0)}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2"><span className="truncate text-[13px] font-semibold text-ink">{doctor.fullName}</span><span className="rounded bg-muted px-1.5 py-px text-[10px] font-semibold text-ink-muted">{pendingCounts[doctor._id] ?? 0} pending</span></div>
                <div className="text-[11px] text-ink-muted">{doctor.specialization ?? 'Doctor'}</div>
              </div>
              {selected && <Check className="shrink-0 text-brand-600" size={15} strokeWidth={3} />}
            </button>
          );
        })}
      </div>
    </section>
  );
}

function SlotPanel({ availability, scheduledDate, onDateChange, selectedSlot, onSelect }: { availability: SlotAvailability[]; scheduledDate: string; onDateChange: (date: string) => void; selectedSlot: string; onSelect: (slot: string) => void }) {
  return (
    <section className="rounded-card border border-border bg-white p-5">
      <h2 className="mb-1 text-sm font-bold text-ink">Schedule Slot</h2>
      <Input className="mb-3 h-9" min={todayIsoDate()} onChange={(event) => onDateChange(event.target.value)} type="date" value={scheduledDate} />
      <div className="grid grid-cols-3 gap-1.5">
        {availability.map(({ slot, available }) => {
          const selected = selectedSlot === slot;
          return (
            <button
              className={`rounded-md border py-1.5 font-mono text-[11.5px] font-semibold transition ${selected ? 'border-brand-600 bg-brand-600 text-white' : !available ? 'cursor-not-allowed border-border bg-muted text-ink-muted line-through' : 'border-border bg-white text-ink hover:bg-brand-50'}`}
              disabled={!available}
              key={slot}
              onClick={() => onSelect(slot)}
              type="button"
            >
              {slot}
            </button>
          );
        })}
      </div>
    </section>
  );
}
