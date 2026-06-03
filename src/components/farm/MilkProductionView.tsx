import React, { useState, useMemo } from 'react';
import { Animal, MilkCollection, MilkDelivery } from '@/lib/farmData';
import {
  Droplet, Calendar, Plus, Trash2, Trophy, BarChart3, TrendingUp,
  Package, Search, Filter, ClipboardCheck
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, AreaChart, Area, LineChart, Line
} from 'recharts';

interface Props {
  animals: Animal[];
  milkCollections: MilkCollection[];
  deliveries: MilkDelivery[];
  onAddCollection: (c: Omit<MilkCollection, 'id' | 'totalQty'>) => Promise<void>;
  onDeleteCollection: (id: string, animalId: string, date: string, total: number) => Promise<void>;
}

const MilkProductionView: React.FC<Props> = ({
  animals, milkCollections, deliveries, onAddCollection, onDeleteCollection
}) => {
  const activeCows = animals.filter(a => a.status === 'Active' && a.species === 'Cow');
  const [selectedCowId, setSelectedCowId] = useState(activeCows[0]?.id || '');
  const [morningQty, setMorningQty] = useState('');
  const [eveningQty, setEveningQty] = useState('');
  const [colDate, setColDate] = useState(new Date().toISOString().slice(0, 10));
  const [notes, setNotes] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCowFilter, setSelectedCowFilter] = useState('All');

  // stats calculations
  const todayStr = new Date().toISOString().slice(0, 10);
  const currentMonthStr = new Date().toISOString().slice(0, 7); // YYYY-MM

  const todayCollected = useMemo(() => {
    return milkCollections
      .filter(c => c.date === todayStr)
      .reduce((sum, c) => sum + c.totalQty, 0);
  }, [milkCollections, todayStr]);

  const monthCollected = useMemo(() => {
    return milkCollections
      .filter(c => c.date.startsWith(currentMonthStr))
      .reduce((sum, c) => sum + c.totalQty, 0);
  }, [milkCollections, currentMonthStr]);

  const totalDelivered = useMemo(() => {
    return deliveries
      .filter(d => d.status === 'Delivered')
      .reduce((sum, d) => sum + d.quantity, 0);
  }, [deliveries]);

  const totalCollected = useMemo(() => {
    return milkCollections.reduce((sum, c) => sum + c.totalQty, 0);
  }, [milkCollections]);

  const remainingInventory = Math.max(0, totalCollected - totalDelivered);

  // Per-cow production ranking
  const cowPerformance = useMemo(() => {
    const map = new Map<string, { name: string; tag: string; count: number; total: number }>();
    milkCollections.forEach(c => {
      const animal = animals.find(a => a.id === c.animalId);
      if (!animal) return;
      const data = map.get(c.animalId) || { name: animal.name, tag: animal.tagId, count: 0, total: 0 };
      data.count += 1;
      data.total += c.totalQty;
      map.set(c.animalId, data);
    });
    return Array.from(map.entries())
      .map(([id, stats]) => ({
        id,
        ...stats,
        avg: stats.count ? stats.total / stats.count : 0
      }))
      .sort((a, b) => b.total - a.total);
  }, [milkCollections, animals]);

  const topProducer = cowPerformance[0];

  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCowId || !morningQty || !eveningQty) return;
    await onAddCollection({
      animalId: selectedCowId,
      date: colDate,
      morningQty: parseFloat(morningQty),
      eveningQty: parseFloat(eveningQty),
      notes
    });
    setMorningQty('');
    setEveningQty('');
    setNotes('');
  };

  // Filter collections
  const filteredCollections = useMemo(() => {
    return milkCollections.filter(c => {
      const animal = animals.find(a => a.id === c.animalId);
      const nameMatch = animal?.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         animal?.tagId.toLowerCase().includes(searchQuery.toLowerCase());
      const cowMatch = selectedCowFilter === 'All' || c.animalId === selectedCowFilter;
      return nameMatch && cowMatch;
    });
  }, [milkCollections, animals, searchQuery, selectedCowFilter]);

  // Analytics Chart Data - Last 7 Days
  const chartDataLast7Days = useMemo(() => {
    const dates = Array.from({ length: 7 }, (_, i) => {
      const d = new Date();
      d.setDate(d.getDate() - i);
      return d.toISOString().slice(0, 10);
    }).reverse();

    return dates.map(d => {
      const dayLogs = milkCollections.filter(c => c.date === d);
      const morning = dayLogs.reduce((sum, c) => sum + c.morningQty, 0);
      const evening = dayLogs.reduce((sum, c) => sum + c.eveningQty, 0);
      const total = dayLogs.reduce((sum, c) => sum + c.totalQty, 0);
      // Format to MMM DD
      const dateParts = d.split('-');
      const label = `${dateParts[2]}/${dateParts[1]}`;
      return { date: label, morning, evening, total };
    });
  }, [milkCollections]);

  // Monthly yield charts
  const chartDataMonthly = useMemo(() => {
    const map = new Map<string, { date: string; morning: number; evening: number; total: number }>();
    // Group by YYYY-MM
    milkCollections.forEach(c => {
      const monthStr = c.date.slice(0, 7);
      const data = map.get(monthStr) || { date: monthStr, morning: 0, evening: 0, total: 0 };
      data.morning += c.morningQty;
      data.evening += c.eveningQty;
      data.total += c.totalQty;
      map.set(monthStr, data);
    });

    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return Array.from(map.entries())
      .map(([key, value]) => {
        const [year, month] = key.split('-');
        const idx = parseInt(month) - 1;
        return {
          month: `${monthNames[idx]} ${year.slice(2)}`,
          morning: value.morning,
          evening: value.evening,
          total: value.total,
          key
        };
      })
      .sort((a, b) => a.key.localeCompare(b.key));
  }, [milkCollections]);

  return (
    <div className="space-y-6">
      {/* Overview Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-2xl border border-stone-200 p-5 hover:shadow-md transition">
          <div className="flex items-center justify-between">
            <div className="w-10 h-10 rounded-xl bg-sky-500/10 flex items-center justify-center text-sky-600">
              <Droplet className="w-5 h-5" />
            </div>
            <span className="text-[10px] bg-sky-50 text-sky-700 px-2 py-0.5 rounded font-bold uppercase tracking-wider">Today</span>
          </div>
          <div className="mt-4">
            <div className="text-2xl font-bold text-stone-850">{todayCollected.toFixed(1)} <span className="text-sm font-medium text-stone-400">Liters</span></div>
            <div className="text-xs text-stone-500 mt-1">Milk collected today</div>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-stone-200 p-5 hover:shadow-md transition">
          <div className="flex items-center justify-between">
            <div className="w-10 h-10 rounded-xl bg-indigo-500/10 flex items-center justify-center text-indigo-600">
              <Calendar className="w-5 h-5" />
            </div>
            <span className="text-[10px] bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded font-bold uppercase tracking-wider">Month</span>
          </div>
          <div className="mt-4">
            <div className="text-2xl font-bold text-stone-850">{monthCollected.toFixed(1)} <span className="text-sm font-medium text-stone-400">Liters</span></div>
            <div className="text-xs text-stone-500 mt-1">Milk collected this month</div>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-stone-200 p-5 hover:shadow-md transition">
          <div className="flex items-center justify-between">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-600">
              <Package className="w-5 h-5" />
            </div>
            <span className="text-[10px] bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded font-bold uppercase tracking-wider">Inventory</span>
          </div>
          <div className="mt-4">
            <div className="text-2xl font-bold text-stone-850">{remainingInventory.toFixed(1)} <span className="text-sm font-medium text-stone-400">Liters</span></div>
            <div className="text-xs text-stone-500 mt-1">Total in-stock remaining</div>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-stone-200 p-5 hover:shadow-md transition">
          <div className="flex items-center justify-between">
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center text-amber-600">
              <Trophy className="w-5 h-5" />
            </div>
            <span className="text-[10px] bg-amber-50 text-amber-700 px-2 py-0.5 rounded font-bold uppercase tracking-wider">Top Cow</span>
          </div>
          <div className="mt-4">
            <div className="text-xl font-bold text-stone-855 truncate">
              {topProducer ? `${topProducer.name} (${topProducer.tag})` : '—'}
            </div>
            <div className="text-xs text-stone-500 mt-1">
              {topProducer ? `${topProducer.total.toFixed(1)}L total yield` : 'No logs yet'}
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Left Column: Form & History */}
        <div className="lg:col-span-1 space-y-5">
          {/* Milk Log Input Form */}
          <div className="bg-white border border-stone-200 rounded-2xl p-5">
            <h2 className="font-bold text-stone-800 text-sm mb-4 uppercase tracking-wider flex items-center gap-2">
              <ClipboardCheck className="w-4 h-4 text-[#6B8E23]" /> Daily Milking Log
            </h2>
            {activeCows.length === 0 ? (
              <div className="text-xs text-stone-500 py-3 text-center">
                Register active cows in the Livestock view to log milk collection.
              </div>
            ) : (
              <form onSubmit={handleAddSubmit} className="space-y-4">
                <div>
                  <label className="text-[10px] font-bold uppercase text-stone-500 block mb-1.5">Select Cow *</label>
                  <select
                    value={selectedCowId}
                    onChange={(e) => setSelectedCowId(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-stone-250 bg-stone-50 text-sm outline-none focus:bg-white focus:border-[#6B8E23]"
                  >
                    {activeCows.map(a => (
                      <option key={a.id} value={a.id}>{a.name} ({a.tagId})</option>
                    ))}
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[10px] font-bold uppercase text-stone-500 block mb-1.5">Morning Qty (L) *</label>
                    <input
                      required
                      type="number"
                      step="0.1"
                      placeholder="e.g. 12.5"
                      value={morningQty}
                      onChange={(e) => setMorningQty(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg border border-stone-250 bg-stone-50 text-sm outline-none focus:bg-white focus:border-[#6B8E23]"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold uppercase text-stone-500 block mb-1.5">Evening Qty (L) *</label>
                    <input
                      required
                      type="number"
                      step="0.1"
                      placeholder="e.g. 10.2"
                      value={eveningQty}
                      onChange={(e) => setEveningQty(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg border border-stone-250 bg-stone-50 text-sm outline-none focus:bg-white focus:border-[#6B8E23]"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-1 gap-3">
                  <div>
                    <label className="text-[10px] font-bold uppercase text-stone-500 block mb-1.5">Collection Date</label>
                    <input
                      type="date"
                      value={colDate}
                      onChange={(e) => setColDate(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg border border-stone-255 bg-stone-50 text-xs outline-none focus:bg-white focus:border-[#6B8E23]"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold uppercase text-stone-500 block mb-1.5">Notes</label>
                    <input
                      type="text"
                      placeholder="Normal / Off-feed comments..."
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg border border-stone-250 bg-stone-50 text-sm outline-none focus:bg-white focus:border-[#6B8E23]"
                    />
                  </div>
                </div>
                <button
                  type="submit"
                  disabled={!selectedCowId || !morningQty || !eveningQty}
                  className="w-full bg-[#6B8E23] hover:bg-[#5a7a1d] disabled:bg-stone-300 text-white py-2.5 rounded-xl text-sm font-semibold transition shadow-sm"
                >
                  Save Collection Log
                </button>
              </form>
            )}
          </div>

          {/* Collection Logs List */}
          <div className="bg-white border border-stone-200 rounded-2xl p-5">
            <div className="flex flex-col gap-3 mb-4">
              <h2 className="font-bold text-stone-800 text-sm uppercase tracking-wider">Milking Records</h2>
              <input
                type="text"
                placeholder="Search cow name/tag..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full px-3 py-1.5 rounded-lg border border-stone-200 bg-stone-50 text-xs outline-none focus:bg-white focus:border-[#6B8E23]"
              />
              <select
                value={selectedCowFilter}
                onChange={(e) => setSelectedCowFilter(e.target.value)}
                className="w-full px-3 py-1.5 rounded-lg border border-stone-200 bg-stone-50 text-xs outline-none focus:bg-white focus:border-[#6B8E23]"
              >
                <option value="All">Filter: All Cows</option>
                {activeCows.map(a => (
                  <option key={a.id} value={a.id}>{a.name} ({a.tagId})</option>
                ))}
              </select>
            </div>

            <div className="space-y-2.5 max-h-80 overflow-y-auto">
              {filteredCollections.map(c => {
                const cow = animals.find(a => a.id === c.animalId);
                return (
                  <div key={c.id} className="p-3 rounded-xl bg-stone-50 border border-stone-200/50 hover:bg-stone-100/50 transition flex justify-between items-center text-xs">
                    <div>
                      <div className="font-bold text-stone-800">{cow ? cow.name : 'Unknown Cow'} ({cow?.tagId || c.animalId})</div>
                      <div className="text-[10px] text-stone-400 mt-0.5">{c.date}</div>
                      <div className="text-[10px] text-[#6B8E23] mt-1">M: {c.morningQty}L · E: {c.eveningQty}L</div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="text-right font-bold text-sm text-stone-800">{c.totalQty} L</div>
                      <button
                        onClick={() => onDeleteCollection(c.id, c.animalId, c.date, c.totalQty)}
                        className="p-1 text-stone-450 hover:text-red-650 hover:bg-red-50 rounded-lg transition"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })}
              {filteredCollections.length === 0 && (
                <div className="text-center py-6 text-stone-400">No collection records found.</div>
              )}
            </div>
          </div>
        </div>

        {/* Right Column: Charts & Cow Rankings */}
        <div className="lg:col-span-2 space-y-5">
          {/* Charts Card */}
          <div className="bg-white border border-stone-200 rounded-2xl p-5">
            <h2 className="font-bold text-stone-850 text-sm mb-4 uppercase tracking-wider flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-[#6B8E23]" /> Yield Trends
            </h2>

            <div className="space-y-6">
              {/* Daily Chart (Last 7 Days) */}
              <div>
                <h3 className="text-xs font-semibold text-stone-500 mb-2 uppercase tracking-wider">7-Day Daily Production</h3>
                <div className="h-44 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={chartDataLast7Days} margin={{ top: 5, right: 5, left: -25, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#F2F0EB" />
                      <XAxis dataKey="date" stroke="#888888" fontSize={9} tickLine={false} />
                      <YAxis stroke="#888888" fontSize={9} tickLine={false} />
                      <Tooltip contentStyle={{ background: '#FFF', border: '1px solid #E6E4DD', borderRadius: '12px', fontSize: '11px' }} />
                      <Bar dataKey="morning" name="Morning" fill="#38BDF8" stackId="a" radius={[0, 0, 0, 0]} />
                      <Bar dataKey="evening" name="Evening" fill="#818CF8" stackId="a" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Monthly Chart (All months) */}
              <div className="pt-4 border-t border-stone-100">
                <h3 className="text-xs font-semibold text-stone-500 mb-2 uppercase tracking-wider">Monthly Aggregated Yield</h3>
                <div className="h-44 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={chartDataMonthly} margin={{ top: 5, right: 5, left: -25, bottom: 5 }}>
                      <defs>
                        <linearGradient id="yieldGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#6B8E23" stopOpacity={0.2} />
                          <stop offset="95%" stopColor="#6B8E23" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#F2F0EB" />
                      <XAxis dataKey="month" stroke="#888888" fontSize={9} tickLine={false} />
                      <YAxis stroke="#888888" fontSize={9} tickLine={false} />
                      <Tooltip contentStyle={{ background: '#FFF', border: '1px solid #E6E4DD', borderRadius: '12px', fontSize: '11px' }} />
                      <Area type="monotone" dataKey="total" name="Total Yield (L)" stroke="#6B8E23" strokeWidth={2} fillOpacity={1} fill="url(#yieldGrad)" />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
          </div>

          {/* Cow Leaderboard Rankings */}
          <div className="bg-white border border-stone-200 rounded-2xl p-5">
            <h2 className="font-bold text-stone-850 text-sm mb-4 uppercase tracking-wider flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-[#6B8E23]" /> Cow Performance Rankings
            </h2>
            <div className="border border-stone-200 rounded-xl overflow-hidden">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-stone-50 border-b border-stone-200 font-semibold text-stone-600">
                    <th className="p-3">Rank</th>
                    <th className="p-3">Cow Name</th>
                    <th className="p-3">Tag ID</th>
                    <th className="p-3 text-right">Avg Daily</th>
                    <th className="p-3 text-right font-bold">Total Output</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100">
                  {cowPerformance.map((cow, i) => (
                    <tr key={cow.id} className="hover:bg-stone-50/50">
                      <td className="p-3 font-semibold text-stone-500">
                        {i === 0 ? '🥇 1' : i === 1 ? '🥈 2' : i === 2 ? '🥉 3' : `${i + 1}`}
                      </td>
                      <td className="p-3 font-bold text-stone-800">{cow.name}</td>
                      <td className="p-3 text-stone-500">{cow.tag}</td>
                      <td className="p-3 text-right text-stone-600">{cow.avg.toFixed(1)} L/day</td>
                      <td className="p-3 text-right font-bold text-[#6B8E23]">{cow.total.toFixed(1)} L</td>
                    </tr>
                  ))}
                  {cowPerformance.length === 0 && (
                    <tr>
                      <td colSpan={5} className="p-4 text-center text-stone-400">No milking logs recorded yet.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MilkProductionView;
