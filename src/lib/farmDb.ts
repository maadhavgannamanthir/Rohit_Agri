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

// ---------------- Mappers ----------------
const num = (v: unknown): number => (v == null ? 0 : typeof v === 'number' ? v : parseFloat(String(v)) || 0);

function rowToAnimal(r: AnimalRow, weights: WeightLog[]): Animal {
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
  const [animalsRes, weightsRes] = await Promise.all([
    supabase.from('animals').select('*').order('created_at', { ascending: true }),
    supabase.from('weight_logs').select('animal_id, log_date, weight_kg').order('log_date', { ascending: true }),
  ]);
  if (animalsRes.error) throw animalsRes.error;
  if (weightsRes.error) throw weightsRes.error;

  const byAnimal = new Map<string, WeightLog[]>();
  (weightsRes.data as WeightRow[] | null)?.forEach((w) => {
    const arr = byAnimal.get(w.animal_id) || [];
    arr.push({ date: w.log_date, weightKg: num(w.weight_kg) });
    byAnimal.set(w.animal_id, arr);
  });

  return (animalsRes.data as AnimalRow[]).map((r) => rowToAnimal(r, byAnimal.get(r.id) || []));
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
  const r = Math.random().toString(36).slice(2, 7).toUpperCase();
  return `${prefix}${Date.now().toString().slice(-4)}${r.slice(0, 2)}`;
}

export async function addAnimal(data: Omit<Animal, 'id' | 'weights' | 'photos' | 'allocatedExpenses'>): Promise<Animal> {
  const userId = await getUserId();
  const id = genId('A');

  // Build the row. Only attach optional/newer columns when they actually have values,
  // so a DB that hasn't been migrated yet (missing target_* columns) still accepts the insert.
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
    photos: data.photoUrl ? [data.photoUrl] : [],
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



export async function addWeightLog(animalId: string, weightKg: number): Promise<WeightLog> {
  const userId = await getUserId();
  const log_date = new Date().toISOString().slice(0, 10);
  const { error } = await supabase
    .from('weight_logs')
    .insert({ animal_id: animalId, log_date, weight_kg: weightKg, user_id: userId });
  if (error) throw error;
  await writeAudit('create', 'weight_log', animalId, `${weightKg} kg`, null);
  return { date: log_date, weightKg };
}

export async function updateWeightLog(
  animalId: string,
  animalLabel: string,
  oldDate: string,
  oldWeight: number,
  newDate: string,
  newWeight: number
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

  const { error } = await supabase
    .from('weight_logs')
    .update({ log_date: newDate, weight_kg: newWeight })
    .eq('animal_id', animalId)
    .eq('log_date', oldDate);
  if (error) throw error;

  const changes: Record<string, { before?: unknown; after?: unknown }> = {};
  if (oldDate !== newDate) changes.date = { before: oldDate, after: newDate };
  if (oldWeight !== newWeight) changes.weightKg = { before: oldWeight, after: newWeight };

  await writeAudit(
    'update',
    'weight_log',
    animalId,
    `${animalLabel} · ${newDate} · ${newWeight} kg`,
    changes
  );
  return { date: newDate, weightKg: newWeight };
}

export async function deleteWeightLog(
  animalId: string,
  animalLabel: string,
  date: string,
  weightKg: number
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
    `${animalLabel} · ${date} · ${weightKg} kg`,
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
  if (patch.photos !== undefined) row.photos = patch.photos;
  if (patch.tagId !== undefined) row.tag_id = patch.tagId;
  if (patch.species !== undefined) row.species = patch.species;
  if (patch.sex !== undefined) row.sex = patch.sex;
  if (patch.targetWeightKg !== undefined) row.target_weight_kg = patch.targetWeightKg ?? null;
  if (patch.targetDate !== undefined) row.target_date = patch.targetDate || null;

  const { error } = await supabase.from('animals').update(row).eq('id', before.id);
  if (error) throw error;

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
