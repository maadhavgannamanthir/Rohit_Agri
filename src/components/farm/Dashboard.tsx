import React, { useMemo, useState } from 'react';
import {
  Animal,
  Expense,
  Partner,
  MilkCollection,
  Client,
  MilkDelivery,
  Invoice,
  Payment,
  formatCurrency,
  calcAnimalROI,
  getRecentDailyGain
} from '@/lib/farmData';
import {
  TrendingUp,
  TrendingDown,
  Sprout,
  DollarSign,
  AlertTriangle,
  Scale,
  Activity,
  ArrowUpRight,
  Droplet,
  Users,
  FileText,
  CreditCard,
  Trophy,
  Package
} from 'lucide-react';

interface Props {
  animals: Animal[];
  expenses: Expense[];
  partners: Partner[];
  milkCollections?: MilkCollection[];
  deliveries?: MilkDelivery[];
  invoices?: Invoice[];
  payments?: Payment[];
  clients?: Client[];
}

const MONTH_LABELS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function monthKey(iso: string): string {
  return iso.slice(0, 7);
}

function ymToLabel(ym: string): string {
  const [, m] = ym.split('-');
  return MONTH_LABELS[Math.max(0, Math.min(11, parseInt(m, 10) - 1))];
}

const Dashboard: React.FC<Props> = ({
  animals = [],
  expenses = [],
  partners = [],
  milkCollections = [],
  deliveries = [],
  invoices = [],
  payments = [],
  clients = []
}) => {
  const active = animals.filter((a) => a.status === 'Active');
  const sold = animals.filter((a) => a.status === 'Sold');

  // Species counts
  const cows = active.filter((a) => a.species === 'Cow');
  const goats = active.filter((a) => a.species === 'Goat');
  const sheep = active.filter((a) => a.species === 'Sheep');

  // Milk stats
  const todayStr = new Date().toISOString().slice(0, 10);
  const currentMonthStr = new Date().toISOString().slice(0, 7); // YYYY-MM

  const todayCollected = milkCollections
    .filter((c) => c.date === todayStr)
    .reduce((sum, c) => sum + c.totalQty, 0);

  const monthCollected = milkCollections
    .filter((c) => c.date.startsWith(currentMonthStr))
    .reduce((sum, c) => sum + c.totalQty, 0);

  const totalDeliveredVolume = deliveries
    .filter((d) => d.status === 'Delivered')
    .reduce((sum, d) => sum + d.quantity, 0);

  const totalCollectedVolume = milkCollections.reduce((sum, c) => sum + c.totalQty, 0);
  const remainingInventory = Math.max(0, totalCollectedVolume - totalDeliveredVolume);

  // CRM client metrics
  const activeClientsCount = clients.filter((c) => c.active).length;

  const totalInvoiced = invoices.reduce((sum, i) => sum + i.grandTotal, 0);
  const totalPaidAmount = payments.reduce((sum, p) => sum + p.amountReceived, 0);
  const outstandingInvoiced = Math.max(0, totalInvoiced - totalPaidAmount);

  // Financial analytics (gross revenue from sales + milk, gross expenses from feed/labor + animal medicine/vet visits, net profit)
  const totalSaleRevenue = sold.reduce((s, a) => s + (a.salePrice || 0), 0);
  const totalMilkRevenue = deliveries
    .filter((d) => d.status === 'Delivered')
    .reduce((sum, d) => sum + d.totalAmount, 0);
  
  const grossRevenue = totalSaleRevenue + totalMilkRevenue;

  const totalAcquisition = animals.reduce((s, a) => s + a.acquisitionCost, 0);
  const totalExpenses = expenses.reduce((s, e) => s + e.amount, 0);
  const grossExpenses = totalAcquisition + totalExpenses;

  const netProfit = grossRevenue - grossExpenses;

  const avgWeight =
    active.reduce((s, a) => {
      const w = a.weights[a.weights.length - 1]?.weightKg || 0;
      return s + w;
    }, 0) / Math.max(active.length, 1);

  const alerts = active.filter((a) => {
    if (a.weights.length < 3) return false;
    const last = a.weights[a.weights.length - 1].weightKg;
    const prev = a.weights[a.weights.length - 3].weightKg;
    return (last - prev) / prev < -0.05;
  });

  // ---------- Real change metrics ----------
  const now = new Date();
  const currentYM = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  const prev = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const prevYM = `${prev.getFullYear()}-${String(prev.getMonth() + 1).padStart(2, '0')}`;

  // Active animals added this month (by acquisitionDate)
  const acquiredThisMonth = animals.filter(
    (a) => a.acquisitionDate && a.acquisitionDate.startsWith(currentYM),
  ).length;

  const activeChangeLabel = `Cows: ${cows.length} | Goats: ${goats.length} | Sheep: ${sheep.length}`;

  // Net profit MoM comparison
  const monthlyAgg = useMemo(() => {
    const map = new Map<string, { income: number; expense: number }>();
    for (const e of expenses) {
      const k = monthKey(e.date);
      const row = map.get(k) || { income: 0, expense: 0 };
      row.expense += e.amount;
      map.set(k, row);
    }
    for (const a of animals) {
      if (!a.acquisitionDate) continue;
      const k = monthKey(a.acquisitionDate);
      const row = map.get(k) || { income: 0, expense: 0 };
      row.expense += a.acquisitionCost;
      map.set(k, row);
    }
    for (const a of sold) {
      if (!a.saleDate || !a.salePrice) continue;
      const k = monthKey(a.saleDate);
      const row = map.get(k) || { income: 0, expense: 0 };
      row.income += a.salePrice;
      map.set(k, row);
    }
    for (const d of deliveries) {
      if (d.status !== 'Delivered') continue;
      const k = monthKey(d.date);
      const row = map.get(k) || { income: 0, expense: 0 };
      row.income += d.totalAmount;
      map.set(k, row);
    }
    return map;
  }, [expenses, animals, sold, deliveries]);

  const cur = monthlyAgg.get(currentYM) || { income: 0, expense: 0 };
  const prv = monthlyAgg.get(prevYM) || { income: 0, expense: 0 };
  const curNet = cur.income - cur.expense;
  const prvNet = prv.income - prv.expense;
  
  let profitChangeLabel = 'No prior month';
  let profitTrendUp = netProfit >= 0;
  if (prv.income !== 0 || prv.expense !== 0) {
    if (prvNet === 0) {
      profitChangeLabel = curNet >= 0 ? 'New profit' : 'New loss';
      profitTrendUp = curNet >= 0;
    } else {
      const pct = ((curNet - prvNet) / Math.abs(prvNet)) * 100;
      profitTrendUp = pct >= 0;
      profitChangeLabel = `${pct >= 0 ? '+' : ''}${pct.toFixed(1)}% vs last mo`;
    }
  } else if (cur.income !== 0 || cur.expense !== 0) {
    profitChangeLabel = curNet >= 0 ? 'First month profit' : 'First month loss';
    profitTrendUp = curNet >= 0;
  }

  // Top milking cow
  const topMilkingCow = useMemo(() => {
    if (milkCollections.length === 0) return null;
    const cowTotals = new Map<string, number>();
    milkCollections.forEach(c => {
      cowTotals.set(c.animalId, (cowTotals.get(c.animalId) || 0) + c.totalQty);
    });
    let maxQty = 0;
    let maxCowId = '';
    cowTotals.forEach((qty, id) => {
      if (qty > maxQty) {
        maxQty = qty;
        maxCowId = id;
      }
    });
    if (!maxCowId) return null;
    const cow = animals.find(a => a.id === maxCowId);
    return cow ? { name: cow.name, tagId: cow.tagId, total: maxQty } : null;
  }, [milkCollections, animals]);

  const stats = [
    {
      label: 'Active Livestock',
      value: active.length.toString(),
      change: activeChangeLabel,
      icon: Sprout,
      color: 'bg-[#6B8E23]',
      trend: 'up' as const,
      isTextChange: true
    },
    {
      label: "Today's Milk Yield",
      value: `${todayCollected.toFixed(1)} L`,
      change: `Monthly: ${monthCollected.toFixed(0)} L`,
      icon: Droplet,
      color: 'bg-sky-600',
      trend: todayCollected > 0 ? ('up' as const) : ('down' as const),
      isTextChange: true
    },
    {
      label: 'Active Clients',
      value: activeClientsCount.toString(),
      change: `Outstanding: ${formatCurrency(outstandingInvoiced)}`,
      icon: Users,
      color: 'bg-[#8B6F47]',
      trend: outstandingInvoiced > 0 ? ('down' as const) : ('up' as const),
      isTextChange: true
    },
    {
      label: 'Net Profit (YTD)',
      value: formatCurrency(netProfit),
      change: profitChangeLabel,
      icon: DollarSign,
      color: 'bg-[#D2691E]',
      trend: profitTrendUp ? ('up' as const) : ('down' as const)
    },
  ];

  // ---------- Real cashflow chart: last 6 months ----------
  const cashflow = useMemo(() => {
    const months: { key: string; label: string; income: number; expense: number }[] = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const ym = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      const row = monthlyAgg.get(ym) || { income: 0, expense: 0 };
      months.push({ key: ym, label: ymToLabel(ym), income: row.income, expense: row.expense });
    }
    return months;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [monthlyAgg]);

  const maxBar = Math.max(1, ...cashflow.map((c) => Math.max(c.income, c.expense)));
  const hasCashflow = cashflow.some((c) => c.income > 0 || c.expense > 0);

  // Tabs for Recent Activity Lists
  const [recentTab, setRecentTab] = useState<'sales_deliveries' | 'expenses_payments'>('sales_deliveries');

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl lg:text-3xl font-bold text-stone-850">
          Good morning, Farmer 🌾
        </h1>
        <p className="text-stone-500 mt-1">
          Here's how your farm is performing today — {new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
        </p>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((s) => {
          const Icon = s.icon;
          return (
            <div
              key={s.label}
              className="bg-white rounded-2xl border border-stone-200 p-5 hover:shadow-md transition"
            >
              <div className="flex items-start justify-between">
                <div className={`w-11 h-11 rounded-xl ${s.color} flex items-center justify-center text-white`}>
                  <Icon className="w-5 h-5" />
                </div>
                <div
                  className={`flex items-center gap-1 text-[11px] font-semibold ${
                    s.isTextChange 
                      ? 'text-stone-500' 
                      : s.trend === 'up' ? 'text-emerald-600' : 'text-red-650'
                  }`}
                >
                  {!s.isTextChange && (
                    s.trend === 'up' ? <TrendingUp className="w-3.5 h-3.5" /> : <TrendingDown className="w-3.5 h-3.5" />
                  )}
                  {s.change}
                </div>
              </div>
              <div className="mt-4">
                <div className="text-2xl font-bold text-stone-800">{s.value}</div>
                <div className="text-sm text-stone-500 mt-0.5">{s.label}</div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Primary Row: Cash Flow & Health / Performance */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        
        {/* Cashflow Chart */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-stone-200 p-5 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-5">
              <div>
                <h2 className="font-semibold text-stone-800">Monthly Cash Flow</h2>
                <p className="text-xs text-stone-500">
                  Revenue (Sales + Milk) vs Total Expenses — last 6 months
                </p>
              </div>
              <div className="flex gap-3 text-xs">
                <div className="flex items-center gap-1.5 font-medium text-stone-600">
                  <span className="w-2.5 h-2.5 rounded-sm bg-[#6B8E23]" /> Income
                </div>
                <div className="flex items-center gap-1.5 font-medium text-stone-600">
                  <span className="w-2.5 h-2.5 rounded-sm bg-[#D2691E]" /> Expense
                </div>
              </div>
            </div>
            {hasCashflow ? (
              <div className="flex items-end justify-between gap-3 h-52 pt-4">
                {cashflow.map((c) => (
                  <div key={c.key} className="flex-1 flex flex-col items-center gap-2">
                    <div className="flex items-end gap-1 h-40 w-full justify-center">
                      <div
                        className="w-5 bg-[#6B8E23] rounded-t-md transition-all hover:opacity-80"
                        style={{ height: `${(c.income / maxBar) * 100}%`, minHeight: c.income ? '4px' : '0' }}
                        title={`Income: ${formatCurrency(c.income)}`}
                      />
                      <div
                        className="w-5 bg-[#D2691E] rounded-t-md transition-all hover:opacity-80"
                        style={{ height: `${(c.expense / maxBar) * 100}%`, minHeight: c.expense ? '4px' : '0' }}
                        title={`Expense: ${formatCurrency(c.expense)}`}
                      />
                    </div>
                    <div className="text-xs font-semibold text-stone-500 mt-1">{c.label}</div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="h-52 flex flex-col items-center justify-center text-center">
                <div className="w-12 h-12 rounded-full bg-stone-100 flex items-center justify-center mb-3">
                  <DollarSign className="w-6 h-6 text-stone-400" />
                </div>
                <div className="text-sm font-semibold text-stone-700">No cash flow yet</div>
                <div className="text-xs text-stone-500 mt-1">
                  Log milk deliveries, expenses or record sales to populate this chart
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Dairy Stock & Highlights */}
        <div className="bg-white rounded-2xl border border-stone-200 p-5 flex flex-col justify-between">
          <div>
            <h2 className="font-semibold text-stone-800 mb-4 flex items-center gap-2">
              <Droplet className="w-4 h-4 text-sky-600" /> Dairy Highlights
            </h2>
            
            <div className="space-y-4">
              {/* Milk Stock Progress Bar */}
              <div className="border border-stone-150 p-4 rounded-xl space-y-2 bg-stone-50/50">
                <div className="flex justify-between items-center text-xs">
                  <span className="font-bold text-stone-600 flex items-center gap-1">
                    <Package className="w-3.5 h-3.5 text-sky-600" /> Milk Inventory
                  </span>
                  <span className="font-semibold text-stone-700">{remainingInventory.toFixed(1)} Liters</span>
                </div>
                <div className="w-full bg-stone-200 rounded-full h-2">
                  <div 
                    className="bg-sky-500 h-2 rounded-full transition-all duration-500" 
                    style={{ 
                      width: `${Math.min(100, totalCollectedVolume ? (remainingInventory / totalCollectedVolume) * 100 : 0)}%` 
                    }} 
                  />
                </div>
                <div className="flex justify-between text-[10px] text-stone-400">
                  <span>Collected: {totalCollectedVolume.toFixed(0)}L</span>
                  <span>Delivered: {totalDeliveredVolume.toFixed(0)}L</span>
                </div>
              </div>

              {/* Top Producer */}
              {topMilkingCow && (
                <div className="border border-stone-150 p-4 rounded-xl flex items-center gap-3 bg-amber-50/30 border-amber-250">
                  <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center text-amber-700 shrink-0">
                    <Trophy className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="text-[10px] uppercase font-bold text-amber-700 tracking-wider">Top Milk Producer</span>
                    <h3 className="font-bold text-stone-850 text-sm leading-tight mt-0.5">{topMilkingCow.name}</h3>
                    <p className="text-[11px] text-stone-500">Tag: {topMilkingCow.tagId} · Yield: {topMilkingCow.total.toFixed(0)}L</p>
                  </div>
                </div>
              )}

              {/* Herd Health Info */}
              <div className="border border-stone-150 p-4 rounded-xl flex items-center gap-3 bg-stone-50/50">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${alerts.length > 0 ? 'bg-red-50 text-red-650' : 'bg-emerald-50 text-emerald-700'}`}>
                  <Activity className="w-5 h-5" />
                </div>
                <div>
                  <span className="text-[10px] uppercase font-bold text-stone-500 tracking-wider">Flock Health Status</span>
                  <h3 className="font-bold text-stone-850 text-sm leading-tight mt-0.5">
                    {alerts.length > 0 ? `${alerts.length} Animal Alerts` : 'All Animals Healthy'}
                  </h3>
                  <p className="text-[11px] text-stone-500">
                    {alerts.length > 0 ? 'Urgent weigh-in drop detected' : 'No anomalies detected recently'}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Financial Summary Breakdown Panel */}
      <div className="bg-white border border-stone-200 rounded-2xl p-5">
        <h2 className="font-semibold text-stone-800 mb-4 flex items-center gap-2">
          <DollarSign className="w-4 h-4 text-emerald-600" /> ERP Financial Ledger Summary
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 divide-y md:divide-y-0 md:divide-x divide-stone-150">
          <div className="space-y-2">
            <span className="text-xs font-bold text-stone-500 uppercase tracking-wider block">Gross Revenue</span>
            <div className="text-2xl font-bold text-emerald-700">{formatCurrency(grossRevenue)}</div>
            <div className="space-y-1 text-xs text-stone-650 pt-2">
              <div className="flex justify-between">
                <span>Livestock Sales:</span>
                <span className="font-semibold text-stone-800">{formatCurrency(totalSaleRevenue)}</span>
              </div>
              <div className="flex justify-between">
                <span>Milk Deliveries:</span>
                <span className="font-semibold text-stone-800">{formatCurrency(totalMilkRevenue)}</span>
              </div>
            </div>
          </div>

          <div className="space-y-2 md:pl-6 pt-4 md:pt-0">
            <span className="text-xs font-bold text-stone-500 uppercase tracking-wider block">Gross Expenditures</span>
            <div className="text-2xl font-bold text-red-650">{formatCurrency(grossExpenses)}</div>
            <div className="space-y-1 text-xs text-stone-650 pt-2">
              <div className="flex justify-between">
                <span>Animal Acquisition:</span>
                <span className="font-semibold text-stone-800">{formatCurrency(totalAcquisition)}</span>
              </div>
              <div className="flex justify-between">
                <span>Operations & Health Expenses:</span>
                <span className="font-semibold text-stone-800">{formatCurrency(totalExpenses)}</span>
              </div>
            </div>
          </div>

          <div className="space-y-2 md:pl-6 pt-4 md:pt-0">
            <span className="text-xs font-bold text-stone-500 uppercase tracking-wider block">Net Farm Profit</span>
            <div className={`text-2xl font-bold ${netProfit >= 0 ? 'text-[#6B8E23]' : 'text-red-650'}`}>
              {formatCurrency(netProfit)}
            </div>
            <span className="text-[11px] text-stone-450 mt-1 block">
              Net balance after all livestock purchases, operations, and sales
            </span>
          </div>
        </div>
      </div>

      {/* Tabbed Recent Activities */}
      <div className="bg-white rounded-2xl border border-stone-200 overflow-hidden">
        <div className="border-b border-stone-200 bg-stone-50/50 px-5 py-3 flex items-center justify-between flex-wrap gap-2">
          <h2 className="font-semibold text-stone-800 text-sm">Recent Ledger Activity Logs</h2>
          <div className="flex gap-2">
            <button
              onClick={() => setRecentTab('sales_deliveries')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition ${
                recentTab === 'sales_deliveries'
                  ? 'bg-[#6B8E23] border-[#6B8E23] text-white'
                  : 'bg-white border-stone-250 text-stone-600 hover:bg-stone-50'
              }`}
            >
              Sales & Milk Deliveries
            </button>
            <button
              onClick={() => setRecentTab('expenses_payments')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition ${
                recentTab === 'expenses_payments'
                  ? 'bg-[#6B8E23] border-[#6B8E23] text-white'
                  : 'bg-white border-stone-250 text-stone-600 hover:bg-stone-50'
              }`}
            >
              Expenses & Customer Payments
            </button>
          </div>
        </div>

        <div className="p-5">
          {recentTab === 'sales_deliveries' ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Recent Livestock Sales */}
              <div>
                <h3 className="font-bold text-xs uppercase tracking-wider text-stone-500 mb-3 border-b border-stone-150 pb-2">
                  Recent Livestock Sales
                </h3>
                <div className="space-y-3">
                  {sold.slice(0, 4).map((a) => {
                    const roi = calcAnimalROI(a);
                    return (
                      <div key={a.id} className="flex items-center gap-3 p-2 rounded-xl border border-stone-100 hover:bg-stone-50 transition">
                        <img src={a.photoUrl || '/placeholder.jpg'} className="w-10 h-10 rounded-lg object-cover" alt={a.name} />
                        <div className="flex-1 min-w-0">
                          <div className="font-semibold text-sm text-stone-800">{a.name} · {a.tagId}</div>
                          <div className="text-xs text-stone-500">{a.buyer} · {a.saleDate}</div>
                        </div>
                        <div className="text-right">
                          <div className="font-bold text-sm text-stone-800">{formatCurrency(a.salePrice || 0)}</div>
                          <div className={`text-[11px] font-bold ${roi >= 0 ? 'text-[#6B8E23]' : 'text-red-650'}`}>
                            {roi >= 0 ? '+' : ''}{formatCurrency(roi)} ROI
                          </div>
                        </div>
                      </div>
                    );
                  })}
                  {sold.length === 0 && (
                    <div className="text-sm text-stone-500 text-center py-6">No sales recorded yet</div>
                  )}
                </div>
              </div>

              {/* Recent Milk Deliveries */}
              <div>
                <h3 className="font-bold text-xs uppercase tracking-wider text-stone-500 mb-3 border-b border-stone-150 pb-2">
                  Recent Milk Deliveries
                </h3>
                <div className="space-y-3">
                  {deliveries.slice(0, 4).map((d) => {
                    const client = clients.find(c => c.id === d.clientId);
                    return (
                      <div key={d.id} className="flex items-center gap-3 p-2 rounded-xl border border-stone-100 hover:bg-stone-50 transition">
                        <div className="w-10 h-10 rounded-lg bg-sky-50 flex items-center justify-center text-sky-600 shrink-0">
                          <Droplet className="w-5 h-5" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="font-semibold text-sm text-stone-800 truncate">{client?.name || 'Unknown Client'}</div>
                          <div className="text-xs text-stone-500">{d.quantity}L @ {formatCurrency(d.unitPrice)} · {d.date}</div>
                        </div>
                        <div className="text-right">
                          <div className="font-bold text-sm text-stone-800">{formatCurrency(d.totalAmount)}</div>
                          <span className={`text-[10px] font-bold uppercase ${d.status === 'Cancelled' ? 'text-red-500' : 'text-stone-500'}`}>
                            {d.status}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                  {deliveries.length === 0 && (
                    <div className="text-sm text-stone-500 text-center py-6">No milk deliveries logged yet</div>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Recent Expenses */}
              <div>
                <h3 className="font-bold text-xs uppercase tracking-wider text-stone-500 mb-3 border-b border-stone-150 pb-2">
                  Recent Expenses
                </h3>
                <div className="space-y-3">
                  {expenses.slice(0, 4).map((e) => (
                    <div key={e.id} className="flex items-center gap-3 p-2 rounded-xl border border-stone-100 hover:bg-stone-50 transition">
                      <div className="w-10 h-10 rounded-lg bg-stone-50 flex items-center justify-center shrink-0 font-bold text-stone-700 text-xs font-mono">
                        {e.category[0]}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-semibold text-sm text-stone-800 truncate">{e.description}</div>
                        <div className="text-xs text-stone-500">{e.category} · {e.date}</div>
                      </div>
                      <div className="font-bold text-sm text-red-650">{formatCurrency(e.amount)}</div>
                    </div>
                  ))}
                  {expenses.length === 0 && (
                    <div className="text-sm text-stone-500 text-center py-6">No expenses recorded yet</div>
                  )}
                </div>
              </div>

              {/* Recent Client Payments */}
              <div>
                <h3 className="font-bold text-xs uppercase tracking-wider text-stone-500 mb-3 border-b border-stone-150 pb-2">
                  Recent Customer Payments
                </h3>
                <div className="space-y-3">
                  {payments.slice(0, 4).map((p) => {
                    const client = clients.find(c => c.id === p.clientId);
                    return (
                      <div key={p.id} className="flex items-center gap-3 p-2 rounded-xl border border-stone-100 hover:bg-stone-50 transition">
                        <div className="w-10 h-10 rounded-lg bg-[#FAF0E0] flex items-center justify-center text-[#D2691E] shrink-0 font-mono">
                          P
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="font-semibold text-sm text-stone-800 truncate">{client?.name || 'Unknown Client'}</div>
                          <div className="text-xs text-stone-500">{p.paymentMethod} · {p.paymentDate}</div>
                        </div>
                        <div className="text-right">
                          <div className="font-bold text-sm text-emerald-750">{formatCurrency(p.amountReceived)}</div>
                          <span className="text-[10px] text-stone-400 font-semibold">{p.referenceNumber || 'No Ref'}</span>
                        </div>
                      </div>
                    );
                  })}
                  {payments.length === 0 && (
                    <div className="text-sm text-stone-500 text-center py-6">No payments received yet</div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
      
      {/* Health Alerts details panel */}
      {alerts.length > 0 && (
        <div className="bg-red-50/50 border border-red-200 rounded-2xl p-5">
          <h2 className="font-semibold text-red-800 mb-3 flex items-center gap-2 text-sm uppercase tracking-wider">
            <AlertTriangle className="w-4 h-4" /> Livestock Health Alert Actions Required
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {alerts.map((a) => (
              <div key={a.id} className="flex items-center gap-3 p-3 bg-white border border-red-100 rounded-xl">
                <img src={a.photoUrl || '/placeholder.jpg'} className="w-12 h-12 rounded-lg object-cover shrink-0" alt={a.name} />
                <div className="flex-1 min-w-0">
                  <div className="font-bold text-sm text-stone-800">{a.name} · Tag: {a.tagId}</div>
                  <div className="text-xs text-red-650">Weigh-in drop of &gt; 5% detected over last 3 updates</div>
                </div>
                <div className="text-xs text-stone-550 italic font-semibold">{a.breed}</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;
