import { useEffect, useRef, useState } from 'react';
import { ChevronDown, Eye, KeyRound, LogOut, Pencil } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../app/AuthContext';
import type { Role } from '../../types/labflow';
import { ProfileModal } from '../profile/ProfileModal';

const fallbackRoleLabels: Record<Role, string> = {
  Admin: 'Administrator',
  Doctor: 'Doctor',
  'Lab Technician': 'Lab Technician',
  Receptionist: 'Receptionist',
  Patient: 'Patient',
};

const fallbackRoleInitials: Record<Role, string> = {
  Admin: 'A',
  Doctor: 'D',
  'Lab Technician': 'L',
  Receptionist: 'R',
  Patient: 'P',
};

type ProfileModalMode = 'view' | 'edit' | 'password';

export function ProfileMenu() {
  const { role, user, logout } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [modalMode, setModalMode] = useState<ProfileModalMode | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  const displayName = user?.name || fallbackRoleLabels[role];
  const displayEmail = user?.email ?? role;
  const initials = user
    ? displayName.split(' ').filter(Boolean).slice(0, 2).map((part) => part.charAt(0)).join('').toUpperCase()
    : fallbackRoleInitials[role];

  useEffect(() => {
    if (!open) return;

    const handleMouseDown = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };

    document.addEventListener('mousedown', handleMouseDown);
    return () => document.removeEventListener('mousedown', handleMouseDown);
  }, [open]);

  const openModal = (mode: ProfileModalMode) => {
    setOpen(false);
    setModalMode(mode);
  };

  const handleLogout = () => {
    logout();
    setOpen(false);
    navigate('/login', { replace: true });
  };

  return (
    <div className="relative hidden sm:block" ref={menuRef}>
      <button
        className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-1 transition hover:bg-[rgb(var(--color-muted))]"
        type="button"
        onClick={() => setOpen((current) => !current)}
      >
        <span className="grid h-9 w-9 place-items-center rounded-full bg-gradient-to-br from-brand-600 to-accent text-xs font-bold text-white">
          {initials}
        </span>

        <span className="text-left">
          <span className="block max-w-[120px] truncate text-[13px] font-semibold leading-tight text-ink">
            {displayName.split(' ')[0]}
          </span>

          <span className="block text-[11px] capitalize leading-tight text-ink-muted">
            {role}
          </span>
        </span>

        <ChevronDown
          size={16}
          strokeWidth={1.8}
          className="text-ink-muted"
        />
      </button>

      {open ? (
        <div className="absolute right-0 top-[46px] z-50 w-64 overflow-hidden rounded-card border border-border bg-white shadow-card">
          <div className="border-b border-border px-3 py-3">
            <p className="truncate text-sm font-semibold text-ink">{displayName}</p>
            <p className="mt-0.5 truncate text-xs text-ink-muted">{displayEmail}</p>
            {user?.mobile ? <p className="mt-0.5 truncate text-xs text-ink-muted">{user.mobile}</p> : null}
          </div>
          <div className="py-1">
            <button className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-ink hover:bg-surface-muted" onClick={() => openModal('view')} type="button"><Eye size={16} />View Profile</button>
            <button className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-ink hover:bg-surface-muted" onClick={() => openModal('edit')} type="button"><Pencil size={16} />Edit Profile</button>
            <button className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-ink hover:bg-surface-muted" onClick={() => openModal('password')} type="button"><KeyRound size={16} />Change Password</button>
            <button className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-danger hover:bg-danger/5" onClick={handleLogout} type="button"><LogOut size={16} />Logout</button>
          </div>
        </div>
      ) : null}

      {modalMode ? <ProfileModal mode={modalMode} onClose={() => setModalMode(null)} /> : null}
    </div>
  );
}
