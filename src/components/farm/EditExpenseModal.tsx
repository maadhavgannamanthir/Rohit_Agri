import React, { useEffect, useState } from 'react';
import { Expense, ExpenseCategory, Animal } from '@/lib/farmData';
import { X, Save } from 'lucide-react';

interface Props {
  expense: Expense | null;
  animals: Animal[];
  onClose: () => void;
  onSave: (id: string, patch: Partial<Pick<Expense, 'amount' | 'category' | 'date' | 'scope' | 'animalId' | 'description' | 'recurring'>>) => void;
}

const CATS: ExpenseCategory[] = ['Feed', 'Medicine', 'Labor', 'Utilities', 'Maintenance', 'Misc'];

const EditExpenseModal: React.FC<Props> = ({ expense, animals, onClose, onSave }) => {
  const [form, setForm] = useState({
    date: '',
    category: 'Feed' as ExpenseCategory,
    description: '',
    amount: '',
    scope: 'Herd' as 'Herd' | 'Animal',
    animalId: '',
    recurring: false,
  });

  useEffect(() => {
    if (expense) {
      setForm({
        date: expense.date,
        category: expense.category,
        description: expense.description,
        amount: String(expense.amount),
        scope: expense.scope,
        animalId: expense.animalId || '',
        recurring: expense.recurring,
      });
    }
  }, [expense]);

  if (!expense) return null;

  const handleSave = () => {
    const amt = parseFloat(form.amount);
    if (!amt || !form.description.trim()) return;
    onSave(expense.id, {
      date: form.date,
      category: form.category,
      description: form.description.trim(),
      amount: amt,
      scope: form.scope,
      animalId: form.scope === 'Animal' ? form.animalId || undefined : undefined,
      recurring: form.recurring,
    });
  };

  return (
    <div className="fixed inset-0 z-[55] bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="bg-white w-full sm:max-w-lg rounded-t-3xl sm:rounded-2xl shadow-2xl">
        <div className="px-5 py-4 border-b border-stone-200 flex items-center justify-between">
          <div>
            <h2 className="font-bold text-stone-800">Edit Expense</h2>
            <p className="text-xs text-stone-500 mt-0.5">ID: {expense.id}</p>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-lg hover:bg-stone-100 flex items-center justify-center">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <Field label="Date">
              <input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} className="input" />
            </Field>
            <Field label="Amount">
              <input type="number" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} className="input" />
            </Field>
          </div>
          <Field label="Category">
            <select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value as ExpenseCategory })} className="input">
              {CATS.map((c) => <option key={c}>{c}</option>)}
            </select>
          </Field>
          <Field label="Description">
            <input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className="input" />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Scope">
              <select value={form.scope} onChange={(e) => setForm({ ...form, scope: e.target.value as 'Herd' | 'Animal' })} className="input">
                <option value="Herd">Whole Herd</option>
                <option value="Animal">Specific Animal</option>
              </select>
            </Field>
            {form.scope === 'Animal' && (
              <Field label="Animal">
                <select value={form.animalId} onChange={(e) => setForm({ ...form, animalId: e.target.value })} className="input">
                  <option value="">Select animal...</option>
                  {animals.map((a) => <option key={a.id} value={a.id}>{a.name} ({a.tagId})</option>)}
                </select>
              </Field>
            )}
          </div>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={form.recurring}
              onChange={(e) => setForm({ ...form, recurring: e.target.checked })}
              className="rounded border-stone-300 text-[#D2691E] focus:ring-[#D2691E]"
            />
            <span className="text-sm text-stone-700">Recurring expense</span>
          </label>
        </div>

        <div className="border-t border-stone-200 px-5 py-3 flex justify-end gap-2">
          <button onClick={onClose} className="px-4 py-2 rounded-lg text-sm font-medium text-stone-700 hover:bg-stone-100">Cancel</button>
          <button
            onClick={handleSave}
            className="inline-flex items-center gap-1.5 px-5 py-2 rounded-lg text-sm font-semibold bg-[#D2691E] hover:bg-[#b85a18] text-white"
          >
            <Save className="w-4 h-4" /> Save
          </button>
        </div>
      </div>
      <style>{`.input{width:100%;padding:.5rem .75rem;border-radius:.5rem;border:1px solid #e7e5e4;background:#fafaf9;font-size:.875rem;outline:none}.input:focus{background:#fff;border-color:#D2691E}`}</style>
    </div>
  );
};

const Field: React.FC<{ label: string; children: React.ReactNode }> = ({ label, children }) => (
  <div>
    <label className="text-xs font-medium text-stone-600 mb-1 block">{label}</label>
    {children}
  </div>
);

export default EditExpenseModal;
