import React, { useEffect, useState } from 'react';
import { Animal, AnimalStatus } from '@/lib/farmData';
import { X, Save, Plus, Trash2, Target } from 'lucide-react';

interface Props {
  animal: Animal | null;
  onClose: () => void;
  onSave: (
    id: string,
    patch: Partial<
      Pick<
        Animal,
        | 'name'
        | 'breed'
        | 'healthNotes'
        | 'vaccinated'
        | 'photoUrl'
        | 'photos'
        | 'targetWeightKg'
        | 'targetDate'
        | 'status'
      >
    >,
    goalReason?: string,
  ) => void;
}

const EditAnimalModal: React.FC<Props> = ({ animal, onClose, onSave }) => {
  const [name, setName] = useState('');
  const [breed, setBreed] = useState('');
  const [status, setStatus] = useState<AnimalStatus>('Active');
  const [healthNotes, setHealthNotes] = useState('');
  const [vaccinated, setVaccinated] = useState(false);
  const [photos, setPhotos] = useState<string[]>([]);
  const [newPhoto, setNewPhoto] = useState('');
  const [targetWeightKg, setTargetWeightKg] = useState('');
  const [targetDate, setTargetDate] = useState('');
  const [goalReason, setGoalReason] = useState('');

  useEffect(() => {
    if (animal) {
      setName(animal.name);
      setBreed(animal.breed);
      setStatus(animal.status);
      setHealthNotes(animal.healthNotes);
      setVaccinated(animal.vaccinated);
      setPhotos(animal.photos.length ? animal.photos : [animal.photoUrl]);
      setNewPhoto('');
      setTargetWeightKg(animal.targetWeightKg != null ? String(animal.targetWeightKg) : '');
      setTargetDate(animal.targetDate || '');
      setGoalReason('');
    }
  }, [animal]);

  if (!animal) return null;

  const addPhoto = () => {
    const url = newPhoto.trim();
    if (!url) return;
    setPhotos((p) => [...p, url]);
    setNewPhoto('');
  };

  const removePhoto = (i: number) => {
    setPhotos((p) => p.filter((_, idx) => idx !== i));
  };

  // Detect whether the goal actually changed vs the loaded animal
  const parsedTarget = targetWeightKg.trim() ? parseFloat(targetWeightKg) : undefined;
  const newTargetWeight = parsedTarget && parsedTarget > 0 ? parsedTarget : undefined;
  const newTargetDate = targetDate || undefined;
  const goalChanged =
    (newTargetWeight ?? null) !== (animal.targetWeightKg ?? null) ||
    (newTargetDate ?? null) !== (animal.targetDate ?? null);

  const handleSave = () => {
    if (!name.trim()) return;
    const cleanPhotos = photos.length ? photos : [animal.photoUrl];
    onSave(
      animal.id,
      {
        name: name.trim(),
        breed: breed.trim(),
        status,
        healthNotes: healthNotes.trim(),
        vaccinated,
        photoUrl: cleanPhotos[0],
        photos: cleanPhotos,
        targetWeightKg: newTargetWeight,
        targetDate: newTargetDate,
      },
      goalChanged ? goalReason.trim() : undefined,
    );
  };


  return (
    <div className="fixed inset-0 z-[55] bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4 overflow-y-auto">
      <div className="bg-white w-full sm:max-w-xl rounded-t-3xl sm:rounded-2xl shadow-2xl max-h-[95vh] overflow-y-auto">
        <div className="sticky top-0 bg-white px-5 py-4 border-b border-stone-200 flex items-center justify-between z-10">
          <div>
            <h2 className="font-bold text-stone-800">Edit Animal</h2>
            <p className="text-xs text-stone-500 mt-0.5">{animal.tagId} · {animal.species}</p>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-lg hover:bg-stone-100 flex items-center justify-center">
            <X className="w-4 h-4 text-stone-600" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Field label="Name">
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="input"
              />
            </Field>
            <Field label="Breed">
              <input
                value={breed}
                onChange={(e) => setBreed(e.target.value)}
                className="input"
              />
            </Field>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Field label="Status">
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as AnimalStatus)}
                className="input"
              >
                <option value="Active">Active</option>
                {animal.sex === 'Female' && (
                  <>
                    <option value="Pregnant">Pregnant</option>
                    <option value="Lactating">Lactating</option>
                    <option value="Dry">Dry</option>
                  </>
                )}
                <option value="Sold">Sold</option>
                <option value="Deceased">Deceased</option>
                <option value="Transferred">Transferred</option>
              </select>
            </Field>
          </div>

          <Field label="Health Notes">
            <textarea
              value={healthNotes}
              onChange={(e) => setHealthNotes(e.target.value)}
              rows={3}
              className="input resize-none"
              placeholder="Conditions, treatments, observations..."
            />
          </Field>

          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={vaccinated}
              onChange={(e) => setVaccinated(e.target.checked)}
              className="rounded border-stone-300 text-[#6B8E23] focus:ring-[#6B8E23]"
            />
            <span className="text-sm text-stone-700">Vaccinations up to date</span>
          </label>

          <div className="p-3 rounded-lg bg-[#6B8E23]/5 border border-[#6B8E23]/20 space-y-2">
            <div className="flex items-center gap-2 text-xs font-semibold text-[#6B8E23]">
              <Target className="w-3.5 h-3.5" /> Growth Goal (optional)
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Field label="Target Weight (kg)">
                <input
                  type="number"
                  step="0.1"
                  min="0"
                  value={targetWeightKg}
                  onChange={(e) => setTargetWeightKg(e.target.value)}
                  placeholder="e.g. 45"
                  className="input"
                />
              </Field>
              <Field label="Target Date">
                <input
                  type="date"
                  value={targetDate}
                  onChange={(e) => setTargetDate(e.target.value)}
                  className="input"
                />
              </Field>
            </div>
            <Field label={`Reason for change${goalChanged ? '' : ' (only shown if goal changes)'}`}>
              <input
                value={goalReason}
                onChange={(e) => setGoalReason(e.target.value)}
                placeholder="e.g. Adjusted after vet check / feed switch / Eid market"
                className="input"
                disabled={!goalChanged}
              />
            </Field>
            <p className="text-[11px] text-stone-500">
              Leave the goal fields blank to remove the goal. Every change to the target is logged in Goal History with the reason you provide.
            </p>
          </div>


          <div>
            <label className="text-xs font-medium text-stone-600 mb-2 block">Photos (first photo is cover)</label>
            <div className="grid grid-cols-3 gap-2 mb-2">
              {photos.map((p, i) => (
                <div key={i} className="relative group aspect-square">
                  <img src={p} alt="" className="w-full h-full object-cover rounded-lg border border-stone-200" />
                  {i === 0 && (
                    <span className="absolute top-1 left-1 text-[9px] font-bold bg-[#6B8E23] text-white px-1.5 py-0.5 rounded">
                      COVER
                    </span>
                  )}
                  <button
                    onClick={() => removePhoto(i)}
                    className="absolute top-1 right-1 w-6 h-6 rounded-full bg-red-600 text-white opacity-0 group-hover:opacity-100 transition flex items-center justify-center"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </div>
            <div className="flex gap-2">
              <input
                value={newPhoto}
                onChange={(e) => setNewPhoto(e.target.value)}
                placeholder="Paste image URL..."
                className="input flex-1"
              />
              <button
                onClick={addPhoto}
                disabled={!newPhoto.trim()}
                className="inline-flex items-center gap-1 px-3 py-2 rounded-lg text-sm font-medium bg-stone-100 hover:bg-stone-200 disabled:opacity-50 text-stone-700"
              >
                <Plus className="w-4 h-4" /> Add
              </button>
            </div>
          </div>
        </div>

        <div className="sticky bottom-0 bg-white border-t border-stone-200 px-5 py-3 flex justify-end gap-2">
          <button onClick={onClose} className="px-4 py-2 rounded-lg text-sm font-medium text-stone-700 hover:bg-stone-100">
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={!name.trim()}
            className="inline-flex items-center gap-1.5 px-5 py-2 rounded-lg text-sm font-semibold bg-[#6B8E23] hover:bg-[#577A1C] disabled:bg-stone-300 text-white"
          >
            <Save className="w-4 h-4" /> Save Changes
          </button>
        </div>
      </div>

      <style>{`.input{width:100%;padding:.5rem .75rem;border-radius:.5rem;border:1px solid #e7e5e4;background:#fafaf9;font-size:.875rem;outline:none}.input:focus{background:#fff;border-color:#6B8E23}`}</style>
    </div>
  );
};

const Field: React.FC<{ label: string; children: React.ReactNode }> = ({ label, children }) => (
  <div>
    <label className="text-xs font-medium text-stone-600 mb-1 block">{label}</label>
    {children}
  </div>
);

export default EditAnimalModal;
