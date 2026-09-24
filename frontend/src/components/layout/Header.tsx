import {
  useEffect,
  useRef,
  useState,
  type ChangeEvent,
  type KeyboardEvent,
} from 'react';
import {
  Bell,
  ChevronDown,
  Menu,
  X,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

import { useAuth } from '../../app/AuthContext';
import { useUnreadNotificationsCount } from '../../hooks/useUnreadNotificationsCount';
import { ChangePasswordModal } from '../profile/ChangePasswordModal';
import { ProfileModal } from '../profile/ProfileModal';
import { SearchBar } from '../ui/SearchBar';

const roleInitials = {
  Admin: 'A',
  Doctor: 'D',
  'Lab Technician': 'L',
  Receptionist: 'R',
  Patient: 'P',
} as const;

const searchItems = [
  { label: 'Dashboard', path: '/dashboard' },
  { label: 'Patients', path: '/patients/register' },
  { label: 'Create Account', path: '/accounts/create' },
  { label: 'Doctors', path: '/doctors' },
  { label: 'Manage Tests', path: '/tests/manage' },
  { label: 'Test Booking', path: '/bookings/new' },
  { label: 'Billing', path: '/billing' },
  { label: 'Sample Tracking', path: '/samples' },
  { label: 'Reports', path: '/reports/preview' },
  { label: 'Notifications', path: '/notifications' },
];

type HeaderProps = {
  onMobileMenu: () => void;
  onToggleSidebar: () => void;
};

export function Header({
  onMobileMenu,
  onToggleSidebar,
}: HeaderProps) {
  const { role, user, logout } = useAuth();
  const navigate = useNavigate();
  const unreadCount = useUnreadNotificationsCount();
  const profileMenuRef = useRef<HTMLDivElement | null>(null);

  const [search, setSearch] = useState('');
  const [searchOpen, setSearchOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [profileModalMode, setProfileModalMode] = useState<'view' | 'edit' | null>(null);
  const [passwordModalOpen, setPasswordModalOpen] = useState(false);

  // Sidebar state only for desktop icon appearance
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  useEffect(() => {
    const handleSidebarState = (event: Event) => {
      const customEvent = event as CustomEvent<{ collapsed?: boolean }>;

      if (typeof customEvent.detail?.collapsed === 'boolean') {
        setSidebarCollapsed(customEvent.detail.collapsed);
      }
    };

    window.addEventListener(
      'sidebar-state-change',
      handleSidebarState,
    );

    return () => {
      window.removeEventListener(
        'sidebar-state-change',
        handleSidebarState,
      );
    };
  }, []);

  useEffect(() => {
    if (!profileOpen) return undefined;

    const handlePointerDown = (event: MouseEvent) => {
      if (!profileMenuRef.current?.contains(event.target as Node)) {
        setProfileOpen(false);
      }
    };
    const handleKeyDown = (event: globalThis.KeyboardEvent) => {
      if (event.key === 'Escape') {
        setProfileOpen(false);
      }
    };

    window.addEventListener('mousedown', handlePointerDown);
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('mousedown', handlePointerDown);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [profileOpen]);

  const filteredItems = search.trim()
    ? searchItems.filter((item) =>
        item.label.toLowerCase().includes(search.toLowerCase()),
      )
    : [];

  const handleSearchChange = (
    event: ChangeEvent<HTMLInputElement>,
  ) => {
    const value = event.target.value;

    setSearch(value);
    setSearchOpen(value.trim().length > 0);
  };

  const handleSearchSubmit = () => {
    if (filteredItems.length > 0) {
      navigate(filteredItems[0].path);
      setSearch('');
      setSearchOpen(false);
    }
  };

  const handleSearchKeyDown = (
    event: KeyboardEvent<HTMLInputElement>,
  ) => {
    if (event.key === 'Enter') {
      event.preventDefault();
      handleSearchSubmit();
    }

    if (event.key === 'Escape') {
      setSearch('');
      setSearchOpen(false);
    }
  };

  const handleSearchItemClick = (path: string) => {
    navigate(path);
    setSearch('');
    setSearchOpen(false);
  };

  const clearSearch = () => {
    setSearch('');
    setSearchOpen(false);
  };

  const openProfileModal = (mode: 'view' | 'edit') => {
    setProfileModalMode(mode);
    setProfileOpen(false);
  };

  const openPasswordModal = () => {
    setPasswordModalOpen(true);
    setProfileOpen(false);
  };

  const handleLogout = () => {
    logout();
    setProfileOpen(false);
    navigate('/login');
  };

  const displayName = user?.name?.trim() || user?.email || role;
  const firstName = displayName.split(' ')[0] || displayName;

  return (
    <header className="z-10 flex h-[var(--size-header)] shrink-0 items-center gap-2 border-b border-border bg-white px-3 lg:gap-3 lg:px-4">

      {/* MOBILE MENU */}
      <button
        aria-label="Open navigation"
        title="Open navigation"
        className="flex cursor-pointer rounded-md p-2 text-ink-muted transition hover:bg-[rgb(var(--color-muted))] hover:text-brand-600 lg:hidden"
        onClick={onMobileMenu}
        type="button"
      >
        <Menu size={22} strokeWidth={1.8} />
      </button>

      {/* DESKTOP SIDEBAR TOGGLE */}
      <button
        aria-label={
          sidebarCollapsed
            ? 'Expand navigation'
            : 'Collapse navigation'
        }
        title={
          sidebarCollapsed
            ? 'Expand navigation'
            : 'Collapse navigation'
        }
        className="hidden cursor-pointer rounded-md p-2 text-ink-muted transition hover:bg-[rgb(var(--color-muted))] hover:text-brand-600 lg:flex"
        onClick={onToggleSidebar}
        type="button"
      >
        <Menu size={22} strokeWidth={1.8} />
      </button>

      {/* ACTIVE SEARCH BAR */}
      <div className="relative min-w-0 flex-1">
        <SearchBar
          value={search}
          onChange={handleSearchChange}
          onFocus={() => {
            if (search.trim()) {
              setSearchOpen(true);
            }
          }}
          onKeyDown={handleSearchKeyDown}
          placeholder="Search patients, tests, reports..."
          className="h-[44px] w-full max-w-none rounded-md border border-[#d7e2ec] bg-[#f6f9fc] px-4 pr-12 text-[13px] text-[#26384b] placeholder:text-[#91a1b1] outline-none transition focus:border-[#1682a9] focus:bg-white focus:ring-2 focus:ring-[#1682a9]/10"
        />

        {/* CLEAR SEARCH */}
        {search && (
          <button
            type="button"
            aria-label="Clear search"
            title="Clear search"
            onClick={clearSearch}
            className="absolute right-3 top-1/2 z-10 grid h-7 w-7 -translate-y-1/2 cursor-pointer place-items-center rounded-full text-[#8da0b1] transition hover:bg-[#eaf4f8] hover:text-[#34495e]"
          >
            <X size={16} strokeWidth={1.8} />
          </button>
        )}

        {/* SEARCH RESULTS */}
        {searchOpen && (
          <div className="absolute left-0 right-0 top-[50px] z-50 overflow-hidden rounded-md border border-[#dce5ee] bg-white shadow-[0_12px_30px_rgba(15,35,60,0.12)]">
            {filteredItems.length > 0 ? (
              <div className="py-1">
                {filteredItems.map((item) => (
                  <button
                    key={item.path}
                    type="button"
                    onClick={() =>
                      handleSearchItemClick(item.path)
                    }
                    className="block w-full cursor-pointer px-4 py-3 text-left text-[13px] text-[#40566b] transition hover:bg-[#f1f7fb] hover:text-[#087eae]"
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            ) : (
              <div className="px-4 py-4 text-[13px] text-[#8a9aaa]">
                No matching results found.
              </div>
            )}
          </div>
        )}
      </div>

      {/* RIGHT SECTION */}
      <div className="ml-auto flex shrink-0 items-center gap-1.5 sm:gap-3">

        {/* NOTIFICATIONS */}
        <button
          aria-label="Open notifications"
          title="Notifications"
          className="relative flex cursor-pointer rounded-md p-2 text-ink-muted transition hover:bg-[rgb(var(--color-muted))] hover:text-brand-600"
          onClick={() => navigate('/notifications')}
          type="button"
        >
          <Bell size={20} strokeWidth={1.8} />

          {unreadCount > 0 ? (
            <span className="absolute right-1 top-1 h-2 w-2 rounded-full border-2 border-white bg-danger" />
          ) : null}
        </button>

        {/* PROFILE */}
        <div className="relative hidden sm:block" ref={profileMenuRef}>
          <button
            aria-expanded={profileOpen}
            aria-haspopup="menu"
            className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-1 transition hover:bg-[rgb(var(--color-muted))]"
            type="button"
            onClick={() => setProfileOpen((current) => !current)}
          >
            <span className="grid h-9 w-9 place-items-center rounded-full bg-gradient-to-br from-brand-600 to-accent text-xs font-bold text-white">
              {roleInitials[role]}
            </span>

            <span className="text-left">
              <span className="block max-w-[120px] truncate text-[13px] font-semibold leading-tight text-ink">
                {firstName}
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

          {profileOpen ? (
            <div className="absolute right-0 top-[46px] z-50 w-48 overflow-hidden rounded-md border border-[#dce5ee] bg-white py-1 shadow-[0_12px_30px_rgba(15,35,60,0.12)]" role="menu">
              <button className="block w-full cursor-pointer px-4 py-3 text-left text-[13px] text-[#40566b] transition hover:bg-[#f1f7fb] hover:text-[#087eae]" onClick={() => openProfileModal('view')} role="menuitem" type="button">View Profile</button>
              <button className="block w-full cursor-pointer px-4 py-3 text-left text-[13px] text-[#40566b] transition hover:bg-[#f1f7fb] hover:text-[#087eae]" onClick={() => openProfileModal('edit')} role="menuitem" type="button">Edit Profile</button>
              <button className="block w-full cursor-pointer px-4 py-3 text-left text-[13px] text-[#40566b] transition hover:bg-[#f1f7fb] hover:text-[#087eae]" onClick={openPasswordModal} role="menuitem" type="button">Change Password</button>
              <div className="my-1 border-t border-[#dce5ee]" />
              <button className="block w-full cursor-pointer px-4 py-3 text-left text-[13px] text-[#c24141] transition hover:bg-[#fff5f5]" onClick={handleLogout} role="menuitem" type="button">Logout</button>
            </div>
          ) : null}
        </div>

      </div>
      {profileModalMode ? <ProfileModal initialMode={profileModalMode} onClose={() => setProfileModalMode(null)} /> : null}
      {passwordModalOpen ? <ChangePasswordModal onClose={() => setPasswordModalOpen(false)} /> : null}
    </header>
  );
}
