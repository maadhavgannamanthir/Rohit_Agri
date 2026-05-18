import React from 'react';
import { Animal, Expense, Partner, formatCurrency, calcAnimalROI } from '@/lib/farmData';
import { TrendingUp, TrendingDown, Sprout, DollarSign, AlertTriangle, Scale, Activity, ArrowUpRight } from 'lucide-react';

interface Props {
  animals: Animal[];
  expenses: Expense[];
  partners: Partner[];
}

const Dashboard: React.FC<Props> = ({ animals, expenses, partners }) => {
  const active = animals.filter((a) => a.status === 'Active');
  const sold = animals.filter((a) => a.status === 'Sold');

  const totalRevenue = sold.reduce((s, a) => s + (a.salePrice || 0), 0);
  const totalAcquisition = animals.reduce((s, a) => s + a.acquisitionCost, 0);
  const totalExpenses = expenses.reduce((s, e) => s + e.amount, 0);
  const netProfit = totalRevenue - totalAcquisition - totalExpenses;

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

  const stats = [
    {
      label: 'Active Livestock',
      value: active.length.toString(),
      change: '+2 this month',
      icon: Sprout,
      color: 'bg-[#6B8E23]',
      trend: 'up' as const,
    },
    {
      label: 'Net Profit (YTD)',
      value: formatCurrency(netProfit),
      change: netProfit >= 0 ? '+12.4%' : '-4.2%',
      icon: DollarSign,
      color: 'bg-[#D2691E]',
      trend: netProfit >= 0 ? ('up' as const) : ('down' as const),
    },
    {
      label: 'Avg Herd Weight',
      value: `${avgWeight.toFixed(1)} kg`,
      change: '+0.8 kg/wk',
      icon: Scale,
      color: 'bg-[#8B6F47]',
      trend: 'up' as const,
    },
    {
      label: 'Health Alerts',
      value: alerts.length.toString(),
      change: alerts.length > 0 ? 'Action needed' : 'All healthy',
      icon: AlertTriangle,
      color: alerts.length > 0 ? 'bg-red-600' : 'bg-emerald-600',
      trend: alerts.length > 0 ? ('down' as const) : ('up' as const),
    },
  ];

  // Simple monthly cashflow data
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May'];
  const cashflow = [
    { month: 'Jan', income: 0, expense: 22000 },
    { month: 'Feb', income: 0, expense: 25000 },
    { month: 'Mar', income: 17200, expense: 28000 },
    { month: 'Apr', income: 18500, expense: 26500 },
    { month: 'May', income: 0, expense: 35100 },
  ];
  const maxBar = Math.max(...cashflow.map((c) => Math.max(c.income, c.expense)));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl lg:text-3xl font-bold text-stone-800">
          Good morning, Farmer 🌾
        </h1>
        <p className="text-stone-500 mt-1">
          Here's how your flock is doing today — {new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
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
                  className={`flex items-center gap-1 text-xs font-semibold ${
                    s.trend === 'up' ? 'text-emerald-600' : 'text-red-600'
                  }`}
                >
                  {s.trend === 'up' ? <TrendingUp className="w-3.5 h-3.5" /> : <TrendingDown className="w-3.5 h-3.5" />}
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

      {/* Cashflow + Alerts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <div className="lg:col-span-2 bg-white rounded-2xl border border-stone-200 p-5">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h2 className="font-semibold text-stone-800">Monthly Cash Flow</h2>
              <p className="text-xs text-stone-500">Revenue vs Expenses — 2025</p>
            </div>
            <div className="flex gap-3 text-xs">
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-sm bg-[#6B8E23]" /> Income
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-sm bg-[#D2691E]" /> Expense
              </div>
            </div>
          </div>
          <div className="flex items-end justify-between gap-3 h-52">
            {cashflow.map((c) => (
              <div key={c.month} className="flex-1 flex flex-col items-center gap-2">
                <div className="flex items-end gap-1 h-44 w-full justify-center">
                  <div
                    className="w-5 bg-[#6B8E23] rounded-t-md transition-all hover:opacity-80"
                    style={{ height: `${(c.income / maxBar) * 100}%`, minHeight: c.income ? '4px' : '0' }}
                    title={formatCurrency(c.income)}
                  />
                  <div
                    className="w-5 bg-[#D2691E] rounded-t-md transition-all hover:opacity-80"
                    style={{ height: `${(c.expense / maxBar) * 100}%`, minHeight: c.expense ? '4px' : '0' }}
                    title={formatCurrency(c.expense)}
                  />
                </div>
                <div className="text-xs font-medium text-stone-600">{c.month}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-stone-200 p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-stone-800">Health Alerts</h2>
            <Activity className="w-4 h-4 text-stone-400" />
          </div>
          {alerts.length === 0 ? (
            <div className="text-center py-8">
              <div className="w-12 h-12 mx-auto rounded-full bg-emerald-50 flex items-center justify-center mb-3">
                <Sprout className="w-6 h-6 text-emerald-600" />
              </div>
              <div className="text-sm font-medium text-stone-700">All animals healthy</div>
              <div className="text-xs text-stone-500 mt-1">No weight anomalies detected</div>
            </div>
          ) : (
            <div className="space-y-3">
              {alerts.map((a) => (
                <div key={a.id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-stone-50">
                  <img src={a.photoUrl} className="w-10 h-10 rounded-lg object-cover" alt={a.name} />
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-sm text-stone-800 truncate">{a.name}</div>
                    <div className="text-xs text-red-600">Weight drop detected</div>
                  </div>
                  <button className="text-xs font-medium text-[#6B8E23] hover:underline">View</button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Recent activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <div className="bg-white rounded-2xl border border-stone-200 p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-stone-800">Recent Sales</h2>
            <button className="text-xs font-medium text-[#6B8E23] hover:underline flex items-center gap-1">
              View all <ArrowUpRight className="w-3 h-3" />
            </button>
          </div>
          <div className="space-y-3">
            {sold.slice(0, 4).map((a) => {
              const roi = calcAnimalROI(a);
              return (
                <div key={a.id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-stone-50">
                  <img src={a.photoUrl} className="w-11 h-11 rounded-lg object-cover" alt={a.name} />
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-sm text-stone-800">{a.name} · {a.tagId}</div>
                    <div className="text-xs text-stone-500">{a.buyer} · {a.saleDate}</div>
                  </div>
                  <div className="text-right">
                    <div className="font-semibold text-sm text-stone-800">{formatCurrency(a.salePrice || 0)}</div>
                    <div className={`text-xs font-medium ${roi >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                      {roi >= 0 ? '+' : ''}{formatCurrency(roi)} ROI
                    </div>
                  </div>
                </div>
              );
            })}
            {sold.length === 0 && (
              <div className="text-sm text-stone-500 text-center py-4">No sales recorded yet</div>
            )}
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-stone-200 p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-stone-800">Recent Expenses</h2>
            <button className="text-xs font-medium text-[#6B8E23] hover:underline flex items-center gap-1">
              View all <ArrowUpRight className="w-3 h-3" />
            </button>
          </div>
          <div className="space-y-3">
            {expenses.slice(0, 4).map((e) => (
              <div key={e.id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-stone-50">
                <div className="w-10 h-10 rounded-lg bg-[#FAF0E0] flex items-center justify-center">
                  <Receipt category={e.category} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-sm text-stone-800 truncate">{e.description}</div>
                  <div className="text-xs text-stone-500">{e.category} · {e.date}</div>
                </div>
                <div className="font-semibold text-sm text-stone-800">{formatCurrency(e.amount)}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

const Receipt: React.FC<{ category: string }> = ({ category }) => {
  const colors: Record<string, string> = {
    Feed: 'text-[#6B8E23]',
    Medicine: 'text-red-600',
    Labor: 'text-blue-600',
    Utilities: 'text-amber-600',
    Maintenance: 'text-purple-600',
    Misc: 'text-stone-600',
  };
  return <span className={`text-xs font-bold ${colors[category]}`}>{category[0]}</span>;
};

export default Dashboard;
