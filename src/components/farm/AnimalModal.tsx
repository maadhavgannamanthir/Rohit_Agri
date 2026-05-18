import React from 'react';
import { Animal, formatCurrency, calcAnimalROI } from '@/lib/farmData';
import { X, Tag, Calendar, Heart, Syringe, Camera, TrendingUp, DollarSign, Pencil, Trash2, Target, History } from 'lucide-react';
import GoalHistoryView from './GoalHistoryView';

interface Props {
  animal: Animal | null;
  onClose: () => void;
  onMarkSold: (id: string, price: number, buyer: string) => void;
  onEdit?: (animal: Animal) => void;
  onDelete?: (animal: Animal) => void;
}

type Tab = 'details' | 'goal';

const AnimalModal: React.FC<Props> = ({ animal, onClose, onMarkSold, onEdit, onDelete }) => {
  const [salePrice, setSalePrice] = React.useState('');
  const [buyer, setBuyer] = React.useState('');
  const [tab, setTab] = React.useState<Tab>('details');

  // Reset tab when switching animals
  React.useEffect(() => {
    if (animal) setTab('details');
  }, [animal?.id]);

  if (!animal) return null;

  const last = animal.weights[animal.weights.length - 1];
  const first = animal.weights[0];
  const gain = last.weightKg - first.weightKg;
  const roi = calcAnimalROI(animal);
  const netProfit = animal.status === 'Sold' ? roi : 0;
  const totalCost = animal.acquisitionCost + animal.allocatedExpenses;

  const handleSale = () => {
    const p = parseFloat(salePrice);
    if (!p || !buyer) return;
    onMarkSold(animal.id, p, buyer);
    setSalePrice('');
    setBuyer('');
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4 overflow-y-auto">
      <div className="bg-white w-full sm:max-w-2xl rounded-t-3xl sm:rounded-2xl shadow-2xl max-h-[95vh] overflow-y-auto">
        {/* Header */}
        <div className="relative h-56 bg-stone-100">
          <img src={animal.photoUrl} alt={animal.name} className="w-full h-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />
          <button
            onClick={onClose}
            className="absolute top-4 right-4 w-9 h-9 rounded-full bg-white/90 backdrop-blur hover:bg-white flex items-center justify-center transition"
          >
            <X className="w-4 h-4 text-stone-700" />
          </button>
          <div className="absolute top-4 left-4 flex gap-1.5">
            <span
              className={`text-[10px] font-bold uppercase tracking-wide px-2 py-1 rounded-md ${
                animal.status === 'Active' ? 'bg-emerald-500 text-white' : 'bg-stone-700 text-white'
              }`}
            >
              {animal.status}
            </span>
            <span className="text-[10px] font-bold uppercase tracking-wide px-2 py-1 rounded-md bg-white/90 text-stone-700">
              {animal.species}
            </span>
          </div>
          <div className="absolute bottom-4 left-5 right-5 text-white">
            <h2 className="text-2xl font-bold">{animal.name}</h2>
            <div className="text-sm opacity-90 flex items-center gap-3 mt-0.5">
              <span className="flex items-center gap-1"><Tag className="w-3 h-3" /> {animal.tagId}</span>
              <span>{animal.breed}</span>
              <span>{animal.sex === 'Male' ? '♂' : '♀'} {animal.sex}</span>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="sticky top-0 z-10 bg-white border-b border-stone-200 px-5 flex gap-1">
          <TabButton active={tab === 'details'} onClick={() => setTab('details')} icon={Tag} label="Details" />
          <TabButton active={tab === 'goal'} onClick={() => setTab('goal')} icon={History} label="Goal History" />
        </div>

        {tab === 'details' && (
          <div className="p-5 space-y-5">
            {/* Photos */}
            <div className="flex gap-2 overflow-x-auto pb-1">
              {animal.photos.map((p, i) => (
                <img
                  key={i}
                  src={p}
                  alt={`${animal.name} ${i + 1}`}
                  className="w-20 h-20 rounded-lg object-cover shrink-0 border-2 border-white shadow-sm"
                />
              ))}
              <button className="w-20 h-20 rounded-lg border-2 border-dashed border-stone-300 shrink-0 flex flex-col items-center justify-center text-stone-400 hover:bg-stone-50 hover:border-[#6B8E23] hover:text-[#6B8E23] transition">
                <Camera className="w-5 h-5" />
                <span className="text-[10px] mt-1">Add</span>
              </button>
            </div>

            {/* Stats grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="bg-stone-50 rounded-xl p-3">
                <div className="text-[10px] uppercase text-stone-500 font-semibold">Current Weight</div>
                <div className="font-bold text-stone-800 mt-1">{last.weightKg.toFixed(1)} kg</div>
              </div>
              <div className="bg-stone-50 rounded-xl p-3">
                <div className="text-[10px] uppercase text-stone-500 font-semibold">Total Gain</div>
                <div className="font-bold text-emerald-600 mt-1">+{gain.toFixed(1)} kg</div>
              </div>
              <div className="bg-stone-50 rounded-xl p-3">
                <div className="text-[10px] uppercase text-stone-500 font-semibold">Total Cost</div>
                <div className="font-bold text-stone-800 mt-1">{formatCurrency(totalCost)}</div>
              </div>
              <div className="bg-stone-50 rounded-xl p-3">
                <div className="text-[10px] uppercase text-stone-500 font-semibold">
                  {animal.status === 'Sold' ? 'Net ROI' : 'Break-even'}
                </div>
                <div className={`font-bold mt-1 ${netProfit >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                  {animal.status === 'Sold'
                    ? `${netProfit >= 0 ? '+' : ''}${formatCurrency(netProfit)}`
                    : formatCurrency(totalCost)}
                </div>
              </div>
            </div>

            {/* Goal summary tile */}
            {animal.targetWeightKg != null && (
              <div className="bg-[#6B8E23]/5 border border-[#6B8E23]/20 rounded-xl p-3 flex items-center gap-3">
                <Target className="w-5 h-5 text-[#6B8E23] shrink-0" />
                <div className="text-sm flex-1">
                  <div className="font-semibold text-stone-800">
                    Goal: {animal.targetWeightKg.toFixed(1)} kg
                    {animal.targetDate ? ` by ${animal.targetDate}` : ''}
                  </div>
                  <div className="text-xs text-stone-500">
                    Open the <button onClick={() => setTab('goal')} className="underline hover:text-[#6B8E23]">Goal History</button> tab to see all changes.
                  </div>
                </div>
              </div>
            )}

            {/* Details */}
            <div className="space-y-3">
              <h3 className="font-semibold text-stone-800">Lifecycle Details</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm">
                <DetailRow icon={Calendar} label="Birth Date" value={animal.birthDate} />
                <DetailRow icon={Calendar} label="Acquired" value={animal.acquisitionDate} />
                <DetailRow icon={DollarSign} label="Acquisition Cost" value={formatCurrency(animal.acquisitionCost)} />
                <DetailRow icon={TrendingUp} label="Allocated Expenses" value={formatCurrency(animal.allocatedExpenses)} />
                <DetailRow
                  icon={Syringe}
                  label="Vaccination"
                  value={animal.vaccinated ? 'Up to date' : 'Pending'}
                  valueClass={animal.vaccinated ? 'text-emerald-600' : 'text-amber-600'}
                />
                <DetailRow icon={Heart} label="Health" value={animal.healthNotes} />
              </div>
            </div>

            {animal.status === 'Sold' && (
              <div className="bg-stone-50 rounded-xl p-4 border border-stone-200">
                <h3 className="font-semibold text-stone-800 mb-2">Sale Record</h3>
                <div className="grid grid-cols-3 gap-3 text-sm">
                  <div>
                    <div className="text-xs text-stone-500">Buyer</div>
                    <div className="font-medium text-stone-800">{animal.buyer}</div>
                  </div>
                  <div>
                    <div className="text-xs text-stone-500">Date</div>
                    <div className="font-medium text-stone-800">{animal.saleDate}</div>
                  </div>
                  <div>
                    <div className="text-xs text-stone-500">Sale Price</div>
                    <div className="font-bold text-emerald-600">{formatCurrency(animal.salePrice || 0)}</div>
                  </div>
                </div>
              </div>
            )}

            {animal.status === 'Active' && (
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
                <h3 className="font-semibold text-amber-900 mb-3 flex items-center gap-2">
                  <DollarSign className="w-4 h-4" /> Mark as Sold
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-2">
                  <input
                    type="number"
                    placeholder="Sale price..."
                    value={salePrice}
                    onChange={(e) => setSalePrice(e.target.value)}
                    className="px-3 py-2 rounded-lg border border-amber-200 bg-white text-sm outline-none focus:border-amber-500"
                  />
                  <input
                    type="text"
                    placeholder="Buyer name..."
                    value={buyer}
                    onChange={(e) => setBuyer(e.target.value)}
                    className="px-3 py-2 rounded-lg border border-amber-200 bg-white text-sm outline-none focus:border-amber-500"
                  />
                </div>
                <button
                  onClick={handleSale}
                  disabled={!salePrice || !buyer}
                  className="w-full bg-amber-600 hover:bg-amber-700 disabled:bg-stone-300 text-white text-sm font-medium py-2 rounded-lg transition"
                >
                  Confirm Sale
                </button>
              </div>
            )}

            {/* Edit / Delete actions */}
            {(onEdit || onDelete) && (
              <div className="flex gap-2 pt-2 border-t border-stone-100">
                {onEdit && (
                  <button
                    onClick={() => onEdit(animal)}
                    className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium bg-stone-100 hover:bg-stone-200 text-stone-700 transition"
                  >
                    <Pencil className="w-4 h-4" /> Edit Details
                  </button>
                )}
                {onDelete && (
                  <button
                    onClick={() => onDelete(animal)}
                    className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium bg-red-50 hover:bg-red-100 text-red-700 transition"
                  >
                    <Trash2 className="w-4 h-4" /> Delete
                  </button>
                )}
              </div>
            )}
          </div>
        )}

        {tab === 'goal' && (
          <div className="p-5">
            <GoalHistoryView animal={animal} />
            {onEdit && (
              <div className="mt-5 pt-4 border-t border-stone-100">
                <button
                  onClick={() => onEdit(animal)}
                  className="w-full inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium bg-[#6B8E23] hover:bg-[#577A1C] text-white transition"
                >
                  <Pencil className="w-4 h-4" /> Edit Goal
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

const TabButton: React.FC<{ active: boolean; onClick: () => void; icon: React.ElementType; label: string }> = ({
  active, onClick, icon: Icon, label,
}) => (
  <button
    onClick={onClick}
    className={`flex items-center gap-1.5 px-4 py-3 text-sm font-medium border-b-2 transition ${
      active
        ? 'border-[#6B8E23] text-[#6B8E23]'
        : 'border-transparent text-stone-500 hover:text-stone-800'
    }`}
  >
    <Icon className="w-4 h-4" />
    {label}
  </button>
);

const DetailRow: React.FC<{ icon: React.ElementType; label: string; value: string; valueClass?: string }> = ({
  icon: Icon,
  label,
  value,
  valueClass,
}) => (
  <div className="flex items-start gap-2 p-2 bg-stone-50 rounded-lg">
    <Icon className="w-3.5 h-3.5 text-stone-400 mt-0.5 shrink-0" />
    <div className="flex-1 min-w-0">
      <div className="text-xs text-stone-500">{label}</div>
      <div className={`font-medium text-stone-800 truncate ${valueClass || ''}`}>{value}</div>
    </div>
  </div>
);

export default AnimalModal;
