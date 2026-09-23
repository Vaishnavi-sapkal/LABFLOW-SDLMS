import { useEffect, useState, type FormEvent } from 'react';
import { FormField } from '@labflow/ui/forms/FormField';
import { changeMyPassword, updateMyAccount } from '../../api/auth';
import { updateMyPatientProfile } from '../../api/patients';
import { useAuth } from '../../app/AuthContext';
import { Modal } from '../ui/Modal';

const phonePattern = /^\+?[1-9]\d{7,14}$/;

type ProfileModalMode = 'view' | 'edit' | 'password';

export function ProfileModal({ mode, onClose }: { mode: ProfileModalMode; onClose: () => void }) {
  const { role, user, updateUser } = useAuth();
  const [name, setName] = useState(user?.name ?? '');
  const [mobile, setMobile] = useState(user?.mobile ?? '');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [saving, setSaving] = useState(false);
  const [apiError, setApiError] = useState('');
  const [success, setSuccess] = useState('');
  const [fieldErrors, setFieldErrors] = useState<{ name?: string; mobile?: string; currentPassword?: string; newPassword?: string }>({});

  useEffect(() => {
    setName(user?.name ?? '');
    setMobile(user?.mobile ?? '');
  }, [user?.name, user?.mobile]);

  const title = mode === 'view'
    ? 'Profile'
    : mode === 'edit'
      ? 'Edit Profile'
      : 'Change Password';

  const submitProfile = async (event: FormEvent) => {
    event.preventDefault();
    setApiError('');
    setSuccess('');

    const nextErrors: typeof fieldErrors = {};
    if (!name.trim()) nextErrors.name = 'Name is required.';
    if (mobile.trim() && !phonePattern.test(mobile.trim())) nextErrors.mobile = 'Enter a valid mobile number.';
    setFieldErrors(nextErrors);
    if (Object.keys(nextErrors).length) return;

    setSaving(true);
    try {
      if (role === 'Patient') {
        const patient = await updateMyPatientProfile({
          fullName: name.trim(),
          mobile: mobile.trim() || undefined,
        });
        updateUser({ name: patient.fullName, mobile: patient.mobile });
      } else {
        const account = await updateMyAccount({
          name: name.trim(),
          mobile: mobile.trim() || undefined,
        });
        updateUser({ name: account.name, mobile: account.mobile });
      }
      setSuccess('Profile updated successfully.');
    } catch (error) {
      setApiError(error instanceof Error ? error.message : 'Unable to update your profile. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const submitPassword = async (event: FormEvent) => {
    event.preventDefault();
    setApiError('');
    setSuccess('');

    const nextErrors: typeof fieldErrors = {};
    if (!currentPassword) nextErrors.currentPassword = 'Current password is required.';
    if (newPassword.length < 6) nextErrors.newPassword = 'New password must be at least 6 characters.';
    setFieldErrors(nextErrors);
    if (Object.keys(nextErrors).length) return;

    setSaving(true);
    try {
      const response = await changeMyPassword({ currentPassword, newPassword });
      setCurrentPassword('');
      setNewPassword('');
      setSuccess(response.message);
    } catch (error) {
      setApiError(error instanceof Error ? error.message : 'Unable to change your password. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  if (!user) return null;

  return (
    <Modal onClose={onClose} title={title}>
      {mode === 'view' ? (
        <div className="grid gap-4 px-5 py-5 text-sm">
          <div>
            <p className="text-xs font-semibold uppercase text-ink-muted">Name</p>
            <p className="mt-1 font-semibold text-ink">{user.name}</p>
          </div>
          <div>
            <p className="text-xs font-semibold uppercase text-ink-muted">Email</p>
            <p className="mt-1 text-ink">{user.email}</p>
          </div>
          <div>
            <p className="text-xs font-semibold uppercase text-ink-muted">Mobile</p>
            <p className="mt-1 text-ink">{user.mobile || 'Not provided'}</p>
          </div>
          <div>
            <p className="text-xs font-semibold uppercase text-ink-muted">Role</p>
            <p className="mt-1 text-ink">{role}</p>
          </div>
          <div className="flex justify-end border-t border-border pt-4">
            <button className="rounded-ui bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700" onClick={onClose} type="button">Close</button>
          </div>
        </div>
      ) : null}

      {mode === 'edit' ? (
        <form className="grid gap-4 px-5 py-5" onSubmit={submitProfile}>
          {apiError ? <div className="rounded-ui border border-danger/30 bg-danger/5 px-3 py-2 text-sm text-danger" role="alert">{apiError}</div> : null}
          {success ? <div className="rounded-ui border border-success/30 bg-success/5 px-3 py-2 text-sm text-success" role="status">{success}</div> : null}
          <FormField label="Name" hint={fieldErrors.name}>
            <input className="focus-ring h-10 rounded-ui border border-border bg-white px-3 text-sm text-ink" value={name} onChange={(event) => setName(event.target.value)} />
          </FormField>
          <FormField label="Mobile number" hint={fieldErrors.mobile}>
            <input className="focus-ring h-10 rounded-ui border border-border bg-white px-3 text-sm text-ink" inputMode="tel" value={mobile} onChange={(event) => setMobile(event.target.value)} />
          </FormField>
          <div className="grid gap-1.5 text-sm font-medium text-ink">
            <span>Email</span>
            <input className="h-10 rounded-ui border border-border bg-surface-muted px-3 text-sm text-ink-muted" disabled value={user.email} />
          </div>
          <div className="flex justify-end gap-2 border-t border-border pt-4">
            <button className="rounded-ui border border-border px-4 py-2 text-sm font-semibold text-ink hover:bg-surface-muted" disabled={saving} onClick={onClose} type="button">Cancel</button>
            <button className="rounded-ui bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-60" disabled={saving} type="submit">{saving ? 'Saving...' : 'Save'}</button>
          </div>
        </form>
      ) : null}

      {mode === 'password' ? (
        <form className="grid gap-4 px-5 py-5" onSubmit={submitPassword}>
          {apiError ? <div className="rounded-ui border border-danger/30 bg-danger/5 px-3 py-2 text-sm text-danger" role="alert">{apiError}</div> : null}
          {success ? <div className="rounded-ui border border-success/30 bg-success/5 px-3 py-2 text-sm text-success" role="status">{success}</div> : null}
          <FormField label="Current password" hint={fieldErrors.currentPassword}>
            <input className="focus-ring h-10 rounded-ui border border-border bg-white px-3 text-sm text-ink" type="password" value={currentPassword} onChange={(event) => setCurrentPassword(event.target.value)} />
          </FormField>
          <FormField label="New password" hint={fieldErrors.newPassword}>
            <input className="focus-ring h-10 rounded-ui border border-border bg-white px-3 text-sm text-ink" minLength={6} type="password" value={newPassword} onChange={(event) => setNewPassword(event.target.value)} />
          </FormField>
          <div className="flex justify-end gap-2 border-t border-border pt-4">
            <button className="rounded-ui border border-border px-4 py-2 text-sm font-semibold text-ink hover:bg-surface-muted" disabled={saving} onClick={onClose} type="button">Cancel</button>
            <button className="rounded-ui bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-60" disabled={saving} type="submit">{saving ? 'Saving...' : 'Save'}</button>
          </div>
        </form>
      ) : null}
    </Modal>
  );
}
