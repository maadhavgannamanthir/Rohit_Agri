import React, { useCallback, useEffect, useState } from 'react';
import Sidebar, { ViewKey } from './farm/Sidebar';
import Dashboard from './farm/Dashboard';
import AnimalsView from './farm/AnimalsView';
import WeightsView from './farm/WeightsView';
import ExpensesView from './farm/ExpensesView';
import PartnersView from './farm/PartnersView';
import ReportsView from './farm/ReportsView';
import MilkProductionView from './farm/MilkProductionView';
import ClientsView from './farm/ClientsView';
import MilkDeliveriesView from './farm/MilkDeliveriesView';
import InvoicesView from './farm/InvoicesView';
import PaymentsView from './farm/PaymentsView';
import SettingsView from './farm/SettingsView';
import AnimalModal from './farm/AnimalModal';
import AddAnimalModal from './farm/AddAnimalModal';
import AuthPage from './farm/AuthPage';
import EditAnimalModal from './farm/EditAnimalModal';
import EditExpenseModal from './farm/EditExpenseModal';
import EditPartnerModal from './farm/EditPartnerModal';
import EditWeightModal from './farm/EditWeightModal';
import ConfirmDialog from './farm/ConfirmDialog';
import { LoadingState, ErrorState } from './farm/LoadingState';
import {
  Animal,
  Expense,
  Partner,
  WeightLog,
  MilkCollection,
  Client,
  MilkDelivery,
  Invoice,
  InvoiceItem,
  Payment,
  FarmSettings,
  formatCurrency,
} from '@/lib/farmData';
import {
  fetchAnimals,
  fetchExpenses,
  fetchPartners,
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
  addVaccination as dbAddVaccination,
  deleteVaccination as dbDeleteVaccination,
  addVetVisit as dbAddVetVisit,
  deleteVetVisit as dbDeleteVetVisit,
  fetchMilkCollections,
  addMilkCollection as dbAddMilkCollection,
  deleteMilkCollection as dbDeleteMilkCollection,
  fetchClients,
  addClient as dbAddClient,
  updateClient as dbUpdateClient,
  deleteClient as dbDeleteClient,
  fetchDeliveries,
  addDelivery as dbAddDelivery,
  deleteDelivery as dbDeleteDelivery,
  fetchInvoices,
  addInvoice as dbAddInvoice,
  deleteInvoice as dbDeleteInvoice,
  updateInvoiceStatus as dbUpdateInvoiceStatus,
  fetchPayments,
  addPayment as dbAddPayment,
  deletePayment as dbDeletePayment,
  fetchFarmSettings,
  saveFarmSettings as dbSaveFarmSettings,
} from '@/lib/farmDb';
import { useAuth } from '@/contexts/AuthContext';
import Header from './farm/Header';
import { CheckCircle2, AlertCircle, Pencil, Trash2 } from 'lucide-react';



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
  const [milkCollections, setMilkCollections] = useState<MilkCollection[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [deliveries, setDeliveries] = useState<MilkDelivery[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [settings, setSettings] = useState<FarmSettings | null>(null);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [selectedAnimal, setSelectedAnimal] = useState<Animal | null>(null);
  const [showAddAnimal, setShowAddAnimal] = useState(false);

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
      const [a, e, p, mc, c, d, inv, pay, fsData] = await Promise.all([
        fetchAnimals(),
        fetchExpenses(),
        fetchPartners(),
        fetchMilkCollections(),
        fetchClients(),
        fetchDeliveries(),
        fetchInvoices(),
        fetchPayments(),
        fetchFarmSettings(),
      ]);
      setAnimals(a);
      setExpenses(e);
      setPartners(p);
      setMilkCollections(mc);
      setClients(c);
      setDeliveries(d);
      setInvoices(inv);
      setPayments(pay);

      let fs = fsData;
      if (!fs) {
        fs = await dbSaveFarmSettings({
          farmName: 'Rohit Agro Farm',
          address: 'Pune, Maharashtra',
          phone: '+91 98765 43210',
          email: 'billing@rohitagro.com',
          gstNumber: '',
          invoicePrefix: 'INV',
          currency: 'INR',
          logoUrl: '',
        });
      }
      setSettings(fs);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load data');
    } finally { setLoading(false); }
  }, []);

  useEffect(() => {
    if (user) loadAll();
    else {
      setAnimals([]);
      setExpenses([]);
      setPartners([]);
      setMilkCollections([]);
      setClients([]);
      setDeliveries([]);
      setInvoices([]);
      setPayments([]);
      setSettings(null);
      setError(null);
      setLoading(false);
    }
  }, [user, loadAll]);

  // ---------- Create ----------
  const handleLogGrowth = async (id: string, weight: number, height?: number) => {
    try {
      const log = await dbAddWeightLog(id, weight, height);
      setAnimals((prev) => prev.map((a) => (a.id === id ? { ...a, weights: [...a.weights, log].sort((x, y) => x.date.localeCompare(y.date)) } : a)));
      pushToast(`Growth logged: ${weight} kg / ${height || '-'} cm`);
    } catch (err) { pushToast(err instanceof Error ? err.message : 'Failed', 'error'); }
  };
  const handleAddVaccination = async (animalId: string, vaccineName: string, date: string, notes: string) => {
    try {
      const newVac = await dbAddVaccination({ animalId, date, vaccineName, notes });
      setAnimals((prev) => prev.map((a) => (a.id === animalId ? { ...a, vaccinations: [...(a.vaccinations || []), newVac] } : a)));
      pushToast(`Vaccination logged: ${vaccineName}`);
    } catch (err) { pushToast(err instanceof Error ? err.message : 'Failed', 'error'); }
  };
  const handleDeleteVaccination = async (id: string, animalId: string, vaccineName: string) => {
    try {
      await dbDeleteVaccination(id, animalId, vaccineName);
      setAnimals((prev) => prev.map((a) => (a.id === animalId ? { ...a, vaccinations: (a.vaccinations || []).filter((v) => v.id !== id) } : a)));
      pushToast(`Vaccination deleted: ${vaccineName}`);
    } catch (err) { pushToast(err instanceof Error ? err.message : 'Failed', 'error'); }
  };
  const handleAddVetVisit = async (animalId: string, date: string, doctorName: string, diagnosis: string, treatment: string, cost: number, notes: string) => {
    try {
      const newVisit = await dbAddVetVisit({ animalId, date, doctorName, diagnosis, treatment, cost, notes });
      setAnimals((prev) => prev.map((a) => (a.id === animalId ? { ...a, vetVisits: [...(a.vetVisits || []), newVisit] } : a)));
      await dbAddExpense({
        date,
        category: 'Medicine',
        description: `Vet Visit: ${diagnosis} (${doctorName})`,
        amount: cost,
        scope: 'Animal',
        animalId,
        recurring: false,
      });
      const nextExp = await fetchExpenses();
      setExpenses(nextExp);
      pushToast(`Vet visit logged: ${diagnosis}`);
    } catch (err) { pushToast(err instanceof Error ? err.message : 'Failed', 'error'); }
  };
  const handleDeleteVetVisit = async (id: string, animalId: string, diagnosis: string) => {
    try {
      await dbDeleteVetVisit(id, animalId, diagnosis);
      setAnimals((prev) => prev.map((a) => (a.id === animalId ? { ...a, vetVisits: (a.vetVisits || []).filter((v) => v.id !== id) } : a)));
      pushToast(`Vet visit deleted: ${diagnosis}`);
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

  // ---------- Milk Collections ----------
  const handleAddCollection = async (c: Omit<MilkCollection, 'id' | 'totalQty'>) => {
    try {
      const newCol = await dbAddMilkCollection(c);
      setMilkCollections((prev) => [newCol, ...prev]);
      pushToast(`Milking log recorded: ${newCol.totalQty} Liters`);
    } catch (err) {
      pushToast(err instanceof Error ? err.message : 'Failed to save collection', 'error');
    }
  };

  const handleDeleteCollection = async (id: string, animalId: string, date: string, total: number) => {
    try {
      await dbDeleteMilkCollection(id, animalId, date, total);
      setMilkCollections((prev) => prev.filter((c) => c.id !== id));
      pushToast(`Removed collection of ${total}L`);
    } catch (err) {
      pushToast(err instanceof Error ? err.message : 'Failed to delete collection', 'error');
    }
  };

  // ---------- Clients ----------
  const handleAddClient = async (c: Omit<Client, 'id'>) => {
    try {
      const newClient = await dbAddClient(c);
      setClients((prev) => [...prev, newClient]);
      pushToast(`Client registered: ${newClient.name}`);
    } catch (err) {
      pushToast(err instanceof Error ? err.message : 'Failed to add client', 'error');
    }
  };

  const handleUpdateClient = async (id: string, patch: Partial<Client>) => {
    const before = clients.find((c) => c.id === id);
    if (!before) return;
    try {
      const updated = await dbUpdateClient(before, patch);
      setClients((prev) => prev.map((c) => (c.id === id ? updated : c)));
      pushToast(`Client updated: ${updated.name}`);
    } catch (err) {
      pushToast(err instanceof Error ? err.message : 'Failed to update client', 'error');
    }
  };

  const handleDeleteClient = async (client: Client) => {
    try {
      await dbDeleteClient(client);
      setClients((prev) => prev.filter((c) => c.id !== client.id));
      pushToast(`Client deleted: ${client.name}`);
    } catch (err) {
      pushToast(err instanceof Error ? err.message : 'Failed to delete client', 'error');
    }
  };

  // ---------- Milk Deliveries ----------
  const handleAddDelivery = async (d: Omit<MilkDelivery, 'id'>) => {
    try {
      const newDelivery = await dbAddDelivery(d);
      setDeliveries((prev) => [newDelivery, ...prev]);
      pushToast(`Logged delivery of ${newDelivery.quantity}L to customer`);
    } catch (err) {
      pushToast(err instanceof Error ? err.message : 'Failed to add delivery', 'error');
    }
  };

  const handleDeleteDelivery = async (d: MilkDelivery) => {
    try {
      await dbDeleteDelivery(d);
      setDeliveries((prev) =>
        prev.map((item) => (item.id === d.id ? { ...item, status: 'Cancelled' as const } : item))
      );
      pushToast(`Delivery cancelled`);
    } catch (err) {
      pushToast(err instanceof Error ? err.message : 'Failed to cancel delivery', 'error');
    }
  };

  // ---------- Invoices ----------
  const handleAddInvoice = async (
    inv: Omit<Invoice, 'id' | 'items'>,
    items: Omit<InvoiceItem, 'id' | 'invoiceId'>[]
  ) => {
    try {
      const newInvoice = await dbAddInvoice(inv, items);
      setInvoices((prev) => [newInvoice, ...prev]);
      pushToast(`Invoice created: ${newInvoice.invoiceNumber}`);
    } catch (err) {
      pushToast(err instanceof Error ? err.message : 'Failed to create invoice', 'error');
    }
  };

  const handleUpdateInvoiceStatus = async (id: string, status: Invoice['status']) => {
    try {
      await dbUpdateInvoiceStatus(id, status);
      setInvoices((prev) =>
        prev.map((inv) => (inv.id === id ? { ...inv, status } : inv))
      );
      pushToast(`Invoice status: ${status}`);
    } catch (err) {
      pushToast(err instanceof Error ? err.message : 'Failed to update invoice status', 'error');
    }
  };

  const handleDeleteInvoice = async (inv: Invoice) => {
    try {
      await dbDeleteInvoice(inv);
      setInvoices((prev) => prev.filter((i) => i.id !== inv.id));
      pushToast(`Invoice deleted`);
    } catch (err) {
      pushToast(err instanceof Error ? err.message : 'Failed to delete invoice', 'error');
    }
  };

  // ---------- Payments ----------
  const handleAddPayment = async (p: Omit<Payment, 'id'>) => {
    try {
      const newPayment = await dbAddPayment(p);
      setPayments((prev) => [newPayment, ...prev]);
      const nextInvoices = await fetchInvoices();
      setInvoices(nextInvoices);
      pushToast(`Payment recorded: ${formatCurrency(newPayment.amountReceived)}`);
    } catch (err) {
      pushToast(err instanceof Error ? err.message : 'Failed to record payment', 'error');
    }
  };

  const handleDeletePayment = async (p: Payment) => {
    try {
      await dbDeletePayment(p);
      setPayments((prev) => prev.filter((item) => item.id !== p.id));
      const nextInvoices = await fetchInvoices();
      setInvoices(nextInvoices);
      pushToast(`Payment deleted`);
    } catch (err) {
      pushToast(err instanceof Error ? err.message : 'Failed to delete payment', 'error');
    }
  };

  const handleSaveSettings = async (fs: Omit<FarmSettings, 'userId'>) => {
    try {
      const updated = await dbSaveFarmSettings(fs);
      setSettings(updated);
      pushToast('Farm settings saved');
    } catch (err) {
      pushToast(err instanceof Error ? err.message : 'Failed to save settings', 'error');
    }
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
    dashboard: 'Dashboard',
    animals: 'Livestock',
    weights: 'Weight Logs',
    milk_production: 'Milk Production',
    clients: 'Clients',
    milk_deliveries: 'Milk Deliveries',
    invoices: 'Invoices',
    payments: 'Payments',
    expenses: 'Expenses',
    partners: 'Partners',
    reports: 'Reports',
    settings: 'Settings',
  };
  const subtitles: Record<ViewKey, string> = {
    dashboard: 'Overview of your farm performance',
    animals: 'Registry of all livestock & status',
    weights: 'Track growth & weigh-ins over time',
    milk_production: 'Log daily collection & track cow yields',
    clients: 'Directory of customer accounts & details',
    milk_deliveries: 'Log deliveries & sale history',
    invoices: 'Client billing, print & PDF generator',
    payments: 'Customer receipt logs & ledger',
    expenses: 'Operational costs & allocations',
    partners: 'Profit shares & distributions',
    reports: 'Analytics, exports & insights',
    settings: 'Configure farm profile & billing defaults',
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
    if (loading) return <LoadingState />;
    if (error) return <ErrorState message={error} onRetry={loadAll} />;
    return (
      <>
        {view === 'dashboard' && (
          <Dashboard
            animals={animals}
            expenses={expenses}
            partners={partners}
            milkCollections={milkCollections}
            deliveries={deliveries}
            invoices={invoices}
            payments={payments}
            clients={clients}
          />
        )}
        {view === 'animals' && <AnimalsView animals={animals} onAdd={() => setShowAddAnimal(true)} onSelect={setSelectedAnimal} />}
        {view === 'weights' && (
          <WeightsView
            animals={animals}
            onLogWeight={handleLogGrowth}
            onEditWeight={(animal, log) => setEditWeight({ animal, log })}
            onDeleteWeight={(animal, log) => setDeleteTarget({ kind: 'weight', animal, log })}
          />
        )}

        {view === 'milk_production' && (
          <MilkProductionView
            animals={animals}
            milkCollections={milkCollections}
            deliveries={deliveries}
            onAddCollection={handleAddCollection}
            onDeleteCollection={handleDeleteCollection}
          />
        )}

        {view === 'clients' && (
          <ClientsView
            clients={clients}
            deliveries={deliveries}
            invoices={invoices}
            payments={payments}
            onAdd={handleAddClient}
            onEdit={handleUpdateClient}
            onDelete={handleDeleteClient}
          />
        )}

        {view === 'milk_deliveries' && (
          <MilkDeliveriesView
            clients={clients}
            deliveries={deliveries}
            onAdd={handleAddDelivery}
            onDelete={handleDeleteDelivery}
          />
        )}

        {view === 'invoices' && (
          <InvoicesView
            clients={clients}
            deliveries={deliveries}
            invoices={invoices}
            settings={settings}
            onAdd={handleAddInvoice}
            onDelete={handleDeleteInvoice}
            onUpdateStatus={handleUpdateInvoiceStatus}
          />
        )}

        {view === 'payments' && (
          <PaymentsView
            clients={clients}
            invoices={invoices}
            payments={payments}
            onAdd={handleAddPayment}
            onDelete={handleDeletePayment}
            onUpdateInvoiceStatus={handleUpdateInvoiceStatus}
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
        {view === 'settings' && <SettingsView settings={settings} onSave={handleSaveSettings} />}
      </>
    );
  };

  // If loading or not authenticated, handle early
  if (authLoading) return <LoadingState />;
  if (!user) return <AuthPage />;

  return (
    <div className="min-h-screen bg-[#FAF9F6] flex">
      <Sidebar
        current={view}
        onSelect={setView}
        open={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        onSignInClick={() => {}}
      />

      <div className="flex-1 flex flex-col min-w-0">
        <Header
          title={titles[view]}
          subtitle={subtitles[view]}
          view={view}
          onOpenSidebar={() => setSidebarOpen(true)}
          onSignInClick={() => {}}
          animals={animals}
          expenses={expenses}
          showMenuButton={true}
        />


        <main className="flex-1 p-4 lg:p-8 max-w-7xl w-full mx-auto">{renderMain()}</main>


        <footer className="border-t border-stone-200/80 bg-white/50 backdrop-blur px-4 lg:px-8 py-4 text-xs text-stone-500 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <img src="/rohit-agro-logo.svg" alt="" className="w-4 h-4 opacity-80" />
            <span>© {new Date().getFullYear()} Rohit Agro · Livestock Management ERP</span>
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
        onLogGrowth={handleLogGrowth}
        onAddVaccination={handleAddVaccination}
        onDeleteVaccination={handleDeleteVaccination}
        onAddVetVisit={handleAddVetVisit}
        onDeleteVetVisit={handleDeleteVetVisit}
        expenses={expenses}
      />
      <AddAnimalModal open={showAddAnimal} onClose={() => setShowAddAnimal(false)} onAdd={handleAddAnimal} />

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
