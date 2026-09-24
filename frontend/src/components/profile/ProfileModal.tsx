import { useEffect, useMemo, useState, type FormEvent, type ReactNode } from 'react';

import { getMyProfile, updateMyProfile, type AuthenticatedUser } from '../../api/auth';
import { getMyDoctor, updateMyDoctorProfile, type DoctorDocument } from '../../api/doctors';
import {
  getMyPatientProfile,
  updateMyPatientProfile,
  type BloodGroup,
  type CreatedPatient,
  type CreatePatientDto,
  type PatientGender,
} from '../../api/patients';
import { useAuth } from '../../app/AuthContext';
import { Button } from '../ui/Button';
import { Field } from '../ui/FormSection';
import { Input, Select, Textarea } from '../ui/Input';
import { Modal } from '../ui/Modal';

type ProfileMode = 'view' | 'edit';

type PatientForm = {
  fullName: string;
  dateOfBirth: string;
  gender: PatientGender;
  bloodGroup: '' | BloodGroup;
  aadhaarNumber: string;
  mobile: string;
  email: string;
  address: string;
  city: string;
  state: string;
  pincode: string;
  referringDoctor: string;
  emergencyContact: string;
  conditions: string;
  allergies: string;
};

type DoctorForm = {
  specialization: string;
  qualification: string;
  registrationNumber: string;
  mobile: string;
};

const emptyPatientForm: PatientForm = {
  fullName: '',
  dateOfBirth: '',
  gender: 'female',
  bloodGroup: '',
  aadhaarNumber: '',
  mobile: '',
  email: '',
  address: '',
  city: '',
  state: '',
  pincode: '',
  referringDoctor: '',
  emergencyContact: '',
  conditions: '',
  allergies: '',
};

const emptyDoctorForm: DoctorForm = {
  specialization: '',
  qualification: '',
  registrationNumber: '',
  mobile: '',
};

export function ProfileModal({ initialMode, onClose }: { initialMode: ProfileMode; onClose: () => void }) {
  const { role, refreshUser } = useAuth();
  const [mode, setMode] = useState<ProfileMode>(initialMode);
  const [profile, setProfile] = useState<AuthenticatedUser | null>(null);
  const [patient, setPatient] = useState<CreatedPatient | null>(null);
  const [doctor, setDoctor] = useState<DoctorDocument | null>(null);
  const [name, setName] = useState('');
  const [patientForm, setPatientForm] = useState<PatientForm>(emptyPatientForm);
  const [initialPatientForm, setInitialPatientForm] = useState<PatientForm>(emptyPatientForm);
  const [doctorForm, setDoctorForm] = useState<DoctorForm>(emptyDoctorForm);
  const [initialDoctorForm, setInitialDoctorForm] = useState<DoctorForm>(emptyDoctorForm);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  const isPatient = role === 'Patient';
  const isDoctor = role === 'Doctor';

  useEffect(() => {
    let active = true;

    const loadProfile = async () => {
      setLoading(true);
      setError('');
      setMessage('');
      try {
        const authProfile = await getMyProfile();
        const patientProfile = isPatient ? await getMyPatientProfile() : null;
        const doctorProfile = isDoctor ? await getMyDoctor() : null;
        if (!active) return;

        setProfile(authProfile);
        setName(authProfile.name);
        setPatient(patientProfile);
        setDoctor(doctorProfile);

        if (patientProfile) {
          const nextPatientForm = toPatientForm(patientProfile);
          setPatientForm(nextPatientForm);
          setInitialPatientForm(nextPatientForm);
        }
        if (doctorProfile) {
          const nextDoctorForm = toDoctorForm(doctorProfile);
          setDoctorForm(nextDoctorForm);
          setInitialDoctorForm(nextDoctorForm);
        }
      } catch (loadError) {
        if (active) setError(loadError instanceof Error ? loadError.message : 'Unable to load your profile.');
      } finally {
        if (active) setLoading(false);
      }
    };

    void loadProfile();

    return () => {
      active = false;
    };
  }, [isDoctor, isPatient]);

  const title = useMemo(() => (mode === 'view' ? 'View Profile' : 'Edit Profile'), [mode]);

  const updatePatientField = <K extends keyof PatientForm>(key: K, value: PatientForm[K]) => {
    setPatientForm((current) => ({ ...current, [key]: value }));
  };

  const updateDoctorField = <K extends keyof DoctorForm>(key: K, value: DoctorForm[K]) => {
    setDoctorForm((current) => ({ ...current, [key]: value }));
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError('');
    setMessage('');

    if (!name.trim()) {
      setError('Name is required.');
      return;
    }

    if (isPatient) {
      const validationError = validatePatientForm(patientForm);
      if (validationError) {
        setError(validationError);
        return;
      }
    }
    if (isDoctor) {
      const validationError = validateDoctorForm(doctorForm);
      if (validationError) {
        setError(validationError);
        return;
      }
    }

    setSaving(true);
    try {
      if (name.trim() !== profile?.name) {
        await updateMyProfile({ name: name.trim() });
      }
      if (isPatient && patient) {
        const changedPatientFields = getChangedPatientFields(initialPatientForm, patientForm);
        if (Object.keys(changedPatientFields).length > 0) {
          const updatedPatient = await updateMyPatientProfile(changedPatientFields);
          setPatient(updatedPatient);
          const nextPatientForm = toPatientForm(updatedPatient);
          setPatientForm(nextPatientForm);
          setInitialPatientForm(nextPatientForm);
        }
      }
      if (isDoctor && doctor) {
        const changedDoctorFields = getChangedDoctorFields(initialDoctorForm, doctorForm);
        if (Object.keys(changedDoctorFields).length > 0) {
          const updatedDoctor = await updateMyDoctorProfile(changedDoctorFields);
          setDoctor(updatedDoctor);
          const nextDoctorForm = toDoctorForm(updatedDoctor);
          setDoctorForm(nextDoctorForm);
          setInitialDoctorForm(nextDoctorForm);
        }
      }

      const refreshedProfile = await refreshUser();
      setProfile(refreshedProfile);
      setName(refreshedProfile.name);
      setMessage('Profile updated successfully.');
      setMode('view');
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'Unable to update your profile.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal title={title} onClose={onClose}>
      {loading ? (
        <div className="grid gap-3 p-5">
          <div className="h-10 animate-pulse rounded-ui bg-slate-200" />
          <div className="h-10 animate-pulse rounded-ui bg-slate-200" />
          <div className="h-24 animate-pulse rounded-ui bg-slate-200" />
        </div>
      ) : (
        <form className="max-h-[78vh] overflow-y-auto p-5" onSubmit={handleSubmit}>
          {error ? <div className="mb-4 border border-[#f1caca] bg-[#fff5f5] px-4 py-3 text-sm text-[#c24141]" role="alert">{error}</div> : null}
          {message ? <div className="mb-4 border border-[#b9dec9] bg-[#f2fbf5] px-4 py-3 text-sm text-[#287a45]">{message}</div> : null}

          <ProfileSection title="Account Information">
            <ProfileField label="Full Name" mode={mode} value={name} edit={<Input value={name} onChange={(event) => setName(event.target.value)} required />} />
            <ProfileField label="Email" mode="view" value={profile?.email} />
            <ProfileField label="Role" mode="view" value={role} />
            <ProfileField label="Account Status" mode="view" value={profile?.isActive ? 'Active' : 'Inactive'} />
            <ProfileField label="Email Verification Status" mode="view" value={formatOptionalBoolean(profile?.emailVerified)} />
            <ProfileField label="Created Date" mode="view" value={formatOptionalDate(profile?.createdAt)} />
            <ProfileField label="Updated Date" mode="view" value={formatOptionalDate(profile?.updatedAt)} />
          </ProfileSection>

          {isPatient && patient ? (
            <>
              <ProfileSection title="Personal Details">
                <ProfileField label="Patient ID" mode="view" value={patient.patientId} />
                <ProfileField label="Full Name" mode={mode} value={patientForm.fullName} edit={<Input value={patientForm.fullName} onChange={(event) => updatePatientField('fullName', event.target.value)} required />} />
                <ProfileField label="Date of Birth" mode={mode} value={formatOptionalDateOnly(patientForm.dateOfBirth)} edit={<Input type="date" value={patientForm.dateOfBirth} onChange={(event) => updatePatientField('dateOfBirth', event.target.value)} required />} />
                <ProfileField label="Gender" mode={mode} value={displayOption(patientForm.gender)} edit={<Select value={patientForm.gender} onChange={(event) => updatePatientField('gender', event.target.value as PatientGender)}><option value="female">Female</option><option value="male">Male</option><option value="other">Other</option></Select>} />
                <ProfileField label="Blood Group" mode={mode} value={patientForm.bloodGroup} edit={<Select value={patientForm.bloodGroup} onChange={(event) => updatePatientField('bloodGroup', event.target.value as '' | BloodGroup)}><option value="">Not provided</option><option>A+</option><option>A-</option><option>B+</option><option>B-</option><option>AB+</option><option>AB-</option><option>O+</option><option>O-</option></Select>} />
              </ProfileSection>
              <ProfileSection title="Contact Information">
                <ProfileField label="Mobile Number" mode={mode} value={patientForm.mobile} edit={<Input type="tel" value={patientForm.mobile} onChange={(event) => updatePatientField('mobile', event.target.value)} required />} />
                <ProfileField label="Patient Email" mode="view" value={patientForm.email} />
                <ProfileField label="Address" mode={mode} value={patientForm.address} edit={<Textarea value={patientForm.address} onChange={(event) => updatePatientField('address', event.target.value)} />} />
                <ProfileField label="City" mode={mode} value={patientForm.city} edit={<Input value={patientForm.city} onChange={(event) => updatePatientField('city', event.target.value)} />} />
                <ProfileField label="State" mode={mode} value={patientForm.state} edit={<Input value={patientForm.state} onChange={(event) => updatePatientField('state', event.target.value)} />} />
                <ProfileField label="Pincode" mode={mode} value={patientForm.pincode} edit={<Input inputMode="numeric" maxLength={6} value={patientForm.pincode} onChange={(event) => updatePatientField('pincode', event.target.value.replace(/\D/g, ''))} />} />
              </ProfileSection>
              <ProfileSection title="Medical History">
                <ProfileField label="Conditions" mode={mode} value={patientForm.conditions} edit={<Textarea value={patientForm.conditions} onChange={(event) => updatePatientField('conditions', event.target.value)} />} />
                <ProfileField label="Allergies" mode={mode} value={patientForm.allergies} edit={<Textarea value={patientForm.allergies} onChange={(event) => updatePatientField('allergies', event.target.value)} />} />
              </ProfileSection>
              <ProfileSection title="Referral & Identification">
                <ProfileField label="Referring Doctor" mode={mode} value={patientForm.referringDoctor} edit={<Input value={patientForm.referringDoctor} onChange={(event) => updatePatientField('referringDoctor', event.target.value)} />} />
                <ProfileField label="Aadhaar ID" mode={mode} value={patientForm.aadhaarNumber} edit={<Input inputMode="numeric" maxLength={12} value={patientForm.aadhaarNumber} onChange={(event) => updatePatientField('aadhaarNumber', event.target.value.replace(/\D/g, ''))} />} />
                <ProfileField label="Emergency Contact" mode={mode} value={patientForm.emergencyContact} edit={<Input inputMode="tel" type="tel" value={patientForm.emergencyContact} onChange={(event) => updatePatientField('emergencyContact', event.target.value)} />} />
              </ProfileSection>
            </>
          ) : null}

          {isDoctor && doctor ? (
            <ProfileSection title="Professional Details">
              <ProfileField label="Full Name" mode="view" value={profile?.name} />
              <ProfileField label="Specialization" mode={mode} value={doctorForm.specialization} edit={<Input value={doctorForm.specialization} onChange={(event) => updateDoctorField('specialization', event.target.value)} />} />
              <ProfileField label="Qualification" mode={mode} value={doctorForm.qualification} edit={<Input value={doctorForm.qualification} onChange={(event) => updateDoctorField('qualification', event.target.value)} />} />
              <ProfileField label="Registration Number" mode={mode} value={doctorForm.registrationNumber} edit={<Input value={doctorForm.registrationNumber} onChange={(event) => updateDoctorField('registrationNumber', event.target.value)} />} />
              <ProfileField label="Mobile Number" mode={mode} value={doctorForm.mobile} edit={<Input type="tel" value={doctorForm.mobile} onChange={(event) => updateDoctorField('mobile', event.target.value)} />} />
              <ProfileField label="Doctor ID" mode="view" value={doctor.doctorId} />
            </ProfileSection>
          ) : null}

          <div className="mt-5 flex justify-end gap-2">
            {mode === 'view' ? <Button type="button" onClick={() => setMode('edit')}>Edit</Button> : <Button disabled={saving} type="submit">{saving ? 'Saving...' : 'Save'}</Button>}
            <Button type="button" variant="secondary" onClick={onClose}>Close</Button>
          </div>
        </form>
      )}
    </Modal>
  );
}

function toPatientForm(patient: CreatedPatient): PatientForm {
  return {
    fullName: patient.fullName ?? '',
    dateOfBirth: patient.dateOfBirth ? patient.dateOfBirth.slice(0, 10) : '',
    gender: patient.gender ?? 'female',
    bloodGroup: patient.bloodGroup ?? '',
    aadhaarNumber: patient.aadhaarNumber ?? '',
    mobile: patient.mobile ?? '',
    email: patient.email ?? '',
    address: patient.address ?? '',
    city: patient.city ?? '',
    state: patient.state ?? '',
    pincode: patient.pincode ?? '',
    referringDoctor: patient.referringDoctor ?? '',
    emergencyContact: patient.emergencyContact ?? '',
    conditions: (patient.conditions ?? []).join(', '),
    allergies: (patient.allergies ?? []).join(', '),
  };
}

function toDoctorForm(doctor: DoctorDocument): DoctorForm {
  return {
    specialization: doctor.specialization ?? '',
    qualification: doctor.qualification ?? '',
    registrationNumber: doctor.registrationNumber ?? '',
    mobile: doctor.mobile ?? '',
  };
}

function getChangedPatientFields(initial: PatientForm, current: PatientForm): Partial<CreatePatientDto> {
  const next: Partial<CreatePatientDto> = {};
  const setIfChanged = <K extends keyof PatientForm>(key: K, value: PatientForm[K]) => {
    if (value !== initial[key]) {
      (next as Record<string, unknown>)[key] = value || undefined;
    }
  };

  setIfChanged('fullName', current.fullName.trim());
  setIfChanged('dateOfBirth', current.dateOfBirth);
  setIfChanged('gender', current.gender);
  setIfChanged('bloodGroup', current.bloodGroup);
  setIfChanged('aadhaarNumber', current.aadhaarNumber);
  setIfChanged('mobile', current.mobile.trim());
  setIfChanged('address', current.address.trim());
  setIfChanged('city', current.city.trim());
  setIfChanged('state', current.state.trim());
  setIfChanged('pincode', current.pincode);
  setIfChanged('referringDoctor', current.referringDoctor.trim());
  setIfChanged('emergencyContact', current.emergencyContact.trim());

  const conditions = toList(current.conditions);
  if (current.conditions !== initial.conditions) next.conditions = conditions;
  const allergies = toList(current.allergies);
  if (current.allergies !== initial.allergies) next.allergies = allergies;

  return next;
}

function getChangedDoctorFields(initial: DoctorForm, current: DoctorForm) {
  const next: Partial<DoctorForm> = {};
  const setIfChanged = <K extends keyof DoctorForm>(key: K, value: DoctorForm[K]) => {
    if (value !== initial[key]) {
      (next as Record<string, string | undefined>)[key] = value || undefined;
    }
  };

  setIfChanged('specialization', current.specialization.trim());
  setIfChanged('qualification', current.qualification.trim());
  setIfChanged('registrationNumber', current.registrationNumber.trim());
  setIfChanged('mobile', current.mobile.trim());

  return next;
}

function validatePatientForm(form: PatientForm) {
  if (!form.fullName.trim() || !form.dateOfBirth || Number.isNaN(new Date(form.dateOfBirth).getTime())) return 'Full name and a valid date of birth are required.';
  if (!/^\+?[1-9]\d{7,14}$/.test(form.mobile.trim())) return 'mobile must be a valid phone number';
  if (form.aadhaarNumber && !/^\d{12}$/.test(form.aadhaarNumber)) return 'aadhaarNumber must be exactly 12 digits';
  if (form.pincode && !/^\d{6}$/.test(form.pincode)) return 'pincode must be exactly 6 digits';
  if (form.emergencyContact && !/^\+?[1-9]\d{7,14}$/.test(form.emergencyContact.trim())) return 'emergencyContact must be a valid phone number';
  return '';
}

function validateDoctorForm(form: DoctorForm) {
  if (form.mobile && !/^\+?[1-9]\d{7,14}$/.test(form.mobile.trim())) return 'mobile must be a valid phone number';
  return '';
}

function toList(value: string) {
  return value.split(',').map((item) => item.trim()).filter(Boolean);
}

function formatOptionalBoolean(value: boolean | undefined) {
  if (typeof value !== 'boolean') return 'Not provided';
  return value ? 'Verified' : 'Not verified';
}

function formatOptionalDate(value: string | undefined) {
  if (!value) return 'Not provided';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Not provided';
  return date.toLocaleString();
}

function formatOptionalDateOnly(value: string | undefined) {
  if (!value) return 'Not provided';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Not provided';
  return date.toLocaleDateString();
}

function displayOption(value: string | undefined) {
  if (!value) return 'Not provided';
  return `${value.charAt(0).toUpperCase()}${value.slice(1)}`;
}

function displayValue(value: string | undefined | null) {
  return value && value.trim() ? value : 'Not provided';
}

function ProfileSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="mt-5 rounded-card border border-border bg-white p-4 first:mt-0">
      <h3 className="mb-4 text-sm font-semibold text-ink">{title}</h3>
      <div className="grid gap-4 sm:grid-cols-2">{children}</div>
    </section>
  );
}

function ProfileField({ label, mode, value, edit }: { label: string; mode: ProfileMode; value?: string | null; edit?: ReactNode }) {
  if (mode === 'edit' && edit) {
    return <Field label={label}>{edit}</Field>;
  }

  return (
    <div className="grid gap-1.5 text-xs font-medium text-ink-muted">
      <span>{label}</span>
      <div className="min-h-10 rounded-ui border border-border bg-surface-muted px-3 py-2 text-sm font-medium text-ink">
        {displayValue(value)}
      </div>
    </div>
  );
}
