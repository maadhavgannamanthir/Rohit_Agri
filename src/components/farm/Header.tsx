import React, { useEffect, useRef, useState } from 'react';
import {
  Menu,
  Bell,
  Search,
  LogIn,
  LogOut,
  ChevronDown,
  Settings,
  UserCircle2,
  HelpCircle,
  Command,
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import type { ViewKey } from './Sidebar';

interface Props {
  title: string;
  subtitle?: string;
  view: ViewKey;
  onOpenSidebar: () => void;
  onSignInClick: () => void;
}

const Header: React.FC<Props> = ({ title, subtitle, onOpenSidebar, onSignInClick }) => {
  const { user, displayName, initials, signOut } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const notifRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false);
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) setNotifOpen(false);
    };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, []);

  return (
    <header className="sticky top-0 z-20 bg-white/85 backdrop-blur-xl border-b border-stone-200/80">
      <div className="px-4 lg:px-8 h-16 flex items-center gap-3 lg:gap-6">
        {/* Mobile menu */}
        <button
          onClick={onOpenSidebar}
          className="lg:hidden w-9 h-9 rounded-lg hover:bg-stone-100 flex items-center justify-center shrink-0"
          aria-label="Open menu"
        >
          <Menu className="w-5 h-5 text-stone-700" />
        </button>

        {/* Page title */}
        <div className="flex flex-col min-w-0 shrink-0">
          <h1 className="text-base sm:text-lg font-bold text-stone-900 leading-tight tracking-tight truncate">
            {title}
          </h1>
          {subtitle && (
            <p className="hidden sm:block text-xs text-stone-500 truncate">{subtitle}</p>
          )}
        </div>

        {/* Search — center, flexible */}
        <div className="hidden md:flex flex-1 justify-center">
          <div className="relative w-full max-w-md">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-400 pointer-events-none" />
            <input
              type="text"
              placeholder="Search animals, expenses, partners..."
              className="w-full pl-10 pr-16 py-2 rounded-xl bg-stone-100/80 border border-transparent focus:bg-white focus:border-stone-300 focus:ring-2 focus:ring-[#6B8E23]/15 outline-none text-sm transition placeholder:text-stone-400"
            />
            <div className="hidden lg:flex absolute right-2 top-1/2 -translate-y-1/2 items-center gap-1 text-[10px] text-stone-400">
              <kbd className="px-1.5 py-0.5 rounded-md bg-white border border-stone-200 font-mono flex items-center gap-0.5">
                <Command className="w-3 h-3" />K
              </kbd>
            </div>
          </div>
        </div>

        {/* Spacer for md- */}
        <div className="md:hidden flex-1" />

        {/* Right actions */}
        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
          {/* Notifications */}
          <div className="relative" ref={notifRef}>
            <button
              onClick={() => setNotifOpen((o) => !o)}
              className="w-9 h-9 rounded-lg hover:bg-stone-100 flex items-center justify-center relative transition"
              aria-label="Notifications"
            >
              <Bell className="w-5 h-5 text-stone-700" />
              <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full ring-2 ring-white" />
            </button>
            {notifOpen && (
              <div className="absolute right-0 mt-2 w-80 bg-white rounded-xl shadow-xl border border-stone-200 overflow-hidden">
                <div className="px-4 py-3 border-b border-stone-100 flex items-center justify-between">
                  <div className="font-semibold text-sm text-stone-900">Notifications</div>
                  <button className="text-xs text-[#6B8E23] font-semibold hover:underline">
                    Mark all read
                  </button>
                </div>
                <div className="max-h-72 overflow-y-auto">
                  <NotifItem
                    color="emerald"
                    title="Weight log recorded"
                    body="Tag #LK-024 gained 1.2 kg this week."
                    time="2h ago"
                  />
                  <NotifItem
                    color="amber"
                    title="Expense pending allocation"
                    body="Feed purchase of ₹4,200 needs animal assignment."
                    time="5h ago"
                  />
                  <NotifItem
                    color="sky"
                    title="Partner share updated"
                    body="Profit distribution recalculated for May."
                    time="1d ago"
                  />
                </div>
                <button className="block w-full text-center px-4 py-2.5 text-xs font-semibold text-stone-600 hover:bg-stone-50 border-t border-stone-100">
                  View all notifications
                </button>
              </div>
            )}
          </div>

          {/* Divider */}
          <div className="hidden sm:block w-px h-7 bg-stone-200 mx-1" />

          {/* User / Sign in */}
          {user ? (
            <div className="relative" ref={menuRef}>
              <button
                onClick={() => setMenuOpen((o) => !o)}
                className="flex items-center gap-2 pl-1 pr-2 py-1 rounded-xl hover:bg-stone-100 transition"
              >
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#7BA02A] to-[#4F6B1A] text-white text-xs font-bold flex items-center justify-center ring-2 ring-white shadow-sm">
                  {initials}
                </div>
                <div className="hidden lg:block text-left leading-tight">
                  <div className="text-xs font-semibold text-stone-900 max-w-[140px] truncate">
                    {displayName}
                  </div>
                  <div className="text-[11px] text-stone-500 max-w-[140px] truncate">
                    {user.email}
                  </div>
                </div>
                <ChevronDown className="hidden lg:block w-4 h-4 text-stone-400" />
              </button>

              {menuOpen && (
                <div className="absolute right-0 mt-2 w-64 bg-white rounded-xl shadow-xl border border-stone-200 overflow-hidden">
                  <div className="px-4 py-3 bg-stone-50/70 border-b border-stone-100 flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#7BA02A] to-[#4F6B1A] text-white text-sm font-bold flex items-center justify-center">
                      {initials}
                    </div>
                    <div className="min-w-0">
                      <div className="text-sm font-semibold text-stone-900 truncate">{displayName}</div>
                      <div className="text-xs text-stone-500 truncate">{user.email}</div>
                    </div>
                  </div>
                  <div className="py-1.5">
                    <MenuItem icon={UserCircle2} label="My profile" />
                    <MenuItem icon={Settings} label="Settings" />
                    <MenuItem icon={HelpCircle} label="Help & support" />
                  </div>
                  <div className="border-t border-stone-100 py-1.5">
                    <button
                      onClick={() => signOut().catch(() => {})}
                      className="w-full flex items-center gap-2.5 px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition"
                    >
                      <LogOut className="w-4 h-4" />
                      Sign out
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <button
              onClick={onSignInClick}
              className="flex items-center gap-2 pl-3 pr-4 py-2 rounded-xl bg-gradient-to-b from-[#7BA02A] to-[#5F7F1F] hover:from-[#82A82E] hover:to-[#557119] text-white text-sm font-semibold transition shadow-sm shadow-[#6B8E23]/30"
            >
              <LogIn className="w-4 h-4" />
              <span className="hidden sm:inline">Sign in</span>
            </button>
          )}
        </div>
      </div>
    </header>
  );
};

const NotifItem: React.FC<{
  color: 'emerald' | 'amber' | 'sky';
  title: string;
  body: string;
  time: string;
}> = ({ color, title, body, time }) => {
  const colorMap = {
    emerald: 'bg-emerald-500',
    amber: 'bg-amber-500',
    sky: 'bg-sky-500',
  };
  return (
    <button className="w-full text-left flex gap-3 px-4 py-3 hover:bg-stone-50 transition border-b border-stone-100 last:border-b-0">
      <div className={`w-2 h-2 rounded-full mt-1.5 shrink-0 ${colorMap[color]}`} />
      <div className="min-w-0 flex-1">
        <div className="text-sm font-semibold text-stone-900 truncate">{title}</div>
        <div className="text-xs text-stone-500 line-clamp-2">{body}</div>
        <div className="text-[11px] text-stone-400 mt-0.5">{time}</div>
      </div>
    </button>
  );
};

const MenuItem: React.FC<{ icon: React.ElementType; label: string }> = ({ icon: Icon, label }) => (
  <button className="w-full flex items-center gap-2.5 px-4 py-2 text-sm text-stone-700 hover:bg-stone-50 transition">
    <Icon className="w-4 h-4 text-stone-500" />
    {label}
  </button>
);

export default Header;
