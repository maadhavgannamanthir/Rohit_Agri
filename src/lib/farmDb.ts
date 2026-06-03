// Supabase data access layer for the Farm Management app.
import { supabase } from '@/lib/supabase';
import type {
  Animal,
  AnimalSex,
  AnimalSpecies,
  AnimalStatus,
  AuditAction,
  AuditEntityType,
  AuditLog,
  Expense,
  ExpenseCategory,
  GoalHistoryEntry,
  Partner,
  WeightLog,
  Vaccination,
  VetVisit,
  MilkCollection,
  Client,
  MilkDelivery,
  Invoice,
  InvoiceItem,
  Payment,
  FarmSettings,
  EggBatch,
} from '@/lib/farmData';

// ---------------- Row types ----------------
interface AnimalRow {
  id: string;
  tag_id: string;
  name: string;
  species: AnimalSpecies;
  breed: string | null;
  sex: AnimalSex;
  birth_date: string | null;
  acquisition_date: string;
  acquisition_cost: number | string;
  status: AnimalStatus;
  photo_url: string | null;
  photos: string[] | null;
  health_notes: string | null;
  vaccinated: boolean;
  allocated_expenses: number | string;
  sale_price: number | string | null;
  sale_date: string | null;
  buyer: string | null;
  target_weight_kg: number | string | null;
  target_date: string | null;
}


interface WeightRow {
  animal_id: string;
  log_date: string;
  weight_kg: number | string;
  height_cm: number | string | null;
}

interface ExpenseRow {
  id: string;
  expense_date: string;
  category: ExpenseCategory;
  description: string;
  amount: number | string;
  scope: 'Herd' | 'Animal';
  animal_id: string | null;
  recurring: boolean;
}

interface PartnerRow {
  id: string;
  name: string;
  contact: string | null;
  investment: number | string;
  join_date: string;
  share_pct: number | string;
  avatar: string | null;
}

interface AuditRow {
  id: string;
  user_id: string;
  user_email: string | null;
  user_name: string | null;
  action: AuditAction;
  entity_type: AuditEntityType;
  entity_id: string;
  entity_label: string | null;
  changes: Record<string, { before?: unknown; after?: unknown }> | null;
  created_at: string;
}

interface EggBatchRow {
  id: string;
  collection_date: string;
  quantity: number;
  status: 'Incubating' | 'Hatched' | 'Damaged';
  hatched_count: number;
  damaged_count: number;
  hatch_date: string | null;
  notes: string | null;
  user_id: string;
  created_at: string;
}

// ---------------- Mappers ----------------
const num = (v: unknown): number => (v == null ? 0 : typeof v === 'number' ? v : parseFloat(String(v)) || 0);

function rowToAnimal(
  r: AnimalRow,
  weights: WeightLog[],
  vaccinations: Vaccination[] = [],
  vetVisits: VetVisit[] = []
): Animal {
  return {
    id: r.id,
    tagId: r.tag_id,
    name: r.name,
    species: r.species,
    breed: r.breed || '',
    sex: r.sex,
    birthDate: r.birth_date || '',
    acquisitionDate: r.acquisition_date,
    acquisitionCost: num(r.acquisition_cost),
    status: r.status,
    photoUrl: r.photo_url || '',
    photos: Array.isArray(r.photos) ? r.photos : [],
    healthNotes: r.health_notes || '',
    vaccinated: !!r.vaccinated,
    allocatedExpenses: num(r.allocated_expenses),
    salePrice: r.sale_price != null ? num(r.sale_price) : undefined,
    saleDate: r.sale_date || undefined,
    buyer: r.buyer || undefined,
    targetWeightKg: r.target_weight_kg != null ? num(r.target_weight_kg) : undefined,
    targetDate: r.target_date || undefined,
    weights,
    vaccinations,
    vetVisits,
  };
}


function rowToExpense(r: ExpenseRow): Expense {
  return {
    id: r.id,
    date: r.expense_date,
    category: r.category,
    description: r.description,
    amount: num(r.amount),
    scope: r.scope,
    animalId: r.animal_id || undefined,
    recurring: !!r.recurring,
  };
}

function rowToPartner(r: PartnerRow): Partner {
  return {
    id: r.id,
    name: r.name,
    contact: r.contact || '',
    investment: num(r.investment),
    joinDate: r.join_date,
    sharePct: num(r.share_pct),
    avatar: r.avatar || '',
  };
}

function rowToAudit(r: AuditRow): AuditLog {
  return {
    id: r.id,
    userId: r.user_id,
    userEmail: r.user_email || '',
    userName: r.user_name || '',
    action: r.action,
    entityType: r.entity_type,
    entityId: r.entity_id,
    entityLabel: r.entity_label || '',
    changes: r.changes,
    createdAt: r.created_at,
  };
}

function rowToEggBatch(r: EggBatchRow): EggBatch {
  return {
    id: r.id,
    collectionDate: r.collection_date,
    quantity: r.quantity,
    status: r.status,
    hatchedCount: num(r.hatched_count),
    damagedCount: num(r.damaged_count),
    hatchDate: r.hatch_date || undefined,
    notes: r.notes || '',
    userId: r.user_id,
    createdAt: r.created_at,
  };
}

// ---------------- Auth helper ----------------
async function getCurrentUser(): Promise<{ id: string; email: string; name: string }> {
  const { data, error } = await supabase.auth.getUser();
  if (error) throw error;
  const u = data.user;
  if (!u?.id) throw new Error('You must be signed in to perform this action');
  const meta = (u.user_metadata || {}) as { name?: string; full_name?: string };
  const name = meta.name || meta.full_name || (u.email ? u.email.split('@')[0] : 'Farm Staff');
  return { id: u.id, email: u.email || '', name };
}

async function getUserId(): Promise<string> {
  return (await getCurrentUser()).id;
}

// ---------------- Audit log ----------------
async function writeAudit(
  action: AuditAction,
  entityType: AuditEntityType,
  entityId: string,
  entityLabel: string,
  changes: Record<string, { before?: unknown; after?: unknown }> | null
): Promise<void> {
  try {
    const user = await getCurrentUser();
    await supabase.from('audit_logs').insert({
      user_id: user.id,
      user_email: user.email,
      user_name: user.name,
      action,
      entity_type: entityType,
      entity_id: entityId,
      entity_label: entityLabel,
      changes,
    });
  } catch (err) {
    // Audit failures should not block the main mutation
    console.warn('Audit log write failed', err);
  }
}

function diff<T extends Record<string, unknown>>(
  before: T,
  after: Partial<T>
): Record<string, { before?: unknown; after?: unknown }> {
  const out: Record<string, { before?: unknown; after?: unknown }> = {};
  for (const k of Object.keys(after)) {
    const b = before[k as keyof T];
    const a = (after as Record<string, unknown>)[k];
    if (JSON.stringify(b) !== JSON.stringify(a)) {
      out[k] = { before: b, after: a };
    }
  }
  return out;
}

export async function fetchAuditLogs(limit = 200): Promise<AuditLog[]> {
  const { data, error } = await supabase
    .from('audit_logs')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(limit);
  if (error) throw error;
  return (data as AuditRow[]).map(rowToAudit);
}

// ---------------- Fetchers ----------------
export async function fetchAnimals(): Promise<Animal[]> {
  const [animalsRes, weightsRes, vaccinesRes, vetVisitsRes] = await Promise.all([
    supabase.from('animals').select('*').order('created_at', { ascending: true }),
    supabase.from('weight_logs').select('animal_id, log_date, weight_kg, height_cm').order('log_date', { ascending: true }),
    supabase.from('vaccinations').select('*').order('vaccination_date', { ascending: true }),
    supabase.from('vet_visits').select('*').order('visit_date', { ascending: true }),
  ]);
  if (animalsRes.error) throw animalsRes.error;
  if (weightsRes.error) throw weightsRes.error;

  const byAnimal = new Map<string, WeightLog[]>();
  (weightsRes.data as WeightRow[] | null)?.forEach((w) => {
    const arr = byAnimal.get(w.animal_id) || [];
    arr.push({ date: w.log_date, weightKg: num(w.weight_kg), heightCm: w.height_cm ? num(w.height_cm) : undefined });
    byAnimal.set(w.animal_id, arr);
  });

  const byAnimalVaccinations = new Map<string, Vaccination[]>();
  (vaccinesRes.data as any[] | null)?.forEach((v) => {
    const arr = byAnimalVaccinations.get(v.animal_id) || [];
    arr.push({
      id: v.id,
      animalId: v.animal_id,
      date: v.vaccination_date,
      vaccineName: v.vaccine_name,
      notes: v.notes || '',
    });
    byAnimalVaccinations.set(v.animal_id, arr);
  });

  const byAnimalVetVisits = new Map<string, VetVisit[]>();
  (vetVisitsRes.data as any[] | null)?.forEach((v) => {
    const arr = byAnimalVetVisits.get(v.animal_id) || [];
    arr.push({
      id: v.id,
      animalId: v.animal_id,
      date: v.visit_date,
      doctorName: v.doctor_name || '',
      diagnosis: v.diagnosis,
      treatment: v.treatment || '',
      cost: num(v.cost),
      notes: v.notes || '',
    });
    byAnimalVetVisits.set(v.animal_id, arr);
  });

  return (animalsRes.data as AnimalRow[]).map((r) =>
    rowToAnimal(
      r,
      byAnimal.get(r.id) || [],
      byAnimalVaccinations.get(r.id) || [],
      byAnimalVetVisits.get(r.id) || []
    )
  );
}

export async function fetchExpenses(): Promise<Expense[]> {
  const { data, error } = await supabase
    .from('expenses')
    .select('*')
    .order('expense_date', { ascending: false });
  if (error) throw error;
  return (data as ExpenseRow[]).map(rowToExpense);
}

export async function fetchPartners(): Promise<Partner[]> {
  const { data, error } = await supabase
    .from('partners')
    .select('*')
    .order('share_pct', { ascending: false });
  if (error) throw error;
  return (data as PartnerRow[]).map(rowToPartner);
}

// ---------------- Mutations: Create ----------------
function genId(prefix: string): string {
  if (typeof window !== 'undefined' && window.crypto && window.crypto.randomUUID) {
    return window.crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

export async function addAnimal(data: Omit<Animal, 'id' | 'weights' | 'photos' | 'allocatedExpenses'>): Promise<Animal> {
  const userId = await getUserId();
  const id = genId('A');

  // Build the row. We intentionally DO NOT send the `photos` JSONB column on insert:
  // some database gateways (including the one in front of this project) serialize
  // JS arrays as Postgres array literals (e.g. `{https://...}`) and then cast them
  // to JSONB, which makes Postgres try to parse the array-literal text as JSON and
  // fail with `22P02: invalid input syntax for type json — Expected ":", but found "}"`.
  // The column has DEFAULT '[]'::jsonb in the schema, so omitting it is safe — and
  // we keep the primary image in the scalar TEXT column `photo_url` which the whole
  // app already reads from.
  //
  // Only attach optional/newer columns (target_*) when they actually have values,
  // so a DB that hasn't been migrated yet still accepts the insert.
  const row: Record<string, unknown> = {
    id,
    user_id: userId,
    tag_id: data.tagId,
    name: data.name,
    species: data.species,
    breed: data.breed || null,
    sex: data.sex,
    birth_date: data.birthDate || null,
    acquisition_date: data.acquisitionDate,
    acquisition_cost: Number.isFinite(data.acquisitionCost) ? data.acquisitionCost : 0,
    status: data.status || 'Active',
    photo_url: data.photoUrl || null,
    health_notes: data.healthNotes || null,
    vaccinated: !!data.vaccinated,
    allocated_expenses: 0,
  };
  if (data.targetWeightKg != null && data.targetWeightKg > 0) {
    row.target_weight_kg = data.targetWeightKg;
  }
  if (data.targetDate) {
    row.target_date = data.targetDate;
  }

  const { data: inserted, error } = await supabase.from('animals').insert(row).select().single();
  if (error) {
    // Surface the real Postgres / PostgREST error so it's debuggable from the console + toast.
    console.error('[addAnimal] insert failed', {
      message: error.message,
      details: (error as { details?: string }).details,
      hint: (error as { hint?: string }).hint,
      code: (error as { code?: string }).code,
      row,
    });
    const detail = (error as { details?: string }).details;
    const hint = (error as { hint?: string }).hint;
    const parts = [error.message, detail, hint].filter(Boolean);
    throw new Error(parts.join(' — ') || 'Failed to register animal');
  }

  const initialDate = new Date().toISOString().slice(0, 10);
  const { error: wErr } = await supabase
    .from('weight_logs')
    .insert({ animal_id: id, log_date: initialDate, weight_kg: 20, user_id: userId });
  if (wErr) {
    console.warn('[addAnimal] initial weight_log insert failed (non-fatal)', wErr);
  }

  await writeAudit('create', 'animal', id, `${data.name} (${data.tagId})`, null);
  return rowToAnimal(inserted as AnimalRow, [{ date: initialDate, weightKg: 20 }]);
}




export async function addWeightLog(animalId: string, weightKg: number, heightCm?: number): Promise<WeightLog> {
  const userId = await getUserId();
  const log_date = new Date().toISOString().slice(0, 10);
  const row: Record<string, any> = { animal_id: animalId, log_date, weight_kg: weightKg, user_id: userId };
  if (heightCm != null && heightCm > 0) row.height_cm = heightCm;
  const { error } = await supabase
    .from('weight_logs')
    .insert(row);
  if (error) throw error;
  await writeAudit('create', 'weight_log', animalId, `${weightKg} kg / ${heightCm || '-'} cm`, null);
  return { date: log_date, weightKg, heightCm };
}

export async function updateWeightLog(
  animalId: string,
  animalLabel: string,
  oldDate: string,
  oldWeight: number,
  newDate: string,
  newWeight: number,
  oldHeight?: number,
  newHeight?: number
): Promise<WeightLog> {
  // If the date is changing, check whether the new date already has a log for this animal.
  if (newDate !== oldDate) {
    const { data: existing } = await supabase
      .from('weight_logs')
      .select('log_date')
      .eq('animal_id', animalId)
      .eq('log_date', newDate)
      .maybeSingle();
    if (existing) {
      throw new Error(`A weigh-in for ${newDate} already exists. Pick a different date.`);
    }
  }

  const row: Record<string, any> = { log_date: newDate, weight_kg: newWeight };
  row.height_cm = newHeight != null && newHeight > 0 ? newHeight : null;

  const { error } = await supabase
    .from('weight_logs')
    .update(row)
    .eq('animal_id', animalId)
    .eq('log_date', oldDate);
  if (error) throw error;

  const changes: Record<string, { before?: unknown; after?: unknown }> = {};
  if (oldDate !== newDate) changes.date = { before: oldDate, after: newDate };
  if (oldWeight !== newWeight) changes.weightKg = { before: oldWeight, after: newWeight };
  if (oldHeight !== newHeight) changes.heightCm = { before: oldHeight, after: newHeight };

  await writeAudit(
    'update',
    'weight_log',
    animalId,
    `${animalLabel} · ${newDate} · ${newWeight} kg · ${newHeight || '-'} cm`,
    changes
  );
  return { date: newDate, weightKg: newWeight, heightCm: newHeight };
}

export async function deleteWeightLog(
  animalId: string,
  animalLabel: string,
  date: string,
  weightKg: number,
  heightCm?: number
): Promise<void> {
  const { error } = await supabase
    .from('weight_logs')
    .delete()
    .eq('animal_id', animalId)
    .eq('log_date', date);
  if (error) throw error;
  await writeAudit(
    'delete',
    'weight_log',
    animalId,
    `${animalLabel} · ${date} · ${weightKg} kg · ${heightCm || '-'} cm`,
    null
  );
}


export async function markAnimalSold(
  animalId: string,
  salePrice: number,
  buyer: string
): Promise<{ salePrice: number; buyer: string; saleDate: string }> {
  const userId = await getUserId();
  const saleDate = new Date().toISOString().slice(0, 10);
  const { error: updErr } = await supabase
    .from('animals')
    .update({ status: 'Sold', sale_price: salePrice, buyer, sale_date: saleDate })
    .eq('id', animalId);
  if (updErr) throw updErr;
  await supabase.from('sales').insert({
    animal_id: animalId,
    sale_date: saleDate,
    sale_price: salePrice,
    buyer,
    user_id: userId,
  });
  await writeAudit('create', 'sale', animalId, `Sold to ${buyer} for ${salePrice}`, null);
  return { salePrice, buyer, saleDate };
}

export async function addExpense(e: Omit<Expense, 'id'>): Promise<Expense> {
  const userId = await getUserId();
  const id = genId('E');
  const row = {
    id,
    user_id: userId,
    expense_date: e.date,
    category: e.category,
    description: e.description,
    amount: e.amount,
    scope: e.scope,
    animal_id: e.scope === 'Animal' ? e.animalId || null : null,
    recurring: e.recurring,
  };
  const { data, error } = await supabase.from('expenses').insert(row).select().single();
  if (error) throw error;
  await writeAudit('create', 'expense', id, `${e.category}: ${e.description}`, null);
  return rowToExpense(data as ExpenseRow);
}

export async function addPartner(p: Omit<Partner, 'id' | 'avatar'>): Promise<Partner> {
  const userId = await getUserId();
  const id = genId('P');
  const initials = p.name
    .split(' ')
    .map((s) => s[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
  const avatar = `https://api.dicebear.com/7.x/initials/svg?seed=${initials}&backgroundColor=6B8E23`;
  const row = {
    id,
    user_id: userId,
    name: p.name,
    contact: p.contact,
    investment: p.investment,
    join_date: p.joinDate,
    share_pct: p.sharePct,
    avatar,
  };
  const { data, error } = await supabase.from('partners').insert(row).select().single();
  if (error) throw error;
  await writeAudit('create', 'partner', id, p.name, null);
  return rowToPartner(data as PartnerRow);
}

// ---------------- Mutations: Update ----------------
interface GoalHistoryRow {
  id: string;
  animal_id: string;
  target_weight_kg: number | string | null;
  target_date: string | null;
  previous_target_weight_kg: number | string | null;
  previous_target_date: string | null;
  set_at: string;
  set_by_email: string | null;
  set_by_name: string | null;
  reason: string | null;
}

function rowToGoalHistory(r: GoalHistoryRow): GoalHistoryEntry {
  return {
    id: r.id,
    animalId: r.animal_id,
    targetWeightKg: r.target_weight_kg != null ? num(r.target_weight_kg) : null,
    targetDate: r.target_date,
    previousTargetWeightKg: r.previous_target_weight_kg != null ? num(r.previous_target_weight_kg) : null,
    previousTargetDate: r.previous_target_date,
    setAt: r.set_at,
    setByEmail: r.set_by_email || '',
    setByName: r.set_by_name || '',
    reason: r.reason || '',
  };
}

export async function fetchGoalHistory(animalId: string): Promise<GoalHistoryEntry[]> {
  const { data, error } = await supabase
    .from('goal_history')
    .select('*')
    .eq('animal_id', animalId)
    .order('set_at', { ascending: false });
  if (error) throw error;
  return (data as GoalHistoryRow[]).map(rowToGoalHistory);
}

export async function updateAnimal(
  before: Animal,
  patch: Partial<Pick<Animal, 'name' | 'breed' | 'healthNotes' | 'vaccinated' | 'photoUrl' | 'photos' | 'tagId' | 'species' | 'sex' | 'targetWeightKg' | 'targetDate'>>,
  goalReason?: string,
): Promise<Animal> {
  const row: Record<string, unknown> = {};
  if (patch.name !== undefined) row.name = patch.name;
  if (patch.breed !== undefined) row.breed = patch.breed;
  if (patch.healthNotes !== undefined) row.health_notes = patch.healthNotes;
  if (patch.vaccinated !== undefined) row.vaccinated = patch.vaccinated;
  if (patch.photoUrl !== undefined) row.photo_url = patch.photoUrl;
  // NOTE: we deliberately skip the `photos` JSONB column on UPDATE for the same
  // reason addAnimal skips it on INSERT — the database gateway in front of this
  // project mis-serializes JS arrays as Postgres array literals (`{...}`) and
  // then casts to JSONB, producing
  //   22P02: invalid input syntax for type json — Expected ":", but found "}".
  // The single hero image is kept in `photo_url` (TEXT) which the entire UI
  // already reads from. If/when multi-photo storage is needed we can move
  // `photos` to a child table or send it as JSON.stringify-ed text.
  if (patch.tagId !== undefined) row.tag_id = patch.tagId;
  if (patch.species !== undefined) row.species = patch.species;
  if (patch.sex !== undefined) row.sex = patch.sex;
  if (patch.targetWeightKg !== undefined) row.target_weight_kg = patch.targetWeightKg ?? null;
  if (patch.targetDate !== undefined) row.target_date = patch.targetDate || null;

  const { error } = await supabase.from('animals').update(row).eq('id', before.id);
  if (error) {
    console.error('[updateAnimal] update failed', {
      message: error.message,
      details: (error as { details?: string }).details,
      hint: (error as { hint?: string }).hint,
      code: (error as { code?: string }).code,
      row,
    });
    const detail = (error as { details?: string }).details;
    const hint = (error as { hint?: string }).hint;
    const parts = [error.message, detail, hint].filter(Boolean);
    throw new Error(parts.join(' — ') || 'Failed to update animal');
  }

  // Detect goal change → write a goal_history row
  const newWeight = patch.targetWeightKg !== undefined ? (patch.targetWeightKg ?? null) : (before.targetWeightKg ?? null);
  const newDate = patch.targetDate !== undefined ? (patch.targetDate || null) : (before.targetDate || null);
  const oldWeight = before.targetWeightKg ?? null;
  const oldDate = before.targetDate || null;
  const weightChanged = (patch.targetWeightKg !== undefined) && (oldWeight !== newWeight);
  const dateChanged = (patch.targetDate !== undefined) && (oldDate !== newDate);
  if (weightChanged || dateChanged) {
    try {
      const user = await getCurrentUser();
      await supabase.from('goal_history').insert({
        animal_id: before.id,
        target_weight_kg: newWeight,
        target_date: newDate,
        previous_target_weight_kg: oldWeight,
        previous_target_date: oldDate,
        set_by: user.id,
        set_by_email: user.email,
        set_by_name: user.name,
        reason: goalReason?.trim() || null,
        user_id: user.id,
      });
    } catch (err) {
      console.warn('Goal history write failed', err);
    }
  }

  // Locally we still merge `photos` into the returned object so the UI reflects
  // the user's selection in this session — but it isn't persisted to the
  // `photos` JSONB column. The hero image IS persisted via `photo_url`.
  const changes = diff(before as unknown as Record<string, unknown>, patch as Record<string, unknown>);
  await writeAudit('update', 'animal', before.id, `${patch.name || before.name} (${patch.tagId || before.tagId})`, changes);
  return { ...before, ...patch };
}



export async function deleteAnimal(animal: Animal): Promise<void> {
  // Delete dependent rows first (in case FKs are not ON DELETE CASCADE)
  await supabase.from('weight_logs').delete().eq('animal_id', animal.id);
  await supabase.from('sales').delete().eq('animal_id', animal.id);
  await supabase.from('expenses').delete().eq('animal_id', animal.id);
  const { error } = await supabase.from('animals').delete().eq('id', animal.id);
  if (error) throw error;
  await writeAudit('delete', 'animal', animal.id, `${animal.name} (${animal.tagId})`, null);
}

export async function updateExpense(
  before: Expense,
  patch: Partial<Pick<Expense, 'amount' | 'category' | 'date' | 'scope' | 'animalId' | 'description' | 'recurring'>>
): Promise<Expense> {
  const row: Record<string, unknown> = {};
  if (patch.amount !== undefined) row.amount = patch.amount;
  if (patch.category !== undefined) row.category = patch.category;
  if (patch.date !== undefined) row.expense_date = patch.date;
  if (patch.scope !== undefined) row.scope = patch.scope;
  if (patch.scope !== undefined || patch.animalId !== undefined) {
    const finalScope = patch.scope ?? before.scope;
    const finalAnimalId = patch.animalId ?? before.animalId;
    row.animal_id = finalScope === 'Animal' ? finalAnimalId || null : null;
  }
  if (patch.description !== undefined) row.description = patch.description;
  if (patch.recurring !== undefined) row.recurring = patch.recurring;

  const { error } = await supabase.from('expenses').update(row).eq('id', before.id);
  if (error) throw error;

  const changes = diff(before as unknown as Record<string, unknown>, patch as Record<string, unknown>);
  await writeAudit('update', 'expense', before.id, `${patch.category || before.category}: ${patch.description || before.description}`, changes);
  return { ...before, ...patch };
}

export async function deleteExpense(expense: Expense): Promise<void> {
  const { error } = await supabase.from('expenses').delete().eq('id', expense.id);
  if (error) throw error;
  await writeAudit('delete', 'expense', expense.id, `${expense.category}: ${expense.description}`, null);
}

export async function updatePartner(
  before: Partner,
  patch: Partial<Pick<Partner, 'name' | 'contact' | 'investment' | 'sharePct' | 'joinDate'>>
): Promise<Partner> {
  const row: Record<string, unknown> = {};
  if (patch.name !== undefined) row.name = patch.name;
  if (patch.contact !== undefined) row.contact = patch.contact;
  if (patch.investment !== undefined) row.investment = patch.investment;
  if (patch.sharePct !== undefined) row.share_pct = patch.sharePct;
  if (patch.joinDate !== undefined) row.join_date = patch.joinDate;

  const { error } = await supabase.from('partners').update(row).eq('id', before.id);
  if (error) throw error;

  const changes = diff(before as unknown as Record<string, unknown>, patch as Record<string, unknown>);
  await writeAudit('update', 'partner', before.id, patch.name || before.name, changes);
  return { ...before, ...patch };
}

export async function deletePartner(partner: Partner): Promise<void> {
  const { error } = await supabase.from('partners').delete().eq('id', partner.id);
  if (error) throw error;
  await writeAudit('delete', 'partner', partner.id, partner.name, null);
}

// ---------------- Health Trackers (Vaccinations & Vet Visits) ----------------
export async function addVaccination(v: Omit<Vaccination, 'id'>): Promise<Vaccination> {
  const userId = await getUserId();
  const { data, error } = await supabase.from('vaccinations').insert({
    animal_id: v.animalId,
    vaccination_date: v.date,
    vaccine_name: v.vaccineName,
    notes: v.notes || null,
    user_id: userId,
  }).select().single();
  if (error) throw error;
  await writeAudit('create', 'vaccination', data.id, `${v.vaccineName} for ${v.animalId}`, null);
  return rowToVaccination(data);
}

export async function deleteVaccination(id: string, animalId: string, vaccineName: string): Promise<void> {
  const { error } = await supabase.from('vaccinations').delete().eq('id', id);
  if (error) throw error;
  await writeAudit('delete', 'vaccination', id, `${vaccineName} deleted for ${animalId}`, null);
}

export async function addVetVisit(v: Omit<VetVisit, 'id'>): Promise<VetVisit> {
  const userId = await getUserId();
  const { data, error } = await supabase.from('vet_visits').insert({
    animal_id: v.animalId,
    visit_date: v.date,
    doctor_name: v.doctorName || null,
    diagnosis: v.diagnosis,
    treatment: v.treatment || null,
    cost: v.cost,
    notes: v.notes || null,
    user_id: userId,
  }).select().single();
  if (error) throw error;
  await writeAudit('create', 'vet_visit', data.id, `${v.diagnosis} visit cost ${v.cost}`, null);
  return rowToVetVisit(data);
}

export async function deleteVetVisit(id: string, animalId: string, diagnosis: string): Promise<void> {
  const { error } = await supabase.from('vet_visits').delete().eq('id', id);
  if (error) throw error;
  await writeAudit('delete', 'vet_visit', id, `Visit (${diagnosis}) deleted for ${animalId}`, null);
}

// ---------------- Milk Collections ----------------
export async function fetchMilkCollections(): Promise<MilkCollection[]> {
  const { data, error } = await supabase
    .from('milk_collections')
    .select('*')
    .order('collection_date', { ascending: false });
  if (error) throw error;
  return (data || []).map(rowToMilkCollection);
}

export async function addMilkCollection(c: Omit<MilkCollection, 'id' | 'totalQty'>): Promise<MilkCollection> {
  const userId = await getUserId();
  const { data, error } = await supabase.from('milk_collections').insert({
    animal_id: c.animalId,
    collection_date: c.date,
    morning_qty: c.morningQty,
    evening_qty: c.eveningQty,
    notes: c.notes || null,
    user_id: userId,
  }).select().single();
  if (error) throw error;
  const total = data.total_qty || (c.morningQty + c.eveningQty);
  await writeAudit('create', 'milk_collection', data.id, `Milked ${total}L from ${c.animalId}`, null);
  return rowToMilkCollection(data);
}

export async function deleteMilkCollection(id: string, animalId: string, date: string, totalQty: number): Promise<void> {
  const { error } = await supabase.from('milk_collections').delete().eq('id', id);
  if (error) throw error;
  await writeAudit('delete', 'milk_collection', id, `Removed collection (${totalQty}L) on ${date} for ${animalId}`, null);
}

// ---------------- Clients ----------------
export async function fetchClients(): Promise<Client[]> {
  const { data, error } = await supabase
    .from('clients')
    .select('*')
    .order('name', { ascending: true });
  if (error) throw error;
  return (data || []).map(rowToClient);
}

export async function addClient(c: Omit<Client, 'id'>): Promise<Client> {
  const userId = await getUserId();
  const id = genId('C');
  const { data, error } = await supabase.from('clients').insert({
    id,
    name: c.name,
    contact_person: c.contactPerson || null,
    mobile: c.mobile,
    alternate_mobile: c.alternateMobile || null,
    address: c.address || null,
    city: c.city || null,
    state: c.state || null,
    postal_code: c.postalCode || null,
    notes: c.notes || null,
    active: c.active,
    user_id: userId,
  }).select().single();
  if (error) throw error;
  await writeAudit('create', 'client', id, c.name, null);
  return rowToClient(data);
}

export async function updateClient(before: Client, patch: Partial<Client>): Promise<Client> {
  const row: Record<string, any> = {};
  if (patch.name !== undefined) row.name = patch.name;
  if (patch.contactPerson !== undefined) row.contact_person = patch.contactPerson || null;
  if (patch.mobile !== undefined) row.mobile = patch.mobile;
  if (patch.alternateMobile !== undefined) row.alternate_mobile = patch.alternateMobile || null;
  if (patch.address !== undefined) row.address = patch.address || null;
  if (patch.city !== undefined) row.city = patch.city || null;
  if (patch.state !== undefined) row.state = patch.state || null;
  if (patch.postalCode !== undefined) row.postal_code = patch.postalCode || null;
  if (patch.notes !== undefined) row.notes = patch.notes || null;
  if (patch.active !== undefined) row.active = patch.active;

  const { error } = await supabase.from('clients').update(row).eq('id', before.id);
  if (error) throw error;

  const changes = diff(before as unknown as Record<string, unknown>, patch as Record<string, unknown>);
  await writeAudit('update', 'client', before.id, patch.name || before.name, changes);
  return { ...before, ...patch };
}

export async function deleteClient(client: Client): Promise<void> {
  const { error } = await supabase.from('clients').delete().eq('id', client.id);
  if (error) throw error;
  await writeAudit('delete', 'client', client.id, client.name, null);
}

// ---------------- Milk Deliveries ----------------
export async function fetchDeliveries(): Promise<MilkDelivery[]> {
  const { data, error } = await supabase
    .from('milk_deliveries')
    .select('*')
    .order('delivery_date', { ascending: false });
  if (error) throw error;
  return (data || []).map(rowToDelivery);
}

export async function addDelivery(d: Omit<MilkDelivery, 'id'>): Promise<MilkDelivery> {
  const userId = await getUserId();
  const id = genId('D');
  const { data, error } = await supabase.from('milk_deliveries').insert({
    id,
    client_id: d.clientId,
    delivery_date: d.date,
    quantity: d.quantity,
    unit_price: d.unitPrice,
    total_amount: d.totalAmount,
    notes: d.notes || null,
    status: d.status,
    user_id: userId,
  }).select().single();
  if (error) throw error;
  await writeAudit('create', 'milk_delivery', id, `${d.quantity}L to client ${d.clientId}`, null);
  return rowToDelivery(data);
}

export async function deleteDelivery(d: MilkDelivery): Promise<void> {
  const { error } = await supabase.from('milk_deliveries').update({ status: 'Cancelled' }).eq('id', d.id);
  if (error) throw error;
  await writeAudit('update', 'milk_delivery', d.id, `Cancelled delivery ${d.id}`, {
    status: { before: d.status, after: 'Cancelled' }
  });
}

// ---------------- Invoices ----------------
export async function fetchInvoices(): Promise<Invoice[]> {
  const [invoicesRes, itemsRes] = await Promise.all([
    supabase.from('invoices').select('*').order('invoice_date', { ascending: false }),
    supabase.from('invoice_items').select('*'),
  ]);
  if (invoicesRes.error) throw invoicesRes.error;
  if (itemsRes.error) throw itemsRes.error;

  const byInvoice = new Map<string, InvoiceItem[]>();
  (itemsRes.data as any[] | null)?.forEach((item) => {
    const arr = byInvoice.get(item.invoice_id) || [];
    arr.push(rowToInvoiceItem(item));
    byInvoice.set(item.invoice_id, arr);
  });

  return (invoicesRes.data as any[]).map((r) => rowToInvoice(r, byInvoice.get(r.id) || []));
}

export async function addInvoice(
  inv: Omit<Invoice, 'id' | 'items'>,
  items: Omit<InvoiceItem, 'id' | 'invoiceId'>[]
): Promise<Invoice> {
  const userId = await getUserId();
  const id = genId('INV');

  // Insert invoice
  const { data: inserted, error: invErr } = await supabase.from('invoices').insert({
    id,
    invoice_number: inv.invoiceNumber,
    client_id: inv.clientId,
    invoice_date: inv.invoiceDate,
    due_date: inv.dueDate,
    subtotal: inv.subtotal,
    tax_pct: inv.taxPct,
    tax_amount: inv.taxAmount,
    grand_total: inv.grandTotal,
    status: inv.status,
    notes: inv.notes || null,
    user_id: userId,
  }).select().single();
  if (invErr) throw invErr;

  // Insert line items
  const itemRows = items.map((it) => ({
    invoice_id: id,
    description: it.description,
    quantity: it.quantity,
    unit_rate: it.unitRate,
    total_amount: it.totalAmount,
  }));
  const { data: insertedItems, error: itemsErr } = await supabase
    .from('invoice_items')
    .insert(itemRows)
    .select();
  if (itemsErr) {
    // Attempt cleanup
    await supabase.from('invoices').delete().eq('id', id);
    throw itemsErr;
  }

  await writeAudit('create', 'invoice', id, inv.invoiceNumber, null);
  const mappedItems = (insertedItems || []).map(rowToInvoiceItem);
  return rowToInvoice(inserted, mappedItems);
}

export async function updateInvoiceStatus(id: string, status: Invoice['status']): Promise<void> {
  const { error } = await supabase.from('invoices').update({ status }).eq('id', id);
  if (error) throw error;
  await writeAudit('update', 'invoice', id, `Status updated to ${status}`, null);
}

export async function deleteInvoice(inv: Invoice): Promise<void> {
  const { error } = await supabase.from('invoices').delete().eq('id', inv.id);
  if (error) throw error;
  await writeAudit('delete', 'invoice', inv.id, inv.invoiceNumber, null);
}

// ---------------- Payments ----------------
export async function fetchPayments(): Promise<Payment[]> {
  const { data, error } = await supabase
    .from('payments')
    .select('*')
    .order('payment_date', { ascending: false });
  if (error) throw error;
  return (data || []).map(rowToPayment);
}

export async function addPayment(p: Omit<Payment, 'id'>): Promise<Payment> {
  const userId = await getUserId();
  const id = genId('PAY');

  const { data, error } = await supabase.from('payments').insert({
    id,
    client_id: p.clientId,
    invoice_id: p.invoiceId || null,
    payment_date: p.paymentDate,
    payment_method: p.paymentMethod,
    reference_number: p.referenceNumber || null,
    amount_received: p.amountReceived,
    notes: p.notes || null,
    user_id: userId,
  }).select().single();
  if (error) throw error;

  await writeAudit('create', 'payment', id, `${p.amountReceived} from client ${p.clientId}`, null);
  return rowToPayment(data);
}

export async function deletePayment(p: Payment): Promise<void> {
  const { error } = await supabase.from('payments').delete().eq('id', p.id);
  if (error) throw error;
  await writeAudit('delete', 'payment', p.id, `Removed payment ${p.id} of ${p.amountReceived}`, null);
}

// Helper mappers for added tables
function rowToVaccination(r: any): Vaccination {
  return {
    id: r.id,
    animalId: r.animal_id,
    date: r.vaccination_date,
    vaccineName: r.vaccine_name,
    notes: r.notes || '',
  };
}

function rowToVetVisit(r: any): VetVisit {
  return {
    id: r.id,
    animalId: r.animal_id,
    date: r.visit_date,
    doctorName: r.doctor_name || '',
    diagnosis: r.diagnosis,
    treatment: r.treatment || '',
    cost: num(r.cost),
    notes: r.notes || '',
  };
}

function rowToMilkCollection(r: any): MilkCollection {
  return {
    id: r.id,
    animalId: r.animal_id,
    date: r.collection_date,
    morningQty: num(r.morning_qty),
    eveningQty: num(r.evening_qty),
    totalQty: num(r.total_qty),
    notes: r.notes || '',
  };
}

function rowToClient(r: any): Client {
  return {
    id: r.id,
    name: r.name,
    contactPerson: r.contact_person || '',
    mobile: r.mobile,
    alternateMobile: r.alternate_mobile || '',
    address: r.address || '',
    city: r.city || '',
    state: r.state || '',
    postalCode: r.postal_code || '',
    notes: r.notes || '',
    active: !!r.active,
  };
}

function rowToDelivery(r: any): MilkDelivery {
  return {
    id: r.id,
    clientId: r.client_id,
    date: r.delivery_date,
    quantity: num(r.quantity),
    unitPrice: num(r.unit_price),
    totalAmount: num(r.total_amount),
    notes: r.notes || '',
    status: r.status,
  };
}

function rowToInvoice(r: any, items: InvoiceItem[] = []): Invoice {
  return {
    id: r.id,
    invoiceNumber: r.invoice_number,
    clientId: r.client_id,
    invoiceDate: r.invoice_date,
    dueDate: r.due_date,
    subtotal: num(r.subtotal),
    taxPct: num(r.tax_pct),
    taxAmount: num(r.tax_amount),
    grandTotal: num(r.grand_total),
    status: r.status,
    notes: r.notes || '',
    items,
  };
}

function rowToInvoiceItem(r: any): InvoiceItem {
  return {
    id: r.id,
    invoiceId: r.invoice_id,
    description: r.description,
    quantity: num(r.quantity),
    unitRate: num(r.unit_rate),
    totalAmount: num(r.total_amount),
  };
}

function rowToPayment(r: any): Payment {
  return {
    id: r.id,
    clientId: r.client_id,
    invoiceId: r.invoice_id || undefined,
    paymentDate: r.payment_date,
    paymentMethod: r.payment_method,
    referenceNumber: r.reference_number || '',
    amountReceived: num(r.amount_received),
    notes: r.notes || '',
  };
}

function rowToFarmSettings(r: any): FarmSettings {
  return {
    userId: r.user_id,
    farmName: r.farm_name,
    address: r.address || '',
    phone: r.phone || '',
    email: r.email || '',
    gstNumber: r.gst_number || '',
    invoicePrefix: r.invoice_prefix || 'INV',
    currency: r.currency || 'INR',
    logoUrl: r.logo_url || '',
  };
}

export async function fetchFarmSettings(): Promise<FarmSettings | null> {
  const { data, error } = await supabase.from('farm_settings').select('*');
  if (error) throw error;
  if (!data || data.length === 0) return null;
  return rowToFarmSettings(data[0]);
}

export async function saveFarmSettings(settings: Omit<FarmSettings, 'userId'>): Promise<FarmSettings> {
  const userId = await getUserId();
  const { data, error } = await supabase.from('farm_settings').upsert({
    user_id: userId,
    farm_name: settings.farmName,
    address: settings.address || null,
    phone: settings.phone || null,
    email: settings.email || null,
    gst_number: settings.gstNumber || null,
    invoice_prefix: settings.invoicePrefix || 'INV',
    currency: settings.currency || 'INR',
    logo_url: settings.logoUrl || null,
    updated_at: new Date().toISOString(),
  }).select().single();
  if (error) throw error;
  return rowToFarmSettings(data);
}

export async function fetchEggBatches(): Promise<EggBatch[]> {
  const { data, error } = await supabase
    .from('egg_batches')
    .select('*')
    .order('collection_date', { ascending: false });
  if (error) throw error;
  return (data as EggBatchRow[]).map(rowToEggBatch);
}

export async function addEggBatch(b: Omit<EggBatch, 'id' | 'createdAt'>): Promise<EggBatch> {
  const userId = await getUserId();
  const { data, error } = await supabase
    .from('egg_batches')
    .insert({
      collection_date: b.collectionDate,
      quantity: b.quantity,
      status: b.status,
      hatched_count: b.hatchedCount,
      damaged_count: b.damagedCount,
      hatch_date: b.hatchDate || null,
      notes: b.notes || null,
      user_id: userId,
    })
    .select()
    .single();
  if (error) throw error;
  await writeAudit('create', 'egg_batch', data.id, `Egg Batch: ${b.quantity} eggs`, data);
  return rowToEggBatch(data as EggBatchRow);
}

export async function updateEggBatch(id: string, patch: Partial<Omit<EggBatch, 'id' | 'createdAt'>>): Promise<EggBatch> {
  // Get current row for audit
  const currentRes = await supabase.from('egg_batches').select('*').eq('id', id).single();
  if (currentRes.error) throw currentRes.error;
  const current = currentRes.data as EggBatchRow;

  const updatePayload: any = {};
  if (patch.collectionDate !== undefined) updatePayload.collection_date = patch.collectionDate;
  if (patch.quantity !== undefined) updatePayload.quantity = patch.quantity;
  if (patch.status !== undefined) updatePayload.status = patch.status;
  if (patch.hatchedCount !== undefined) updatePayload.hatched_count = patch.hatchedCount;
  if (patch.damagedCount !== undefined) updatePayload.damaged_count = patch.damagedCount;
  if (patch.hatchDate !== undefined) updatePayload.hatch_date = patch.hatchDate || null;
  if (patch.notes !== undefined) updatePayload.notes = patch.notes || null;

  const { data, error } = await supabase
    .from('egg_batches')
    .update(updatePayload)
    .eq('id', id)
    .select()
    .single();
  if (error) throw error;

  const changes = diff(current as unknown as Record<string, unknown>, updatePayload as Record<string, unknown>);
  await writeAudit('update', 'egg_batch', id, `Egg Batch Updated`, changes);
  return rowToEggBatch(data as EggBatchRow);
}

export async function deleteEggBatch(id: string): Promise<void> {
  const currentRes = await supabase.from('egg_batches').select('*').eq('id', id).single();
  if (currentRes.error) throw currentRes.error;
  const current = currentRes.data as EggBatchRow;

  const { error } = await supabase.from('egg_batches').delete().eq('id', id);
  if (error) throw error;

  await writeAudit('delete', 'egg_batch', id, `Egg Batch Deleted`, current as any);
}

