import { useEffect, useState } from 'react';
import { Trash2, UserPlus } from 'lucide-react';
import { deleteAccount, listAccounts, registerAccount, type AccountRole, type AccountSummary } from '../api/auth';
import { createDoctor, listDoctors, updateDoctor, type DoctorDocument } from '../api/doctors';
import { createOrLinkPatientAccount } from '../api/patientAccountProvisioning';
import type { BloodGroup, PatientGender } from '../api/patients';
import { Button } from '../components/ui/Button';
import { Field, FormSection } from '../components/ui/FormSection';
import { Input, Select } from '../components/ui/Input';
import { PageContainer } from '../components/layout/PageContainer';
import { useAuth } from '../app/AuthContext';

const roles: Array<{ value: AccountRole; label: string }> = [
  { value: 'admin', label: 'Administrator' },
  { value: 'doctor', label: 'Doctor' },
  { value: 'receptionist', label: 'Receptionist' },
  { value: 'technician', label: 'Lab Technician' },
  { value: 'patient', label: 'Patient' },
];

const emptyForm = {
  name: '', email: '', password: '', role: 'doctor' as AccountRole,
  mobile: '', specialization: '', qualification: '', registrationNumber: '',
  dateOfBirth: '', gender: 'female' as PatientGender, bloodGroup: 'O+' as BloodGroup, city: '',
};

function normalizeMobile(value?: string) {
  return value?.replace(/\D/g, '') ?? '';
}

function isValidMobile(value: string) {
  return /^\+?[1-9]\d{7,14}$/.test(value.trim());
}

export function AccountManagement() {
  const { user } = useAuth();
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [accounts, setAccounts] = useState<AccountSummary[]>([]);
  const [accountsLoading, setAccountsLoading] = useState(true);
  const [accountsError, setAccountsError] = useState('');
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const loadAccounts = async () => {
    setAccountsLoading(true);
    setAccountsError('');
    try {
      setAccounts(await listAccounts());
    } catch (loadError) {
      setAccountsError(loadError instanceof Error ? loadError.message : 'Unable to load accounts.');
    } finally {
      setAccountsLoading(false);
    }
  };

  useEffect(() => { void loadAccounts(); }, []);

  const createAccount = async () => {
    if (saving) return;
    if (form.role === 'doctor' && (!isValidMobile(form.mobile) || !form.specialization.trim() || !form.qualification.trim())) {
      setError('A valid mobile number, specialization, and qualification are required for a doctor account.');
      return;
    }
    if (form.role === 'patient' && (!isValidMobile(form.mobile) || !form.dateOfBirth)) {
      setError('A valid mobile number and date of birth are required for a patient account.');
      return;
    }
    setSaving(true);
    setError('');
    setMessage('');
    try {
      if (form.role === 'patient') {
        const { patient } = await createOrLinkPatientAccount({
          fullName: form.name, email: form.email, password: form.password, mobile: form.mobile,
          dateOfBirth: form.dateOfBirth, gender: form.gender, bloodGroup: form.bloodGroup, city: form.city || undefined,
          consentToTesting: true, consentToDetailsVerification: true,
          rollbackAccount: deleteAccount,
        });
        setMessage(`${patient.fullName}'s patient account was created and linked to ${patient.patientId}.`);
        setForm(emptyForm);
        await loadAccounts();
        return;
      }

      let matchingDoctor: DoctorDocument | undefined;
      if (form.role === 'doctor') {
        const [emailMatches, mobileMatches] = await Promise.all([listDoctors(form.email), listDoctors(form.mobile)]);
        const matches = [...emailMatches, ...mobileMatches].filter((doctor, index, doctors) =>
          doctors.findIndex((candidate) => candidate._id === doctor._id) === index &&
          (doctor.email?.toLowerCase() === form.email.trim().toLowerCase() || normalizeMobile(doctor.mobile) === normalizeMobile(form.mobile)),
        );
        if (matches.length > 1) throw new Error('More than one doctor profile matches this email or mobile number. Resolve the duplicate profiles before creating this account.');
        matchingDoctor = matches[0];
        if (matchingDoctor?.userId) throw new Error('The matching doctor profile is already linked to a user account.');
      }

      const user = await registerAccount({ name: form.name, email: form.email, password: form.password, role: form.role });
      if (form.role === 'doctor') {
        try {
          if (matchingDoctor) {
            await updateDoctor(matchingDoctor._id, { userId: user.id, isActive: true });
          } else {
            await createDoctor({ fullName: form.name, email: form.email, mobile: form.mobile, specialization: form.specialization, qualification: form.qualification, registrationNumber: form.registrationNumber || undefined, userId: user.id, isActive: true });
          }
        } catch (profileError) {
          // Do not leave an Admin-created doctor login without a usable profile.
          try {
            await deleteAccount(user.id);
          } catch {
            throw new Error('The doctor profile could not be created and the new login could not be rolled back. Delete the account from the list before retrying.');
          }
          throw profileError;
        }
      }
      setMessage(`${user.name}'s ${roles.find((role) => role.value === user.role)?.label ?? user.role} account was created.`);
      setForm(emptyForm);
      await loadAccounts();
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Unable to create the account.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (account: AccountSummary) => {
    const doctorWarning = account.role === 'doctor'
      ? "This will deactivate the doctor's profile and remove their login."
      : 'This will permanently delete this account.';
    if (!window.confirm(`${doctorWarning}\n\nDelete ${account.name} (${account.email})?`)) return;

    setDeletingId(account.id);
    setAccountsError('');
    try {
      await deleteAccount(account.id);
      await loadAccounts();
    } catch (deleteError) {
      setAccountsError(deleteError instanceof Error ? deleteError.message : 'Unable to delete the account.');
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <PageContainer>
      <div className="mx-auto max-w-2xl">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-ink">Create Account</h1>
          <p className="mt-1 text-sm text-ink-muted">Add staff or patient access. Account roles are enforced by the server.</p>
        </div>
        <FormSection title="Account details" description="The user can sign in with the email address and password entered here.">
          <Field label="Full name"><Input value={form.name} onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))} /></Field>
          <Field label="Email address"><Input type="email" value={form.email} onChange={(event) => setForm((current) => ({ ...current, email: event.target.value }))} /></Field>
          <Field label="Temporary password"><Input type="password" value={form.password} onChange={(event) => setForm((current) => ({ ...current, password: event.target.value }))} /></Field>
          <Field label="Role"><Select value={form.role} onChange={(event) => setForm((current) => ({ ...current, role: event.target.value as AccountRole }))}>{roles.map((role) => <option key={role.value} value={role.value}>{role.label}</option>)}</Select></Field>
          {form.role === 'doctor' ? <FormSection title="Doctor profile" description="A profile is created or linked by matching email or mobile number.">
            <Field label="Mobile number"><Input required value={form.mobile} onChange={(event) => setForm((current) => ({ ...current, mobile: event.target.value }))} /></Field>
            <Field label="Specialization"><Input required value={form.specialization} onChange={(event) => setForm((current) => ({ ...current, specialization: event.target.value }))} /></Field>
            <Field label="Qualification"><Input required value={form.qualification} onChange={(event) => setForm((current) => ({ ...current, qualification: event.target.value }))} /></Field>
            <Field label="Registration number"><Input value={form.registrationNumber} onChange={(event) => setForm((current) => ({ ...current, registrationNumber: event.target.value }))} /></Field>
          </FormSection> : null}
          {form.role === 'patient' ? <FormSection title="Patient profile" description="A profile is created for the new patient account.">
            <Field label="Mobile number"><Input required value={form.mobile} onChange={(event) => setForm((current) => ({ ...current, mobile: event.target.value }))} /></Field>
            <Field label="Date of birth"><Input required type="date" value={form.dateOfBirth} onChange={(event) => setForm((current) => ({ ...current, dateOfBirth: event.target.value }))} /></Field>
            <Field label="Gender"><Select value={form.gender} onChange={(event) => setForm((current) => ({ ...current, gender: event.target.value as PatientGender }))}><option value="female">Female</option><option value="male">Male</option><option value="other">Other</option></Select></Field>
            <Field label="Blood group"><Select value={form.bloodGroup} onChange={(event) => setForm((current) => ({ ...current, bloodGroup: event.target.value as BloodGroup }))}>{(['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'] as BloodGroup[]).map((group) => <option key={group} value={group}>{group}</option>)}</Select></Field>
            <Field label="City"><Input value={form.city} onChange={(event) => setForm((current) => ({ ...current, city: event.target.value }))} /></Field>
          </FormSection> : null}
          {message ? <p className="text-sm text-success">{message}</p> : null}
          {error ? <p className="text-sm text-danger" role="alert">{error}</p> : null}
          <Button disabled={saving || !form.name || !form.email || !form.password} icon={<UserPlus size={16} />} onClick={createAccount}>{saving ? 'Creating account…' : 'Create Account'}</Button>
        </FormSection>
        <section className="mt-6 card p-5">
          <div className="mb-4"><h2 className="text-base font-semibold text-ink">Existing accounts</h2><p className="mt-1 text-sm text-ink-muted">Delete access that is no longer needed. Doctor profiles are deactivated to preserve clinical history.</p></div>
          {accountsError ? <p className="mb-3 text-sm text-danger" role="alert">{accountsError}</p> : null}
          {accountsLoading ? <p className="py-4 text-sm text-ink-muted">Loading accounts...</p> : <div className="overflow-x-auto"><table className="w-full text-left text-sm"><thead className="border-b border-border text-xs text-ink-muted"><tr><th className="px-2 py-2">Name</th><th className="px-2 py-2">Email</th><th className="px-2 py-2">Role</th><th className="px-2 py-2">Status</th><th className="px-2 py-2">Action</th></tr></thead><tbody>{accounts.map((account) => <tr className="border-b border-border last:border-0" key={account.id}><td className="px-2 py-3 font-medium text-ink">{account.name}</td><td className="px-2 py-3 text-ink-muted">{account.email}</td><td className="px-2 py-3 capitalize text-ink-muted">{account.role}</td><td className="px-2 py-3"><span className={account.isActive ? 'text-success' : 'text-ink-muted'}>{account.isActive ? 'Active' : 'Inactive'}</span></td><td className="px-2 py-3"><Button disabled={deletingId === account.id || account.id === user?.id} icon={<Trash2 size={14} />} onClick={() => void handleDelete(account)} size="sm" type="button" variant="danger-outline">{deletingId === account.id ? 'Deleting...' : account.id === user?.id ? 'Current account' : 'Delete'}</Button></td></tr>)}{!accounts.length ? <tr><td className="px-2 py-5 text-center text-ink-muted" colSpan={5}>No accounts found.</td></tr> : null}</tbody></table></div>}
        </section>
      </div>
    </PageContainer>
  );
}
