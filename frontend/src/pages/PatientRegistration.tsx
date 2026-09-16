import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { CheckCircle2, Save } from 'lucide-react';
import { Button } from '../components/ui/Button';
import { Checkbox } from '../components/ui/Checkbox';
import { Field, FormSection } from '../components/ui/FormSection';
import { Input, Select, Textarea } from '../components/ui/Input';
import { SearchBar } from '../components/ui/SearchBar';
import { StatusBadge } from '../components/ui/StatusBadge';
import { PageContainer } from '../components/layout/PageContainer';
import { StepTracker } from '../components/laboratory/StepTracker';
import { createPatient, listPatients, updatePatient, type BloodGroup, type CreatedPatient, type PatientGender } from '../api/patients';
import { createOrLinkPatientAccount } from '../api/patientAccountProvisioning';
import { useAuth } from '../app/AuthContext';

interface PatientFormState {
  fullName: string;
  dateOfBirth: string;
  gender: PatientGender;
  bloodGroup: BloodGroup;
  mobile: string;
  email: string;
  address: string;
  city: string;
  state: string;
  pincode: string;
  referringDoctor: string;
  governmentId: string;
  emergencyContact: string;
  conditions: string;
  allergies: string;
  consentToTesting: boolean;
  consentToDetailsVerification: boolean;
}

const initialForm: PatientFormState = {
  fullName: '',
  dateOfBirth: '',
  gender: 'female',
  bloodGroup: 'B+',
  mobile: '',
  email: '',
  address: '',
  city: '',
  state: '',
  pincode: '',
  referringDoctor: '',
  governmentId: '',
  emergencyContact: '',
  conditions: '',
  allergies: '',
  consentToTesting: true,
  consentToDetailsVerification: true,
};

function toList(value: string) {
  return value.split(',').map((item) => item.trim()).filter(Boolean);
}

function getAge(dateOfBirth: string) {
  const date = new Date(dateOfBirth);
  const today = new Date();
  let age = today.getFullYear() - date.getFullYear();
  const hasNotHadBirthday = today.getMonth() < date.getMonth() ||
    (today.getMonth() === date.getMonth() && today.getDate() < date.getDate());

  if (hasNotHadBirthday) age -= 1;
  return age;
}

function displayGender(gender: string) {
  return `${gender.charAt(0).toUpperCase()}${gender.slice(1)}`;
}

export function PatientRegistration() {
  const { role } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const [form, setForm] = useState(initialForm);
  const [registered, setRegistered] = useState(false);
  const [registeredPatient, setRegisteredPatient] = useState<CreatedPatient | null>(null);
  const [registrationError, setRegistrationError] = useState('');
  const accountTab = searchParams.get('tab') === 'account' || searchParams.get('account') === 'true';
  const [createPatientAccount, setCreatePatientAccount] = useState(accountTab);
  const [accountPassword, setAccountPassword] = useState('');
  const [existingPatientSearch, setExistingPatientSearch] = useState('');
  const [existingPatients, setExistingPatients] = useState<CreatedPatient[]>([]);
  const [patientSearchError, setPatientSearchError] = useState('');

  useEffect(() => {
    setCreatePatientAccount(accountTab);
  }, [accountTab]);

  useEffect(() => {
    let active = true;
    const timer = window.setTimeout(() => {
      void listPatients(existingPatientSearch.trim() || undefined)
        .then((patients) => { if (active) { setExistingPatients(patients); setPatientSearchError(''); } })
        .catch((error) => { if (active) setPatientSearchError(error instanceof Error ? error.message : 'Unable to search patients.'); });
    }, 300);
    return () => { active = false; window.clearTimeout(timer); };
  }, [existingPatientSearch]);

  const selectExistingPatient = (patient: CreatedPatient) => {
    setForm((current) => ({
      ...current,
      fullName: patient.fullName,
      dateOfBirth: patient.dateOfBirth.slice(0, 10),
      gender: patient.gender,
      bloodGroup: patient.bloodGroup ?? current.bloodGroup,
      mobile: patient.mobile,
      email: patient.email ?? '',
      address: patient.address ?? '',
      city: patient.city ?? '',
      state: patient.state ?? '',
      pincode: patient.pincode ?? '',
      referringDoctor: patient.referringDoctor ?? '',
      governmentId: patient.aadhaarNumber ?? '',
      emergencyContact: patient.emergencyContact ?? '',
      conditions: (patient.conditions ?? []).join(', '),
      allergies: (patient.allergies ?? []).join(', '),
      consentToTesting: patient.consentToTesting ?? current.consentToTesting,
      consentToDetailsVerification: patient.consentToDetailsVerification ?? current.consentToDetailsVerification,
    }));
    setExistingPatientSearch('');
    setExistingPatients([]);
  };

  const handleRegister = async () => {
    setRegistrationError('');

    const dateOfBirth = new Date(form.dateOfBirth);
    if (!form.fullName.trim() || Number.isNaN(dateOfBirth.getTime()) || dateOfBirth > new Date()) {
      setRegistrationError('Enter the patient name and a valid date of birth that is not in the future.');
      return;
    }
    if (!/^\+?[1-9]\d{7,14}$/.test(form.mobile.trim())) {
      setRegistrationError('Enter a valid mobile number.');
      return;
    }
    if (form.governmentId && !/^\d{12}$/.test(form.governmentId)) {
      setRegistrationError('Aadhaar ID must contain exactly 12 digits.');
      return;
    }
    if (form.pincode && !/^\d{6}$/.test(form.pincode)) {
      setRegistrationError('Pincode must contain exactly 6 digits.');
      return;
    }
    if (form.emergencyContact && !/^\+?[1-9]\d{7,14}$/.test(form.emergencyContact.trim())) {
      setRegistrationError('Enter a valid emergency contact number.');
      return;
    }
    if (!form.consentToTesting || !form.consentToDetailsVerification) {
      setRegistrationError('Both consent confirmations are required before registration.');
      return;
    }

    const patientPayload = {
      fullName: form.fullName.trim(),
      dateOfBirth: form.dateOfBirth,
      gender: form.gender,
      bloodGroup: form.bloodGroup,
      aadhaarNumber: form.governmentId || undefined,
      mobile: form.mobile.trim(),
      email: form.email.trim() || undefined,
      address: form.address.trim() || undefined,
      city: form.city.trim() || undefined,
      state: form.state.trim() || undefined,
      pincode: form.pincode || undefined,
      referringDoctor: form.referringDoctor.trim() || undefined,
      emergencyContact: form.emergencyContact.trim() || undefined,
      conditions: toList(form.conditions),
      allergies: toList(form.allergies),
      consentToTesting: form.consentToTesting,
      consentToDetailsVerification: form.consentToDetailsVerification,
    };

    try {
      if (createPatientAccount) {
        const { patient } = await createOrLinkPatientAccount({
          ...patientPayload,
          password: accountPassword,
        });
        setRegisteredPatient(patient);
        setRegistered(true);
        return;
      }

      const mobileMatches = await listPatients(patientPayload.mobile);
      const existingPatient = mobileMatches.find((patient) => patient.mobile.replace(/\D/g, '') === patientPayload.mobile.replace(/\D/g, ''));
      if (existingPatient && !existingPatient._id) {
        throw new Error('The matched patient profile cannot be updated because it has no database ID.');
      }
      const patient = existingPatient
        ? await updatePatient(existingPatient._id!, patientPayload)
        : await createPatient(patientPayload);

      setRegisteredPatient(patient);
      setRegistered(true);
    } catch (error) {
      setRegistrationError(error instanceof Error ? error.message : 'Unable to register patient. Please try again.');
    }
  };

  const previewPatient = registeredPatient ?? form;

  return (
    <PageContainer>
      <div className="grid gap-6 xl:grid-cols-[1fr_320px]">
        <div className="grid gap-5">
          <StepTracker activeIndex={2} steps={['Identity', 'Medical', 'Consent', 'Register']} />
          <div className="flex border-b border-border" role="tablist" aria-label="Patient registration options">
            <button aria-selected={!accountTab} className={`border-b-2 px-4 py-3 text-sm font-semibold ${!accountTab ? 'border-brand-600 text-brand-700' : 'border-transparent text-ink-muted hover:text-ink'}`} onClick={() => setSearchParams({})} role="tab" type="button">Patient</button>
            <button aria-selected={accountTab} className={`border-b-2 px-4 py-3 text-sm font-semibold ${accountTab ? 'border-brand-600 text-brand-700' : 'border-transparent text-ink-muted hover:text-ink'}`} onClick={() => setSearchParams({ tab: 'account' })} role="tab" type="button">Register Patient Account</button>
          </div>
          <section className="card p-5"><h2 className="mb-3 text-base font-semibold">Find an existing patient</h2><SearchBar aria-label="Search existing patients" onChange={(event) => setExistingPatientSearch(event.target.value)} placeholder="Search name, patient ID, or mobile" value={existingPatientSearch} />{patientSearchError ? <p className="mt-2 text-sm text-danger">{patientSearchError}</p> : null}{existingPatients.length ? <div className="mt-3 grid gap-2">{existingPatients.map((patient) => <button className="rounded-ui border border-border px-3 py-2 text-left text-sm hover:bg-surface-muted" key={patient._id ?? patient.patientId} onClick={() => selectExistingPatient(patient)} type="button"><span className="font-semibold">{patient.fullName}</span><span className="ml-2 text-ink-muted">{patient.patientId} · {patient.mobile}</span></button>)}</div> : existingPatientSearch ? <p className="mt-2 text-sm text-ink-muted">No matching patients.</p> : null}</section>
          <FormSection title="Personal Details" description="Capture verified patient demographics.">
            <Field label="Full Name"><Input value={form.fullName} onChange={(event) => setForm((current) => ({ ...current, fullName: event.target.value }))} /></Field>
            <Field label="Date of Birth"><Input value={form.dateOfBirth} onChange={(event) => setForm((current) => ({ ...current, dateOfBirth: event.target.value }))} type="date" /></Field>
            <Field label="Gender"><Select value={form.gender} onChange={(event) => setForm((current) => ({ ...current, gender: event.target.value as PatientGender }))}><option value="female">Female</option><option value="male">Male</option><option value="other">Other</option></Select></Field>
            <Field label="Blood Group"><Select value={form.bloodGroup} onChange={(event) => setForm((current) => ({ ...current, bloodGroup: event.target.value as BloodGroup }))}><option>A+</option><option>A-</option><option>B+</option><option>B-</option><option>AB+</option><option>AB-</option><option>O+</option><option>O-</option></Select></Field>
          </FormSection>
          <FormSection title="Contact Information">
            <Field label="Mobile Number"><Input value={form.mobile} onChange={(event) => setForm((current) => ({ ...current, mobile: event.target.value }))} /></Field>
            <Field label="Email"><Input value={form.email} onChange={(event) => setForm((current) => ({ ...current, email: event.target.value }))} /></Field>
            <Field label="Address"><Textarea value={form.address} onChange={(event) => setForm((current) => ({ ...current, address: event.target.value }))} /></Field>
            <Field label="City"><Input value={form.city} onChange={(event) => setForm((current) => ({ ...current, city: event.target.value }))} /></Field>
            <Field label="State"><Input value={form.state} onChange={(event) => setForm((current) => ({ ...current, state: event.target.value }))} /></Field>
            <Field label="Pincode"><Input inputMode="numeric" maxLength={6} value={form.pincode} onChange={(event) => setForm((current) => ({ ...current, pincode: event.target.value.replace(/\D/g, '') }))} /></Field>
          </FormSection>
          <FormSection title="Medical History" description="Separate multiple entries with commas.">
            <Field label="Existing Conditions"><Textarea onChange={(event) => setForm((current) => ({ ...current, conditions: event.target.value }))} placeholder="e.g. Diabetes, hypertension" value={form.conditions} /></Field>
            <Field label="Allergies"><Textarea onChange={(event) => setForm((current) => ({ ...current, allergies: event.target.value }))} placeholder="e.g. Penicillin, peanuts" value={form.allergies} /></Field>
          </FormSection>
          <FormSection title="Referral & Identification">
            <Field label="Referring Doctor"><Input value={form.referringDoctor} onChange={(event) => setForm((current) => ({ ...current, referringDoctor: event.target.value }))} /></Field>
            <Field label="Aadhaar ID"><Input inputMode="numeric" maxLength={12} value={form.governmentId} onChange={(event) => setForm((current) => ({ ...current, governmentId: event.target.value.replace(/\D/g, '') }))} /></Field>
            <Field label="Emergency Contact"><Input inputMode="tel" value={form.emergencyContact} onChange={(event) => setForm((current) => ({ ...current, emergencyContact: event.target.value }))} /></Field>
          </FormSection>
          <section className="card p-5">
            <h2 className="text-base font-semibold">Consent</h2>
            <div className="mt-4 grid gap-3 text-sm text-ink-muted">
              <label className="flex items-start gap-3"><Checkbox checked={form.consentToTesting} onChange={(event) => setForm((current) => ({ ...current, consentToTesting: event.target.checked }))} /> Patient consent received for diagnostic testing and digital report delivery.</label>
              <label className="flex items-start gap-3"><Checkbox checked={form.consentToDetailsVerification} onChange={(event) => setForm((current) => ({ ...current, consentToDetailsVerification: event.target.checked }))} /> Emergency contact and referral details verified.</label>
            </div>
          </section>
          {(role === 'Admin' || role === 'Receptionist') && accountTab ? (
            <FormSection title="Patient portal account" description="Create a sign-in account and link it to this patient profile.">
              <Field label="Temporary password"><Input type="password" value={accountPassword} onChange={(event) => setAccountPassword(event.target.value)} /></Field>
            </FormSection>
          ) : null}
        </div>
        <aside className="card h-fit p-5 xl:sticky xl:top-24">
          <div className="flex items-center justify-between"><h2 className="text-base font-semibold">Patient Preview</h2><StatusBadge tone={registered ? 'success' : 'warning'}>{registered ? 'Registered' : 'Draft'}</StatusBadge></div>
          <div className="mt-5 rounded-ui bg-brand-50 p-4"><p className="text-lg font-semibold text-brand-700">{previewPatient.fullName}</p><p className="text-sm text-ink-muted">{displayGender(previewPatient.gender)}, {getAge(previewPatient.dateOfBirth)} years | {previewPatient.bloodGroup ?? 'Not specified'}</p></div>
          <div className="mt-5 grid gap-3 text-sm"><p><span className="text-ink-muted">Patient ID:</span> {registeredPatient?.patientId ?? 'Generated on save'}</p><p><span className="text-ink-muted">City:</span> {previewPatient.city}</p><p><span className="text-ink-muted">Phone:</span> {previewPatient.mobile}</p><p className="flex items-center gap-2 text-success"><CheckCircle2 size={16} /> {registered ? 'Available for booking' : 'Ready for registration'}</p></div>
          <Button className="mt-6 w-full" disabled={registered} icon={<Save size={16} />} onClick={handleRegister}>{registered ? 'Patient Registered' : 'Register Patient'}</Button>
          {registrationError && <p className="mt-3 text-sm text-danger">{registrationError}</p>}
        </aside>
      </div>
    </PageContainer>
  );
}
