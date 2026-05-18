import React, { useEffect, useState } from 'react';
import { Animal, GoalHistoryEntry } from '@/lib/farmData';
import { fetchGoalHistory } from '@/lib/farmDb';
import { Target, TrendingUp, TrendingDown, Minus, Calendar, User, AlertCircle, Loader2, X } from 'lucide-react';

interface Props {
  animal: Animal;
}

function fmtWeight(w: number | null): string {
  return w == null ? '—' : `${w.toFixed(1)} kg`;
}
function fmtDate(d: string | null): string {
  if (!d) return '—';
  return new Date(d).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
}
function fmtTime(ts: string): string {
  return new Date(ts).toLocaleString(undefined, {
    year: 'numeric', month: 'short', day: 'numeric',
    hour: 'numeric', minute: '2-digit',
  });
}

function classifyChange(entry: GoalHistoryEntry): { kind: 'set' | 'raised' | 'lowered' | 'cleared' | 'date' | 'unchanged'; label: string; tone: string; Icon: React.ElementType } {
  const prevW = entry.previousTargetWeightKg;
  const newW = entry.targetWeightKg;
  const prevD = entry.previousTargetDate;
  const newD = entry.targetDate;

  // Goal cleared
  if (prevW != null && newW == null) {
    return { kind: 'cleared', label: 'Goal cleared', tone: 'bg-stone-100 text-stone-700 border-stone-200', Icon: X };
  }
  // Goal set for the first time
  if (prevW == null && newW != null) {
    return { kind: 'set', label: 'Goal set', tone: 'bg-emerald-50 text-emerald-700 border-emerald-200', Icon: Target };
  }
  // Both present — compare weight
  if (prevW != null && newW != null) {
    if (newW > prevW) return { kind: 'raised', label: `Raised +${(newW - prevW).toFixed(1)} kg`, tone: 'bg-sky-50 text-sky-700 border-sky-200', Icon: TrendingUp };
    if (newW < prevW) return { kind: 'lowered', label: `Lowered ${(newW - prevW).toFixed(1)} kg`, tone: 'bg-amber-50 text-amber-700 border-amber-200', Icon: TrendingDown };
  }
  // Only the date changed
  if (prevD !== newD) {
    return { kind: 'date', label: 'Target date changed', tone: 'bg-indigo-50 text-indigo-700 border-indigo-200', Icon: Calendar };
  }
  return { kind: 'unchanged', label: 'Goal updated', tone: 'bg-stone-100 text-stone-700 border-stone-200', Icon: Minus };
}

const GoalHistoryView: React.FC<Props> = ({ animal }) => {
  const [entries, setEntries] = useState<GoalHistoryEntry[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    fetchGoalHistory(animal.id)
      .then((rows) => { if (!cancelled) setEntries(rows); })
      .catch((err) => { if (!cancelled) setError(err instanceof Error ? err.message : 'Failed to load goal history'); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [animal.id]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-10 text-stone-500 text-sm">
        <Loader2 className="w-4 h-4 mr-2 animate-spin" /> Loading goal history…
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-sm text-red-700 flex items-start gap-2">
        <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" /> {error}
      </div>
    );
  }

  // Current goal summary
  const hasCurrentGoal = animal.targetWeightKg != null;

  return (
    <div className="space-y-4">
      {/* Current goal card */}
      <div className={`rounded-xl border p-4 ${hasCurrentGoal ? 'border-[#6B8E23]/30 bg-[#6B8E23]/5' : 'border-stone-200 bg-stone-50'}`}>
        <div className="flex items-center gap-2 mb-2">
          <Target className={`w-4 h-4 ${hasCurrentGoal ? 'text-[#6B8E23]' : 'text-stone-400'}`} />
          <div className="text-xs font-semibold uppercase tracking-wide text-stone-600">Current Goal</div>
        </div>
        {hasCurrentGoal ? (
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <div className="text-xs text-stone-500">Target weight</div>
              <div className="font-bold text-stone-800">{fmtWeight(animal.targetWeightKg ?? null)}</div>
            </div>
            <div>
              <div className="text-xs text-stone-500">Target date</div>
              <div className="font-bold text-stone-800">{fmtDate(animal.targetDate ?? null)}</div>
            </div>
          </div>
        ) : (
          <div className="text-sm text-stone-500">No active growth goal. Edit this animal to set one.</div>
        )}
      </div>

      {/* Timeline */}
      {!entries || entries.length === 0 ? (
        <div className="text-center py-8 text-sm text-stone-500 border border-dashed border-stone-200 rounded-xl">
          No goal changes recorded yet. Future edits to the target weight or date will appear here.
        </div>
      ) : (
        <ol className="relative border-l-2 border-stone-200 ml-3 space-y-4 pb-1">
          {entries.map((e) => {
            const c = classifyChange(e);
            const Icon = c.Icon;
            return (
              <li key={e.id} className="ml-5 relative">
                <span className="absolute -left-[34px] top-1 w-6 h-6 rounded-full bg-white border-2 border-stone-200 flex items-center justify-center">
                  <Icon className="w-3 h-3 text-stone-600" />
                </span>
                <div className="bg-white border border-stone-200 rounded-xl p-3 shadow-sm">
                  <div className="flex flex-wrap items-center gap-2 mb-2">
                    <span className={`text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-md border ${c.tone}`}>
                      {c.label}
                    </span>
                    <span className="text-[11px] text-stone-500 flex items-center gap-1">
                      <Calendar className="w-3 h-3" /> {fmtTime(e.setAt)}
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="bg-stone-50 rounded-lg p-2">
                      <div className="text-[10px] uppercase text-stone-500 font-semibold">Weight</div>
                      <div className="font-medium text-stone-800">
                        {fmtWeight(e.previousTargetWeightKg)} <span className="text-stone-400">→</span>{' '}
                        <span className="text-stone-900 font-bold">{fmtWeight(e.targetWeightKg)}</span>
                      </div>
                    </div>
                    <div className="bg-stone-50 rounded-lg p-2">
                      <div className="text-[10px] uppercase text-stone-500 font-semibold">Target date</div>
                      <div className="font-medium text-stone-800">
                        {fmtDate(e.previousTargetDate)} <span className="text-stone-400">→</span>{' '}
                        <span className="text-stone-900 font-bold">{fmtDate(e.targetDate)}</span>
                      </div>
                    </div>
                  </div>
                  {e.reason && (
                    <div className="mt-2 text-xs text-stone-700 bg-amber-50 border border-amber-100 rounded-lg p-2">
                      <span className="font-semibold text-amber-800">Reason: </span>{e.reason}
                    </div>
                  )}
                  <div className="mt-2 text-[11px] text-stone-500 flex items-center gap-1">
                    <User className="w-3 h-3" />
                    {e.setByName || e.setByEmail || 'Unknown user'}
                  </div>
                </div>
              </li>
            );
          })}
        </ol>
      )}
    </div>
  );
};

export default GoalHistoryView;
