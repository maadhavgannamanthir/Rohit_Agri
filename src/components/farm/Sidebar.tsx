import React from 'react';
import {
  LayoutDashboard,
  Sprout,
  Scale,
  Receipt,
  Users,
  BarChart3,
  Settings,
  X,
  LogOut,
  LogIn,
  Droplet,
  User,
  FileText,
  CreditCard,
  Egg,
} from 'lucide-react';

import { useAuth } from '@/contexts/AuthContext';

export type ViewKey =
  | 'dashboard'
  | 'animals'
  | 'weights'
  | 'milk_production'
  | 'clients'
  | 'milk_deliveries'
  | 'invoices'
  | 'payments'
  | 'expenses'
  | 'partners'
  | 'reports'
  | 'settings'
  | 'egg_batches';

interface Props {
  current: ViewKey;
  onSelect: (v: ViewKey) => void;
  open: boolean;
  onClose: () => void;
  onSignInClick: () => void;
}

interface NavItem {
  key: ViewKey;
  label: string;
  icon: React.ElementType;
}

interface NavSection {
  title: string;
  items: NavItem[];
}

const sections: NavSection[] = [
  {
    title: 'Farm',
    items: [
      { key: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
      { key: 'animals', label: 'Livestock', icon: Sprout },
      { key: 'weights', label: 'Weight Logs', icon: Scale },
      { key: 'milk_production', label: 'Milk Production', icon: Droplet },
      { key: 'egg_batches', label: 'Egg Incubator', icon: Egg },
    ],
  },
  {
    title: 'CRM',
    items: [
      { key: 'clients', label: 'Clients', icon: User },
      { key: 'milk_deliveries', label: 'Milk Deliveries', icon: Droplet },
    ],
  },
  {
    title: 'Finance',
    items: [
      { key: 'invoices', label: 'Invoices', icon: FileText },
      { key: 'payments', label: 'Payments', icon: CreditCard },
      { key: 'expenses', label: 'Expenses', icon: Receipt },
      { key: 'partners', label: 'Partners', icon: Users },
    ],
  },
  {
    title: 'Admin',
    items: [
      { key: 'reports', label: 'Reports', icon: BarChart3 },
    ],
  },
];

const Sidebar: React.FC<Props> = ({ current, onSelect, open, onClose, onSignInClick }) => {
  const { user, displayName, initials, signOut } = useAuth();

  const handleSignOut = async () => {
    try {
      await signOut();
    } catch {
      /* ignored */
    }
  };

  return (
    <>
      {open && (
        <div
          className="fixed inset-0 bg-black/40 backdrop-blur-sm z-30 lg:hidden"
          onClick={onClose}
        />
      )}
      <aside
        className={`fixed lg:sticky top-0 left-0 h-screen w-64 shrink-0 z-40 flex flex-col transition-transform duration-300
          bg-gradient-to-b from-[#2D3B1F] via-[#26331A] to-[#1B2412] text-stone-100
          border-r border-black/20 shadow-xl shadow-stone-900/10
          ${open ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}`}
      >
        {/* Brand */}
        <div className="px-5 py-5 border-b border-white/5 flex items-center justify-between">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="relative shrink-0">
              <div className="absolute inset-0 rounded-xl bg-[#6B8E23]/40 blur-md" />
              <img
                src="/rohit-agro-logo.svg"
                alt="Rohit Agro"
                className="relative w-10 h-10 rounded-xl ring-1 ring-white/10 bg-white/5 p-0.5"
              />
            </div>
            <div className="min-w-0">
              <div className="font-bold text-base leading-tight truncate">Rohit Agro</div>
              <div className="text-[10px] uppercase tracking-[0.18em] text-stone-400">
                Dairy & Livestock ERP
              </div>
            </div>
          </div>
          <button
            onClick={onClose}
            className="lg:hidden text-stone-300 hover:text-white"
            aria-label="Close menu"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-4 overflow-y-auto space-y-4">
          {sections.map((sec) => (
            <div key={sec.title} className="space-y-1">
              <div className="px-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-stone-500">
                {sec.title}
              </div>
              <div className="space-y-0.5">
                {sec.items.map((item) => {
                  const Icon = item.icon;
                  const active = current === item.key;
                  return (
                    <button
                      key={item.key}
                      onClick={() => {
                        onSelect(item.key);
                        onClose();
                      }}
                      className={`group relative w-full flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-medium transition
                        ${
                          active
                            ? 'bg-white/[0.08] text-white font-semibold'
                            : 'text-stone-300 hover:bg-white/[0.04] hover:text-white'
                        }`}
                    >
                      {/* Active accent bar */}
                      <span
                        className={`absolute left-0 top-1/2 -translate-y-1/2 w-1 rounded-r-full transition-all ${
                          active ? 'h-5 bg-[#A4C148]' : 'h-0 bg-transparent'
                        }`}
                      />
                      <Icon
                        className={`w-3.5 h-3.5 transition ${
                          active ? 'text-[#C7E07A]' : 'text-stone-400 group-hover:text-stone-200'
                        }`}
                      />
                      <span className="flex-1 text-left">{item.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>

        {/* Footer */}
        <div className="p-3 border-t border-white/5">
          <button
            onClick={() => {
              onSelect('settings');
              onClose();
            }}
            className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-medium transition
              ${
                current === 'settings'
                  ? 'bg-white/[0.08] text-white font-semibold'
                  : 'text-stone-300 hover:bg-white/[0.04] hover:text-white'
              }`}
          >
            <Settings className="w-3.5 h-3.5 text-stone-400" />
            <span>Settings</span>
          </button>

          {user ? (
            <div className="mt-3 rounded-xl bg-white/[0.04] ring-1 ring-white/5 p-3">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-gradient-to-br from-[#D2691E] to-[#A0501A] flex items-center justify-center text-xs font-bold shrink-0 shadow-sm">
                  {initials}
                </div>
                <div className="text-xs min-w-0 flex-1">
                  <div className="font-semibold truncate" title={displayName}>{displayName}</div>
                  <div className="text-stone-400 truncate" title={user.email || ''}>
                    {user.email}
                  </div>
                </div>
              </div>
              <button
                onClick={handleSignOut}
                className="mt-2.5 w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-xs font-semibold bg-white/[0.05] hover:bg-white/[0.1] text-stone-100 transition ring-1 ring-white/5"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Sign out</span>
              </button>
            </div>
          ) : (
            <button
              onClick={() => {
                onSignInClick();
                onClose();
              }}
              className="mt-3 w-full flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl text-sm font-semibold bg-gradient-to-b from-[#7BA02A] to-[#5F7F1F] hover:from-[#82A82E] hover:to-[#557119] text-white transition shadow-sm shadow-[#6B8E23]/30"
            >
              <LogIn className="w-4 h-4" />
              <span>Sign in</span>
            </button>
          )}
        </div>
      </aside>
    </>
  );
};

export default Sidebar;
