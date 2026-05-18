import React, { useState, useEffect } from 'react';
import { Animal, Expense, Partner, AuditLog, ExpenseCategory, formatCurrency, calcAnimalROI } from '@/lib/farmData';
import {
  FileText, Download, BarChart3, PieChart, FileSpreadsheet, History,
  Plus, Pencil, Trash2,
} from 'lucide-react';
import {
  exportProfitLossPdf,
  exportPartnerPayoutPdf,
  exportExpenseLedgerCsv,
  exportWeightHistoryCsv,
  exportHerdInventory,
} from '@/lib/exports';
import { useAuth } from '@/contexts/AuthContext';
import { fetchAuditLogs } from '@/lib/farmDb';

interface Props {
  animals: Animal[];
  expenses: Expense[];
  partners: Partner[];
}

const ReportsView: React.FC<Props> = ({ animals, expenses, partners }) => {
  const { displayName, user } = useAuth();
  const author = { name: displayName, email: user?.email || '' };

  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [expCat, setExpCat] = useState<ExpenseCategory | 'All'>('All');
  const [weightAnimal, setWeightAnimal] = useState<'all' | string>('all');

  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [logsLoading, setLogsLoading] = useState(false);

  const loadLogs = async () => {
    setLogsLoading(true);
    try {
      const data = await fetchAuditLogs(50);
      setLogs(data);
    } catch (e) {
      console.warn('Failed to load audit logs', e);
    } finally {
      setLogsLoading(false);
    }
  };

  useEffect(() => { loadLogs(); }, []);

  const sold = animals.filter((a) => a.status === 'Sold');
  const totalRevenue = sold.reduce((s, a) => s + (a.salePrice || 0), 0);
  const totalAcq = animals.reduce((s, a) => s + a.acquisitionCost, 0);
  const totalExp = expenses.reduce((s, e) => s + e.amount, 0);
  const netProfit = totalRevenue - totalAcq - totalExp;

  const expByCat: Record<string, number> = {};
  expenses.forEach((e) => { expByCat[e.category] = (expByCat[e.category] || 0) + e.amount; });
  const catColors: Record<string, string> = {
    Feed: '#6B8E23', Medicine: '#DC2626', Labor: '#2563EB',
    Utilities: '#D97706', Maintenance: '#9333EA', Misc: '#78716C',
  };
  const totalForChart = Object.values(expByCat).reduce((s, v) => s + v, 0) || 1;
  let cumAngle = 0;
  const slices = Object.entries(expByCat).map(([cat, val]) => {
    const pct = val / totalForChart;
    const startA = cumAngle; cumAngle += pct * 360;
    return { cat, val, pct, startA, endA: cumAngle, color: catColors[cat] };
  });
  const polar = (cx: number, cy: number, r: number, a: number) => {
    const rad = ((a - 90) * Math.PI) / 180;
    return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
  };
  const arcPath = (s: number, e: number) => {
    const cx = 100, cy = 100, r = 80;
    const a = polar(cx, cy, r, e), b = polar(cx, cy, r, s);
    return `M ${cx} ${cy} L ${b.x} ${b.y} A ${r} ${r} 0 ${e - s <= 180 ? 0 : 1} 0 ${a.x} ${a.y} Z`;
  };

  const actionStyle: Record<string, string> = {
    create: 'bg-emerald-50 text-emerald-700',
    update: 'bg-blue-50 text-blue-700',
    delete: 'bg-red-50 text-red-700',
  };
  const actionIcon: Record<string, React.ElementType> = { create: Plus, update: Pencil, delete: Trash2 };

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl lg:text-3xl font-bold text-stone-800">Reports & Analytics</h1>
        <p className="text-stone-500 mt-1">Financial summaries and exportable reports</p>
      </div>

      <div className="bg-white rounded-2xl border border-stone-200 p-6">
        <h2 className="font-semibold text-stone-800 mb-4 flex items-center gap-2"><BarChart3 className="w-4 h-4 text-[#6B8E23]" /> Profit & Loss Summary</h2>
        <div className="space-y-3">
          <Row label="Total Revenue (Sales)" value={totalRevenue} positive />
          <Row label="Total Acquisition Costs" value={-totalAcq} />
          <Row label="Total Operating Expenses" value={-totalExp} />
          <div className="border-t border-stone-200 pt-3 mt-3">
            <Row label="Net Profit" value={netProfit} bold positive={netProfit >= 0} />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <div className="bg-white rounded-2xl border border-stone-200 p-5">
          <h3 className="font-semibold text-stone-800 mb-4 flex items-center gap-2"><PieChart className="w-4 h-4 text-[#D2691E]" /> Expense Distribution</h3>
          <div className="flex items-center gap-4">
            <svg viewBox="0 0 200 200" className="w-40 h-40 shrink-0">
              {slices.map((s) => <path key={s.cat} d={arcPath(s.startA, s.endA)} fill={s.color} />)}
              <circle cx="100" cy="100" r="40" fill="white" />
              <text x="100" y="95" textAnchor="middle" className="text-xs fill-stone-500 font-medium">Total</text>
              <text x="100" y="112" textAnchor="middle" className="text-sm fill-stone-800 font-bold">{formatCurrency(totalForChart).slice(0, 8)}</text>
            </svg>
            <div className="flex-1 space-y-1.5">
              {slices.map((s) => (
                <div key={s.cat} className="flex items-center gap-2 text-xs">
                  <span className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: s.color }} />
                  <span className="text-stone-600 flex-1">{s.cat}</span>
                  <span className="font-semibold text-stone-800">{(s.pct * 100).toFixed(0)}%</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-stone-200 p-5">
          <h3 className="font-semibold text-stone-800 mb-4">Top Performers by ROI</h3>
          <div className="space-y-2">
            {sold.slice().sort((a, b) => calcAnimalROI(b) - calcAnimalROI(a)).slice(0, 5).map((a, i) => {
              const roi = calcAnimalROI(a);
              return (
                <div key={a.id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-stone-50">
                  <div className="w-6 h-6 rounded-full bg-[#6B8E23]/10 text-[#6B8E23] text-xs font-bold flex items-center justify-center">{i + 1}</div>
                  <img src={a.photoUrl} className="w-9 h-9 rounded-lg object-cover" alt="" />
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-sm text-stone-800 truncate">{a.name} · {a.tagId}</div>
                    <div className="text-xs text-stone-500">Sold to {a.buyer}</div>
                  </div>
                  <div className={`font-bold text-sm ${roi >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>{roi >= 0 ? '+' : ''}{formatCurrency(roi)}</div>
                </div>
              );
            })}
            {sold.length === 0 && <div className="text-sm text-stone-500 text-center py-4">No sales yet</div>}
          </div>
        </div>
      </div>

      {/* Exportable reports - now wired up */}
      <div className="bg-white rounded-2xl border border-stone-200 p-5 space-y-5">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold text-stone-800">Generate Reports</h2>
          <span className="text-xs text-stone-500">Author: <span className="font-medium text-stone-700">{author.name}</span></span>
        </div>

        <ReportCard
          icon={FileText} format="PDF" name="Profit & Loss Statement"
          desc="Revenue, costs, and net profit for a date range"
        >
          <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="text-xs px-2 py-1.5 rounded border border-stone-200" />
          <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="text-xs px-2 py-1.5 rounded border border-stone-200" />
          <DLBtn onClick={() => exportProfitLossPdf({ animals, expenses, startDate: startDate || undefined, endDate: endDate || undefined, author })} />
        </ReportCard>

        <ReportCard icon={FileText} format="PDF" name="Partner Payout Statement" desc="Each partner's share of net profit">
          <DLBtn onClick={() => exportPartnerPayoutPdf({ partners, animals, expenses, author })} />
        </ReportCard>

        <ReportCard icon={FileSpreadsheet} format="CSV" name="Expense Ledger" desc="Filtered by category">
          <select value={expCat} onChange={(e) => setExpCat(e.target.value as ExpenseCategory | 'All')} className="text-xs px-2 py-1.5 rounded border border-stone-200">
            <option value="All">All categories</option>
            {(['Feed', 'Medicine', 'Labor', 'Utilities', 'Maintenance', 'Misc'] as ExpenseCategory[]).map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
          <DLBtn onClick={() => exportExpenseLedgerCsv({ expenses, animals, category: expCat })} />
        </ReportCard>

        <ReportCard icon={BarChart3} format="CSV" name="Weight Log History" desc="All weight measurements per animal">
          <select value={weightAnimal} onChange={(e) => setWeightAnimal(e.target.value)} className="text-xs px-2 py-1.5 rounded border border-stone-200">
            <option value="all">All animals</option>
            {animals.map((a) => <option key={a.id} value={a.id}>{a.name} ({a.tagId})</option>)}
          </select>
          <DLBtn onClick={() => exportWeightHistoryCsv({ animals, animalId: weightAnimal })} />
        </ReportCard>

        <ReportCard icon={FileSpreadsheet} format="PDF / CSV" name="Herd Inventory Snapshot" desc="Complete livestock register">
          <button onClick={() => exportHerdInventory({ animals, author, format: 'pdf' })} className="inline-flex items-center gap-1.5 bg-[#6B8E23] hover:bg-[#577A1C] text-white text-xs font-medium px-3 py-1.5 rounded-lg">
            <Download className="w-3.5 h-3.5" /> PDF
          </button>
          <button onClick={() => exportHerdInventory({ animals, author, format: 'csv' })} className="inline-flex items-center gap-1.5 bg-stone-100 hover:bg-stone-200 text-stone-700 text-xs font-medium px-3 py-1.5 rounded-lg">
            <Download className="w-3.5 h-3.5" /> CSV
          </button>
        </ReportCard>
      </div>

      {/* Audit log */}
      <div className="bg-white rounded-2xl border border-stone-200 p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold text-stone-800 flex items-center gap-2"><History className="w-4 h-4 text-[#6B8E23]" /> Audit Log</h2>
          <button onClick={loadLogs} className="text-xs text-[#6B8E23] hover:underline">Refresh</button>
        </div>
        {logsLoading ? (
          <div className="text-sm text-stone-500 py-4 text-center">Loading...</div>
        ) : logs.length === 0 ? (
          <div className="text-sm text-stone-500 py-4 text-center">No activity recorded yet</div>
        ) : (
          <div className="divide-y divide-stone-100 max-h-96 overflow-y-auto">
            {logs.map((l) => {
              const Icon = actionIcon[l.action] || History;
              return (
                <div key={l.id} className="py-2.5 flex items-start gap-3">
                  <div className={`w-7 h-7 rounded-lg shrink-0 flex items-center justify-center ${actionStyle[l.action]}`}>
                    <Icon className="w-3.5 h-3.5" />
                  </div>
                  <div className="flex-1 min-w-0 text-sm">
                    <div className="text-stone-800">
                      <span className="font-semibold capitalize">{l.action}</span>
                      <span className="text-stone-500"> · {l.entityType.replace('_', ' ')} · </span>
                      <span className="font-medium">{l.entityLabel}</span>
                    </div>
                    <div className="text-xs text-stone-500 mt-0.5">
                      {l.userName || l.userEmail} · {new Date(l.createdAt).toLocaleString()}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

const Row: React.FC<{ label: string; value: number; positive?: boolean; bold?: boolean }> = ({ label, value, positive, bold }) => (
  <div className={`flex items-center justify-between ${bold ? 'text-base' : 'text-sm'}`}>
    <span className={bold ? 'font-bold text-stone-800' : 'text-stone-600'}>{label}</span>
    <span className={`${bold ? 'font-bold' : 'font-semibold'} ${positive ? 'text-emerald-600' : value < 0 ? 'text-red-600' : 'text-stone-800'}`}>
      {value < 0 ? '-' : ''}{formatCurrency(Math.abs(value))}
    </span>
  </div>
);

const ReportCard: React.FC<{ icon: React.ElementType; format: string; name: string; desc: string; children: React.ReactNode }> = ({ icon: Icon, format, name, desc, children }) => (
  <div className="border border-stone-200 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center gap-3">
    <div className="w-10 h-10 rounded-lg bg-[#6B8E23]/10 flex items-center justify-center shrink-0">
      <Icon className="w-5 h-5 text-[#6B8E23]" />
    </div>
    <div className="flex-1 min-w-0">
      <div className="flex items-center gap-2">
        <div className="font-semibold text-sm text-stone-800">{name}</div>
        <span className="text-[10px] font-bold bg-stone-100 text-stone-600 px-1.5 py-0.5 rounded">{format}</span>
      </div>
      <div className="text-xs text-stone-500 mt-0.5">{desc}</div>
    </div>
    <div className="flex items-center gap-2 flex-wrap">{children}</div>
  </div>
);

const DLBtn: React.FC<{ onClick: () => void }> = ({ onClick }) => (
  <button onClick={onClick} className="inline-flex items-center gap-1.5 bg-[#6B8E23] hover:bg-[#577A1C] text-white text-xs font-semibold px-3 py-1.5 rounded-lg transition">
    <Download className="w-3.5 h-3.5" /> Download
  </button>
);

export default ReportsView;
