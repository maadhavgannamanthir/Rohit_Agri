import React, { useState, useMemo } from 'react';
import { Client, MilkDelivery, Invoice, InvoiceItem, FarmSettings, formatCurrency } from '@/lib/farmData';
import {
  FileText, Calendar, Plus, Trash2, Search, Filter,
  TrendingUp, IndianRupee, X, CheckCircle, Clock, AlertTriangle, Download, Printer
} from 'lucide-react';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

interface Props {
  clients: Client[];
  deliveries: MilkDelivery[];
  invoices: Invoice[];
  settings: FarmSettings | null;
  onAdd: (inv: Omit<Invoice, 'id' | 'items'>, items: Omit<InvoiceItem, 'id' | 'invoiceId'>[]) => Promise<void>;
  onDelete: (inv: Invoice) => Promise<void>;
  onUpdateStatus: (id: string, status: Invoice['status']) => Promise<void>;
}

const InvoicesView: React.FC<Props> = ({
  clients,
  deliveries,
  invoices,
  settings,
  onAdd,
  onDelete,
  onUpdateStatus
}) => {
  // Modal states
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [viewInvoice, setViewInvoice] = useState<Invoice | null>(null);

  // Filter states
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'All' | Invoice['status']>('All');

  // Form states (Create Invoice)
  const [clientId, setClientId] = useState(clients[0]?.id || '');
  const [startDate, setStartDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 30);
    return d.toISOString().slice(0, 10);
  });
  const [endDate, setEndDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [invoiceDate, setInvoiceDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [dueDate, setDueDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 15); // Default Net 15
    return d.toISOString().slice(0, 10);
  });
  const [taxPct, setTaxPct] = useState('0'); // e.g. 0%
  const [notes, setNotes] = useState('');
  const [customItems, setCustomItems] = useState<{ description: string; amount: number }[]>([]);
  const [newCustomDesc, setNewCustomDesc] = useState('');
  const [newCustomAmount, setNewCustomAmount] = useState('');

  // Auto-calculated milk deliveries for the selected client and date range
  const matchedDeliveries = useMemo(() => {
    if (!clientId) return [];
    return deliveries.filter(d => 
      d.clientId === clientId && 
      d.status === 'Delivered' && 
      d.date >= startDate && 
      d.date <= endDate
    );
  }, [clientId, startDate, endDate, deliveries]);

  // Aggregate milk deliveries into single line items by rate
  const milkLineItems = useMemo(() => {
    const grouped = new Map<number, { qty: number; rate: number }>();
    matchedDeliveries.forEach(d => {
      const existing = grouped.get(d.unitPrice) || { qty: 0, rate: d.unitPrice };
      existing.qty += d.quantity;
      grouped.set(d.unitPrice, existing);
    });

    return Array.from(grouped.values()).map(g => ({
      description: `Milk Supply (${startDate} to ${endDate}) — ${g.qty.toFixed(1)} Liters`,
      quantity: g.qty,
      unitRate: g.rate,
      totalAmount: g.qty * g.rate
    }));
  }, [matchedDeliveries, startDate, endDate]);

  // Total calculations for form
  const subtotal = useMemo(() => {
    const milkSum = milkLineItems.reduce((sum, item) => sum + item.totalAmount, 0);
    const customSum = customItems.reduce((sum, item) => sum + item.amount, 0);
    return milkSum + customSum;
  }, [milkLineItems, customItems]);

  const taxAmount = useMemo(() => {
    const pct = parseFloat(taxPct) || 0;
    return (subtotal * pct) / 100;
  }, [subtotal, taxPct]);

  const grandTotal = useMemo(() => subtotal + taxAmount, [subtotal, taxAmount]);

  // Generate next sequential invoice number using the settings prefix
  const nextInvoiceNumber = useMemo(() => {
    const year = new Date().getFullYear();
    const prefixStr = settings?.invoicePrefix || 'INV';
    const prefix = `${prefixStr}-${year}-`;
    
    const yearInvoices = invoices.filter(inv => inv.invoiceNumber.startsWith(prefix));
    let maxNum = 0;
    yearInvoices.forEach(inv => {
      const parts = inv.invoiceNumber.split('-');
      const numVal = parseInt(parts[2], 10);
      if (!isNaN(numVal) && numVal > maxNum) {
        maxNum = numVal;
      }
    });
    return `${prefix}${String(maxNum + 1).padStart(4, '0')}`;
  }, [invoices, settings]);

  const handleAddCustomItem = () => {
    if (!newCustomDesc || !newCustomAmount) return;
    setCustomItems([...customItems, {
      description: newCustomDesc,
      amount: parseFloat(newCustomAmount) || 0
    }]);
    setNewCustomDesc('');
    setNewCustomAmount('');
  };

  const handleRemoveCustomItem = (idx: number) => {
    setCustomItems(customItems.filter((_, i) => i !== idx));
  };

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!clientId) return;

    const items: Omit<InvoiceItem, 'id' | 'invoiceId'>[] = [
      ...milkLineItems.map(item => ({
        description: item.description,
        quantity: item.quantity,
        unitRate: item.unitRate,
        totalAmount: item.totalAmount
      })),
      ...customItems.map(item => ({
        description: item.description,
        quantity: 1,
        unitRate: item.amount,
        totalAmount: item.amount
      }))
    ];

    if (items.length === 0) {
      alert('Please add at least one item or select deliveries to invoice.');
      return;
    }

    const invoiceData = {
      invoiceNumber: nextInvoiceNumber,
      clientId,
      invoiceDate,
      dueDate,
      subtotal,
      taxPct: parseFloat(taxPct) || 0,
      taxAmount,
      grandTotal,
      status: 'Issued' as const,
      notes
    };

    try {
      await onAdd(invoiceData, items);
      setShowCreateModal(false);
      setCustomItems([]);
      setNotes('');
    } catch (err) {
      console.error(err);
    }
  };

  // Filter invoices for list
  const filteredInvoices = useMemo(() => {
    return invoices.filter(inv => {
      const client = clients.find(c => c.id === inv.clientId);
      const matchSearch = client?.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          inv.invoiceNumber.toLowerCase().includes(searchQuery.toLowerCase());
      const matchStatus = statusFilter === 'All' || inv.status === statusFilter;
      return matchSearch && matchStatus;
    });
  }, [invoices, clients, searchQuery, statusFilter]);

  // PDF Export logic
  const handleDownloadPDF = (invoice: Invoice) => {
    const client = clients.find(c => c.id === invoice.clientId);
    const doc = new jsPDF();

    // Theme color setup (Olive green)
    const brandColor = [107, 142, 35]; // rgb(107, 142, 35)

    // Header Accent Bar
    doc.setFillColor(brandColor[0], brandColor[1], brandColor[2]);
    doc.rect(0, 0, 210, 15, 'F');

    // Title
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(22);
    doc.setTextColor(50, 50, 50);
    doc.text((settings?.farmName || 'ROHIT AGRO').toUpperCase(), 15, 35);
    
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(120, 120, 120);
    doc.text(settings?.address || 'Livestock & Dairy Management ERP', 15, 41);
    
    const contactLine = `Email: ${settings?.email || 'info@rohitagro.com'} | Phone: ${settings?.phone || '+91 98765 43210'}${settings?.gstNumber ? ' | GST: ' + settings.gstNumber : ''}`;
    doc.text(contactLine, 15, 46);

    // Invoice Title & Info
    doc.setFontSize(18);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(brandColor[0], brandColor[1], brandColor[2]);
    doc.text('INVOICE', 140, 35);

    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(80, 80, 80);
    doc.text(`Invoice No:  ${invoice.invoiceNumber}`, 140, 43);
    doc.text(`Date:            ${invoice.invoiceDate}`, 140, 48);
    doc.text(`Due Date:     ${invoice.dueDate}`, 140, 53);

    // Horizontal Separator
    doc.setDrawColor(230, 230, 230);
    doc.line(15, 60, 195, 60);

    // Bill To Section
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(50, 50, 50);
    doc.text('BILL TO:', 15, 70);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(80, 80, 80);
    doc.text(client ? client.name : 'Unknown Client', 15, 76);
    if (client?.contactPerson) doc.text(`Attn: ${client.contactPerson}`, 15, 81);
    if (client?.mobile) doc.text(`Phone: ${client.mobile}`, 15, 86);
    if (client?.address) doc.text(`${client.address}, ${client.city}`, 15, 91);

    // Item Table
    const headers = [['Description', 'Qty', 'Unit Rate (INR)', 'Total (INR)']];
    const data = (invoice.items || []).map(item => [
      item.description,
      item.quantity.toFixed(1),
      Math.round(item.unitRate).toLocaleString('en-IN'),
      Math.round(item.totalAmount).toLocaleString('en-IN')
    ]);

    autoTable(doc, {
      startY: 100,
      head: headers,
      body: data,
      headStyles: { fillColor: brandColor as [number, number, number], fontSize: 9 },
      bodyStyles: { fontSize: 8.5, textColor: [70, 70, 70] },
      columnStyles: {
        0: { cellWidth: 100 },
        1: { halign: 'right', cellWidth: 20 },
        2: { halign: 'right', cellWidth: 30 },
        3: { halign: 'right', cellWidth: 30 }
      },
      margin: { left: 15, right: 15 }
    });

    const finalY = (doc as any).lastAutoTable.finalY + 10;

    // Totals Box
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(80, 80, 80);
    doc.text('Subtotal:', 130, finalY);
    doc.text(`${Math.round(invoice.subtotal).toLocaleString('en-IN')}`, 175, finalY, { align: 'right' });

    doc.text(`Tax (${invoice.taxPct}%):`, 130, finalY + 5);
    doc.text(`${Math.round(invoice.taxAmount).toLocaleString('en-IN')}`, 175, finalY + 5, { align: 'right' });

    doc.setFont('helvetica', 'bold');
    doc.setTextColor(50, 50, 50);
    doc.text('Grand Total:', 130, finalY + 11);
    doc.text(`INR ${Math.round(invoice.grandTotal).toLocaleString('en-IN')}`, 175, finalY + 11, { align: 'right' });

    // Notes
    if (invoice.notes) {
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      doc.setTextColor(120, 120, 120);
      doc.text('Notes / Payment Terms:', 15, finalY);
      doc.text(invoice.notes, 15, finalY + 5, { maxWidth: 100 });
    }

    // Save
    doc.save(`${invoice.invoiceNumber}.pdf`);
  };

  const handlePrint = (invoice: Invoice) => {
    const client = clients.find(c => c.id === invoice.clientId);
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    printWindow.document.write(`
      <html>
        <head>
          <title>Print ${invoice.invoiceNumber}</title>
          <style>
            body { font-family: system-ui, sans-serif; color: #333; padding: 40px; margin: 0; }
            .header { display: flex; justify-content: space-between; border-bottom: 2px solid #6B8E23; padding-bottom: 20px; }
            .logo { font-size: 24px; font-weight: bold; color: #6B8E23; }
            .inv-title { font-size: 28px; font-weight: bold; color: #555; }
            .meta { margin: 20px 0; font-size: 14px; line-height: 1.6; }
            table { width: 100%; border-collapse: collapse; margin-top: 30px; }
            th { background-color: #f5f5f5; text-align: left; padding: 10px; border-bottom: 2px solid #ddd; }
            td { padding: 10px; border-bottom: 1px solid #eee; }
            .totals { float: right; margin-top: 20px; font-size: 15px; width: 250px; }
            .totals div { display: flex; justify-content: space-between; padding: 5px 0; }
            .bold { font-weight: bold; font-size: 16px; border-top: 1px solid #ccc; padding-top: 10px; }
            .notes { margin-top: 50px; font-size: 12px; color: #666; }
          </style>
        </head>
        <body onload="window.print();window.close();">
          <div class="header">
            <div>
              <div class="logo">${settings?.farmName || 'ROHIT AGRO'}</div>
              <div>${settings?.address || 'Livestock & Dairy Management ERP'}</div>
              <div>Phone: ${settings?.phone || '+91 98765 43210'}${settings?.email ? ` | Email: ${settings.email}` : ''}${settings?.gstNumber ? `<br/>GST: ${settings.gstNumber}` : ''}</div>
            </div>
            <div>
              <div class="inv-title">INVOICE</div>
              <div class="meta">
                <strong>Invoice No:</strong> ${invoice.invoiceNumber}<br/>
                <strong>Date:</strong> ${invoice.invoiceDate}<br/>
                <strong>Due Date:</strong> ${invoice.dueDate}
              </div>
            </div>
          </div>
          
          <div class="meta">
            <strong>BILL TO:</strong><br/>
            ${client ? client.name : 'Unknown Client'}<br/>
            ${client?.contactPerson ? `Attn: ${client.contactPerson}<br/>` : ''}
            ${client?.mobile ? `Phone: ${client.mobile}<br/>` : ''}
            ${client?.address ? `${client.address}, ${client.city}` : ''}
          </div>

          <table>
            <thead>
              <tr>
                <th>Description</th>
                <th style="text-align: right;">Quantity</th>
                <th style="text-align: right;">Unit Rate</th>
                <th style="text-align: right;">Total Amount</th>
              </tr>
            </thead>
            <tbody>
              ${(invoice.items || []).map(item => `
                <tr>
                  <td>${item.description}</td>
                  <td style="text-align: right;">${item.quantity.toFixed(1)}</td>
                  <td style="text-align: right;">₹${Math.round(item.unitRate)}</td>
                  <td style="text-align: right;">₹${Math.round(item.totalAmount)}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>

          <div class="totals">
            <div><span>Subtotal:</span> <span>₹${Math.round(invoice.subtotal)}</span></div>
            <div><span>Tax (${invoice.taxPct}%):</span> <span>₹${Math.round(invoice.taxAmount)}</span></div>
            <div class="bold"><span>Grand Total:</span> <span>₹${Math.round(invoice.grandTotal)}</span></div>
          </div>

          ${invoice.notes ? `<div class="notes"><strong>Notes / Payment Terms:</strong><br/>${invoice.notes}</div>` : ''}
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  return (
    <div className="space-y-6">
      {/* Search / Filter panel */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-[#6B8E23]/10 flex items-center justify-center text-[#6B8E23]">
            <FileText className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-stone-850">Client Invoices</h1>
            <p className="text-xs text-stone-500">Generate statements, export PDF, print bills and track payment status</p>
          </div>
        </div>
        <button
          onClick={() => {
            setClientId(clients[0]?.id || '');
            setShowCreateModal(true);
          }}
          className="bg-[#6B8E23] hover:bg-[#5a7a1d] text-white px-4 py-2.5 rounded-xl text-sm font-semibold flex items-center gap-2 transition shadow-sm"
        >
          <Plus className="w-4 h-4" /> Create Invoice
        </button>
      </div>

      {/* Toolbar filters */}
      <div className="bg-white border border-stone-200 rounded-2xl p-4 flex flex-col sm:flex-row gap-3 items-center">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-3 top-2.5 w-4 h-4 text-stone-400" />
          <input
            type="text"
            placeholder="Search invoice number or customer..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-2 rounded-xl border border-stone-200 bg-stone-50 text-xs outline-none focus:bg-white focus:border-[#6B8E23]"
          />
        </div>
        
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as any)}
          className="w-full sm:w-48 px-3 py-2 rounded-xl border border-stone-200 bg-stone-50 text-xs outline-none focus:bg-white focus:border-[#6B8E23]"
        >
          <option value="All">All Statuses</option>
          <option value="Draft">Draft</option>
          <option value="Issued">Issued</option>
          <option value="Partially Paid">Partially Paid</option>
          <option value="Paid">Paid</option>
          <option value="Overdue">Overdue</option>
        </select>
      </div>

      {/* Invoice Table */}
      <div className="bg-white border border-stone-200 rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-stone-50 border-b border-stone-200 font-semibold text-stone-600">
                <th className="p-3">Invoice Number</th>
                <th className="p-3">Customer</th>
                <th className="p-3">Date</th>
                <th className="p-3">Due Date</th>
                <th className="p-3 text-right">Grand Total</th>
                <th className="p-3">Status</th>
                <th className="p-3 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {filteredInvoices.map(inv => {
                const client = clients.find(c => c.id === inv.clientId);
                return (
                  <tr key={inv.id} className="hover:bg-stone-50/50">
                    <td className="p-3 font-bold text-[#6B8E23]">{inv.invoiceNumber}</td>
                    <td className="p-3 font-semibold text-stone-800">{client ? client.name : 'Unknown Client'}</td>
                    <td className="p-3 text-stone-500">{inv.invoiceDate}</td>
                    <td className="p-3 text-stone-500">{inv.dueDate}</td>
                    <td className="p-3 text-right font-bold text-stone-800">{formatCurrency(inv.grandTotal)}</td>
                    <td className="p-3">
                      <span className={`inline-flex items-center gap-1 text-[9px] font-bold uppercase px-2.5 py-0.5 rounded-full ${
                        inv.status === 'Paid' ? 'bg-emerald-50 text-emerald-700' :
                        inv.status === 'Overdue' ? 'bg-red-50 text-red-700' :
                        inv.status === 'Issued' ? 'bg-blue-50 text-blue-700' : 'bg-stone-100 text-stone-600'
                      }`}>
                        {inv.status === 'Paid' ? <CheckCircle className="w-2.5 h-2.5" /> : 
                         inv.status === 'Issued' ? <Clock className="w-2.5 h-2.5" /> : <AlertTriangle className="w-2.5 h-2.5" />}
                        {inv.status}
                      </span>
                    </td>
                    <td className="p-3">
                      <div className="flex items-center justify-center gap-2">
                        <button
                          onClick={() => setViewInvoice(inv)}
                          className="px-2 py-1 text-stone-600 hover:text-stone-850 hover:bg-stone-100 rounded-lg transition"
                        >
                          View
                        </button>
                        <button
                          onClick={() => handleDownloadPDF(inv)}
                          className="p-1.5 text-stone-500 hover:text-[#6B8E23] hover:bg-stone-100 rounded-lg transition"
                          title="Download PDF"
                        >
                          <Download className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handlePrint(inv)}
                          className="p-1.5 text-stone-500 hover:text-[#D2691E] hover:bg-stone-100 rounded-lg transition"
                          title="Print Invoice"
                        >
                          <Printer className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => onDelete(inv)}
                          className="p-1.5 text-stone-450 hover:text-red-650 hover:bg-red-50 rounded-lg transition"
                          title="Delete Invoice"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {filteredInvoices.length === 0 && (
                <tr>
                  <td colSpan={7} className="p-4 text-center text-stone-400">No invoices found.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create Invoice Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white border border-stone-200 rounded-2xl w-full max-w-2xl shadow-xl overflow-hidden max-h-[90vh] flex flex-col">
            <div className="px-5 py-4 border-b border-stone-100 flex items-center justify-between bg-stone-50 shrink-0">
              <h3 className="font-bold text-sm text-stone-800 uppercase tracking-wider">
                Create Billing Invoice ({nextInvoiceNumber})
              </h3>
              <button
                onClick={() => setShowCreateModal(false)}
                className="p-1 rounded-lg text-stone-400 hover:bg-stone-200 hover:text-stone-850"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateSubmit} className="flex-1 overflow-y-auto p-5 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] font-bold uppercase text-stone-500 block mb-1.5">Customer *</label>
                  <select
                    value={clientId}
                    onChange={(e) => setClientId(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-stone-250 bg-stone-50 text-sm outline-none focus:bg-white focus:border-[#6B8E23]"
                  >
                    {clients.map(c => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>
                
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[10px] font-bold uppercase text-stone-500 block mb-1.5">Tax (%)</label>
                    <input
                      type="number"
                      placeholder="e.g. 5"
                      value={taxPct}
                      onChange={(e) => setTaxPct(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg border border-stone-250 bg-stone-50 text-sm outline-none focus:bg-white focus:border-[#6B8E23]"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold uppercase text-stone-500 block mb-1.5">Date</label>
                    <input
                      type="date"
                      value={invoiceDate}
                      onChange={(e) => setInvoiceDate(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg border border-stone-250 bg-stone-50 text-xs outline-none"
                    />
                  </div>
                </div>
              </div>

              {/* Delivery auto-calculation range */}
              <div className="p-4 bg-stone-50 border border-stone-150 rounded-xl space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="font-bold text-xs text-stone-700 uppercase tracking-wider">Calculate Milk Deliveries</h4>
                  <span className="text-[10px] bg-[#6B8E23]/10 text-[#6B8E23] px-2 py-0.5 rounded font-semibold">
                    {matchedDeliveries.length} Deliveries Found
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[9px] font-bold uppercase text-stone-500 block mb-1">Start Date</label>
                    <input
                      type="date"
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                      className="w-full px-2 py-1.5 rounded-lg border border-stone-200 bg-white text-xs outline-none focus:border-[#6B8E23]"
                    />
                  </div>
                  <div>
                    <label className="text-[9px] font-bold uppercase text-stone-500 block mb-1">End Date</label>
                    <input
                      type="date"
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                      className="w-full px-2 py-1.5 rounded-lg border border-stone-200 bg-white text-xs outline-none focus:border-[#6B8E23]"
                    />
                  </div>
                </div>
              </div>

              {/* Items List Preview */}
              <div className="space-y-2">
                <h4 className="font-bold text-xs text-stone-600 uppercase tracking-wider">Line Items Summary</h4>
                <div className="border border-stone-150 rounded-xl overflow-hidden">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead className="bg-stone-50">
                      <tr className="border-b border-stone-150 text-stone-500 font-semibold">
                        <th className="p-2">Description</th>
                        <th className="p-2 text-right">Qty</th>
                        <th className="p-2 text-right">Rate</th>
                        <th className="p-2 text-right">Total</th>
                        <th className="p-2"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-stone-100">
                      {milkLineItems.map((item, idx) => (
                        <tr key={idx}>
                          <td className="p-2 font-medium text-stone-700">{item.description}</td>
                          <td className="p-2 text-right">{item.quantity.toFixed(1)} L</td>
                          <td className="p-2 text-right">{formatCurrency(item.unitRate)}</td>
                          <td className="p-2 text-right font-bold">{formatCurrency(item.totalAmount)}</td>
                          <td className="p-2"></td>
                        </tr>
                      ))}
                      {customItems.map((item, idx) => (
                        <tr key={idx}>
                          <td className="p-2 text-stone-700">{item.description}</td>
                          <td className="p-2 text-right">1.0</td>
                          <td className="p-2 text-right">{formatCurrency(item.amount)}</td>
                          <td className="p-2 text-right font-bold">{formatCurrency(item.amount)}</td>
                          <td className="p-2 text-center">
                            <button
                              type="button"
                              onClick={() => handleRemoveCustomItem(idx)}
                              className="text-red-500 hover:text-red-700"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </td>
                        </tr>
                      ))}
                      {milkLineItems.length === 0 && customItems.length === 0 && (
                        <tr>
                          <td colSpan={5} className="p-4 text-center text-stone-400 italic">
                            No items. Select deliveries or add custom lines below.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Add Custom Charges Form */}
              <div className="border border-stone-200 rounded-xl p-3 bg-stone-50/50 space-y-2">
                <span className="text-[10px] font-bold uppercase text-stone-500">Add Extra Custom Charge</span>
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="e.g. Service charge or Delivery fee"
                    value={newCustomDesc}
                    onChange={(e) => setNewCustomDesc(e.target.value)}
                    className="flex-1 px-3 py-1.5 rounded-lg border border-stone-200 bg-white text-xs outline-none"
                  />
                  <input
                    type="number"
                    placeholder="Amount (₹)"
                    value={newCustomAmount}
                    onChange={(e) => setNewCustomAmount(e.target.value)}
                    className="w-24 px-3 py-1.5 rounded-lg border border-stone-200 bg-white text-xs outline-none"
                  />
                  <button
                    type="button"
                    onClick={handleAddCustomItem}
                    className="bg-[#D2691E] text-white px-3 py-1.5 rounded-lg text-xs font-semibold hover:bg-[#a75418]"
                  >
                    Add line
                  </button>
                </div>
              </div>

              {/* Notes, Terms & Dates */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] font-bold uppercase text-stone-500 block mb-1.5">Due Date</label>
                  <input
                    type="date"
                    value={dueDate}
                    onChange={(e) => setDueDate(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-stone-250 bg-stone-50 text-xs outline-none"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold uppercase text-stone-500 block mb-1.5 font-semibold text-stone-600">
                    Grand Total Preview
                  </label>
                  <div className="w-full px-3 py-2 rounded-lg bg-[#6B8E23]/10 border border-[#6B8E23]/25 font-bold text-[#6B8E23] text-sm">
                    {formatCurrency(grandTotal)}
                  </div>
                </div>
                <div className="col-span-2">
                  <label className="text-[10px] font-bold uppercase text-stone-500 block mb-1.5">Terms / Footer Notes</label>
                  <input
                    type="text"
                    placeholder="e.g. Please wire amount to Bank Account: XXXX-XXXX"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-stone-250 bg-stone-50 text-xs outline-none"
                  />
                </div>
              </div>

              <div className="flex gap-3 justify-end pt-3 border-t border-stone-100 shrink-0">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 border border-stone-250 rounded-xl text-stone-600 text-xs font-semibold hover:bg-stone-50 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="bg-[#6B8E23] hover:bg-[#5a7a1d] text-white px-4 py-2 rounded-xl text-xs font-semibold transition"
                >
                  Create & Issue Invoice
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Invoice Viewer Modal */}
      {viewInvoice && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white border border-stone-200 rounded-2xl w-full max-w-2xl shadow-xl overflow-hidden max-h-[90vh] flex flex-col">
            <div className="px-5 py-4 border-b border-stone-100 flex items-center justify-between bg-stone-50 shrink-0">
              <h3 className="font-bold text-sm text-stone-850 uppercase tracking-wider">
                Invoice Details: {viewInvoice.invoiceNumber}
              </h3>
              <button
                onClick={() => setViewInvoice(null)}
                className="p-1 rounded-lg text-stone-400 hover:bg-stone-200 hover:text-stone-850"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              <div className="flex justify-between items-start border-b border-stone-100 pb-4">
                <div>
                  <div className="text-xl font-bold text-[#6B8E23]">{settings?.farmName || 'ROHIT AGRO'}</div>
                  <div className="text-[10px] text-stone-500 font-semibold uppercase tracking-wider mt-0.5">
                    {settings?.address || 'Livestock & Dairy Management ERP'}
                  </div>
                  {(settings?.phone || settings?.email || settings?.gstNumber) && (
                    <div className="text-[9px] text-stone-450 mt-0.5 font-medium">
                      {settings?.phone} {settings?.email && ` · ${settings.email}`} {settings?.gstNumber && ` · GST: ${settings.gstNumber}`}
                    </div>
                  )}
                </div>
                <div className="text-right">
                  <span className={`text-[10px] font-bold uppercase px-2.5 py-1 rounded-full ${
                    viewInvoice.status === 'Paid' ? 'bg-emerald-50 text-emerald-700' :
                    viewInvoice.status === 'Overdue' ? 'bg-red-50 text-red-700' : 'bg-blue-50 text-blue-700'
                  }`}>
                    {viewInvoice.status}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 text-xs">
                <div>
                  <div className="font-bold text-stone-500 uppercase tracking-wider text-[9px] mb-1">Bill To:</div>
                  <div className="font-bold text-stone-800">
                    {clients.find(c => c.id === viewInvoice.clientId)?.name || 'Unknown Client'}
                  </div>
                  <div className="text-stone-500 mt-1">
                    {clients.find(c => c.id === viewInvoice.clientId)?.address}
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-bold text-stone-500 uppercase tracking-wider text-[9px] mb-1">Invoice Details:</div>
                  <div className="text-stone-700"><span className="text-stone-400">Date:</span> {viewInvoice.invoiceDate}</div>
                  <div className="text-stone-700 mt-0.5"><span className="text-stone-400">Due:</span> {viewInvoice.dueDate}</div>
                </div>
              </div>

              {/* Items */}
              <div className="border border-stone-150 rounded-xl overflow-hidden">
                <table className="w-full text-left border-collapse text-xs">
                  <thead className="bg-stone-50">
                    <tr className="border-b border-stone-150 text-stone-500 font-semibold">
                      <th className="p-3">Item Description</th>
                      <th className="p-3 text-right">Quantity</th>
                      <th className="p-3 text-right">Rate</th>
                      <th className="p-3 text-right">Amount</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-100">
                    {(viewInvoice.items || []).map((item, idx) => (
                      <tr key={idx} className="text-stone-700">
                        <td className="p-3 font-medium">{item.description}</td>
                        <td className="p-3 text-right">{item.quantity.toFixed(1)}</td>
                        <td className="p-3 text-right">{formatCurrency(item.unitRate)}</td>
                        <td className="p-3 text-right font-bold text-stone-850">{formatCurrency(item.totalAmount)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Summary calculations */}
              <div className="flex justify-end">
                <div className="w-64 space-y-1.5 text-xs">
                  <div className="flex justify-between text-stone-500">
                    <span>Subtotal:</span>
                    <span>{formatCurrency(viewInvoice.subtotal)}</span>
                  </div>
                  <div className="flex justify-between text-stone-500">
                    <span>Tax ({viewInvoice.taxPct}%):</span>
                    <span>{formatCurrency(viewInvoice.taxAmount)}</span>
                  </div>
                  <div className="flex justify-between font-bold text-stone-800 border-t border-stone-200 pt-1.5 text-sm">
                    <span>Grand Total:</span>
                    <span>{formatCurrency(viewInvoice.grandTotal)}</span>
                  </div>
                </div>
              </div>

              {viewInvoice.notes && (
                <div className="p-3 bg-stone-50 rounded-xl border border-stone-150 text-xs text-stone-500">
                  <strong>Notes:</strong> {viewInvoice.notes}
                </div>
              )}
            </div>

            <div className="px-5 py-4 border-t border-stone-100 bg-stone-50 flex items-center justify-between shrink-0 text-xs">
              <div className="flex gap-2">
                {viewInvoice.status !== 'Paid' && (
                  <button
                    onClick={async () => {
                      await onUpdateStatus(viewInvoice.id, 'Paid');
                      setViewInvoice({ ...viewInvoice, status: 'Paid' });
                    }}
                    className="bg-[#6B8E23] hover:bg-[#5a7a1d] text-white px-3 py-1.5 rounded-lg font-semibold transition"
                  >
                    Mark Paid
                  </button>
                )}
                {viewInvoice.status === 'Paid' && (
                  <button
                    onClick={async () => {
                      await onUpdateStatus(viewInvoice.id, 'Issued');
                      setViewInvoice({ ...viewInvoice, status: 'Issued' });
                    }}
                    className="border border-stone-250 bg-white hover:bg-stone-50 text-stone-650 px-3 py-1.5 rounded-lg font-semibold transition"
                  >
                    Mark Unpaid
                  </button>
                )}
              </div>

              <div className="flex gap-2">
                <button
                  onClick={() => handleDownloadPDF(viewInvoice)}
                  className="bg-white border border-stone-250 text-stone-700 px-3 py-1.5 rounded-lg font-semibold hover:bg-stone-50 transition flex items-center gap-1.5"
                >
                  <Download className="w-3.5 h-3.5" /> Download PDF
                </button>
                <button
                  onClick={() => handlePrint(viewInvoice)}
                  className="bg-white border border-stone-250 text-stone-700 px-3 py-1.5 rounded-lg font-semibold hover:bg-stone-50 transition flex items-center gap-1.5"
                >
                  <Printer className="w-3.5 h-3.5" /> Print
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default InvoicesView;
