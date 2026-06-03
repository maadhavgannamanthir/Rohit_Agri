import React, { useState, useEffect } from 'react';
import { Animal, Expense, Vaccination, VetVisit, formatCurrency, calcAnimalROI } from '@/lib/farmData';
import {
  X, Tag, Calendar, Heart, Syringe, Camera, TrendingUp, DollarSign,
  Pencil, Trash2, Target, History, Scale, Activity, Plus, FileText, ClipboardList
} from 'lucide-react';
import GoalHistoryView from './GoalHistoryView';

interface Props {
  animal: Animal | null;
  onClose: () => void;
  onMarkSold: (id: string, price: number, buyer: string) => void;
  onEdit?: (animal: Animal) => void;
  onDelete?: (animal: Animal) => void;
  onLogGrowth: (id: string, weight: number, height?: number) => Promise<void>;
  onAddVaccination: (animalId: string, name: string, date: string, notes: string) => Promise<void>;
  onDeleteVaccination: (id: string, animalId: string, name: string) => Promise<void>;
  onAddVetVisit: (animalId: string, date: string, doctorName: string, diagnosis: string, treatment: string, cost: number, notes: string) => Promise<void>;
  onDeleteVetVisit: (id: string, animalId: string, diagnosis: string) => Promise<void>;
  expenses: Expense[];
}

type Tab = 'details' | 'growth' | 'health' | 'finance' | 'goal';

const AnimalModal: React.FC<Props> = ({
  animal, onClose, onMarkSold, onEdit, onDelete,
  onLogGrowth, onAddVaccination, onDeleteVaccination, onAddVetVisit, onDeleteVetVisit,
  expenses
}) => {
  const [salePrice, setSalePrice] = useState('');
  const [buyer, setBuyer] = useState('');
  const [tab, setTab] = useState<Tab>('details');

  // Growth Form State
  const [growthWeight, setGrowthWeight] = useState('');
  const [growthHeight, setGrowthHeight] = useState('');
  const [growthDate, setGrowthDate] = useState(new Date().toISOString().slice(0, 10));
  const [showGrowthForm, setShowGrowthForm] = useState(false);

  // Vaccination Form State
  const [vacName, setVacName] = useState('');
  const [vacDate, setVacDate] = useState(new Date().toISOString().slice(0, 10));
  const [vacNotes, setVacNotes] = useState('');
  const [showVacForm, setShowVacForm] = useState(false);

  // Vet Visit Form State
  const [vetDate, setVetDate] = useState(new Date().toISOString().slice(0, 10));
  const [vetDoctor, setVetDoctor] = useState('');
  const [vetDiag, setVetDiag] = useState('');
  const [vetTreat, setVetTreat] = useState('');
  const [vetCost, setVetCost] = useState('');
  const [vetNotes, setVetNotes] = useState('');
  const [showVetForm, setShowVetForm] = useState(false);

  // Reset states when switching animals
  useEffect(() => {
    if (animal) {
      setTab('details');
      setShowGrowthForm(false);
      setShowVacForm(false);
      setShowVetForm(false);
    }
  }, [animal?.id]);

  if (!animal) return null;

  // Financial calculations
  const animalExpenses = expenses.filter(e => e.animalId === animal.id);
  const totalMedCost = animalExpenses.filter(e => e.category === 'Medicine').reduce((s, e) => s + e.amount, 0);
  const totalMaintCost = animalExpenses.filter(e => e.category !== 'Medicine').reduce((s, e) => s + e.amount, 0);
  const totalCost = animal.acquisitionCost + totalMedCost + totalMaintCost;
  const netROI = animal.status === 'Sold' && animal.salePrice ? animal.salePrice - totalCost : 0;

  // Weight statistics
  const weights = animal.weights || [];
  const lastWeight = weights[weights.length - 1]?.weightKg || 0;
  const lastHeight = weights[weights.length - 1]?.heightCm || 0;
  const firstWeight = weights[0]?.weightKg || 0;
  const gain = lastWeight - firstWeight;

  const handleSale = () => {
    const p = parseFloat(salePrice);
    if (!p || !buyer) return;
    onMarkSold(animal.id, p, buyer);
    setSalePrice('');
    setBuyer('');
  };

  const handleLogGrowthSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const w = parseFloat(growthWeight);
    if (!w) return;
    const h = growthHeight ? parseFloat(growthHeight) : undefined;
    await onLogGrowth(animal.id, w, h);
    setGrowthWeight('');
    setGrowthHeight('');
    setShowGrowthForm(false);
  };

  const handleAddVaccinationSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!vacName || !vacDate) return;
    await onAddVaccination(animal.id, vacName, vacDate, vacNotes);
    setVacName('');
    setVacNotes('');
    setShowVacForm(false);
  };

  const handleAddVetVisitSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!vetDiag || !vetDate) return;
    const cost = vetCost ? parseFloat(vetCost) : 0;
    await onAddVetVisit(animal.id, vetDate, vetDoctor, vetDiag, vetTreat, cost, vetNotes);
    setVetDoctor('');
    setVetDiag('');
    setVetTreat('');
    setVetCost('');
    setVetNotes('');
    setShowVetForm(false);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4 overflow-y-auto">
      <div className="bg-white w-full sm:max-w-2xl rounded-t-3xl sm:rounded-2xl shadow-2xl max-h-[90vh] overflow-y-auto flex flex-col">
        {/* Header Hero */}
        <div className="relative h-48 bg-stone-100 shrink-0">
          <img src={animal.photoUrl} alt={animal.name} className="w-full h-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
          <button
            onClick={onClose}
            className="absolute top-4 right-4 w-9 h-9 rounded-full bg-white/90 backdrop-blur hover:bg-white flex items-center justify-center transition"
          >
            <X className="w-4 h-4 text-stone-700" />
          </button>
          <div className="absolute top-4 left-4 flex gap-1.5">
            <span
              className={`text-[10px] font-bold uppercase tracking-wide px-2.5 py-1 rounded-md text-white shadow-sm ${
                animal.status === 'Active' ? 'bg-emerald-600' :
                animal.status === 'Pregnant' ? 'bg-indigo-600' :
                animal.status === 'Lactating' ? 'bg-cyan-600' :
                animal.status === 'Dry' ? 'bg-amber-600' :
                animal.status === 'Sold' ? 'bg-stone-600' :
                'bg-red-600'
              }`}
            >
              {animal.status}
            </span>
            <span className="text-[10px] font-bold uppercase tracking-wide px-2.5 py-1 rounded-md bg-white/90 text-stone-700 shadow-sm">
              {animal.species}
            </span>
          </div>
          <div className="absolute bottom-4 left-5 right-5 text-white">
            <h2 className="text-2xl font-bold">{animal.name || 'Unnamed Animal'}</h2>
            <div className="text-xs opacity-90 flex items-center gap-3 mt-1.5">
              <span className="flex items-center gap-1"><Tag className="w-3.5 h-3.5" /> {animal.tagId}</span>
              <span>{animal.breed}</span>
              <span>{animal.sex === 'Male' ? '♂' : '♀'} {animal.sex}</span>
            </div>
          </div>
        </div>

        {/* Tabs Bar */}
        <div className="sticky top-0 z-10 bg-white border-b border-stone-200 px-5 flex gap-1 overflow-x-auto shrink-0">
          <TabButton active={tab === 'details'} onClick={() => setTab('details')} icon={Tag} label="Details" />
          {animal.species !== 'Cow' && animal.species !== 'Country Chicken' && (
            <>
              <TabButton active={tab === 'growth'} onClick={() => setTab('growth')} icon={Scale} label="Growth Log" />
              <TabButton active={tab === 'goal'} onClick={() => setTab('goal')} icon={History} label="Goals" />
            </>
          )}
          <TabButton active={tab === 'health'} onClick={() => setTab('health')} icon={Activity} label="Health" />
          <TabButton active={tab === 'finance'} onClick={() => setTab('finance')} icon={DollarSign} label="Ledger" />
        </div>

        {/* Modal Scroll Content */}
        <div className="p-5 overflow-y-auto flex-1 space-y-5">
          {tab === 'details' && (
            <div className="space-y-5">
              {/* Photo Gallery */}
              <div className="flex gap-2 overflow-x-auto pb-1">
                {animal.photos.map((p, i) => (
                  <img
                    key={i}
                    src={p}
                    alt={`${animal.name} ${i + 1}`}
                    className="w-20 h-20 rounded-xl object-cover shrink-0 border border-stone-200 shadow-sm"
                  />
                ))}
                <button className="w-20 h-20 rounded-xl border-2 border-dashed border-stone-300 shrink-0 flex flex-col items-center justify-center text-stone-400 hover:bg-stone-50 hover:border-[#6B8E23] hover:text-[#6B8E23] transition">
                  <Camera className="w-5 h-5" />
                  <span className="text-[9px] mt-1.5 font-semibold uppercase tracking-wider">Add Photo</span>
                </button>
              </div>

              {/* Stats overview */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="bg-stone-50 rounded-xl p-3.5 border border-stone-200/50">
                  <div className="text-[10px] uppercase text-stone-500 font-semibold tracking-wider">Weight / Height</div>
                  <div className="font-bold text-stone-800 mt-1">{lastWeight.toFixed(1)} kg / {lastHeight ? `${lastHeight} cm` : '—'}</div>
                </div>
                <div className="bg-stone-50 rounded-xl p-3.5 border border-stone-200/50">
                  <div className="text-[10px] uppercase text-stone-500 font-semibold tracking-wider">Weight Gain</div>
                  <div className="font-bold text-emerald-600 mt-1">+{gain.toFixed(1)} kg</div>
                </div>
                <div className="bg-stone-50 rounded-xl p-3.5 border border-stone-200/50">
                  <div className="text-[10px] uppercase text-stone-500 font-semibold tracking-wider">Total Expenses</div>
                  <div className="font-bold text-stone-800 mt-1">{formatCurrency(totalCost - animal.acquisitionCost)}</div>
                </div>
                <div className="bg-stone-50 rounded-xl p-3.5 border border-stone-200/50">
                  <div className="text-[10px] uppercase text-stone-500 font-semibold tracking-wider">Break-even</div>
                  <div className="font-bold text-stone-800 mt-1">{formatCurrency(totalCost)}</div>
                </div>
              </div>

              {/* General Details */}
              <div className="space-y-3.5">
                <h3 className="font-bold text-stone-800 text-sm uppercase tracking-wider">Lifecycle Details</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                  <DetailRow icon={Calendar} label="Birth Date" value={animal.birthDate || 'N/A'} />
                  <DetailRow icon={Calendar} label="Acquisition Date" value={animal.acquisitionDate} />
                  <DetailRow icon={DollarSign} label="Acquisition Cost" value={formatCurrency(animal.acquisitionCost)} />
                  <DetailRow icon={TrendingUp} label="Total Life Cost" value={formatCurrency(totalCost)} />
                  <DetailRow icon={Heart} label="Health Comments" value={animal.healthNotes || 'No health issues.'} />
                </div>
              </div>

              {/* Sale Workflow */}
              {animal.status === 'Sold' && (
                <div className="bg-stone-50 rounded-xl p-4 border border-stone-200">
                  <h3 className="font-bold text-stone-800 text-sm mb-3 uppercase tracking-wider">Sale Record</h3>
                  <div className="grid grid-cols-3 gap-3 text-sm">
                    <div>
                      <div className="text-xs text-stone-500 font-medium">Buyer</div>
                      <div className="font-bold text-stone-800 mt-1">{animal.buyer || 'Unknown'}</div>
                    </div>
                    <div>
                      <div className="text-xs text-stone-500 font-medium">Date</div>
                      <div className="font-bold text-stone-800 mt-1">{animal.saleDate || 'N/A'}</div>
                    </div>
                    <div>
                      <div className="text-xs text-stone-500 font-medium">Price</div>
                      <div className="font-bold text-emerald-600 mt-1">{formatCurrency(animal.salePrice || 0)}</div>
                    </div>
                  </div>
                </div>
              )}

              {['Active', 'Pregnant', 'Lactating', 'Dry'].includes(animal.status) && (
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
                  <h3 className="font-bold text-amber-900 text-sm mb-3 flex items-center gap-2 uppercase tracking-wider">
                    <DollarSign className="w-4 h-4" /> Record Sale of Animal
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
                    <input
                      type="number"
                      placeholder="Sale price (e.g. 50000)"
                      value={salePrice}
                      onChange={(e) => setSalePrice(e.target.value)}
                      className="px-3.5 py-2 rounded-xl border border-amber-200 bg-white text-sm outline-none focus:border-amber-500"
                    />
                    <input
                      type="text"
                      placeholder="Buyer name (e.g. Local Dairy Corp)"
                      value={buyer}
                      onChange={(e) => setBuyer(e.target.value)}
                      className="px-3.5 py-2 rounded-xl border border-amber-200 bg-white text-sm outline-none focus:border-amber-500"
                    />
                  </div>
                  <button
                    onClick={handleSale}
                    disabled={!salePrice || !buyer}
                    className="w-full bg-amber-600 hover:bg-amber-700 disabled:bg-stone-300 text-white text-sm font-semibold py-2.5 rounded-xl transition shadow-sm"
                  >
                    Confirm Sale
                  </button>
                </div>
              )}

              {/* Edit actions */}
              {(onEdit || onDelete) && (
                <div className="flex gap-2.5 pt-3 border-t border-stone-100">
                  {onEdit && (
                    <button
                      onClick={() => onEdit(animal)}
                      className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl text-sm font-semibold bg-stone-100 hover:bg-stone-200 text-stone-700 transition border border-stone-200"
                    >
                      <Pencil className="w-4 h-4" /> Edit Profile
                    </button>
                  )}
                  {onDelete && (
                    <button
                      onClick={() => onDelete(animal)}
                      className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl text-sm font-semibold bg-red-50 hover:bg-red-100 text-red-700 transition border border-red-100"
                    >
                      <Trash2 className="w-4 h-4" /> Delete Animal
                    </button>
                  )}
                </div>
              )}
            </div>
          )}

          {tab === 'growth' && (
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="font-bold text-stone-800 text-sm uppercase tracking-wider">Weigh-in &amp; Height History</h3>
                <button
                  onClick={() => setShowGrowthForm(!showGrowthForm)}
                  className="inline-flex items-center gap-1 bg-[#6B8E23] hover:bg-[#5a7a1d] text-white text-xs font-semibold px-2.5 py-1.5 rounded-lg transition"
                >
                  <Plus className="w-3.5 h-3.5" /> Log Growth
                </button>
              </div>

              {showGrowthForm && (
                <form onSubmit={handleLogGrowthSubmit} className="bg-stone-50 border border-stone-200 rounded-xl p-4 space-y-3">
                  <div className="grid grid-cols-3 gap-2">
                    <div>
                      <label className="text-[10px] uppercase font-bold text-stone-500 block mb-1">Weight (kg) *</label>
                      <input
                        required
                        type="number"
                        step="0.1"
                        placeholder="45"
                        value={growthWeight}
                        onChange={(e) => setGrowthWeight(e.target.value)}
                        className="w-full px-2.5 py-1.5 rounded-lg border border-stone-200 bg-white text-sm outline-none"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] uppercase font-bold text-stone-500 block mb-1">Height (cm)</label>
                      <input
                        type="number"
                        step="0.1"
                        placeholder="110"
                        value={growthHeight}
                        onChange={(e) => setGrowthHeight(e.target.value)}
                        className="w-full px-2.5 py-1.5 rounded-lg border border-stone-200 bg-white text-sm outline-none"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] uppercase font-bold text-stone-500 block mb-1">Weigh Date</label>
                      <input
                        type="date"
                        value={growthDate}
                        onChange={(e) => setGrowthDate(e.target.value)}
                        className="w-full px-2.5 py-1.5 rounded-lg border border-stone-200 bg-white text-xs outline-none"
                      />
                    </div>
                  </div>
                  <div className="flex gap-2 justify-end">
                    <button
                      type="button"
                      onClick={() => setShowGrowthForm(false)}
                      className="px-3 py-1 text-xs font-semibold text-stone-600 bg-stone-150 hover:bg-stone-200 rounded-lg"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="px-3.5 py-1 text-xs font-semibold text-white bg-[#6B8E23] hover:bg-[#5a7a1d] rounded-lg"
                    >
                      Save Log
                    </button>
                  </div>
                </form>
              )}

              <div className="space-y-2 max-h-80 overflow-y-auto">
                {[...weights].reverse().map((w, idx, arr) => {
                  const prev = arr[idx + 1];
                  const wtDiff = prev ? w.weightKg - prev.weightKg : 0;
                  return (
                    <div key={w.date} className="flex justify-between items-center p-3 rounded-lg bg-stone-50 border border-stone-200/50 hover:bg-stone-100/50">
                      <div>
                        <div className="text-sm font-bold text-stone-800">{w.date}</div>
                        {w.heightCm && (
                          <div className="text-[10px] text-stone-500 mt-0.5">Height: {w.heightCm} cm</div>
                        )}
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="text-right">
                          <div className="font-bold text-stone-800 text-sm">{w.weightKg.toFixed(1)} kg</div>
                          {prev && (
                            <div className={`text-[10px] font-semibold ${wtDiff >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                              {wtDiff >= 0 ? '+' : ''}{wtDiff.toFixed(1)} kg
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
                {weights.length === 0 && (
                  <div className="text-center py-6 text-stone-400 text-xs">No growth records logged yet.</div>
                )}
              </div>
            </div>
          )}

          {tab === 'health' && (
            <div className="space-y-5">
              {/* Vaccinations */}
              <div className="space-y-3.5">
                <div className="flex justify-between items-center">
                  <h3 className="font-bold text-stone-800 text-sm uppercase tracking-wider">Vaccinations</h3>
                  <button
                    onClick={() => setShowVacForm(!showVacForm)}
                    className="inline-flex items-center gap-1 bg-[#6B8E23] hover:bg-[#5a7a1d] text-white text-xs font-semibold px-2.5 py-1.5 rounded-lg transition"
                  >
                    <Plus className="w-3.5 h-3.5" /> Log Vaccine
                  </button>
                </div>

                {showVacForm && (
                  <form onSubmit={handleAddVaccinationSubmit} className="bg-stone-50 border border-stone-200 rounded-xl p-4 space-y-3">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="text-[10px] uppercase font-bold text-stone-500 block mb-1">Vaccine Name *</label>
                        <input
                          required
                          type="text"
                          placeholder="e.g. Anthrax Spore"
                          value={vacName}
                          onChange={(e) => setVacName(e.target.value)}
                          className="w-full px-2.5 py-1.5 rounded-lg border border-stone-200 bg-white text-sm outline-none"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] uppercase font-bold text-stone-500 block mb-1">Date Administered</label>
                        <input
                          type="date"
                          value={vacDate}
                          onChange={(e) => setVacDate(e.target.value)}
                          className="w-full px-2.5 py-1.5 rounded-lg border border-stone-200 bg-white text-xs outline-none"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="text-[10px] uppercase font-bold text-stone-500 block mb-1">Notes</label>
                      <input
                        type="text"
                        placeholder="e.g. Dosage 1ml, booster due in 6 months"
                        value={vacNotes}
                        onChange={(e) => setVacNotes(e.target.value)}
                        className="w-full px-2.5 py-1.5 rounded-lg border border-stone-200 bg-white text-sm outline-none"
                      />
                    </div>
                    <div className="flex gap-2 justify-end">
                      <button
                        type="button"
                        onClick={() => setShowVacForm(false)}
                        className="px-3 py-1 text-xs font-semibold text-stone-600 bg-stone-150 hover:bg-stone-200 rounded-lg"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        className="px-3.5 py-1 text-xs font-semibold text-white bg-[#6B8E23] hover:bg-[#5a7a1d] rounded-lg"
                      >
                        Log Vaccine
                      </button>
                    </div>
                  </form>
                )}

                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {(animal.vaccinations || []).map((v) => (
                    <div key={v.id} className="flex justify-between items-center p-3 rounded-lg bg-stone-50 border border-stone-200/50">
                      <div>
                        <div className="text-sm font-bold text-stone-800">{v.vaccineName}</div>
                        <div className="text-[10px] text-stone-500 mt-1 flex items-center gap-1.5">
                          <Calendar className="w-3 h-3" /> {v.date}
                          {v.notes && <span>· {v.notes}</span>}
                        </div>
                      </div>
                      <button
                        onClick={() => onDeleteVaccination(v.id, animal.id, v.vaccineName)}
                        className="p-1 rounded-lg hover:bg-red-50 hover:text-red-600 text-stone-400 transition"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                  {(animal.vaccinations || []).length === 0 && (
                    <div className="text-center py-4 text-stone-400 text-xs">No vaccinations logged.</div>
                  )}
                </div>
              </div>

              {/* Vet Visits */}
              <div className="space-y-3.5 pt-2 border-t border-stone-100">
                <div className="flex justify-between items-center">
                  <h3 className="font-bold text-stone-800 text-sm uppercase tracking-wider">Veterinary Visits</h3>
                  <button
                    onClick={() => setShowVetForm(!showVetForm)}
                    className="inline-flex items-center gap-1 bg-[#6B8E23] hover:bg-[#5a7a1d] text-white text-xs font-semibold px-2.5 py-1.5 rounded-lg transition"
                  >
                    <Plus className="w-3.5 h-3.5" /> Log Vet Visit
                  </button>
                </div>

                {showVetForm && (
                  <form onSubmit={handleAddVetVisitSubmit} className="bg-stone-50 border border-stone-200 rounded-xl p-4 space-y-3">
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                      <div>
                        <label className="text-[10px] uppercase font-bold text-stone-500 block mb-1">Diagnosis *</label>
                        <input
                          required
                          type="text"
                          placeholder="e.g. Mastitis"
                          value={vetDiag}
                          onChange={(e) => setVetDiag(e.target.value)}
                          className="w-full px-2.5 py-1.5 rounded-lg border border-stone-200 bg-white text-sm outline-none"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] uppercase font-bold text-stone-500 block mb-1">Vet Doctor</label>
                        <input
                          type="text"
                          placeholder="Dr. Verma"
                          value={vetDoctor}
                          onChange={(e) => setVetDoctor(e.target.value)}
                          className="w-full px-2.5 py-1.5 rounded-lg border border-stone-200 bg-white text-sm outline-none"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] uppercase font-bold text-stone-500 block mb-1">Treatment Cost (₹)</label>
                        <input
                          type="number"
                          placeholder="1200"
                          value={vetCost}
                          onChange={(e) => setVetCost(e.target.value)}
                          className="w-full px-2.5 py-1.5 rounded-lg border border-stone-200 bg-white text-sm outline-none"
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      <div>
                        <label className="text-[10px] uppercase font-bold text-stone-500 block mb-1">Date</label>
                        <input
                          type="date"
                          value={vetDate}
                          onChange={(e) => setVetDate(e.target.value)}
                          className="w-full px-2.5 py-1.5 rounded-lg border border-stone-200 bg-white text-xs outline-none"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] uppercase font-bold text-stone-500 block mb-1">Treatment Plan</label>
                        <input
                          type="text"
                          placeholder="e.g. Penicillin 5 days"
                          value={vetTreat}
                          onChange={(e) => setVetTreat(e.target.value)}
                          className="w-full px-2.5 py-1.5 rounded-lg border border-stone-200 bg-white text-sm outline-none"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="text-[10px] uppercase font-bold text-stone-500 block mb-1">Additional Notes</label>
                      <input
                        type="text"
                        placeholder="Slight fever, kept in separate box."
                        value={vetNotes}
                        onChange={(e) => setVetNotes(e.target.value)}
                        className="w-full px-2.5 py-1.5 rounded-lg border border-stone-200 bg-white text-sm outline-none"
                      />
                    </div>
                    <div className="flex gap-2 justify-end">
                      <button
                        type="button"
                        onClick={() => setShowVetForm(false)}
                        className="px-3 py-1 text-xs font-semibold text-stone-600 bg-stone-150 hover:bg-stone-200 rounded-lg"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        className="px-3.5 py-1 text-xs font-semibold text-white bg-[#6B8E23] hover:bg-[#5a7a1d] rounded-lg"
                      >
                        Log Visit
                      </button>
                    </div>
                  </form>
                )}

                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {(animal.vetVisits || []).map((v) => (
                    <div key={v.id} className="p-3 rounded-lg bg-stone-50 border border-stone-200/50 space-y-1.5">
                      <div className="flex justify-between items-start">
                        <div>
                          <div className="text-sm font-bold text-stone-800">{v.diagnosis}</div>
                          <div className="text-xs text-[#6B8E23] font-semibold">Treatment: {v.treatment || 'Observation'}</div>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="text-right">
                            <div className="text-sm font-bold text-stone-800">{formatCurrency(v.cost)}</div>
                            <div className="text-[9px] text-stone-500">{v.date}</div>
                          </div>
                          <button
                            onClick={() => onDeleteVetVisit(v.id, animal.id, v.diagnosis)}
                            className="p-1 rounded-lg hover:bg-red-50 hover:text-red-600 text-stone-400 transition"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                      <div className="text-xs text-stone-500 flex gap-2">
                        {v.doctorName && <span>Doctor: {v.doctorName}</span>}
                        {v.notes && <span>· Notes: {v.notes}</span>}
                      </div>
                    </div>
                  ))}
                  {(animal.vetVisits || []).length === 0 && (
                    <div className="text-center py-4 text-stone-400 text-xs">No veterinary visits logged.</div>
                  )}
                </div>
              </div>
            </div>
          )}

          {tab === 'finance' && (
            <div className="space-y-4">
              <h3 className="font-bold text-stone-800 text-sm uppercase tracking-wider">Financial Breakdown</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Cost Statement */}
                <div className="rounded-xl border border-stone-200 bg-stone-50/50 p-4 space-y-2">
                  <div className="text-xs font-semibold text-stone-500 uppercase tracking-wider border-b border-stone-200 pb-1.5">Expenses Ledger</div>
                  <div className="flex justify-between text-sm">
                    <span className="text-stone-600">Purchase Price:</span>
                    <span className="font-semibold text-stone-800">{formatCurrency(animal.acquisitionCost)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-stone-600">Medical Expenses:</span>
                    <span className="font-semibold text-stone-800">{formatCurrency(totalMedCost)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-stone-600">Maintenance &amp; Feed:</span>
                    <span className="font-semibold text-stone-800">{formatCurrency(totalMaintCost)}</span>
                  </div>
                  <div className="flex justify-between text-sm border-t border-dashed border-stone-200 pt-2 font-bold">
                    <span className="text-stone-800">Total Accumulated Cost:</span>
                    <span className="text-stone-900">{formatCurrency(totalCost)}</span>
                  </div>
                </div>

                {/* Returns Statement */}
                <div className="rounded-xl border border-stone-200 bg-stone-50/50 p-4 space-y-2">
                  <div className="text-xs font-semibold text-stone-500 uppercase tracking-wider border-b border-stone-200 pb-1.5">Returns &amp; Profitability</div>
                  <div className="flex justify-between text-sm">
                    <span className="text-stone-600">Current Status:</span>
                    <span className="font-bold text-stone-800">{animal.status}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-stone-600">Sale Price:</span>
                    <span className="font-semibold text-stone-800">{animal.status === 'Sold' ? formatCurrency(animal.salePrice || 0) : '—'}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-stone-600">Purchase Price:</span>
                    <span className="font-semibold text-stone-850">-{formatCurrency(animal.acquisitionCost)}</span>
                  </div>
                  <div className="flex justify-between text-sm border-t border-dashed border-stone-200 pt-2 font-bold">
                    <span className="text-stone-800">Net Profit / Loss:</span>
                    <span className={netROI >= 0 ? 'text-emerald-600' : 'text-red-600'}>
                      {animal.status === 'Sold' ? `${netROI >= 0 ? '+' : ''}${formatCurrency(netROI)}` : 'N/A (Active)'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Expense Logs */}
              <div className="space-y-3.5 pt-2">
                <h4 className="font-bold text-stone-800 text-sm uppercase tracking-wider flex items-center gap-1.5">
                  <FileText className="w-4 h-4 text-stone-500" /> Animal-Specific Ledger Items
                </h4>
                <div className="border border-stone-200 rounded-xl overflow-hidden">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="bg-stone-50 border-b border-stone-200 font-semibold text-stone-600">
                        <th className="p-2.5">Date</th>
                        <th className="p-2.5">Category</th>
                        <th className="p-2.5">Description</th>
                        <th className="p-2.5 text-right">Amount</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-stone-100">
                      {animalExpenses.map((exp) => (
                        <tr key={exp.id} className="hover:bg-stone-50/50">
                          <td className="p-2.5 text-stone-500">{exp.date}</td>
                          <td className="p-2.5 font-semibold text-stone-700">{exp.category}</td>
                          <td className="p-2.5 text-stone-600 truncate max-w-[150px]" title={exp.description}>{exp.description}</td>
                          <td className="p-2.5 text-right font-bold text-stone-805">{formatCurrency(exp.amount)}</td>
                        </tr>
                      ))}
                      {animalExpenses.length === 0 && (
                        <tr>
                          <td colSpan={4} className="p-4 text-center text-stone-400 text-xs">No direct expenses logged for this animal.</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {tab === 'goal' && (
            <div>
              <GoalHistoryView animal={animal} />
              {onEdit && (
                <div className="mt-5 pt-4 border-t border-stone-100">
                  <button
                    onClick={() => onEdit(animal)}
                    className="w-full inline-flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl text-sm font-semibold bg-[#6B8E23] hover:bg-[#577A1C] text-white transition shadow-sm"
                  >
                    <Pencil className="w-4 h-4" /> Edit Target Weight Goal
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

const TabButton: React.FC<{ active: boolean; onClick: () => void; icon: React.ElementType; label: string }> = ({
  active, onClick, icon: Icon, label,
}) => (
  <button
    onClick={onClick}
    className={`flex items-center gap-1.5 px-4 py-3 text-xs font-semibold border-b-2 transition whitespace-nowrap ${
      active
        ? 'border-[#6B8E23] text-[#6B8E23]'
        : 'border-transparent text-stone-500 hover:text-stone-800'
    }`}
  >
    <Icon className="w-3.5 h-3.5 shrink-0" />
    {label}
  </button>
);

const DetailRow: React.FC<{ icon: React.ElementType; label: string; value: string; valueClass?: string }> = ({
  icon: Icon,
  label,
  value,
  valueClass,
}) => (
  <div className="flex items-start gap-2.5 p-3 bg-stone-50 rounded-xl border border-stone-200/40">
    <Icon className="w-4 h-4 text-stone-450 mt-0.5 shrink-0" />
    <div className="flex-1 min-w-0">
      <div className="text-[10px] text-stone-400 uppercase font-semibold tracking-wider">{label}</div>
      <div className={`font-semibold text-stone-850 truncate mt-0.5 ${valueClass || ''}`}>{value}</div>
    </div>
  </div>
);

export default AnimalModal;
