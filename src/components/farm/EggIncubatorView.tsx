import React, { useState, useMemo } from 'react';
import { EggBatch } from '@/lib/farmData';
import {
  Egg, Calendar, Plus, Trash2, TrendingUp, Sparkles, AlertCircle, CheckCircle2, FileText, ClipboardList
} from 'lucide-react';

interface Props {
  eggBatches: EggBatch[];
  onAdd: (b: Omit<EggBatch, 'id' | 'createdAt'>) => Promise<void>;
  onUpdate: (id: string, patch: Partial<Omit<EggBatch, 'id' | 'createdAt'>>) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
}

const EggIncubatorView: React.FC<Props> = ({ eggBatches, onAdd, onUpdate, onDelete }) => {
  const [showAddModal, setShowAddModal] = useState(false);
  const [showHatchModal, setShowHatchModal] = useState<EggBatch | null>(null);
  
  // Add Batch Form State
  const [quantity, setQuantity] = useState('');
  const [colDate, setColDate] = useState(new Date().toISOString().slice(0, 10));
  const [notes, setNotes] = useState('');

  // Hatch Batch Form State
  const [hatchedCount, setHatchedCount] = useState('');
  const [damagedCount, setDamagedCount] = useState('');
  const [hatchDate, setHatchDate] = useState(new Date().toISOString().slice(0, 10));
  const [hatchNotes, setHatchNotes] = useState('');

  // Metrics
  const metrics = useMemo(() => {
    let incubating = 0;
    let hatched = 0;
    let damaged = 0;
    let totalLaidInHatchedOrDamaged = 0;

    eggBatches.forEach(b => {
      if (b.status === 'Incubating') {
        incubating += b.quantity;
      } else if (b.status === 'Hatched') {
        hatched += b.hatchedCount;
        damaged += b.damagedCount;
        totalLaidInHatchedOrDamaged += b.quantity;
      } else if (b.status === 'Damaged') {
        damaged += b.quantity;
        totalLaidInHatchedOrDamaged += b.quantity;
      }
    });

    const hatchRate = totalLaidInHatchedOrDamaged > 0
      ? (hatched / totalLaidInHatchedOrDamaged) * 100
      : 0;

    return { incubating, hatched, damaged, hatchRate };
  }, [eggBatches]);

  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const qty = parseInt(quantity, 10);
    if (!qty || qty <= 0) return;

    try {
      await onAdd({
        collectionDate: colDate,
        quantity: qty,
        status: 'Incubating',
        hatchedCount: 0,
        damagedCount: 0,
        notes
      });
      setQuantity('');
      setNotes('');
      setShowAddModal(false);
    } catch (err) {
      console.error(err);
    }
  };

  const handleHatchSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!showHatchModal) return;

    const hc = parseInt(hatchedCount, 10) || 0;
    const dc = parseInt(damagedCount, 10) || 0;
    const totalInput = hc + dc;

    if (totalInput > showHatchModal.quantity) {
      alert(`The sum of hatched (${hc}) and damaged (${dc}) cannot exceed the batch quantity of ${showHatchModal.quantity}.`);
      return;
    }

    try {
      await onUpdate(showHatchModal.id, {
        status: 'Hatched',
        hatchedCount: hc,
        damagedCount: dc,
        hatchDate,
        notes: hatchNotes || showHatchModal.notes
      });
      setHatchedCount('');
      setDamagedCount('');
      setHatchNotes('');
      setShowHatchModal(null);
    } catch (err) {
      console.error(err);
    }
  };

  const handleMarkEntireDamaged = async (batch: EggBatch) => {
    if (!window.confirm(`Are you sure you want to mark all ${batch.quantity} eggs in this batch as damaged?`)) return;
    try {
      await onUpdate(batch.id, {
        status: 'Damaged',
        damagedCount: batch.quantity,
        hatchedCount: 0,
        hatchDate: new Date().toISOString().slice(0, 10)
      });
    } catch (err) {
      console.error(err);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Delete this egg batch? This will NOT remove chickens that were already hatched and registered.')) return;
    try {
      await onDelete(id);
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="space-y-6">
      {/* Heading */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold text-stone-850 flex items-center gap-2">
            <Egg className="w-8 h-8 text-[#A4C148]" /> Egg Incubator
          </h1>
          <p className="text-stone-500 mt-1">Track eggs lifecycle & automate in-house chicken count additions</p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="inline-flex items-center gap-2 bg-[#6B8E23] hover:bg-[#5a7a1d] text-white px-4 py-2.5 rounded-xl text-sm font-medium shadow-sm transition"
        >
          <Plus className="w-4 h-4" /> Log Egg Collection
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Incubating */}
        <div className="bg-white rounded-2xl border border-stone-200 p-5 hover:shadow-md transition">
          <div className="flex justify-between items-start">
            <div>
              <span className="text-xs font-bold text-stone-500 uppercase tracking-wider block">Incubating Now</span>
              <span className="text-3xl font-bold text-stone-850 mt-1 block">{metrics.incubating}</span>
            </div>
            <div className="w-10 h-10 rounded-xl bg-amber-50 flex items-center justify-center text-amber-600 shadow-sm border border-amber-100">
              <Egg className="w-5 h-5 fill-amber-500" />
            </div>
          </div>
          <div className="text-[11px] text-stone-500 mt-2.5">Pending hatching cycle (~21 days)</div>
        </div>

        {/* Hatched */}
        <div className="bg-white rounded-2xl border border-stone-200 p-5 hover:shadow-md transition">
          <div className="flex justify-between items-start">
            <div>
              <span className="text-xs font-bold text-stone-500 uppercase tracking-wider block">Total Hatched</span>
              <span className="text-3xl font-bold text-emerald-600 mt-1 block">+{metrics.hatched}</span>
            </div>
            <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-600 shadow-sm border border-emerald-100">
              <CheckCircle2 className="w-5 h-5" />
            </div>
          </div>
          <div className="text-[11px] text-stone-500 mt-2.5">Added automatically to poultry registry</div>
        </div>

        {/* Damaged */}
        <div className="bg-white rounded-2xl border border-stone-200 p-5 hover:shadow-md transition">
          <div className="flex justify-between items-start">
            <div>
              <span className="text-xs font-bold text-stone-500 uppercase tracking-wider block">Damaged / Unviable</span>
              <span className="text-3xl font-bold text-red-650 mt-1 block">{metrics.damaged}</span>
            </div>
            <div className="w-10 h-10 rounded-xl bg-red-50 flex items-center justify-center text-red-655 shadow-sm border border-red-100">
              <AlertCircle className="w-5 h-5" />
            </div>
          </div>
          <div className="text-[11px] text-stone-500 mt-2.5">Cracked, unfertilized, or died in shell</div>
        </div>

        {/* Hatch Rate */}
        <div className="bg-white rounded-2xl border border-stone-200 p-5 hover:shadow-md transition">
          <div className="flex justify-between items-start">
            <div>
              <span className="text-xs font-bold text-stone-500 uppercase tracking-wider block">Success Hatch Rate</span>
              <span className="text-3xl font-bold text-indigo-650 mt-1 block">{metrics.hatchRate.toFixed(1)}%</span>
            </div>
            <div className="w-10 h-10 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-650 shadow-sm border border-indigo-100">
              <TrendingUp className="w-5 h-5" />
            </div>
          </div>
          <div className="text-[11px] text-stone-500 mt-2.5">Target benchmark: &gt; 80% viability</div>
        </div>
      </div>

      {/* Main Table */}
      <div className="bg-white rounded-2xl border border-stone-200 overflow-hidden shadow-sm">
        <div className="px-5 py-4 border-b border-stone-150 bg-stone-50/50 flex justify-between items-center">
          <h2 className="font-semibold text-stone-800 flex items-center gap-2">
            <ClipboardList className="w-4 h-4 text-stone-500" /> Incubation Batches & Logs
          </h2>
          <span className="text-xs text-stone-500">{eggBatches.length} collections recorded</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-stone-150 text-[10px] uppercase font-bold text-stone-500 tracking-wider bg-stone-50/20">
                <th className="px-5 py-3.5">Collected</th>
                <th className="px-5 py-3.5">Batch Qty</th>
                <th className="px-5 py-3.5">Status</th>
                <th className="px-5 py-3.5">Hatched / Damaged</th>
                <th className="px-5 py-3.5">Hatch Date</th>
                <th className="px-5 py-3.5">Notes</th>
                <th className="px-5 py-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-150 text-xs text-stone-700">
              {eggBatches.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-12 text-stone-400">
                    No egg incubation batches recorded. Log a collection above to begin!
                  </td>
                </tr>
              ) : (
                eggBatches.map((b) => (
                  <tr key={b.id} className="hover:bg-stone-50/50 transition">
                    <td className="px-5 py-4 font-medium flex items-center gap-2">
                      <Calendar className="w-3.5 h-3.5 text-stone-400" />
                      {b.collectionDate}
                    </td>
                    <td className="px-5 py-4 font-bold text-stone-850 text-sm">
                      {b.quantity} eggs
                    </td>
                    <td className="px-5 py-4">
                      <span
                        className={`inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${
                          b.status === 'Incubating'
                            ? 'bg-amber-100 text-amber-800'
                            : b.status === 'Hatched'
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-red-100 text-red-800'
                        }`}
                      >
                        {b.status}
                      </span>
                    </td>
                    <td className="px-5 py-4 font-semibold">
                      {b.status === 'Incubating' ? (
                        <span className="text-stone-400">—</span>
                      ) : b.status === 'Hatched' ? (
                        <span>
                          <span className="text-emerald-600 font-bold">{b.hatchedCount}</span> Hatched /{' '}
                          <span className="text-red-600 font-bold">{b.damagedCount}</span> Damaged
                        </span>
                      ) : (
                        <span className="text-red-650">{b.damagedCount} Damaged</span>
                      )}
                    </td>
                    <td className="px-5 py-4 text-stone-500">
                      {b.hatchDate || <span className="text-stone-300">—</span>}
                    </td>
                    <td className="px-5 py-4 max-w-xs truncate text-stone-500" title={b.notes}>
                      {b.notes || <span className="text-stone-300 italic">None</span>}
                    </td>
                    <td className="px-5 py-4 text-right space-x-1.5 whitespace-nowrap">
                      {b.status === 'Incubating' && (
                        <>
                          <button
                            onClick={() => {
                              setHatchedCount(b.quantity.toString());
                              setDamagedCount('0');
                              setShowHatchModal(b);
                            }}
                            className="bg-[#6B8E23] hover:bg-[#5a7a1d] text-white px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider shadow-sm transition"
                          >
                            Hatch Eggs
                          </button>
                          <button
                            onClick={() => handleMarkEntireDamaged(b)}
                            className="border border-red-200 hover:bg-red-50 text-red-655 px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider transition"
                          >
                            Mark Damaged
                          </button>
                        </>
                      )}
                      <button
                        onClick={() => handleDelete(b.id)}
                        className="text-stone-400 hover:text-red-600 p-1 rounded-md transition"
                        title="Delete Batch log"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Collection Batch Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-stone-200 max-w-md w-full overflow-hidden">
            <div className="px-5 py-4 border-b border-stone-150 bg-stone-50/50 flex justify-between items-center">
              <h3 className="font-bold text-stone-850 flex items-center gap-2">
                <Egg className="w-5 h-5 text-[#6B8E23]" /> Log Egg Collection
              </h3>
              <button onClick={() => setShowAddModal(false)} className="text-stone-400 hover:text-stone-700 font-semibold text-lg">×</button>
            </div>
            <form onSubmit={handleAddSubmit} className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-bold text-stone-500 uppercase tracking-wider mb-1.5">Collection Date *</label>
                <input
                  type="date"
                  required
                  value={colDate}
                  onChange={e => setColDate(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-lg border border-stone-200 bg-stone-50 focus:bg-white focus:border-[#6B8E23] outline-none text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-stone-500 uppercase tracking-wider mb-1.5">Eggs Count *</label>
                <input
                  type="number"
                  required
                  min={1}
                  placeholder="e.g. 12"
                  value={quantity}
                  onChange={e => setQuantity(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-lg border border-stone-200 bg-stone-50 focus:bg-white focus:border-[#6B8E23] outline-none text-sm font-semibold"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-stone-500 uppercase tracking-wider mb-1.5">Incubator / Batch Notes</label>
                <textarea
                  placeholder="e.g. Incubator Tray B, Country Chicken flock 2"
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-lg border border-stone-200 bg-stone-50 focus:bg-white focus:border-[#6B8E23] outline-none text-sm min-h-[80px]"
                />
              </div>
              <div className="flex gap-3 justify-end pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2.5 border border-stone-200 rounded-lg text-sm text-stone-600 hover:bg-stone-50 font-medium transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2.5 bg-[#6B8E23] hover:bg-[#5a7a1d] text-white rounded-lg text-sm font-semibold shadow-sm transition"
                >
                  Start Incubation
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Hatch / Resolve Batch Modal */}
      {showHatchModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-stone-200 max-w-md w-full overflow-hidden">
            <div className="px-5 py-4 border-b border-stone-150 bg-stone-50/50 flex justify-between items-center">
              <h3 className="font-bold text-stone-850 flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-emerald-600" /> Hatch Egg Batch
              </h3>
              <button onClick={() => setShowHatchModal(null)} className="text-stone-400 hover:text-stone-700 font-semibold text-lg">×</button>
            </div>
            <form onSubmit={handleHatchSubmit} className="p-5 space-y-4">
              <div className="bg-stone-50 border border-stone-200 p-4 rounded-xl text-xs space-y-1">
                <div className="flex justify-between">
                  <span className="text-stone-500 font-medium">Batch Collection Date:</span>
                  <span className="font-semibold text-stone-800">{showHatchModal.collectionDate}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-stone-500 font-medium">Batch Total Quantity:</span>
                  <span className="font-bold text-stone-850">{showHatchModal.quantity} eggs</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-stone-500 uppercase tracking-wider mb-1.5">Hatched (Chicks) *</label>
                  <input
                    type="number"
                    required
                    min={0}
                    value={hatchedCount}
                    onChange={e => setHatchedCount(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-lg border border-stone-200 bg-stone-50 focus:bg-white focus:border-[#6B8E23] outline-none text-sm font-bold text-emerald-600"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-stone-500 uppercase tracking-wider mb-1.5">Damaged / Unviable *</label>
                  <input
                    type="number"
                    required
                    min={0}
                    value={damagedCount}
                    onChange={e => setDamagedCount(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-lg border border-stone-200 bg-stone-50 focus:bg-white focus:border-[#6B8E23] outline-none text-sm font-bold text-red-655"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-stone-500 uppercase tracking-wider mb-1.5">Hatch Date *</label>
                <input
                  type="date"
                  required
                  value={hatchDate}
                  onChange={e => setHatchDate(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-lg border border-stone-200 bg-stone-50 focus:bg-white focus:border-[#6B8E23] outline-none text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-stone-500 uppercase tracking-wider mb-1.5">Hatch/Viability Notes</label>
                <textarea
                  placeholder="e.g. 8 healthy chicks registered, 2 eggs failed to develop."
                  value={hatchNotes}
                  onChange={e => setHatchNotes(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-lg border border-stone-200 bg-stone-50 focus:bg-white focus:border-[#6B8E23] outline-none text-sm min-h-[80px]"
                />
              </div>

              <div className="flex gap-3 justify-end pt-2">
                <button
                  type="button"
                  onClick={() => setShowHatchModal(null)}
                  className="px-4 py-2.5 border border-stone-200 rounded-lg text-sm text-stone-600 hover:bg-stone-50 font-medium transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-sm font-semibold shadow-sm transition"
                >
                  Record Hatch & Add Chicks
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default EggIncubatorView;
