import React, { useCallback, useEffect, useState } from 'react';
import Sidebar, { ViewKey } from './farm/Sidebar';
import Dashboard from './farm/Dashboard';
import AnimalsView from './farm/AnimalsView';
import WeightsView from './farm/WeightsView';
import ExpensesView from './farm/ExpensesView';
import PartnersView from './farm/PartnersView';
import ReportsView from './farm/ReportsView';
import AnimalModal from './farm/AnimalModal';
import AddAnimalModal from './farm/AddAnimalModal';
import AuthModal from './farm/AuthModal';
import EditAnimalModal from './farm/EditAnimalModal';
import EditExpenseModal from './farm/EditExpenseModal';
import EditPartnerModal from './farm/EditPartnerModal';
import EditWeightModal from './farm/EditWeightModal';
import ConfirmDialog from './farm/ConfirmDialog';
import { LoadingState, ErrorState } from './farm/LoadingState';
import { Animal, Expense, Partner, WeightLog } from '@/lib/farmData';
import {
  fetchAnimals, fetchExpenses, fetchPartners,
  addAnimal as dbAddAnimal,
  addExpense as dbAddExpense,
  addPartner as dbAddPartner,
  addWeightLog as dbAddWeightLog,
  markAnimalSold as dbMarkSold,
  updateAnimal as dbUpdateAnimal,
  deleteAnimal as dbDeleteAnimal,
  updateExpense as dbUpdateExpense,
  deleteExpense as dbDeleteExpense,
  updatePartner as dbUpdatePartner,
  deletePartner as dbDeletePartner,
  updateWeightLog as dbUpdateWeightLog,
  deleteWeightLog as dbDeleteWeightLog,
} from '@/lib/farmDb';
import { useAuth } from '@/contexts/AuthContext';
import Header from './farm/Header';
import { CheckCircle2, AlertCircle, LogIn, ShieldCheck, BarChart3, Sprout, ArrowRight } from 'lucide-react';



interface Toast { id: number; message: string; type: 'success' | 'error' }
type DeleteTarget =
  | { kind: 'animal'; data: Animal }
  | { kind: 'expense'; data: Expense }
  | { kind: 'partner'; data: Partner }
  | { kind: 'weight'; animal: Animal; log: WeightLog }
  | null;


const AppLayout: React.FC = () => {
  const { user, loading: authLoading } = useAuth();


  const [view, setView] = useState<ViewKey>('dashboard');
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const [animals, setAnimals] = useState<Animal[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [partners, setPartners] = useState<Partner[]>([]);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [selectedAnimal, setSelectedAnimal] = useState<Animal | null>(null);
  const [showAddAnimal, setShowAddAnimal] = useState(false);
  const [showAuth, setShowAuth] = useState(false);

  const [editAnimal, setEditAnimal] = useState<Animal | null>(null);
  const [editExpense, setEditExpense] = useState<Expense | null>(null);
  const [editPartner, setEditPartner] = useState<Partner | null>(null);
  const [editWeight, setEditWeight] = useState<{ animal: Animal; log: WeightLog } | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<DeleteTarget>(null);


  const [toasts, setToasts] = useState<Toast[]>([]);

  const pushToast = (message: string, type: 'success' | 'error' = 'success') => {
    const id = Date.now() + Math.random();
    setToasts((t) => [...t, { id, message, type }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 3500);
  };

  const loadAll = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const [a, e, p] = await Promise.all([fetchAnimals(), fetchExpenses(), fetchPartners()]);
      setAnimals(a); setExpenses(e); setPartners(p);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load data');
    } finally { setLoading(false); }
  }, []);

  useEffect(() => {
    if (user) loadAll();
    else { setAnimals([]); setExpenses([]); setPartners([]); setError(null); setLoading(false); }
  }, [user, loadAll]);

  // ---------- Create ----------
  const handleLogWeight = async (id: string, weight: number) => {
    try {
      const log = await dbAddWeightLog(id, weight);
      setAnimals((prev) => prev.map((a) => (a.id === id ? { ...a, weights: [...a.weights, log] } : a)));
      pushToast(`Weight logged: ${weight} kg`);
    } catch (err) { pushToast(err instanceof Error ? err.message : 'Failed', 'error'); }
  };
  const handleAddExpense = async (e: Omit<Expense, 'id'>) => {
    try { const c = await dbAddExpense(e); setExpenses((p) => [c, ...p]); pushToast(`Expense added: ${c.description}`); }
    catch (err) { pushToast(err instanceof Error ? err.message : 'Failed', 'error'); }
  };
  const handleAddPartner = async (p: Omit<Partner, 'id' | 'avatar'>) => {
    try { const c = await dbAddPartner(p); setPartners((x) => [...x, c]); pushToast(`Partner added: ${c.name}`); }
    catch (err) { pushToast(err instanceof Error ? err.message : 'Failed', 'error'); }
  };
  const handleMarkSold = async (id: string, salePrice: number, buyer: string) => {
    try {
      const { saleDate } = await dbMarkSold(id, salePrice, buyer);
      setAnimals((prev) => prev.map((a) => a.id === id ? { ...a, status: 'Sold', salePrice, buyer, saleDate } : a));
      setSelectedAnimal(null); pushToast(`Sale recorded for ${buyer}`);
    } catch (err) { pushToast(err instanceof Error ? err.message : 'Failed', 'error'); }
  };
  const handleAddAnimal = async (data: Omit<Animal, 'id' | 'weights' | 'photos' | 'allocatedExpenses'>) => {
    try { const c = await dbAddAnimal(data); setAnimals((p) => [...p, c]); pushToast(`Registered: ${c.name}`); }
    catch (err) { pushToast(err instanceof Error ? err.message : 'Failed', 'error'); }
  };

  // ---------- Update ----------
  const handleSaveAnimal = async (id: string, patch: Partial<Animal>, goalReason?: string) => {
    const before = animals.find((a) => a.id === id);
    if (!before) return;
    try {
      const updated = await dbUpdateAnimal(before, patch, goalReason);
      setAnimals((prev) => prev.map((a) => a.id === id ? updated : a));
      setEditAnimal(null);
      if (selectedAnimal?.id === id) setSelectedAnimal(updated);
      pushToast(`Saved changes to ${updated.name}`);
    } catch (err) { pushToast(err instanceof Error ? err.message : 'Failed', 'error'); }
  };

  const handleSaveExpense = async (id: string, patch: Partial<Expense>) => {
    const before = expenses.find((e) => e.id === id);
    if (!before) return;
    try {
      const updated = await dbUpdateExpense(before, patch);
      setExpenses((prev) => prev.map((e) => e.id === id ? updated : e));
      setEditExpense(null); pushToast('Expense updated');
    } catch (err) { pushToast(err instanceof Error ? err.message : 'Failed', 'error'); }
  };
  const handleSavePartner = async (id: string, patch: Partial<Partner>) => {
    const before = partners.find((p) => p.id === id);
    if (!before) return;
    try {
      const updated = await dbUpdatePartner(before, patch);
      setPartners((prev) => prev.map((p) => p.id === id ? updated : p));
      setEditPartner(null); pushToast(`Updated ${updated.name}`);
    } catch (err) { pushToast(err instanceof Error ? err.message : 'Failed', 'error'); }
  };


  const handleSaveWeight = async (
    animalId: string,
    oldDate: string,
    oldWeight: number,
    newDate: string,
    newWeight: number,
  ) => {
    const animal = animals.find((a) => a.id === animalId);
    if (!animal) return;
    try {
      const updated = await dbUpdateWeightLog(
        animalId,
        `${animal.name} (${animal.tagId})`,
        oldDate,
        oldWeight,
        newDate,
        newWeight,
      );
      setAnimals((prev) =>
        prev.map((a) => {
          if (a.id !== animalId) return a;
          const next = a.weights
            .map((w) => (w.date === oldDate ? updated : w))
            .sort((x, y) => x.date.localeCompare(y.date));
          return { ...a, weights: next };
        }),
      );
      setEditWeight(null);
      pushToast(`Weigh-in updated for ${animal.name}`);
    } catch (err) { pushToast(err instanceof Error ? err.message : 'Failed', 'error'); }
  };


  // ---------- Delete ----------
  const confirmDelete = async () => {
    if (!deleteTarget) return;
    try {
      if (deleteTarget.kind === 'animal') {
        await dbDeleteAnimal(deleteTarget.data);
        setAnimals((prev) => prev.filter((a) => a.id !== deleteTarget.data.id));
        if (selectedAnimal?.id === deleteTarget.data.id) setSelectedAnimal(null);
        pushToast(`Deleted ${deleteTarget.data.name}`);
      } else if (deleteTarget.kind === 'expense') {
        await dbDeleteExpense(deleteTarget.data);
        setExpenses((prev) => prev.filter((e) => e.id !== deleteTarget.data.id));
        pushToast('Expense deleted');
      } else if (deleteTarget.kind === 'partner') {
        await dbDeletePartner(deleteTarget.data);
        setPartners((prev) => prev.filter((p) => p.id !== deleteTarget.data.id));
        pushToast(`Removed ${deleteTarget.data.name}`);
      } else if (deleteTarget.kind === 'weight') {
        const { animal, log } = deleteTarget;
        await dbDeleteWeightLog(
          animal.id,
          `${animal.name} (${animal.tagId})`,
          log.date,
          log.weightKg,
        );
        setAnimals((prev) =>
          prev.map((a) =>
            a.id === animal.id
              ? { ...a, weights: a.weights.filter((w) => w.date !== log.date) }
              : a,
          ),
        );
        pushToast(`Weigh-in deleted (${log.date})`);
      }
    } catch (err) {
      pushToast(err instanceof Error ? err.message : 'Failed to delete', 'error');
    } finally { setDeleteTarget(null); }
  };


  const titles: Record<ViewKey, string> = {
    dashboard: 'Dashboard', animals: 'Livestock', weights: 'Weight Logs',
    expenses: 'Expenses', partners: 'Partners', reports: 'Reports',
  };
  const subtitles: Record<ViewKey, string> = {
    dashboard: 'Overview of your farm performance',
    animals: 'Registry of all livestock & status',
    weights: 'Track growth & weigh-ins over time',
    expenses: 'Operational costs & allocations',
    partners: 'Profit shares & distributions',
    reports: 'Analytics, exports & insights',
  };


  const deleteMessage = () => {
    if (!deleteTarget) return '';
    if (deleteTarget.kind === 'animal')
      return `This will permanently remove ${deleteTarget.data.name} (${deleteTarget.data.tagId}) along with all its weight logs, sale records, and allocated expenses. This cannot be undone.`;
    if (deleteTarget.kind === 'expense')
      return `Delete expense "${deleteTarget.data.description}" (${deleteTarget.data.category})? This cannot be undone.`;
    if (deleteTarget.kind === 'weight')
      return `Delete the ${deleteTarget.log.weightKg.toFixed(1)} kg weigh-in for ${deleteTarget.animal.name} on ${deleteTarget.log.date}? This cannot be undone.`;
    return `Remove partner "${deleteTarget.data.name}"? Their profit share will no longer be calculated. This cannot be undone.`;
  };

  const deleteTitle = () => {
    if (!deleteTarget) return '';
    if (deleteTarget.kind === 'weight') return 'Delete weigh-in?';
    return `Delete ${deleteTarget.kind}?`;
  };


  const renderMain = () => {
    if (authLoading) return <LoadingState />;
    if (!user) {
      return (
        <div className="relative min-h-[70vh] flex items-center justify-center overflow-hidden">
          {/* background flourish */}
          <div className="absolute inset-0 -z-10">
            <div className="absolute -top-32 -left-32 w-[28rem] h-[28rem] rounded-full bg-[#6B8E23]/10 blur-3xl" />
            <div className="absolute -bottom-32 -right-32 w-[28rem] h-[28rem] rounded-full bg-[#D2691E]/10 blur-3xl" />
          </div>

          <div className="max-w-2xl w-full bg-white/90 backdrop-blur border border-stone-200/70 rounded-3xl shadow-xl shadow-stone-900/5 p-8 sm:p-12 text-center">
            <div className="relative inline-flex">
              <div className="absolute inset-0 rounded-2xl bg-[#6B8E23]/20 blur-xl" />
              <img
                src="/rohit-agro-logo.svg"
                alt="Rohit Agro"
                className="relative w-20 h-20 rounded-2xl shadow-sm ring-1 ring-stone-200"
              />
            </div>

            <div className="mt-5 inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 text-[11px] font-semibold uppercase tracking-wider">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              Trusted by serious farmers
            </div>

            <h2 className="mt-4 text-3xl sm:text-4xl font-bold text-stone-900 tracking-tight">
              Welcome to <span className="text-[#6B8E23]">Rohit Agro</span>
            </h2>
            <p className="mt-3 text-base text-stone-600 max-w-lg mx-auto">
              The complete operating system for sheep & goat farms — livestock registry, weight logs,
              expense tracking, and automated partner profit distribution.
            </p>

            <div className="mt-6 flex flex-col sm:flex-row gap-3 justify-center">
              <button
                onClick={() => setShowAuth(true)}
                className="group inline-flex items-center justify-center gap-2 bg-gradient-to-b from-[#7BA02A] to-[#5F7F1F] hover:from-[#82A82E] hover:to-[#557119] text-white font-semibold px-6 py-3 rounded-xl transition shadow-sm shadow-[#6B8E23]/30"
              >
                <LogIn className="w-4 h-4" />
                Sign in to your account
                <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
              </button>
              <button
                onClick={() => setShowAuth(true)}
                className="inline-flex items-center justify-center gap-2 bg-white hover:bg-stone-50 text-stone-800 font-semibold px-6 py-3 rounded-xl border border-stone-200 transition"
              >
                Create free account
              </button>
            </div>

            <div className="mt-8 grid grid-cols-1 sm:grid-cols-3 gap-3 text-left">
              {[
                { icon: Sprout, title: 'Livestock Registry', desc: 'Tags, breeds, lineage & sale records' },
                { icon: BarChart3, title: 'Growth Analytics', desc: 'Weigh-ins, ADG & herd insights' },
                { icon: ShieldCheck, title: 'Secure & Private', desc: 'Row-level security per user' },
              ].map(({ icon: Icon, title, desc }) => (
                <div key={title} className="rounded-2xl border border-stone-200 bg-stone-50/60 p-4">
                  <div className="w-9 h-9 rounded-lg bg-white border border-stone-200 flex items-center justify-center shadow-sm">
                    <Icon className="w-4 h-4 text-[#6B8E23]" />
                  </div>
                  <div className="mt-3 text-sm font-semibold text-stone-900">{title}</div>
                  <div className="text-xs text-stone-500 mt-0.5">{desc}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      );
    }

    if (loading) return <LoadingState />;
    if (error) return <ErrorState message={error} onRetry={loadAll} />;
    return (
      <>
        {view === 'dashboard' && <Dashboard animals={animals} expenses={expenses} partners={partners} />}
        {view === 'animals' && <AnimalsView animals={animals} onAdd={() => setShowAddAnimal(true)} onSelect={setSelectedAnimal} />}
        {view === 'weights' && (
          <WeightsView
            animals={animals}
            onLogWeight={handleLogWeight}
            onEditWeight={(animal, log) => setEditWeight({ animal, log })}
            onDeleteWeight={(animal, log) => setDeleteTarget({ kind: 'weight', animal, log })}
          />
        )}

        {view === 'expenses' && (
          <ExpensesView
            expenses={expenses} animals={animals} onAdd={handleAddExpense}
            onEdit={(e) => setEditExpense(e)}
            onDelete={(e) => setDeleteTarget({ kind: 'expense', data: e })}
          />
        )}
        {view === 'partners' && (
          <PartnersView
            partners={partners} animals={animals} expenses={expenses} onAdd={handleAddPartner}
            onEdit={(p) => setEditPartner(p)}
            onDelete={(p) => setDeleteTarget({ kind: 'partner', data: p })}
          />
        )}
        {view === 'reports' && <ReportsView animals={animals} expenses={expenses} partners={partners} />}
      </>
    );
  };

  return (
    <div className="min-h-screen bg-[#FAF9F6] flex">
      <Sidebar current={view} onSelect={setView} open={sidebarOpen} onClose={() => setSidebarOpen(false)} onSignInClick={() => setShowAuth(true)} />

      <div className="flex-1 flex flex-col min-w-0">
        <Header
          title={titles[view]}
          subtitle={subtitles[view]}
          view={view}
          onOpenSidebar={() => setSidebarOpen(true)}
          onSignInClick={() => setShowAuth(true)}
        />


        <main className="flex-1 p-4 lg:p-8 max-w-7xl w-full mx-auto">{renderMain()}</main>

        <footer className="border-t border-stone-200/80 bg-white/50 backdrop-blur px-4 lg:px-8 py-4 text-xs text-stone-500 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <img src="/rohit-agro-logo.svg" alt="" className="w-4 h-4 opacity-80" />
            <span>© {new Date().getFullYear()} Rohit Agro · Sheep &amp; Goat Farm Management</span>
          </div>
          <div className="flex gap-5">
            <a href="#" className="hover:text-stone-800 transition">Help</a>
            <a href="#" className="hover:text-stone-800 transition">Privacy</a>
            <a href="#" className="hover:text-stone-800 transition">Terms</a>
          </div>
        </footer>

      </div>

      <AnimalModal
        animal={selectedAnimal}
        onClose={() => setSelectedAnimal(null)}
        onMarkSold={handleMarkSold}
        onEdit={(a) => { setSelectedAnimal(null); setEditAnimal(a); }}
        onDelete={(a) => setDeleteTarget({ kind: 'animal', data: a })}
      />
      <AddAnimalModal open={showAddAnimal} onClose={() => setShowAddAnimal(false)} onAdd={handleAddAnimal} />
      <AuthModal open={showAuth} onClose={() => setShowAuth(false)} />

      <EditAnimalModal animal={editAnimal} onClose={() => setEditAnimal(null)} onSave={handleSaveAnimal} />
      <EditExpenseModal expense={editExpense} animals={animals} onClose={() => setEditExpense(null)} onSave={handleSaveExpense} />
      <EditPartnerModal partner={editPartner} onClose={() => setEditPartner(null)} onSave={handleSavePartner} />
      <EditWeightModal
        animal={editWeight?.animal ?? null}
        log={editWeight?.log ?? null}
        onClose={() => setEditWeight(null)}
        onSave={handleSaveWeight}
      />

      <ConfirmDialog
        open={!!deleteTarget}
        title={deleteTitle()}
        message={deleteMessage()}
        confirmLabel="Delete"
        destructive
        onConfirm={confirmDelete}
        onCancel={() => setDeleteTarget(null)}
      />


      <div className="fixed bottom-4 right-4 z-50 space-y-2 max-w-sm">
        {toasts.map((t) => (
          <div key={t.id} className={`flex items-start gap-2 px-4 py-3 rounded-xl shadow-lg border ${t.type === 'success' ? 'bg-white border-emerald-200 text-stone-800' : 'bg-red-50 border-red-200 text-red-800'}`}>
            {t.type === 'success' ? <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" /> : <AlertCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />}
            <div className="text-sm font-medium">{t.message}</div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default AppLayout;
