import React, { useState } from 'react';
import { Partner, Animal, Expense, formatCurrency } from '@/lib/farmData';
import { Plus, Users, Mail, Calendar, Pencil, Trash2 } from 'lucide-react';

interface Props {
  partners: Partner[];
  animals: Animal[];
  expenses: Expense[];
  onAdd: (p: Omit<Partner, 'id' | 'avatar'>) => void;
  onEdit?: (p: Partner) => void;
  onDelete?: (p: Partner) => void;
}

const PartnersView: React.FC<Props> = ({ partners, animals, expenses, onAdd, onEdit, onDelete }) => {
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: '', contact: '', investment: '', joinDate: new Date().toISOString().slice(0, 10), sharePct: '' });

  const totalInvestment = partners.reduce((s, p) => s + p.investment, 0);
  const totalRevenue = animals.filter((a) => a.status === 'Sold').reduce((s, a) => s + (a.salePrice || 0), 0);
  const totalAcq = animals.reduce((s, a) => s + a.acquisitionCost, 0);
  const totalExp = expenses.reduce((s, e) => s + e.amount, 0);
  const netProfit = totalRevenue - totalAcq - totalExp;

  const handleSubmit = () => {
    const inv = parseFloat(form.investment);
    const sp = parseFloat(form.sharePct);
    if (!inv || !form.name || !sp) return;
    onAdd({ name: form.name, contact: form.contact, investment: inv, joinDate: form.joinDate, sharePct: sp });
    setForm({ name: '', contact: '', investment: '', joinDate: new Date().toISOString().slice(0, 10), sharePct: '' });
    setShowForm(false);
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold text-stone-800">Partners & Investments</h1>
          <p className="text-stone-500 mt-1">{partners.length} active partners · {formatCurrency(totalInvestment)} total invested</p>
        </div>
        <button
          onClick={() => setShowForm((s) => !s)}
          className="inline-flex items-center gap-2 bg-[#6B8E23] hover:bg-[#5a7a1d] text-white px-4 py-2.5 rounded-xl text-sm font-medium shadow-sm transition"
        >
          <Plus className="w-4 h-4" /> {showForm ? 'Cancel' : 'Add Partner'}
        </button>
      </div>

      <div className="bg-gradient-to-br from-[#2D3B1F] to-[#3d5028] rounded-2xl p-6 text-white">
        <div className="flex items-center justify-between mb-4">
          <div>
            <div className="text-xs uppercase tracking-wider text-stone-300 font-semibold">Farm Net Profit (YTD)</div>
            <div className="text-3xl lg:text-4xl font-bold mt-1">{formatCurrency(netProfit)}</div>
          </div>
          <div className={`px-3 py-1.5 rounded-full text-xs font-bold ${netProfit >= 0 ? 'bg-emerald-500/20 text-emerald-300' : 'bg-red-500/20 text-red-300'}`}>
            {netProfit >= 0 ? '+ Profit' : 'Loss'}
          </div>
        </div>
        <div className="grid grid-cols-3 gap-4 pt-4 border-t border-white/10">
          <div><div className="text-xs text-stone-300">Revenue</div><div className="font-semibold text-lg">{formatCurrency(totalRevenue)}</div></div>
          <div><div className="text-xs text-stone-300">Acquisition</div><div className="font-semibold text-lg">{formatCurrency(totalAcq)}</div></div>
          <div><div className="text-xs text-stone-300">Operating Costs</div><div className="font-semibold text-lg">{formatCurrency(totalExp)}</div></div>
        </div>
      </div>

      {showForm && (
        <div className="bg-white rounded-2xl border border-stone-200 p-5 space-y-4">
          <h2 className="font-semibold text-stone-800">New Partner</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Full name" className="px-3 py-2 rounded-lg border border-stone-200 bg-stone-50 text-sm outline-none focus:bg-white focus:border-[#6B8E23]" />
            <input value={form.contact} onChange={(e) => setForm({ ...form, contact: e.target.value })} placeholder="Email/Phone" className="px-3 py-2 rounded-lg border border-stone-200 bg-stone-50 text-sm outline-none focus:bg-white focus:border-[#6B8E23]" />
            <input type="number" value={form.investment} onChange={(e) => setForm({ ...form, investment: e.target.value })} placeholder="Investment Amount" className="px-3 py-2 rounded-lg border border-stone-200 bg-stone-50 text-sm outline-none focus:bg-white focus:border-[#6B8E23]" />
            <input type="number" value={form.sharePct} onChange={(e) => setForm({ ...form, sharePct: e.target.value })} placeholder="Share %" className="px-3 py-2 rounded-lg border border-stone-200 bg-stone-50 text-sm outline-none focus:bg-white focus:border-[#6B8E23]" />
            <input type="date" value={form.joinDate} onChange={(e) => setForm({ ...form, joinDate: e.target.value })} className="px-3 py-2 rounded-lg border border-stone-200 bg-stone-50 text-sm outline-none focus:bg-white focus:border-[#6B8E23] sm:col-span-2" />
          </div>
          <button onClick={handleSubmit} className="bg-[#6B8E23] hover:bg-[#5a7a1d] text-white px-5 py-2 rounded-lg text-sm font-medium">Save Partner</button>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {partners.map((p) => {
          const profitShare = (p.sharePct / 100) * netProfit;
          return (
            <div key={p.id} className="bg-white rounded-2xl border border-stone-200 p-5 hover:shadow-md transition">
              <div className="flex items-start gap-4">
                <img src={p.avatar} alt={p.name} className="w-14 h-14 rounded-xl object-cover bg-stone-100" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="font-bold text-stone-800">{p.name}</div>
                      <div className="text-xs text-stone-500 flex items-center gap-1 mt-0.5"><Mail className="w-3 h-3" /> {p.contact}</div>
                    </div>
                    <span className="text-xs font-bold bg-[#6B8E23]/10 text-[#6B8E23] px-2 py-0.5 rounded-md">{p.sharePct}%</span>
                  </div>
                  <div className="text-xs text-stone-500 flex items-center gap-1 mt-2"><Calendar className="w-3 h-3" /> Joined {p.joinDate}</div>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3 mt-4 pt-4 border-t border-stone-100">
                <div><div className="text-[10px] uppercase text-stone-400 font-semibold">Investment</div><div className="font-bold text-stone-800">{formatCurrency(p.investment)}</div></div>
                <div><div className="text-[10px] uppercase text-stone-400 font-semibold">Profit Share</div><div className={`font-bold ${profitShare >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>{profitShare >= 0 ? '+' : ''}{formatCurrency(profitShare)}</div></div>
              </div>
              {(onEdit || onDelete) && (
                <div className="flex gap-2 mt-4">
                  {onEdit && (
                    <button onClick={() => onEdit(p)} className="flex-1 inline-flex items-center justify-center gap-1.5 bg-stone-100 hover:bg-stone-200 text-stone-700 text-xs font-medium px-3 py-2 rounded-lg transition">
                      <Pencil className="w-3.5 h-3.5" /> Edit
                    </button>
                  )}
                  {onDelete && (
                    <button onClick={() => onDelete(p)} className="flex-1 inline-flex items-center justify-center gap-1.5 bg-red-50 hover:bg-red-100 text-red-700 text-xs font-medium px-3 py-2 rounded-lg transition">
                      <Trash2 className="w-3.5 h-3.5" /> Delete
                    </button>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div className="bg-white rounded-2xl border border-stone-200 p-5">
        <div className="flex items-center gap-2 mb-4"><Users className="w-4 h-4 text-[#6B8E23]" /><h2 className="font-semibold text-stone-800">Equity Distribution</h2></div>
        <div className="flex h-10 rounded-lg overflow-hidden">
          {partners.map((p, i) => {
            const colors = ['#6B8E23', '#D2691E', '#8B6F47', '#556B2F', '#A0522D'];
            return (
              <div key={p.id} className="flex items-center justify-center text-white text-xs font-semibold transition hover:opacity-90" style={{ width: `${p.sharePct}%`, backgroundColor: colors[i % colors.length] }} title={`${p.name}: ${p.sharePct}%`}>
                {p.sharePct >= 8 && `${p.sharePct}%`}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default PartnersView;
