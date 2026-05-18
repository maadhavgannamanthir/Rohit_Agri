import React, { useEffect, useState } from 'react';
import { Partner } from '@/lib/farmData';
import { X, Save } from 'lucide-react';

interface Props {
  partner: Partner | null;
  onClose: () => void;
  onSave: (id: string, patch: Partial<Pick<Partner, 'name' | 'contact' | 'investment' | 'sharePct' | 'joinDate'>>) => void;
}

const EditPartnerModal: React.FC<Props> = ({ partner, onClose, onSave }) => {
  const [form, setForm] = useState({ name: '', contact: '', investment: '', sharePct: '', joinDate: '' });

  useEffect(() => {
    if (partner) {
      setForm({
        name: partner.name,
        contact: partner.contact,
        investment: String(partner.investment),
        sharePct: String(partner.sharePct),
        joinDate: partner.joinDate,
      });
    }
  }, [partner]);

  if (!partner) return null;

  const handleSave = () => {
    const inv = parseFloat(form.investment);
    const sp = parseFloat(form.sharePct);
    if (!form.name.trim() || !inv || !sp) return;
    onSave(partner.id, {
      name: form.name.trim(),
      contact: form.contact.trim(),
      investment: inv,
      sharePct: sp,
      joinDate: form.joinDate,
    });
  };

  return (
    <div className="fixed inset-0 z-[55] bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="bg-white w-full sm:max-w-lg rounded-t-3xl sm:rounded-2xl shadow-2xl">
        <div className="px-5 py-4 border-b border-stone-200 flex items-center justify-between">
          <div>
            <h2 className="font-bold text-stone-800">Edit Partner</h2>
            <p className="text-xs text-stone-500 mt-0.5">ID: {partner.id}</p>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-lg hover:bg-stone-100 flex items-center justify-center">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5 space-y-3">
          <Field label="Name">
            <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="input" />
          </Field>
          <Field label="Contact (email/phone)">
            <input value={form.contact} onChange={(e) => setForm({ ...form, contact: e.target.value })} className="input" />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Investment">
              <input type="number" value={form.investment} onChange={(e) => setForm({ ...form, investment: e.target.value })} className="input" />
            </Field>
            <Field label="Share %">
              <input type="number" value={form.sharePct} onChange={(e) => setForm({ ...form, sharePct: e.target.value })} className="input" />
            </Field>
          </div>
          <Field label="Join Date">
            <input type="date" value={form.joinDate} onChange={(e) => setForm({ ...form, joinDate: e.target.value })} className="input" />
          </Field>
        </div>

        <div className="border-t border-stone-200 px-5 py-3 flex justify-end gap-2">
          <button onClick={onClose} className="px-4 py-2 rounded-lg text-sm font-medium text-stone-700 hover:bg-stone-100">Cancel</button>
          <button
            onClick={handleSave}
            className="inline-flex items-center gap-1.5 px-5 py-2 rounded-lg text-sm font-semibold bg-[#6B8E23] hover:bg-[#577A1C] text-white"
          >
            <Save className="w-4 h-4" /> Save
          </button>
        </div>
      </div>
      <style>{`.input{width:100%;padding:.5rem .75rem;border-radius:.5rem;border:1px solid #e7e5e4;background:#fafaf9;font-size:.875rem;outline:none}.input:focus{background:#fff;border-color:#6B8E23}`}</style>
    </div>
  );
};

const Field: React.FC<{ label: string; children: React.ReactNode }> = ({ label, children }) => (
  <div>
    <label className="text-xs font-medium text-stone-600 mb-1 block">{label}</label>
    {children}
  </div>
);

export default EditPartnerModal;
