import React, { useState, useMemo } from 'react';
import { Expense, ExpenseCategory, Animal, formatCurrency } from '@/lib/farmData';
import { Plus, Search, Wheat, Pill, HardHat, Zap, Hammer, Package, Repeat, Pencil, Trash2 } from 'lucide-react';

interface Props {
  expenses: Expense[];
  animals: Animal[];
  onAdd: (e: Omit<Expense, 'id'>) => void;
  onEdit?: (e: Expense) => void;
  onDelete?: (e: Expense) => void;
}

const CAT_META: Record<ExpenseCategory, { icon: React.ElementType; color: string; bg: string }> = {
  Feed: { icon: Wheat, color: 'text-[#6B8E23]', bg: 'bg-[#6B8E23]/10' },
  Medicine: { icon: Pill, color: 'text-red-600', bg: 'bg-red-50' },
  Labor: { icon: HardHat, color: 'text-blue-600', bg: 'bg-blue-50' },
  Utilities: { icon: Zap, color: 'text-amber-600', bg: 'bg-amber-50' },
  Maintenance: { icon: Hammer, color: 'text-purple-600', bg: 'bg-purple-50' },
  Misc: { icon: Package, color: 'text-stone-600', bg: 'bg-stone-100' },
};

const ExpensesView: React.FC<Props> = ({ expenses, animals, onAdd, onEdit, onDelete }) => {
  const [query, setQuery] = useState('');
  const [catFilter, setCatFilter] = useState<'All' | ExpenseCategory>('All');
  const [showForm, setShowForm] = useState(false);

  const [form, setForm] = useState<{
    date: string;
    category: ExpenseCategory;
    description: string;
    amount: string;
    scope: 'Herd' | 'Animal';
    animalId: string;
    recurring: boolean;
  }>({
    date: new Date().toISOString().slice(0, 10),
    category: 'Feed',
    description: '',
    amount: '',
    scope: 'Herd',
    animalId: '',
    recurring: false,
  });

  const filtered = useMemo(() => {
    return expenses.filter((e) => {
      const q = query.toLowerCase();
      const matchQ = !q || e.description.toLowerCase().includes(q);
      const matchC = catFilter === 'All' || e.category === catFilter;
      return matchQ && matchC;
    });
  }, [expenses, query, catFilter]);

  const total = filtered.reduce((s, e) => s + e.amount, 0);
  const byCategory = useMemo(() => {
    const map: Record<string, number> = {};
    expenses.forEach((e) => {
      map[e.category] = (map[e.category] || 0) + e.amount;
    });
    return map;
  }, [expenses]);
  const grandTotal = expenses.reduce((s, e) => s + e.amount, 0);

  const handleSubmit = () => {
    const amt = parseFloat(form.amount);
    if (!amt || !form.description) return;
    onAdd({
      date: form.date,
      category: form.category,
      description: form.description,
      amount: amt,
      scope: form.scope,
      animalId: form.scope === 'Animal' ? form.animalId : undefined,
      recurring: form.recurring,
    });
    setForm({
      date: new Date().toISOString().slice(0, 10),
      category: 'Feed',
      description: '',
      amount: '',
      scope: 'Herd',
      animalId: '',
      recurring: false,
    });
    setShowForm(false);
  };

  const cats: (ExpenseCategory | 'All')[] = ['All', 'Feed', 'Medicine', 'Labor', 'Utilities', 'Maintenance', 'Misc'];

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold text-stone-800">Expense Tracking</h1>
          <p className="text-stone-500 mt-1">Total: <span className="font-semibold text-stone-800">{formatCurrency(grandTotal)}</span> across {expenses.length} entries</p>
        </div>
        <button
          onClick={() => setShowForm((s) => !s)}
          className="inline-flex items-center gap-2 bg-[#D2691E] hover:bg-[#b85a18] text-white px-4 py-2.5 rounded-xl text-sm font-medium shadow-sm transition"
        >
          <Plus className="w-4 h-4" /> {showForm ? 'Cancel' : 'Add Expense'}
        </button>
      </div>

      {/* Add form */}
      {showForm && (
        <div className="bg-white rounded-2xl border border-stone-200 p-5 space-y-4">
          <h2 className="font-semibold text-stone-800">New Expense Entry</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            <div>
              <label className="text-xs font-medium text-stone-600 mb-1 block">Date</label>
              <input
                type="date"
                value={form.date}
                onChange={(e) => setForm({ ...form, date: e.target.value })}
                className="w-full px-3 py-2 rounded-lg border border-stone-200 bg-stone-50 text-sm focus:bg-white focus:border-[#D2691E] outline-none"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-stone-600 mb-1 block">Category</label>
              <select
                value={form.category}
                onChange={(e) => setForm({ ...form, category: e.target.value as ExpenseCategory })}
                className="w-full px-3 py-2 rounded-lg border border-stone-200 bg-stone-50 text-sm focus:bg-white focus:border-[#D2691E] outline-none"
              >
                {(Object.keys(CAT_META) as ExpenseCategory[]).map((c) => (
                  <option key={c}>{c}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-stone-600 mb-1 block">Amount ({formatCurrency(0).charAt(0)})</label>
              <input
                type="number"
                placeholder="0.00"
                value={form.amount}
                onChange={(e) => setForm({ ...form, amount: e.target.value })}
                className="w-full px-3 py-2 rounded-lg border border-stone-200 bg-stone-50 text-sm focus:bg-white focus:border-[#D2691E] outline-none"
              />
            </div>
            <div className="sm:col-span-2 lg:col-span-2">
              <label className="text-xs font-medium text-stone-600 mb-1 block">Description</label>
              <input
                type="text"
                placeholder="e.g. Weekly feed purchase..."
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                className="w-full px-3 py-2 rounded-lg border border-stone-200 bg-stone-50 text-sm focus:bg-white focus:border-[#D2691E] outline-none"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-stone-600 mb-1 block">Scope</label>
              <select
                value={form.scope}
                onChange={(e) => setForm({ ...form, scope: e.target.value as 'Herd' | 'Animal' })}
                className="w-full px-3 py-2 rounded-lg border border-stone-200 bg-stone-50 text-sm focus:bg-white focus:border-[#D2691E] outline-none"
              >
                <option value="Herd">Whole Herd</option>
                <option value="Animal">Specific Animal</option>
              </select>
            </div>
            {form.scope === 'Animal' && (
              <div className="sm:col-span-2">
                <label className="text-xs font-medium text-stone-600 mb-1 block">Animal</label>
                <select
                  value={form.animalId}
                  onChange={(e) => setForm({ ...form, animalId: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-stone-200 bg-stone-50 text-sm focus:bg-white focus:border-[#D2691E] outline-none"
                >
                  <option value="">Select animal...</option>
                  {animals.filter((a) => a.status === 'Active').map((a) => (
                    <option key={a.id} value={a.id}>{a.name} ({a.tagId})</option>
                  ))}
                </select>
              </div>
            )}
          </div>
          <div className="flex items-center justify-between">
            <label className="flex items-center gap-2 text-sm text-stone-600 cursor-pointer">
              <input
                type="checkbox"
                checked={form.recurring}
                onChange={(e) => setForm({ ...form, recurring: e.target.checked })}
                className="rounded border-stone-300 text-[#D2691E] focus:ring-[#D2691E]"
              />
              Mark as recurring expense
            </label>
            <button
              onClick={handleSubmit}
              className="bg-[#6B8E23] hover:bg-[#5a7a1d] text-white px-5 py-2 rounded-lg text-sm font-medium"
            >
              Save Expense
            </button>
          </div>
        </div>
      )}

      {/* Category breakdown */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {(Object.keys(CAT_META) as ExpenseCategory[]).map((c) => {
          const meta = CAT_META[c];
          const Icon = meta.icon;
          const val = byCategory[c] || 0;
          const pct = grandTotal ? (val / grandTotal) * 100 : 0;
          return (
            <button
              key={c}
              onClick={() => setCatFilter(catFilter === c ? 'All' : c)}
              className={`bg-white rounded-xl border p-3 text-left transition hover:shadow-md ${
                catFilter === c ? 'border-[#D2691E] ring-2 ring-[#D2691E]/20' : 'border-stone-200'
              }`}
            >
              <div className={`w-8 h-8 rounded-lg ${meta.bg} flex items-center justify-center mb-2`}>
                <Icon className={`w-4 h-4 ${meta.color}`} />
              </div>
              <div className="text-xs text-stone-500">{c}</div>
              <div className="font-bold text-sm text-stone-800">{formatCurrency(val)}</div>
              <div className="text-[10px] text-stone-400">{pct.toFixed(0)}% of total</div>
            </button>
          );
        })}
      </div>

      {/* Search */}
      <div className="bg-white rounded-2xl border border-stone-200 p-4 flex flex-col sm:flex-row gap-3">
        <div className="flex-1 relative">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
          <input
            type="text"
            placeholder="Search expenses..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-2.5 rounded-lg border border-stone-200 bg-stone-50 focus:bg-white outline-none text-sm"
          />
        </div>
        <div className="flex gap-2 overflow-x-auto">
          {cats.map((c) => (
            <button
              key={c}
              onClick={() => setCatFilter(c)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition ${
                catFilter === c ? 'bg-[#D2691E] text-white' : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
              }`}
            >
              {c}
            </button>
          ))}
        </div>
      </div>

      {/* List */}
      <div className="bg-white rounded-2xl border border-stone-200 overflow-hidden">
        <div className="px-5 py-3 border-b border-stone-100 flex items-center justify-between bg-stone-50">
          <div className="text-sm font-semibold text-stone-700">{filtered.length} entries</div>
          <div className="text-sm font-semibold text-stone-800">Total: {formatCurrency(total)}</div>
        </div>
        <div className="divide-y divide-stone-100">
          {filtered.map((e) => {
            const meta = CAT_META[e.category];
            const Icon = meta.icon;
            const animal = animals.find((a) => a.id === e.animalId);
            return (
              <div key={e.id} className="p-4 flex items-center gap-3 hover:bg-stone-50">
                <div className={`w-10 h-10 rounded-lg ${meta.bg} flex items-center justify-center shrink-0`}>
                  <Icon className={`w-5 h-5 ${meta.color}`} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-sm text-stone-800 truncate">{e.description}</div>
                  <div className="flex items-center gap-2 text-xs text-stone-500 mt-0.5 flex-wrap">
                    <span>{e.date}</span>
                    <span>·</span>
                    <span className={meta.color}>{e.category}</span>
                    <span>·</span>
                    <span>{e.scope === 'Herd' ? 'Whole Herd' : animal?.name || 'Animal'}</span>
                    {e.recurring && (
                      <>
                        <span>·</span>
                        <span className="inline-flex items-center gap-0.5 text-blue-600">
                          <Repeat className="w-3 h-3" /> Recurring
                        </span>
                      </>
                    )}
                  </div>
                </div>
                <div className="font-semibold text-stone-800">{formatCurrency(e.amount)}</div>
                {(onEdit || onDelete) && (
                  <div className="flex items-center gap-1 ml-2 shrink-0">
                    {onEdit && (
                      <button
                        onClick={() => onEdit(e)}
                        title="Edit"
                        className="w-8 h-8 rounded-lg hover:bg-stone-200 flex items-center justify-center text-stone-500 hover:text-stone-800 transition"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                    )}
                    {onDelete && (
                      <button
                        onClick={() => onDelete(e)}
                        title="Delete"
                        className="w-8 h-8 rounded-lg hover:bg-red-50 flex items-center justify-center text-stone-500 hover:text-red-600 transition"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                )}
              </div>
            );
          })}
          {filtered.length === 0 && (
            <div className="p-8 text-center text-sm text-stone-500">No expenses match your filters</div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ExpensesView;
