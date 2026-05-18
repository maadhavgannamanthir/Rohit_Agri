import React, { useState } from 'react';
import {
  Animal,
  WeightLog,
  getWeightChange,
  getGoalProjection,
  GoalStatus,
} from '@/lib/farmData';
import {
  Scale,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  Bluetooth,
  Plus,
  Pencil,
  Trash2,
  Target,
  CalendarClock,
  CheckCircle2,
} from 'lucide-react';

interface Props {
  animals: Animal[];
  onLogWeight: (animalId: string, weight: number) => void;
  onEditWeight: (animal: Animal, log: WeightLog) => void;
  onDeleteWeight: (animal: Animal, log: WeightLog) => void;
}

// ---------------- Goal status badge ----------------
const GOAL_STYLES: Record<GoalStatus, { label: string; cls: string; dot: string }> = {
  'on-track': {
    label: 'On Track',
    cls: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    dot: 'bg-emerald-500',
  },
  ahead: {
    label: 'Ahead',
    cls: 'bg-sky-50 text-sky-700 border-sky-200',
    dot: 'bg-sky-500',
  },
  behind: {
    label: 'Behind',
    cls: 'bg-red-50 text-red-700 border-red-200',
    dot: 'bg-red-500',
  },
  achieved: {
    label: 'Achieved',
    cls: 'bg-amber-50 text-amber-700 border-amber-200',
    dot: 'bg-amber-500',
  },
  none: {
    label: 'No Goal',
    cls: 'bg-stone-100 text-stone-500 border-stone-200',
    dot: 'bg-stone-400',
  },
};

const GoalBadge: React.FC<{ status: GoalStatus; compact?: boolean }> = ({ status, compact }) => {
  const s = GOAL_STYLES[status];
  if (compact) {
    return (
      <span
        title={s.label}
        className={`inline-flex items-center justify-center w-2.5 h-2.5 rounded-full ${s.dot}`}
      />
    );
  }
  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-[10px] font-semibold ${s.cls}`}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${s.dot}`} />
      {s.label}
    </span>
  );
};

const WeightsView: React.FC<Props> = ({ animals, onLogWeight, onEditWeight, onDeleteWeight }) => {
  const active = animals.filter((a) => a.status === 'Active');
  const [selectedId, setSelectedId] = useState<string>(active[0]?.id || '');
  const selected = active.find((a) => a.id === selectedId) || active[0];
  const [newWeight, setNewWeight] = useState('');

  const handleLog = () => {
    const w = parseFloat(newWeight);
    if (!w || !selected) return;
    onLogWeight(selected.id, w);
    setNewWeight('');
  };

  if (!selected) {
    return (
      <div className="text-center py-12 text-stone-500">No active animals to track</div>
    );
  }

  const weights = selected.weights;
  const hasWeights = weights.length > 0;
  const change = getWeightChange(weights);
  const projection = getGoalProjection(selected);
  const hasGoal = projection.targetWeightKg != null;

  // Chart bounds — include target weight so the goal line is on the canvas
  const allYs: number[] = weights.map((w) => w.weightKg);
  if (hasGoal) allYs.push(projection.targetWeightKg as number);
  const maxY = allYs.length ? Math.max(...allYs) : 0;
  const minY = allYs.length ? Math.min(...allYs) : 0;
  const pad = Math.max(1, (maxY - minY) * 0.12);
  const yMax = maxY + pad;
  const yMin = Math.max(0, minY - pad);
  const yRange = yMax - yMin || 1;

  // SVG dimensions
  const W = 600;
  const H = 200;

  const yFor = (kg: number) => H - ((kg - yMin) / yRange) * (H - 20) - 10;

  const points = weights.map((w, i) => {
    const x = weights.length === 1 ? W / 2 : (i / (weights.length - 1)) * W;
    return { x, y: yFor(w.weightKg), w: w.weightKg, d: w.date };
  });
  const pathD = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');
  const areaD = pathD ? `${pathD} L ${W} ${H} L 0 ${H} Z` : '';
  const targetY = hasGoal ? yFor(projection.targetWeightKg as number) : null;



  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold text-stone-800">Weight Tracking</h1>
          <p className="text-stone-500 mt-1">Weekly weigh-ins · {active.length} active animals</p>
        </div>
        <button className="inline-flex items-center gap-2 bg-white border border-stone-200 hover:bg-stone-50 text-stone-700 px-4 py-2.5 rounded-xl text-sm font-medium transition">
          <Bluetooth className="w-4 h-4 text-blue-600" /> Connect Smart Scale
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Animal list */}
        <div className="bg-white rounded-2xl border border-stone-200 p-4 lg:max-h-[640px] overflow-y-auto">
          <h2 className="font-semibold text-sm text-stone-700 mb-3 px-1">Select Animal</h2>
          <div className="space-y-1.5">
            {active.map((a) => {
              const lastW = a.weights[a.weights.length - 1]?.weightKg || 0;
              const ch = getWeightChange(a.weights);
              const alert = ch < -5;
              const proj = getGoalProjection(a);
              return (
                <button
                  key={a.id}
                  onClick={() => setSelectedId(a.id)}
                  className={`w-full flex items-center gap-3 p-2 rounded-lg text-left transition ${
                    selectedId === a.id
                      ? 'bg-[#6B8E23]/10 ring-1 ring-[#6B8E23]/30'
                      : 'hover:bg-stone-50'
                  }`}
                >
                  <img src={a.photoUrl} className="w-10 h-10 rounded-lg object-cover" alt={a.name} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="font-medium text-sm text-stone-800 truncate">{a.name}</span>
                    </div>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <span className="text-xs text-stone-500 truncate">{a.tagId} · {lastW.toFixed(1)}kg</span>
                    </div>
                    <div className="mt-1">
                      <GoalBadge status={proj.status} />
                    </div>
                  </div>
                  {alert ? (
                    <AlertTriangle className="w-4 h-4 text-red-500 shrink-0" />
                  ) : ch > 0 ? (
                    <TrendingUp className="w-4 h-4 text-emerald-500 shrink-0" />
                  ) : (
                    <TrendingDown className="w-4 h-4 text-stone-400 shrink-0" />
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Detail panel */}
        <div className="lg:col-span-2 space-y-4">
          <div className="bg-white rounded-2xl border border-stone-200 p-5">
            <div className="flex items-center gap-4 mb-4">
              <img src={selected.photoUrl} className="w-16 h-16 rounded-xl object-cover" alt={selected.name} />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xl font-bold text-stone-800 truncate">{selected.name}</span>
                  <GoalBadge status={projection.status} />
                </div>
                <div className="text-sm text-stone-500">{selected.tagId} · {selected.breed} · {selected.sex}</div>
              </div>
              {hasWeights && (
                <div className="text-right shrink-0">
                  <div className="text-2xl font-bold text-stone-800">
                    {weights[weights.length - 1].weightKg.toFixed(1)}<span className="text-sm text-stone-500"> kg</span>
                  </div>
                  <div className={`text-xs font-semibold ${change >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                    {change >= 0 ? '+' : ''}{change.toFixed(1)}% (2 wk)
                  </div>
                </div>
              )}
            </div>

            {change < -10 && (
              <div className="mb-4 flex items-start gap-2 p-3 rounded-lg bg-red-50 border border-red-200 text-sm">
                <AlertTriangle className="w-4 h-4 text-red-600 mt-0.5 shrink-0" />
                <div>
                  <div className="font-semibold text-red-700">Health Alert</div>
                  <div className="text-red-600">Weight dropped &gt;10% in 2 weeks. Schedule vet check.</div>
                </div>
              </div>
            )}

            {/* Chart */}
            {hasWeights ? (
              <div className="border border-stone-100 rounded-xl p-3 bg-stone-50/50">
                <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-auto" preserveAspectRatio="none">
                  <defs>
                    <linearGradient id="wg" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#6B8E23" stopOpacity="0.3" />
                      <stop offset="100%" stopColor="#6B8E23" stopOpacity="0" />
                    </linearGradient>
                  </defs>
                  <path d={areaD} fill="url(#wg)" />
                  <path d={pathD} fill="none" stroke="#6B8E23" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />

                  {/* Goal line (dashed) */}
                  {targetY != null && (
                    <g>
                      <line
                        x1={0}
                        x2={W}
                        y1={targetY}
                        y2={targetY}
                        stroke="#D97706"
                        strokeWidth="2"
                        strokeDasharray="6 5"
                        strokeLinecap="round"
                      />
                      <rect
                        x={W - 96}
                        y={Math.max(2, targetY - 18)}
                        width={94}
                        height={16}
                        rx={8}
                        fill="#FEF3C7"
                        stroke="#FCD34D"
                      />
                      <text
                        x={W - 49}
                        y={Math.max(13, targetY - 6)}
                        textAnchor="middle"
                        fontSize="10"
                        fontWeight="700"
                        fill="#92400E"
                      >
                        Goal {(projection.targetWeightKg as number).toFixed(1)} kg
                      </text>
                    </g>
                  )}

                  {points.map((p, i) => (
                    <g key={i}>
                      <circle cx={p.x} cy={p.y} r="4" fill="white" stroke="#6B8E23" strokeWidth="2" />
                    </g>
                  ))}
                </svg>
                <div className="flex justify-between text-[10px] text-stone-400 mt-1 px-1">
                  <span>{weights[0].date.slice(5)}</span>
                  {weights.length > 2 && <span>{weights[Math.floor(weights.length / 2)].date.slice(5)}</span>}
                  <span>{weights[weights.length - 1].date.slice(5)}</span>
                </div>
              </div>
            ) : (
              <div className="border border-dashed border-stone-200 rounded-xl p-6 text-center text-sm text-stone-500">
                No weigh-ins recorded yet. Log this animal's first weight below.
              </div>
            )}

            {/* Goal projection panel */}
            {hasGoal && (
              <GoalPanel projection={projection} />
            )}
            {!hasGoal && (
              <div className="mt-4 p-3 rounded-xl bg-stone-50 border border-dashed border-stone-200 text-xs text-stone-500 flex items-center gap-2">
                <Target className="w-4 h-4 text-stone-400" />
                No growth goal set for {selected.name}. Set a target weight &amp; date from{' '}
                <span className="font-semibold text-stone-700">Edit Animal</span> to see progress projections here.
              </div>
            )}
          </div>

          {/* Log new weight */}
          <div className="bg-white rounded-2xl border border-stone-200 p-5">
            <h3 className="font-semibold text-stone-800 mb-3 flex items-center gap-2">
              <Scale className="w-4 h-4 text-[#6B8E23]" /> Log This Week's Weight
            </h3>
            <div className="flex gap-2">
              <div className="flex-1 relative">
                <input
                  type="number"
                  step="0.1"
                  placeholder="Weight in kg..."
                  value={newWeight}
                  onChange={(e) => setNewWeight(e.target.value)}
                  className="w-full pl-3 pr-12 py-2.5 rounded-lg border border-stone-200 bg-stone-50 focus:bg-white focus:border-[#6B8E23] focus:ring-2 focus:ring-[#6B8E23]/20 outline-none text-sm"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-stone-400 font-medium">kg</span>
              </div>
              <button
                onClick={handleLog}
                disabled={!newWeight}
                className="inline-flex items-center gap-1.5 bg-[#6B8E23] hover:bg-[#5a7a1d] disabled:bg-stone-300 text-white px-4 py-2.5 rounded-lg text-sm font-medium transition"
              >
                <Plus className="w-4 h-4" /> Log
              </button>
            </div>
            {hasWeights && (
              <p className="text-xs text-stone-500 mt-2">
                Last logged: {weights[weights.length - 1].date} ({weights[weights.length - 1].weightKg.toFixed(1)} kg)
              </p>
            )}
          </div>

          {/* History table */}
          <div className="bg-white rounded-2xl border border-stone-200 p-5">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold text-stone-800">Recent Weigh-ins</h3>
              <span className="text-xs text-stone-500">{weights.length} total</span>
            </div>
            {hasWeights ? (
              <div className="space-y-2 max-h-72 overflow-y-auto">
                {[...weights].reverse().slice(0, 12).map((w, i, arr) => {
                  const prev = arr[i + 1];
                  const diff = prev ? w.weightKg - prev.weightKg : 0;
                  return (
                    <div
                      key={`${w.date}-${w.weightKg}`}
                      className="group flex items-center justify-between py-2 pl-3 pr-2 rounded-lg bg-stone-50 hover:bg-stone-100 transition"
                    >
                      <div className="text-sm text-stone-700 font-medium">{w.date}</div>
                      <div className="flex items-center gap-3">
                        <span className="font-semibold text-stone-800">{w.weightKg.toFixed(1)} kg</span>
                        {prev && (
                          <span className={`text-xs font-medium w-12 text-right ${diff >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                            {diff >= 0 ? '+' : ''}{diff.toFixed(1)}
                          </span>
                        )}
                        <div className="flex items-center gap-1 sm:opacity-0 sm:group-hover:opacity-100 transition">
                          <button
                            onClick={() => onEditWeight(selected, w)}
                            title="Edit weigh-in"
                            className="w-8 h-8 rounded-lg hover:bg-white flex items-center justify-center text-stone-600 hover:text-[#6B8E23] border border-transparent hover:border-stone-200"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => onDeleteWeight(selected, w)}
                            title="Delete weigh-in"
                            className="w-8 h-8 rounded-lg hover:bg-white flex items-center justify-center text-stone-600 hover:text-red-600 border border-transparent hover:border-stone-200"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-sm text-stone-500 text-center py-6">No weigh-ins yet.</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

// ---------------- Goal projection panel ----------------
const GoalPanel: React.FC<{ projection: ReturnType<typeof getGoalProjection> }> = ({ projection }) => {
  const {
    status,
    targetWeightKg,
    targetDate,
    kgToGo,
    daysToTarget,
    avgDailyGainKg,
    projectedHitDate,
    requiredDailyGainKg,
  } = projection;

  const s = GOAL_STYLES[status];

  const formatGain = (kgPerDay: number) => {
    if (!kgPerDay) return '0 kg/day';
    const abs = Math.abs(kgPerDay);
    if (abs >= 0.1) return `${kgPerDay >= 0 ? '+' : ''}${kgPerDay.toFixed(2)} kg/day`;
    return `${kgPerDay >= 0 ? '+' : ''}${Math.round(kgPerDay * 1000)} g/day`;
  };

  if (status === 'achieved') {
    return (
      <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-4">
        <div className="flex items-center gap-2 text-amber-800 font-semibold text-sm">
          <CheckCircle2 className="w-4 h-4" />
          Goal achieved — {targetWeightKg?.toFixed(1)} kg target reached
        </div>
        <div className="text-xs text-amber-700 mt-1">
          Current weight is at or above the {targetWeightKg?.toFixed(1)} kg goal
          {targetDate ? ` (target date ${targetDate})` : ''}.
        </div>
      </div>
    );
  }

  const projDate = projectedHitDate
    ? new Date(projectedHitDate).toLocaleDateString(undefined, {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      })
    : null;

  return (
    <div className="mt-4 rounded-xl border border-stone-200 bg-gradient-to-br from-white to-stone-50 p-4">
      <div className="flex items-center justify-between gap-2 mb-3">
        <div className="flex items-center gap-2 text-sm font-semibold text-stone-700">
          <Target className="w-4 h-4 text-[#D97706]" />
          Goal Progress
        </div>
        <span
          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-[10px] font-semibold ${s.cls}`}
        >
          <span className={`w-1.5 h-1.5 rounded-full ${s.dot}`} />
          {s.label}
        </span>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Stat
          label="Kg to go"
          value={`${kgToGo > 0 ? kgToGo.toFixed(1) : '0.0'} kg`}
          sub={targetWeightKg != null ? `goal ${targetWeightKg.toFixed(1)} kg` : undefined}
        />
        <Stat
          label="Days to goal"
          value={targetDate ? `${daysToTarget} day${Math.abs(daysToTarget) === 1 ? '' : 's'}` : '—'}
          sub={targetDate || 'no target date'}
          warn={targetDate ? daysToTarget < 0 : false}
        />
        <Stat
          label="Avg daily gain"
          value={formatGain(avgDailyGainKg)}
          sub="last ~4 wks"
          warn={avgDailyGainKg <= 0}
        />
        <Stat
          label="Projected hit"
          value={projDate || '—'}
          sub={
            avgDailyGainKg <= 0
              ? 'no growth — cannot project'
              : requiredDailyGainKg && requiredDailyGainKg > 0
                ? `need ${formatGain(requiredDailyGainKg)}`
                : 'on current pace'
          }
          warn={status === 'behind'}
        />
      </div>

      {status === 'behind' && avgDailyGainKg > 0 && projectedHitDate && targetDate && (
        <div className="mt-3 flex items-start gap-2 text-xs text-red-700 bg-red-50 border border-red-200 rounded-lg p-2.5">
          <CalendarClock className="w-3.5 h-3.5 mt-0.5 shrink-0" />
          <span>
            At the current rate, the {targetWeightKg?.toFixed(1)} kg goal will be reached on{' '}
            <span className="font-semibold">{projDate}</span> — after the target date of{' '}
            <span className="font-semibold">{targetDate}</span>.
            {requiredDailyGainKg && requiredDailyGainKg > 0 && (
              <> Increase daily gain to <span className="font-semibold">{formatGain(requiredDailyGainKg)}</span> to stay on schedule.</>
            )}
          </span>
        </div>
      )}
      {status === 'ahead' && projectedHitDate && targetDate && (
        <div className="mt-3 flex items-start gap-2 text-xs text-sky-700 bg-sky-50 border border-sky-200 rounded-lg p-2.5">
          <TrendingUp className="w-3.5 h-3.5 mt-0.5 shrink-0" />
          <span>
            Ahead of schedule — projected to hit {targetWeightKg?.toFixed(1)} kg on{' '}
            <span className="font-semibold">{projDate}</span>, before the {targetDate} target.
          </span>
        </div>
      )}
    </div>
  );
};

const Stat: React.FC<{ label: string; value: string; sub?: string; warn?: boolean }> = ({
  label,
  value,
  sub,
  warn,
}) => (
  <div className="rounded-lg bg-white border border-stone-200 p-2.5">
    <div className="text-[10px] uppercase tracking-wide text-stone-500 font-semibold">{label}</div>
    <div className={`text-sm font-bold mt-0.5 ${warn ? 'text-red-600' : 'text-stone-800'}`}>{value}</div>
    {sub && <div className="text-[10px] text-stone-500 mt-0.5 truncate" title={sub}>{sub}</div>}
  </div>
);

export default WeightsView;
