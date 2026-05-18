// Real CSV + PDF export generation for the Farm Management app.
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import {
  Animal,
  Expense,
  ExpenseCategory,
  Partner,
  calcAnimalROI,
  formatCurrency,
} from '@/lib/farmData';

export const FARM_NAME = 'Rohit Agro Farm';


export interface ReportAuthor {
  name: string;
  email: string;
}

// ---------------- Brand logo (SVG rasterized to PNG for jsPDF) ----------------
// Inline copy of /public/rohit-agro-logo.svg so PDF generation works without a network fetch.
const LOGO_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" width="256" height="256">
  <rect x="2" y="2" width="60" height="60" rx="14" ry="14" fill="#6B8E23"/>
  <g fill="#FFFFFF" font-family="Helvetica,Arial,sans-serif" font-weight="800">
    <path d="M14 18 H24.5 C29.2 18 32.5 21 32.5 25.2 C32.5 28.3 30.7 30.8 27.9 31.9 L33.2 41 H27.6 L23.1 32.8 H19 V41 H14 Z M19 28.6 H24 C26 28.6 27.4 27.3 27.4 25.4 C27.4 23.6 26 22.3 24 22.3 H19 Z"/>
    <path d="M40.4 18 H45.6 L54.2 41 H49 L47.3 36.2 H38.7 L37 41 H31.9 Z M43 23.6 L40 32.2 H46 Z"/>
  </g>
  <g transform="translate(40 6)">
    <path d="M8 14 C 8 10, 10 6, 14 3" stroke="#D2691E" stroke-width="2" stroke-linecap="round" fill="none"/>
    <path d="M8 11 C 4 10, 2 7, 3 3 C 7 4, 9 7, 8 11 Z" fill="#D2691E"/>
    <path d="M11 7 C 13 4, 17 3, 20 5 C 18 9, 14 10, 11 7 Z" fill="#D2691E"/>
  </g>
</svg>`;

let logoPngCache: string | null = null;
async function loadLogoPng(): Promise<string> {
  if (logoPngCache) return logoPngCache;
  const svgBlob = new Blob([LOGO_SVG], { type: 'image/svg+xml;charset=utf-8' });
  const url = URL.createObjectURL(svgBlob);
  try {
    const png = await new Promise<string>((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        const size = 256;
        const canvas = document.createElement('canvas');
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext('2d');
        if (!ctx) return reject(new Error('Canvas 2D context unavailable'));
        ctx.clearRect(0, 0, size, size);
        ctx.drawImage(img, 0, 0, size, size);
        resolve(canvas.toDataURL('image/png'));
      };
      img.onerror = () => reject(new Error('Failed to rasterize Rohit Agro logo'));
      img.src = url;
    });
    logoPngCache = png;
    return png;
  } finally {
    URL.revokeObjectURL(url);
  }
}

// ---------------- CSV builder ----------------
function csvEscape(v: unknown): string {
  if (v == null) return '';
  const s = String(v);
  if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

export function buildCsv(headers: string[], rows: (string | number | null | undefined)[][]): string {
  const lines = [headers.map(csvEscape).join(',')];
  for (const r of rows) lines.push(r.map(csvEscape).join(','));
  return '\uFEFF' + lines.join('\r\n'); // UTF-8 BOM for Excel
}

export function downloadCsv(filename: string, csv: string): void {
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

// ---------------- PDF helpers ----------------
function drawHeader(
  doc: jsPDF,
  title: string,
  subtitle: string,
  author: ReportAuthor,
  logoPng: string,
): void {
  const pageW = doc.internal.pageSize.getWidth();

  // Brand logo (rasterized from /public/rohit-agro-logo.svg)
  // Renders inside a ~14mm square at (14, 11) — the SVG already includes its own
  // rounded olive badge + RA monogram + burnt-orange sprout accent.
  doc.addImage(logoPng, 'PNG', 14, 11, 14, 14);



  // Farm name
  doc.setTextColor(45, 59, 31); // #2D3B1F
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.text(FARM_NAME, 30, 17);

  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100);
  doc.text('Sheep & Goat Farm Management', 30, 23);

  // Right side: metadata
  const now = new Date().toLocaleString();
  doc.setFontSize(8);
  doc.setTextColor(100);
  doc.text(`Generated: ${now}`, pageW - 14, 14, { align: 'right' });
  doc.text(`Author: ${author.name}`, pageW - 14, 19, { align: 'right' });
  if (author.email) doc.text(author.email, pageW - 14, 24, { align: 'right' });

  // Divider
  doc.setDrawColor(210, 105, 30); // #D2691E
  doc.setLineWidth(0.6);
  doc.line(14, 30, pageW - 14, 30);

  // Title
  doc.setTextColor(45, 59, 31);
  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  doc.text(title, 14, 40);

  if (subtitle) {
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(100);
    doc.text(subtitle, 14, 46);
  }
}

function drawFooter(doc: jsPDF): void {
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(150);
    doc.text(`${FARM_NAME} · Confidential`, 14, pageH - 8);
    doc.text(`Page ${i} of ${pageCount}`, pageW - 14, pageH - 8, { align: 'right' });
  }
}

function savePdf(doc: jsPDF, filename: string): void {
  drawFooter(doc);
  doc.save(filename);
}

const PDF_HEAD_STYLES = {
  fillColor: [107, 142, 35] as [number, number, number],
  textColor: [255, 255, 255] as [number, number, number],
  fontStyle: 'bold' as const,
};

// ---------------- Report 1: Profit & Loss ----------------
export interface PLOptions {
  animals: Animal[];
  expenses: Expense[];
  startDate?: string;
  endDate?: string;
  author: ReportAuthor;
}

function inRange(date: string, start?: string, end?: string): boolean {
  if (start && date < start) return false;
  if (end && date > end) return false;
  return true;
}

export async function exportProfitLossPdf(opts: PLOptions): Promise<void> {
  const { animals, expenses, startDate, endDate, author } = opts;
  const logoPng = await loadLogoPng();
  const doc = new jsPDF();

  const rangeLabel = startDate || endDate
    ? `Period: ${startDate || 'Start'} to ${endDate || 'Today'}`
    : 'Period: All time';
  drawHeader(doc, 'Profit & Loss Statement', rangeLabel, author, logoPng);


  const filteredSales = animals.filter(
    (a) => a.status === 'Sold' && a.saleDate && inRange(a.saleDate, startDate, endDate)
  );
  const filteredAcq = animals.filter((a) => inRange(a.acquisitionDate, startDate, endDate));
  const filteredExp = expenses.filter((e) => inRange(e.date, startDate, endDate));

  const totalRevenue = filteredSales.reduce((s, a) => s + (a.salePrice || 0), 0);
  const totalAcq = filteredAcq.reduce((s, a) => s + a.acquisitionCost, 0);
  const totalExp = filteredExp.reduce((s, e) => s + e.amount, 0);
  const netProfit = totalRevenue - totalAcq - totalExp;

  // Summary table
  autoTable(doc, {
    startY: 54,
    head: [['Line Item', 'Amount']],
    body: [
      ['Revenue from Sales', formatCurrency(totalRevenue)],
      ['Acquisition Costs', `- ${formatCurrency(totalAcq)}`],
      ['Operating Expenses', `- ${formatCurrency(totalExp)}`],
      [{ content: 'NET PROFIT', styles: { fontStyle: 'bold' } }, { content: formatCurrency(netProfit), styles: { fontStyle: 'bold', textColor: netProfit >= 0 ? [22, 163, 74] : [220, 38, 38] } }],
    ],
    headStyles: PDF_HEAD_STYLES,
    columnStyles: { 1: { halign: 'right' } },
  });

  // Expense breakdown by category
  const byCat: Record<string, number> = {};
  filteredExp.forEach((e) => { byCat[e.category] = (byCat[e.category] || 0) + e.amount; });

  autoTable(doc, {
    head: [['Expense Category', 'Amount', '% of Total']],
    body: Object.entries(byCat).map(([c, v]) => [
      c,
      formatCurrency(v),
      totalExp ? `${((v / totalExp) * 100).toFixed(1)}%` : '0%',
    ]),
    headStyles: PDF_HEAD_STYLES,
    columnStyles: { 1: { halign: 'right' }, 2: { halign: 'right' } },
  });

  // Sales detail
  if (filteredSales.length > 0) {
    autoTable(doc, {
      head: [['Date', 'Animal', 'Tag', 'Buyer', 'Sale Price', 'ROI']],
      body: filteredSales.map((a) => [
        a.saleDate || '',
        a.name,
        a.tagId,
        a.buyer || '',
        formatCurrency(a.salePrice || 0),
        formatCurrency(calcAnimalROI(a)),
      ]),
      headStyles: PDF_HEAD_STYLES,
      columnStyles: { 4: { halign: 'right' }, 5: { halign: 'right' } },
    });
  }

  savePdf(doc, `profit-loss-${startDate || 'all'}-${endDate || 'today'}.pdf`);
}

// ---------------- Report 2: Partner Payout Statement ----------------
export interface PartnerPayoutOptions {
  partners: Partner[];
  animals: Animal[];
  expenses: Expense[];
  author: ReportAuthor;
}
export async function exportPartnerPayoutPdf(opts: PartnerPayoutOptions): Promise<void> {
  const { partners, animals, expenses, author } = opts;
  const logoPng = await loadLogoPng();
  const doc = new jsPDF();
  drawHeader(doc, 'Partner Payout Statement', `As of ${new Date().toISOString().slice(0, 10)}`, author, logoPng);


  const totalRevenue = animals.filter((a) => a.status === 'Sold').reduce((s, a) => s + (a.salePrice || 0), 0);
  const totalAcq = animals.reduce((s, a) => s + a.acquisitionCost, 0);
  const totalExp = expenses.reduce((s, e) => s + e.amount, 0);
  const netProfit = totalRevenue - totalAcq - totalExp;
  const totalInvestment = partners.reduce((s, p) => s + p.investment, 0);

  autoTable(doc, {
    startY: 54,
    head: [['Metric', 'Amount']],
    body: [
      ['Total Revenue', formatCurrency(totalRevenue)],
      ['Total Costs', formatCurrency(totalAcq + totalExp)],
      ['Net Profit (distributable)', formatCurrency(netProfit)],
      ['Total Partner Investment', formatCurrency(totalInvestment)],
    ],
    headStyles: PDF_HEAD_STYLES,
    columnStyles: { 1: { halign: 'right' } },
  });

  autoTable(doc, {
    head: [['Partner', 'Contact', 'Investment', 'Share %', 'Profit Share', 'Joined']],
    body: partners.map((p) => {
      const share = (p.sharePct / 100) * netProfit;
      return [
        p.name,
        p.contact,
        formatCurrency(p.investment),
        `${p.sharePct}%`,
        formatCurrency(share),
        p.joinDate,
      ];
    }),
    foot: [[
      { content: 'TOTAL', styles: { fontStyle: 'bold' } },
      '',
      { content: formatCurrency(totalInvestment), styles: { fontStyle: 'bold', halign: 'right' } },
      { content: `${partners.reduce((s, p) => s + p.sharePct, 0)}%`, styles: { fontStyle: 'bold', halign: 'right' } },
      { content: formatCurrency(partners.reduce((s, p) => s + (p.sharePct / 100) * netProfit, 0)), styles: { fontStyle: 'bold', halign: 'right' } },
      '',
    ]],
    headStyles: PDF_HEAD_STYLES,
    columnStyles: { 2: { halign: 'right' }, 3: { halign: 'right' }, 4: { halign: 'right' } },
  });

  savePdf(doc, `partner-payout-${new Date().toISOString().slice(0, 10)}.pdf`);
}

// ---------------- Report 3: Expense Ledger CSV ----------------
export interface ExpenseLedgerOptions {
  expenses: Expense[];
  animals: Animal[];
  category?: ExpenseCategory | 'All';
}

export function exportExpenseLedgerCsv(opts: ExpenseLedgerOptions): void {
  const { expenses, animals, category = 'All' } = opts;
  const filtered = category === 'All' ? expenses : expenses.filter((e) => e.category === category);
  const animalById = new Map(animals.map((a) => [a.id, a]));

  const headers = ['Date', 'Category', 'Description', 'Amount', 'Scope', 'Animal', 'Tag', 'Recurring', 'Expense ID'];
  const rows = filtered.map((e) => {
    const a = e.animalId ? animalById.get(e.animalId) : null;
    return [
      e.date,
      e.category,
      e.description,
      e.amount,
      e.scope,
      a?.name || '',
      a?.tagId || '',
      e.recurring ? 'Yes' : 'No',
      e.id,
    ];
  });
  // Footer row
  const total = filtered.reduce((s, e) => s + e.amount, 0);
  rows.push(['', '', 'TOTAL', total, '', '', '', '', '']);

  const csv = buildCsv(headers, rows);
  downloadCsv(`expense-ledger-${category}-${new Date().toISOString().slice(0, 10)}.csv`, csv);
}

// ---------------- Report 4: Weight Log History ----------------
export interface WeightHistoryOptions {
  animals: Animal[];
  animalId?: string | 'all';
}

export function exportWeightHistoryCsv(opts: WeightHistoryOptions): void {
  const { animals, animalId = 'all' } = opts;
  const list = animalId === 'all' ? animals : animals.filter((a) => a.id === animalId);

  const headers = ['Date', 'Animal Name', 'Tag ID', 'Species', 'Breed', 'Weight (kg)', 'Δ from previous (kg)'];
  const rows: (string | number)[][] = [];
  for (const a of list) {
    let prev: number | null = null;
    for (const w of a.weights) {
      const delta = prev != null ? +(w.weightKg - prev).toFixed(2) : '';
      rows.push([w.date, a.name, a.tagId, a.species, a.breed, w.weightKg, delta as number | string]);
      prev = w.weightKg;
    }
  }
  const csv = buildCsv(headers, rows);
  downloadCsv(`weight-history-${animalId}-${new Date().toISOString().slice(0, 10)}.csv`, csv);
}

// ---------------- Report 5: Herd Inventory Snapshot ----------------
export interface HerdInventoryOptions {
  animals: Animal[];
  author: ReportAuthor;
  format: 'pdf' | 'csv';
}

export async function exportHerdInventory(opts: HerdInventoryOptions): Promise<void> {
  const { animals, author, format } = opts;

  if (format === 'csv') {
    const headers = [
      'Tag ID', 'Name', 'Species', 'Breed', 'Sex', 'Birth Date', 'Acquired',
      'Acquisition Cost', 'Status', 'Latest Weight (kg)', 'Vaccinated', 'Health Notes',
      'Sale Price', 'Buyer', 'Sale Date', 'Allocated Expenses',
    ];
    const rows = animals.map((a) => {
      const lastW = a.weights[a.weights.length - 1]?.weightKg ?? '';
      return [
        a.tagId, a.name, a.species, a.breed, a.sex, a.birthDate, a.acquisitionDate,
        a.acquisitionCost, a.status, lastW, a.vaccinated ? 'Yes' : 'No', a.healthNotes,
        a.salePrice ?? '', a.buyer ?? '', a.saleDate ?? '', a.allocatedExpenses,
      ];
    });
    downloadCsv(`herd-inventory-${new Date().toISOString().slice(0, 10)}.csv`, buildCsv(headers, rows));
    return;
  }

  const logoPng = await loadLogoPng();
  const doc = new jsPDF({ orientation: 'landscape' });
  drawHeader(
    doc,
    'Herd Inventory Snapshot',
    `${animals.length} total animals · ${animals.filter((a) => a.status === 'Active').length} active`,
    author,
    logoPng,
  );


  const active = animals.filter((a) => a.status === 'Active').length;
  const sold = animals.filter((a) => a.status === 'Sold').length;
  const deceased = animals.filter((a) => a.status === 'Deceased').length;

  autoTable(doc, {
    startY: 54,
    head: [['Status', 'Count']],
    body: [['Active', active], ['Sold', sold], ['Deceased', deceased], ['Total', animals.length]],
    headStyles: PDF_HEAD_STYLES,
    columnStyles: { 1: { halign: 'right' } },
    tableWidth: 80,
  });

  autoTable(doc, {
    head: [['Tag', 'Name', 'Species', 'Breed', 'Sex', 'Status', 'Acquired', 'Cost', 'Latest Wt', 'Vacc.']],
    body: animals.map((a) => [
      a.tagId,
      a.name,
      a.species,
      a.breed,
      a.sex,
      a.status,
      a.acquisitionDate,
      formatCurrency(a.acquisitionCost),
      a.weights[a.weights.length - 1] ? `${a.weights[a.weights.length - 1].weightKg.toFixed(1)} kg` : '—',
      a.vaccinated ? 'Yes' : 'No',
    ]),
    headStyles: PDF_HEAD_STYLES,
    columnStyles: { 7: { halign: 'right' }, 8: { halign: 'right' } },
    styles: { fontSize: 8 },
  });

  savePdf(doc, `herd-inventory-${new Date().toISOString().slice(0, 10)}.pdf`);
}
