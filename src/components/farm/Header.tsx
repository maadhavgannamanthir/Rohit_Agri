import React, { useEffect, useMemo, useRef, useState } from 'react';
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
  BellOff,
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import type { ViewKey } from './Sidebar';
import type { Animal, Expense } from '@/lib/farmData';
import { formatCurrency } from '@/lib/farmData';

interface Props {
  title: string;
  subtitle?: string;
  view: ViewKey;
  onOpenSidebar: () => void;
  onSignInClick: () => void;
  animals?: Animal[];
  expenses?: Expense[];
  /** Hide the hamburger menu button when there is no sidebar to open (e.g. logged-out). */
  showMenuButton?: boolean;
}


type NotifColor = 'emerald' | 'amber' | 'sky' | 'red';

interface Notif {
  id: string;
  color: NotifColor;
  title: string;
  body: string;
  time: string;
  ts: number;
}

function timeAgo(iso: string): string {
  const d = new Date(iso).getTime();
  if (Number.isNaN(d)) return '';
  const diffMs = Date.now() - d;
  const mins = Math.round(diffMs / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.round(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.round(hrs / 24);
  if (days < 30) return `${days}d ago`;
  const months = Math.round(days / 30);
  return `${months}mo ago`;
}

function buildNotifications(animals: Animal[], expenses: Expense[]): Notif[] {
  const out: Notif[] = [];

  // Most recent 3 weight logs across all animals
  const allLogs: { animal: Animal; date: string; weightKg: number }[] = [];
  for (const a of animals) {
    for (const w of a.weights) {
      allLogs.push({ animal: a, date: w.date, weightKg: w.weightKg });
    }
  }
  allLogs.sort((x, y) => y.date.localeCompare(x.date));
  for (const log of allLogs.slice(0, 2)) {
    out.push({
      id: `w-${log.animal.id}-${log.date}`,
      color: 'emerald',
      title: 'Weight log recorded',
      body: `${log.animal.name} (${log.animal.tagId}) — ${log.weightKg.toFixed(1)} kg on ${log.date}`,
      time: timeAgo(log.date),
      ts: new Date(log.date).getTime(),
    });
  }

  // Most recent 2 sales
  const sales = animals
    .filter((a) => a.status === 'Sold' && a.saleDate)
    .sort((x, y) => (y.saleDate || '').localeCompare(x.saleDate || ''))
    .slice(0, 2);
  for (const a of sales) {
    out.push({
      id: `s-${a.id}`,
      color: 'sky',
      title: 'Sale recorded',
      body: `${a.name} sold to ${a.buyer || 'buyer'} for ${formatCurrency(a.salePrice || 0)}`,
      time: timeAgo(a.saleDate as string),
      ts: new Date(a.saleDate as string).getTime(),
    });
  }

  // Most recent 2 expenses
  const recentExpenses = [...expenses]
    .sort((x, y) => y.date.localeCompare(x.date))
    .slice(0, 2);
  for (const e of recentExpenses) {
    out.push({
      id: `e-${e.id}`,
      color: 'amber',
      title: `${e.category} expense logged`,
      body: `${e.description} — ${formatCurrency(e.amount)}`,
      time: timeAgo(e.date),
      ts: new Date(e.date).getTime(),
    });
  }

  // Health alerts (animals with weight drop > 5% across last 3 weigh-ins)
  for (const a of animals) {
    if (a.status !== 'Active' || a.weights.length < 3) continue;
    const last = a.weights[a.weights.length - 1].weightKg;
    const prev = a.weights[a.weights.length - 3].weightKg;
    if (prev > 0 && (last - prev) / prev < -0.05) {
      out.push({
        id: `h-${a.id}`,
        color: 'red',
        title: 'Weight drop detected',
        body: `${a.name} (${a.tagId}) lost ${(prev - last).toFixed(1)} kg recently`,
        time: timeAgo(a.weights[a.weights.length - 1].date),
        ts: new Date(a.weights[a.weights.length - 1].date).getTime(),
      });
    }
  }

  // Sort by newest first, dedupe, cap at 6
  const seen = new Set<string>();
  return out
    .filter((n) => (seen.has(n.id) ? false : (seen.add(n.id), true)))
    .sort((x, y) => y.ts - x.ts)
    .slice(0, 6);
}

const STORAGE_KEY = 'rohit-agro:notifs-read-ids';

function loadReadIds(): Set<string> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return new Set();
    return new Set(JSON.parse(raw));
  } catch {
    return new Set();
  }
}
function saveReadIds(ids: Set<string>) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify([...ids]));
  } catch {
    /* ignore */
  }
}

const Header: React.FC<Props> = ({
  title,
  subtitle,
  onOpenSidebar,
  onSignInClick,
  animals = [],
  expenses = [],
  showMenuButton = true,
}) => {
  const { user, displayName, initials, signOut } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [readIds, setReadIds] = useState<Set<string>>(() => loadReadIds());
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

  const notifications = useMemo(
    () => (user ? buildNotifications(animals, expenses) : []),
    [user, animals, expenses],
  );
  const unreadCount = notifications.filter((n) => !readIds.has(n.id)).length;

  const markAllRead = () => {
    const next = new Set(readIds);
    notifications.forEach((n) => next.add(n.id));
    setReadIds(next);
    saveReadIds(next);
  };

  return (
    <header className="sticky top-0 z-20 bg-white/85 backdrop-blur-xl border-b border-stone-200/80">
      <div className="px-4 lg:px-8 h-16 flex items-center gap-3 lg:gap-6">
        {/* Mobile menu — only shown when a sidebar exists to open */}
        {showMenuButton && (
          <button
            onClick={onOpenSidebar}
            className="lg:hidden w-9 h-9 rounded-lg hover:bg-stone-100 flex items-center justify-center shrink-0"
            aria-label="Open menu"
          >
            <Menu className="w-5 h-5 text-stone-700" />
          </button>
        )}

        {/* Brand mark — shown when sidebar is hidden so the header isn't empty on the left */}
        {!showMenuButton && (
          <div className="flex items-center gap-2 shrink-0">
            <img
              src="/rohit-agro-logo.svg"
              alt="Rohit Agro"
              className="w-8 h-8 rounded-lg ring-1 ring-stone-200"
            />
          </div>
        )}


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
              {unreadCount > 0 && (
                <span className="absolute top-1 right-1 min-w-[16px] h-4 px-1 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center ring-2 ring-white">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </button>
            {notifOpen && (
              <div className="absolute right-0 mt-2 w-80 bg-white rounded-xl shadow-xl border border-stone-200 overflow-hidden">
                <div className="px-4 py-3 border-b border-stone-100 flex items-center justify-between">
                  <div className="font-semibold text-sm text-stone-900">
                    Notifications{' '}
                    {unreadCount > 0 && (
                      <span className="ml-1 text-xs text-stone-500 font-medium">
                        ({unreadCount} new)
                      </span>
                    )}
                  </div>
                  {notifications.length > 0 && unreadCount > 0 && (
                    <button
                      onClick={markAllRead}
                      className="text-xs text-[#6B8E23] font-semibold hover:underline"
                    >
                      Mark all read
                    </button>
                  )}
                </div>
                <div className="max-h-72 overflow-y-auto">
                  {notifications.length === 0 ? (
                    <div className="px-4 py-8 text-center">
                      <div className="w-10 h-10 mx-auto rounded-full bg-stone-100 flex items-center justify-center mb-2">
                        <BellOff className="w-5 h-5 text-stone-400" />
                      </div>
                      <div className="text-sm font-medium text-stone-700">
                        You're all caught up
                      </div>
                      <div className="text-xs text-stone-500 mt-1">
                        New activity will appear here
                      </div>
                    </div>
                  ) : (
                    notifications.map((n) => (
                      <NotifItem
                        key={n.id}
                        color={n.color}
                        title={n.title}
                        body={n.body}
                        time={n.time}
                        unread={!readIds.has(n.id)}
                      />
                    ))
                  )}
                </div>
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
  color: NotifColor;
  title: string;
  body: string;
  time: string;
  unread: boolean;
}> = ({ color, title, body, time, unread }) => {
  const colorMap: Record<NotifColor, string> = {
    emerald: 'bg-emerald-500',
    amber: 'bg-amber-500',
    sky: 'bg-sky-500',
    red: 'bg-red-500',
  };
  return (
    <button
      className={`w-full text-left flex gap-3 px-4 py-3 hover:bg-stone-50 transition border-b border-stone-100 last:border-b-0 ${
        unread ? 'bg-stone-50/40' : ''
      }`}
    >
      <div className={`w-2 h-2 rounded-full mt-1.5 shrink-0 ${colorMap[color]}`} />
      <div className="min-w-0 flex-1">
        <div className="text-sm font-semibold text-stone-900 truncate">{title}</div>
        <div className="text-xs text-stone-500 line-clamp-2">{body}</div>
        <div className="text-[11px] text-stone-400 mt-0.5">{time}</div>
      </div>
      {unread && <span className="w-1.5 h-1.5 rounded-full bg-[#6B8E23] mt-2 shrink-0" />}
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
