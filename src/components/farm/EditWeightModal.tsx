import React, { useEffect, useState } from 'react';
import { Animal, WeightLog } from '@/lib/farmData';
import { X, Save, Scale } from 'lucide-react';

interface Props {
  animal: Animal | null;
  log: WeightLog | null;
  onClose: () => void;
  onSave: (
    animalId: string,
    oldDate: string,
    oldWeight: number,
    newDate: string,
    newWeight: number
  ) => void;
}

const EditWeightModal: React.FC<Props> = ({ animal, log, onClose, onSave }) => {
  const [date, setDate] = useState('');
  const [weight, setWeight] = useState('');

  useEffect(() => {
    if (log) {
      setDate(log.date);
      setWeight(String(log.weightKg));
    }
  }, [log]);

  if (!animal || !log) return null;

  const w = parseFloat(weight);
  const valid = !!date && !isNaN(w) && w > 0;
  const changed = valid && (date !== log.date || w !== log.weightKg);

  const handleSave = () => {
    if (!valid || !changed) return;
    onSave(animal.id, log.date, log.weightKg, date, w);
  };

  return (
    <div className="fixed inset-0 z-[55] bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4 overflow-y-auto">
      <div className="bg-white w-full sm:max-w-md rounded-t-3xl sm:rounded-2xl shadow-2xl overflow-hidden">
        <div className="px-5 py-4 border-b border-stone-200 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#6B8E23]/10 flex items-center justify-center">
              <Scale className="w-5 h-5 text-[#6B8E23]" />
            </div>
            <div>
              <h2 className="font-bold text-stone-800">Edit Weigh-in</h2>
              <p className="text-xs text-stone-500 mt-0.5">
                {animal.name} · {animal.tagId}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg hover:bg-stone-100 flex items-center justify-center"
          >
            <X className="w-4 h-4 text-stone-600" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          <div>
            <label className="text-xs font-medium text-stone-600 mb-1 block">
              Weigh-in Date
            </label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              max={new Date().toISOString().slice(0, 10)}
              className="w-full px-3 py-2 rounded-lg border border-stone-200 bg-stone-50 focus:bg-white focus:border-[#6B8E23] focus:ring-2 focus:ring-[#6B8E23]/20 outline-none text-sm"
            />
          </div>

          <div>
            <label className="text-xs font-medium text-stone-600 mb-1 block">
              Weight (kg)
            </label>
            <div className="relative">
              <input
                type="number"
                step="0.1"
                min="0"
                value={weight}
                onChange={(e) => setWeight(e.target.value)}
                className="w-full pl-3 pr-12 py-2 rounded-lg border border-stone-200 bg-stone-50 focus:bg-white focus:border-[#6B8E23] focus:ring-2 focus:ring-[#6B8E23]/20 outline-none text-sm"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-stone-400 font-medium">
                kg
              </span>
            </div>
          </div>

          <div className="text-xs text-stone-500 bg-stone-50 rounded-lg p-3 border border-stone-100">
            <div className="font-medium text-stone-700 mb-1">Original entry</div>
            <div>
              {log.date} · {log.weightKg.toFixed(1)} kg
            </div>
          </div>
        </div>

        <div className="bg-stone-50 px-5 py-3 flex justify-end gap-2 border-t border-stone-200">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg text-sm font-medium text-stone-700 hover:bg-stone-200"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={!changed}
            className="inline-flex items-center gap-1.5 px-5 py-2 rounded-lg text-sm font-semibold bg-[#6B8E23] hover:bg-[#577A1C] disabled:bg-stone-300 text-white"
          >
            <Save className="w-4 h-4" /> Save Changes
          </button>
        </div>
      </div>
    </div>
  );
};

export default EditWeightModal;
