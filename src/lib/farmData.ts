// Types and pure helpers for the Farm Management app.
// Data loading and persistence lives in src/lib/farmDb.ts (Supabase).

export type AnimalSex = 'Male' | 'Female';
export type AnimalStatus = 'Active' | 'Sold' | 'Deceased' | 'Pregnant' | 'Lactating' | 'Dry' | 'Transferred';
export type AnimalSpecies = 'Sheep' | 'Goat' | 'Cow' | 'Country Chicken';

export interface EggBatch {
  id: string;
  collectionDate: string;
  quantity: number;
  status: 'Incubating' | 'Hatched' | 'Damaged';
  hatchedCount: number;
  damagedCount: number;
  hatchDate?: string;
  notes?: string;
  userId?: string;
  createdAt?: string;
}

export interface WeightLog {
  date: string;
  weightKg: number;
  heightCm?: number;
}

export interface Vaccination {
  id: string;
  animalId: string;
  date: string;
  vaccineName: string;
  notes: string;
}

export interface VetVisit {
  id: string;
  animalId: string;
  date: string;
  doctorName: string;
  diagnosis: string;
  treatment: string;
  cost: number;
  notes: string;
}

export interface MilkCollection {
  id: string;
  animalId: string;
  date: string;
  morningQty: number;
  eveningQty: number;
  totalQty: number;
  notes: string;
}

export interface Client {
  id: string;
  name: string;
  contactPerson: string;
  mobile: string;
  alternateMobile: string;
  address: string;
  city: string;
  state: string;
  postalCode: string;
  notes: string;
  active: boolean;
}

export interface MilkDelivery {
  id: string;
  clientId: string;
  date: string;
  quantity: number;
  unitPrice: number;
  totalAmount: number;
  notes: string;
  status: 'Delivered' | 'Cancelled';
}

export interface InvoiceItem {
  id: string;
  invoiceId: string;
  description: string;
  quantity: number;
  unitRate: number;
  totalAmount: number;
}

export interface Invoice {
  id: string;
  invoiceNumber: string;
  clientId: string;
  invoiceDate: string;
  dueDate: string;
  subtotal: number;
  taxPct: number;
  taxAmount: number;
  grandTotal: number;
  status: 'Draft' | 'Issued' | 'Partially Paid' | 'Paid' | 'Overdue';
  notes: string;
  items?: InvoiceItem[];
}

export interface Payment {
  id: string;
  clientId: string;
  invoiceId?: string;
  paymentDate: string;
  paymentMethod: 'Cash' | 'Bank Transfer' | 'UPI' | 'Cheque' | 'Other';
  referenceNumber: string;
  amountReceived: number;
  notes: string;
}

export interface Animal {
  id: string;
  tagId: string;
  name: string;
  species: AnimalSpecies;
  breed: string;
  sex: AnimalSex;
  birthDate: string;
  acquisitionDate: string;
  acquisitionCost: number;
  status: AnimalStatus;
  salePrice?: number;
  saleDate?: string;
  buyer?: string;
  photoUrl: string;
  photos: string[];
  weights: WeightLog[];
  vaccinations?: Vaccination[];
  vetVisits?: VetVisit[];
  healthNotes: string;
  vaccinated: boolean;
  allocatedExpenses: number;
  targetWeightKg?: number;
  targetDate?: string;
}


export type ExpenseCategory =
  | 'Feed'
  | 'Medicine'
  | 'Labor'
  | 'Utilities'
  | 'Maintenance'
  | 'Misc';

export interface Expense {
  id: string;
  date: string;
  category: ExpenseCategory;
  description: string;
  amount: number;
  scope: 'Herd' | 'Animal';
  animalId?: string;
  recurring: boolean;
}

export interface Partner {
  id: string;
  name: string;
  contact: string;
  investment: number;
  joinDate: string;
  sharePct: number;
  avatar: string;
}

export type AuditAction = 'create' | 'update' | 'delete';
export type AuditEntityType =
  | 'animal'
  | 'expense'
  | 'partner'
  | 'weight_log'
  | 'sale'
  | 'vaccination'
  | 'vet_visit'
  | 'milk_collection'
  | 'client'
  | 'milk_delivery'
  | 'invoice'
  | 'payment'
  | 'egg_batch';

export interface AuditLog {
  id: string;
  userId: string;
  userEmail: string;
  userName: string;
  action: AuditAction;
  entityType: AuditEntityType;
  entityId: string;
  entityLabel: string;
  changes: Record<string, { before?: unknown; after?: unknown }> | null;
  createdAt: string;
}

export interface GoalHistoryEntry {
  id: string;
  animalId: string;
  targetWeightKg: number | null;
  targetDate: string | null;
  previousTargetWeightKg: number | null;
  previousTargetDate: string | null;
  setAt: string;
  setByEmail: string;
  setByName: string;
  reason: string;
}

export const CURRENCY = '₹';

export function formatCurrency(n: number): string {
  return `${CURRENCY}${Math.round(n).toLocaleString('en-IN')}`;
}

export function calcAnimalROI(a: Animal): number {
  if (a.status !== 'Sold' || !a.salePrice) return 0;
  return a.salePrice - a.acquisitionCost - a.allocatedExpenses;
}

export function getWeightChange(weights: WeightLog[]): number {
  if (weights.length < 2) return 0;
  const last = weights[weights.length - 1].weightKg;
  const twoBack = weights[Math.max(0, weights.length - 3)].weightKg;
  return ((last - twoBack) / twoBack) * 100;
}

// ---------------- Goal projection ----------------
export type GoalStatus = 'on-track' | 'behind' | 'ahead' | 'achieved' | 'none';

export interface GoalProjection {
  status: GoalStatus;
  /** Latest recorded weight (kg) */
  currentWeightKg: number;
  /** Target weight (kg) — undefined if not set */
  targetWeightKg?: number;
  /** Target date (ISO yyyy-mm-dd) — undefined if not set */
  targetDate?: string;
  /** Kg remaining to reach target (negative means already exceeded) */
  kgToGo: number;
  /** Days remaining until target_date from today (can be negative) */
  daysToTarget: number;
  /** Average daily gain (kg/day) over the last ~4 weeks of logs */
  avgDailyGainKg: number;
  /** Projected date (ISO) when target weight would be hit at current rate; null if cannot project */
  projectedHitDate: string | null;
  /** Required daily gain to hit target on target_date (kg/day); null if no target_date or already achieved */
  requiredDailyGainKg: number | null;
}

const MS_PER_DAY = 86_400_000;

function daysBetween(a: string, b: string): number {
  const da = new Date(a).getTime();
  const db = new Date(b).getTime();
  return Math.round((db - da) / MS_PER_DAY);
}

function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

/**
 * Compute the average daily gain (kg/day) over the most recent ~`windowDays` window
 * of weight logs. Falls back to using as many entries as exist.
 */
export function getRecentDailyGain(weights: WeightLog[], windowDays = 28): number {
  if (weights.length < 2) return 0;
  const sorted = [...weights].sort((a, b) => a.date.localeCompare(b.date));
  const last = sorted[sorted.length - 1];
  // Find the earliest log within the window
  const cutoffMs = new Date(last.date).getTime() - windowDays * MS_PER_DAY;
  let anchor = sorted[0];
  for (const w of sorted) {
    if (new Date(w.date).getTime() >= cutoffMs) { anchor = w; break; }
  }
  if (anchor.date === last.date) {
    // Window too narrow — use the entry right before the last one as the anchor
    anchor = sorted[sorted.length - 2];
  }
  const span = daysBetween(anchor.date, last.date);
  if (span <= 0) return 0;
  return (last.weightKg - anchor.weightKg) / span;
}

/**
 * Compute goal projection for an animal. If no target_weight_kg is set, returns status='none'.
 * Status semantics when target_date is also set:
 *  - 'achieved'   : current >= target (target already met)
 *  - 'ahead'      : projected hit date is BEFORE target date (or required gain is met with headroom >5%)
 *  - 'on-track'   : projected hit date within ±5% of remaining time to target
 *  - 'behind'     : projected hit date is AFTER target date (or no projection possible due to flat/negative gain)
 * Without a target_date, status is 'on-track' when avg gain is positive, 'behind' when ≤ 0.
 */
export function getGoalProjection(animal: Animal): GoalProjection {
  const weights = animal.weights;
  const current = weights.length ? weights[weights.length - 1].weightKg : 0;
  const target = animal.targetWeightKg;
  const targetDate = animal.targetDate;

  if (!target || target <= 0) {
    return {
      status: 'none',
      currentWeightKg: current,
      targetWeightKg: target,
      targetDate,
      kgToGo: 0,
      daysToTarget: 0,
      avgDailyGainKg: getRecentDailyGain(weights),
      projectedHitDate: null,
      requiredDailyGainKg: null,
    };
  }

  const kgToGo = target - current;
  const avgGain = getRecentDailyGain(weights);
  const today = todayISO();
  const daysToTarget = targetDate ? daysBetween(today, targetDate) : 0;

  // Already at or past target
  if (kgToGo <= 0) {
    return {
      status: 'achieved',
      currentWeightKg: current,
      targetWeightKg: target,
      targetDate,
      kgToGo,
      daysToTarget,
      avgDailyGainKg: avgGain,
      projectedHitDate: weights.length ? weights[weights.length - 1].date : null,
      requiredDailyGainKg: 0,
    };
  }

  // Project hit date based on avg daily gain
  let projectedHitDate: string | null = null;
  if (avgGain > 0) {
    const daysNeeded = kgToGo / avgGain;
    const proj = new Date(Date.now() + daysNeeded * MS_PER_DAY);
    projectedHitDate = proj.toISOString().slice(0, 10);
  }

  // Required daily gain to hit target on target_date
  const requiredDailyGainKg = targetDate && daysToTarget > 0 ? kgToGo / daysToTarget : null;

  let status: GoalStatus;
  if (!targetDate) {
    status = avgGain > 0 ? 'on-track' : 'behind';
  } else if (!projectedHitDate) {
    status = 'behind'; // no positive growth → won't hit
  } else {
    const diffDays = daysBetween(projectedHitDate, targetDate); // positive = projected hit BEFORE target
    const tolerance = Math.max(3, Math.round(Math.abs(daysToTarget) * 0.05)); // ±5% or 3 days
    if (diffDays > tolerance) status = 'ahead';
    else if (diffDays < -tolerance) status = 'behind';
    else status = 'on-track';
  }

  return {
    status,
    currentWeightKg: current,
    targetWeightKg: target,
    targetDate,
    kgToGo,
    daysToTarget,
    avgDailyGainKg: avgGain,
    projectedHitDate,
    requiredDailyGainKg,
  };
}

export interface FarmSettings {
  userId: string;
  farmName: string;
  address: string;
  phone: string;
  email: string;
  gstNumber: string;
  invoicePrefix: string;
  currency: string;
  logoUrl: string;
}

