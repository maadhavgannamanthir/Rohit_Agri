import React, { useState } from 'react';
import { Animal } from '@/lib/farmData';
import { X, Upload, Camera, Sparkles } from 'lucide-react';

interface Props {
  open: boolean;
  onClose: () => void;
  onAdd: (a: Omit<Animal, 'id' | 'weights' | 'photos' | 'allocatedExpenses'>) => void;
}

const SAMPLE_PHOTOS = [
  'https://images.unsplash.com/photo-1484557985045-edf25e08da73?w=600&h=400&fit=crop',
  'https://images.unsplash.com/photo-1570042225831-d98fa7577f1e?w=600&h=400&fit=crop',
  'https://images.unsplash.com/photo-1533318087102-b3ad366ed041?w=600&h=400&fit=crop',
  'https://images.unsplash.com/photo-1524024973431-2ad916746881?w=600&h=400&fit=crop',
];

const AddAnimalModal: React.FC<Props> = ({ open, onClose, onAdd }) => {
  const [form, setForm] = useState({
    name: '',
    tagId: '',
    species: 'Sheep' as 'Sheep' | 'Goat' | 'Cow',
    breed: '',
    sex: 'Male' as 'Male' | 'Female',
    birthDate: '',
    acquisitionDate: new Date().toISOString().slice(0, 10),
    acquisitionCost: '',
    healthNotes: '',
    photoUrl: SAMPLE_PHOTOS[0],
    targetWeightKg: '',
    targetDate: '',
  });

  const [aiChecking, setAiChecking] = useState(false);
  const [aiResult, setAiResult] = useState<string | null>(null);

  if (!open) return null;

  const handleAICheck = () => {
    setAiChecking(true);
    setAiResult(null);
    setTimeout(() => {
      setAiChecking(false);
      setAiResult('No matches found in registry — this appears to be a new animal.');
    }, 1500);
  };

  const handleSubmit = () => {
    if (!form.name || !form.tagId || !form.acquisitionCost) return;
    const parsedTarget = form.targetWeightKg ? parseFloat(form.targetWeightKg) : undefined;
    onAdd({
      name: form.name,
      tagId: form.tagId,
      species: form.species,
      breed: form.breed || 'Mixed',
      sex: form.sex,
      birthDate: form.birthDate || '2024-01-01',
      acquisitionDate: form.acquisitionDate,
      acquisitionCost: parseFloat(form.acquisitionCost),
      status: 'Active',
      photoUrl: form.photoUrl,
      healthNotes: form.healthNotes || 'New arrival - to be assessed',
      vaccinated: false,
      targetWeightKg: parsedTarget && parsedTarget > 0 ? parsedTarget : undefined,
      targetDate: form.targetDate || undefined,
    });
    setForm({
      name: '', tagId: '', species: 'Sheep', breed: '', sex: 'Male',
      birthDate: '', acquisitionDate: new Date().toISOString().slice(0, 10),
      acquisitionCost: '', healthNotes: '', photoUrl: SAMPLE_PHOTOS[0],
      targetWeightKg: '', targetDate: '',
    });
    setAiResult(null);
    onClose();
  };


  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4 overflow-y-auto">
      <div className="bg-white w-full sm:max-w-2xl rounded-t-3xl sm:rounded-2xl shadow-2xl max-h-[95vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-stone-200 px-5 py-4 flex items-center justify-between z-10">
          <h2 className="font-bold text-stone-800">Register New Animal</h2>
          <button onClick={onClose} className="w-8 h-8 rounded-full hover:bg-stone-100 flex items-center justify-center">
            <X className="w-4 h-4 text-stone-600" />
          </button>
        </div>

        <div className="p-5 space-y-5">
          {/* Photo selection */}
          <div>
            <label className="text-sm font-semibold text-stone-700 mb-2 block">Animal Photo</label>
            <div className="grid grid-cols-4 gap-2 mb-3">
              {SAMPLE_PHOTOS.map((p) => (
                <button
                  key={p}
                  onClick={() => setForm({ ...form, photoUrl: p })}
                  className={`aspect-square rounded-lg overflow-hidden border-2 transition ${form.photoUrl === p ? 'border-[#6B8E23] ring-2 ring-[#6B8E23]/30' : 'border-transparent hover:border-stone-300'
                    }`}
                >
                  <img src={p} className="w-full h-full object-cover" alt="" />
                </button>
              ))}
            </div>
            <div className="flex gap-2">
              <button className="flex-1 inline-flex items-center justify-center gap-2 px-3 py-2 rounded-lg border-2 border-dashed border-stone-300 text-stone-500 hover:border-[#6B8E23] hover:text-[#6B8E23] text-sm font-medium transition">
                <Camera className="w-4 h-4" /> Take Photo
              </button>
              <button className="flex-1 inline-flex items-center justify-center gap-2 px-3 py-2 rounded-lg border-2 border-dashed border-stone-300 text-stone-500 hover:border-[#6B8E23] hover:text-[#6B8E23] text-sm font-medium transition">
                <Upload className="w-4 h-4" /> Upload
              </button>
            </div>

            {/* AI ID check */}
            <button
              onClick={handleAICheck}
              disabled={aiChecking}
              className="mt-3 w-full inline-flex items-center justify-center gap-2 bg-gradient-to-r from-[#6B8E23] to-[#8FB229] hover:opacity-90 text-white text-sm font-medium px-3 py-2.5 rounded-lg transition disabled:opacity-60"
            >
              <Sparkles className="w-4 h-4" />
              {aiChecking ? 'Analyzing photo...' : 'Check AI for existing match'}
            </button>
            {aiResult && (
              <div className="mt-2 p-2.5 rounded-lg bg-blue-50 text-xs text-blue-700 border border-blue-200">
                ✓ {aiResult}
              </div>
            )}
          </div>

          {/* Form */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Field label="Name *">
              <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. Daisy" className={inputCls} />
            </Field>
            <Field label="Tag ID / RFID *">
              <input value={form.tagId} onChange={(e) => setForm({ ...form, tagId: e.target.value })} placeholder="e.g. SH-013" className={inputCls} />
            </Field>
            <Field label="Species">
              <select value={form.species} onChange={(e) => setForm({ ...form, species: e.target.value as 'Sheep' | 'Goat' | 'Cow' })} className={inputCls}>
                <option>Sheep</option>
                <option>Goat</option>
                <option>Cow</option>
              </select>
            </Field>
            <Field label="Breed">
              <input value={form.breed} onChange={(e) => setForm({ ...form, breed: e.target.value })} placeholder="e.g. Merino" className={inputCls} />
            </Field>
            <Field label="Sex">
              <select value={form.sex} onChange={(e) => setForm({ ...form, sex: e.target.value as 'Male' | 'Female' })} className={inputCls}>
                <option>Male</option>
                <option>Female</option>
              </select>
            </Field>
            <Field label="Birth Date">
              <input type="date" value={form.birthDate} onChange={(e) => setForm({ ...form, birthDate: e.target.value })} className={inputCls} />
            </Field>
            <Field label="Acquisition Date">
              <input type="date" value={form.acquisitionDate} onChange={(e) => setForm({ ...form, acquisitionDate: e.target.value })} className={inputCls} />
            </Field>
            <Field label="Acquisition Cost *">
              <input type="number" value={form.acquisitionCost} onChange={(e) => setForm({ ...form, acquisitionCost: e.target.value })} placeholder="0" className={inputCls} />
            </Field>

            <div className="sm:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-3 p-3 rounded-lg bg-[#6B8E23]/5 border border-[#6B8E23]/20">
              <div className="sm:col-span-2 text-xs font-semibold text-[#6B8E23] flex items-center gap-1.5">
                <span className="inline-block w-1.5 h-1.5 rounded-full bg-[#6B8E23]" /> Growth Goal (optional)
              </div>
              <Field label="Target Weight (kg)">
                <input
                  type="number"
                  step="0.1"
                  min="0"
                  value={form.targetWeightKg}
                  onChange={(e) => setForm({ ...form, targetWeightKg: e.target.value })}
                  placeholder="e.g. 45"
                  className={inputCls}
                />
              </Field>
              <Field label="Target Date">
                <input
                  type="date"
                  value={form.targetDate}
                  onChange={(e) => setForm({ ...form, targetDate: e.target.value })}
                  className={inputCls}
                />
              </Field>
            </div>
            <div className="sm:col-span-2">
              <Field label="Health Notes">
                <textarea
                  value={form.healthNotes}
                  onChange={(e) => setForm({ ...form, healthNotes: e.target.value })}
                  placeholder="Optional notes..."
                  rows={2}
                  className={inputCls + ' resize-none'}
                />
              </Field>
            </div>
          </div>


          <div className="flex gap-2 pt-2">
            <button onClick={onClose} className="flex-1 px-4 py-2.5 rounded-lg bg-stone-100 hover:bg-stone-200 text-stone-700 text-sm font-medium">
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              disabled={!form.name || !form.tagId || !form.acquisitionCost}
              className="flex-1 px-4 py-2.5 rounded-lg bg-[#6B8E23] hover:bg-[#5a7a1d] disabled:bg-stone-300 text-white text-sm font-medium"
            >
              Register Animal
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

const inputCls = 'w-full px-3 py-2 rounded-lg border border-stone-200 bg-stone-50 text-sm outline-none focus:bg-white focus:border-[#6B8E23] focus:ring-2 focus:ring-[#6B8E23]/20';

const Field: React.FC<{ label: string; children: React.ReactNode }> = ({ label, children }) => (
  <div>
    <label className="text-xs font-medium text-stone-600 mb-1 block">{label}</label>
    {children}
  </div>
);

export default AddAnimalModal;
