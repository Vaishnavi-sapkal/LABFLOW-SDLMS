import { useState, type FormEvent } from 'react';

import { changePassword } from '../../api/auth';
import { Button } from '../ui/Button';
import { Field } from '../ui/FormSection';
import { Input } from '../ui/Input';
import { Modal } from '../ui/Modal';

export function ChangePasswordModal({ onClose }: { onClose: () => void }) {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError('');
    setMessage('');

    if (!currentPassword) {
      setError('Current password is required.');
      return;
    }
    if (newPassword.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }
    if (newPassword !== confirmNewPassword) {
      setError('New password and confirmation do not match');
      return;
    }

    setLoading(true);
    try {
      const response = await changePassword({ currentPassword, newPassword, confirmNewPassword });
      setMessage(response.message);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmNewPassword('');
    } catch (changeError) {
      const fallback = 'Unable to update your password.';
      const messageText = changeError instanceof Error ? changeError.message : fallback;
      setError(messageText === 'Current password is incorrect' ? 'Current password is incorrect' : messageText);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal title="Change Password" onClose={onClose}>
      <form className="grid gap-4 p-5" onSubmit={handleSubmit}>
        {error ? <div className="border border-[#f1caca] bg-[#fff5f5] px-4 py-3 text-sm text-[#c24141]" role="alert">{error}</div> : null}
        {message ? <div className="border border-[#b9dec9] bg-[#f2fbf5] px-4 py-3 text-sm text-[#287a45]">{message}</div> : null}
        <Field label="Current Password">
          <Input autoComplete="current-password" type="password" value={currentPassword} onChange={(event) => setCurrentPassword(event.target.value)} />
        </Field>
        <Field label="New Password">
          <Input autoComplete="new-password" minLength={6} type="password" value={newPassword} onChange={(event) => setNewPassword(event.target.value)} />
        </Field>
        <Field label="Confirm New Password">
          <Input autoComplete="new-password" minLength={6} type="password" value={confirmNewPassword} onChange={(event) => setConfirmNewPassword(event.target.value)} />
        </Field>
        <div className="flex justify-end gap-2">
          <Button disabled={loading} type="submit">{loading ? 'Updating...' : 'Update Password'}</Button>
          <Button type="button" variant="secondary" onClick={onClose}>Close</Button>
        </div>
      </form>
    </Modal>
  );
}
