import React, { useState, useMemo } from 'react';
import { Client, Invoice, Payment, formatCurrency } from '@/lib/farmData';
import {
  CreditCard, Calendar, Plus, Trash2, Search, Filter,
  IndianRupee, X, ShieldAlert, CheckCircle, Receipt
} from 'lucide-react';

interface Props {
  clients: Client[];
  invoices: Invoice[];
  payments: Payment[];
  onAdd: (p: Omit<Payment, 'id'>) => Promise<void>;
  onDelete: (p: Payment) => Promise<void>;
  onUpdateInvoiceStatus: (id: string, status: Invoice['status']) => Promise<void>;
}

const PaymentsView: React.FC<Props> = ({
  clients,
  invoices,
  payments,
  onAdd,
  onDelete,
  onUpdateInvoiceStatus
}) => {
  // Form states
  const [clientId, setClientId] = useState(clients[0]?.id || '');
  const [invoiceId, setInvoiceId] = useState('');
  const [paymentDate, setPaymentDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [paymentMethod, setPaymentMethod] = useState<Payment['paymentMethod']>('UPI');
  const [referenceNumber, setReferenceNumber] = useState('');
  const [amountReceived, setAmountReceived] = useState('');
  const [notes, setNotes] = useState('');

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [methodFilter, setMethodFilter] = useState<string>('All');

  // Filter invoices belonging to the selected client that are not yet paid
  const clientOutstandingInvoices = useMemo(() => {
    if (!clientId) return [];
    return invoices.filter(inv => inv.clientId === clientId && inv.status !== 'Paid');
  }, [clientId, invoices]);

  // If a specific invoice is selected, check its amount
  const selectedInvoice = useMemo(() => {
    if (!invoiceId) return null;
    return invoices.find(inv => inv.id === invoiceId) || null;
  }, [invoiceId, invoices]);

  // Calculate outstanding balance of the selected invoice
  const selectedInvoiceOutstanding = useMemo(() => {
    if (!selectedInvoice) return 0;
    // Calculate total payments recorded against this invoice
    const invoicePayments = payments.filter(p => p.invoiceId === selectedInvoice.id);
    const paidSum = invoicePayments.reduce((sum, p) => sum + p.amountReceived, 0);
    return Math.max(0, selectedInvoice.grandTotal - paidSum);
  }, [selectedInvoice, payments]);

  // Stats
  const stats = useMemo(() => {
    const totalCollected = payments.reduce((sum, p) => sum + p.amountReceived, 0);
    const currentMonthStr = new Date().toISOString().slice(0, 7);
    const monthlyCollected = payments
      .filter(p => p.paymentDate.startsWith(currentMonthStr))
      .reduce((sum, p) => sum + p.amountReceived, 0);
      
    // Count methods
    const methodCounts = { Cash: 0, BankTransfer: 0, UPI: 0, Cheque: 0, Other: 0 };
    payments.forEach(p => {
      if (p.paymentMethod === 'Cash') methodCounts.Cash += p.amountReceived;
      else if (p.paymentMethod === 'Bank Transfer') methodCounts.BankTransfer += p.amountReceived;
      else if (p.paymentMethod === 'UPI') methodCounts.UPI += p.amountReceived;
      else if (p.paymentMethod === 'Cheque') methodCounts.Cheque += p.amountReceived;
      else methodCounts.Other += p.amountReceived;
    });

    return {
      totalCollected,
      monthlyCollected,
      methodCounts
    };
  }, [payments]);

  // Handle client selection change in form
  const handleClientChange = (id: string) => {
    setClientId(id);
    setInvoiceId(''); // Reset selected invoice
  };

  // Auto-fill outstanding amount when invoice is selected
  const handleInvoiceChange = (id: string) => {
    setInvoiceId(id);
    if (id) {
      const inv = invoices.find(i => i.id === id);
      if (inv) {
        // calculate actual outstanding
        const invoicePayments = payments.filter(p => p.invoiceId === id);
        const paidSum = invoicePayments.reduce((sum, p) => sum + p.amountReceived, 0);
        const outstanding = Math.max(0, inv.grandTotal - paidSum);
        setAmountReceived(outstanding.toString());
      }
    } else {
      setAmountReceived('');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!clientId || !amountReceived) return;

    const amt = parseFloat(amountReceived);
    if (amt <= 0) return;

    try {
      await onAdd({
        clientId,
        invoiceId: invoiceId || undefined,
        paymentDate,
        paymentMethod,
        referenceNumber,
        amountReceived: amt,
        notes
      });

      // Automatically update invoice status if a specific invoice was selected
      if (selectedInvoice) {
        const remaining = selectedInvoiceOutstanding - amt;
        if (remaining <= 0) {
          await onUpdateInvoiceStatus(selectedInvoice.id, 'Paid');
        } else if (remaining < selectedInvoice.grandTotal) {
          await onUpdateInvoiceStatus(selectedInvoice.id, 'Partially Paid');
        }
      }

      // Reset
      setAmountReceived('');
      setReferenceNumber('');
      setNotes('');
      setInvoiceId('');
    } catch (err) {
      console.error(err);
    }
  };

  // Filter payments list
  const filteredPayments = useMemo(() => {
    return payments.filter(p => {
      const client = clients.find(c => c.id === p.clientId);
      const invoice = p.invoiceId ? invoices.find(i => i.id === p.invoiceId) : null;
      const matchSearch = client?.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          (invoice && invoice.invoiceNumber.toLowerCase().includes(searchQuery.toLowerCase())) ||
                          p.referenceNumber.toLowerCase().includes(searchQuery.toLowerCase());
      const matchMethod = methodFilter === 'All' || p.paymentMethod === methodFilter;
      return matchSearch && matchMethod;
    });
  }, [payments, clients, invoices, searchQuery, methodFilter]);

  return (
    <div className="space-y-6">
      {/* Quick Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-2xl border border-stone-200 p-5 hover:shadow-md transition">
          <div className="flex items-center justify-between">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-600">
              <IndianRupee className="w-5 h-5" />
            </div>
            <span className="text-[10px] bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded font-bold uppercase tracking-wider">Total</span>
          </div>
          <div className="mt-4">
            <div className="text-2xl font-bold text-stone-850">{formatCurrency(stats.totalCollected)}</div>
            <div className="text-xs text-stone-500 mt-1">Total revenue collected</div>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-stone-200 p-5 hover:shadow-md transition">
          <div className="flex items-center justify-between">
            <div className="w-10 h-10 rounded-xl bg-indigo-500/10 flex items-center justify-center text-indigo-600">
              <Calendar className="w-5 h-5" />
            </div>
            <span className="text-[10px] bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded font-bold uppercase tracking-wider">Mo. Collection</span>
          </div>
          <div className="mt-4">
            <div className="text-2xl font-bold text-stone-850">{formatCurrency(stats.monthlyCollected)}</div>
            <div className="text-xs text-stone-500 mt-1">Payments collected this month</div>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-stone-200 p-5 hover:shadow-md transition">
          <div className="flex items-center justify-between">
            <div className="w-10 h-10 rounded-xl bg-sky-500/10 flex items-center justify-center text-sky-650">
              <CreditCard className="w-5 h-5" />
            </div>
            <span className="text-[10px] bg-sky-50 text-sky-700 px-2 py-0.5 rounded font-bold uppercase tracking-wider">UPI / Bank</span>
          </div>
          <div className="mt-4">
            <div className="text-2xl font-bold text-stone-855">
              {formatCurrency(stats.methodCounts.UPI + stats.methodCounts.BankTransfer)}
            </div>
            <div className="text-xs text-stone-500 mt-1">UPI & Bank Transfer collections</div>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-stone-200 p-5 hover:shadow-md transition">
          <div className="flex items-center justify-between">
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center text-amber-600">
              <Receipt className="w-5 h-5" />
            </div>
            <span className="text-[10px] bg-amber-50 text-amber-700 px-2 py-0.5 rounded font-bold uppercase tracking-wider">Cash</span>
          </div>
          <div className="mt-4">
            <div className="text-2xl font-bold text-stone-855">{formatCurrency(stats.methodCounts.Cash)}</div>
            <div className="text-xs text-stone-500 mt-1">Cash collections</div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left column: Add payment form */}
        <div className="lg:col-span-1">
          <div className="bg-white border border-stone-200 rounded-2xl p-5">
            <h2 className="font-bold text-stone-800 text-sm mb-4 uppercase tracking-wider flex items-center gap-2">
              <CreditCard className="w-4 h-4 text-[#6B8E23]" /> Record Client Payment
            </h2>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="text-[10px] font-bold uppercase text-stone-500 block mb-1.5">Select Client *</label>
                <select
                  value={clientId}
                  onChange={(e) => handleClientChange(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-stone-250 bg-stone-50 text-sm outline-none focus:bg-white focus:border-[#6B8E23]"
                >
                  {clients.map(c => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-[10px] font-bold uppercase text-stone-500 block mb-1.5">
                  Link to Invoice (Optional)
                </label>
                <select
                  value={invoiceId}
                  onChange={(e) => handleInvoiceChange(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-stone-250 bg-stone-50 text-sm outline-none focus:bg-white focus:border-[#6B8E23]"
                >
                  <option value="">-- General Payment (No Invoice Link) --</option>
                  {clientOutstandingInvoices.map(inv => (
                    <option key={inv.id} value={inv.id}>
                      {inv.invoiceNumber} (Total: {formatCurrency(inv.grandTotal)})
                    </option>
                  ))}
                </select>
              </div>

              {selectedInvoice && (
                <div className="bg-amber-50/50 border border-amber-200 p-3 rounded-xl text-xs space-y-1 text-stone-700">
                  <div className="flex justify-between">
                    <span>Invoice Total:</span>
                    <span className="font-semibold">{formatCurrency(selectedInvoice.grandTotal)}</span>
                  </div>
                  <div className="flex justify-between text-amber-700 font-bold border-t border-amber-200/50 pt-1 mt-1">
                    <span>Outstanding Due:</span>
                    <span>{formatCurrency(selectedInvoiceOutstanding)}</span>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-bold uppercase text-stone-500 block mb-1.5">Amount (₹) *</label>
                  <input
                    required
                    type="number"
                    step="1"
                    placeholder="e.g. 5000"
                    value={amountReceived}
                    onChange={(e) => setAmountReceived(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-stone-250 bg-stone-50 text-sm outline-none focus:bg-white focus:border-[#6B8E23]"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold uppercase text-stone-500 block mb-1.5">Payment Method *</label>
                  <select
                    value={paymentMethod}
                    onChange={(e) => setPaymentMethod(e.target.value as any)}
                    className="w-full px-3 py-2 rounded-lg border border-stone-250 bg-stone-50 text-sm outline-none focus:bg-white focus:border-[#6B8E23]"
                  >
                    <option value="UPI">UPI / GPay / PhonePe</option>
                    <option value="Cash">Cash</option>
                    <option value="Bank Transfer">Bank Transfer</option>
                    <option value="Cheque">Cheque</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-bold uppercase text-stone-500 block mb-1.5">Payment Date</label>
                  <input
                    type="date"
                    value={paymentDate}
                    onChange={(e) => setPaymentDate(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-stone-255 bg-stone-50 text-xs outline-none focus:bg-white"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold uppercase text-stone-500 block mb-1.5">Reference No. / Txn ID</label>
                  <input
                    type="text"
                    placeholder="e.g. UPI txn ref"
                    value={referenceNumber}
                    onChange={(e) => setReferenceNumber(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-stone-250 bg-stone-50 text-sm outline-none focus:bg-white focus:border-[#6B8E23]"
                  />
                </div>
              </div>

              <div>
                <label className="text-[10px] font-bold uppercase text-stone-500 block mb-1.5">Remarks / Memo</label>
                <input
                  type="text"
                  placeholder="Receipt note..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-stone-250 bg-stone-50 text-sm outline-none focus:bg-white focus:border-[#6B8E23]"
                />
              </div>

              <button
                type="submit"
                className="w-full bg-[#6B8E23] hover:bg-[#5a7a1d] text-white py-2.5 rounded-xl text-sm font-semibold transition shadow-sm"
              >
                Record Payment
              </button>
            </form>
          </div>
        </div>

        {/* Right column: Payments log table */}
        <div className="lg:col-span-2 space-y-4">
          <div className="bg-white border border-stone-200 rounded-2xl p-4 flex flex-col sm:flex-row gap-3 items-center">
            <div className="relative flex-1 w-full">
              <Search className="absolute left-3 top-2.5 w-4 h-4 text-stone-400" />
              <input
                type="text"
                placeholder="Search customer, invoice, txn ref..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-2 rounded-xl border border-stone-200 bg-stone-50 text-xs outline-none focus:bg-white focus:border-[#6B8E23]"
              />
            </div>
            
            <select
              value={methodFilter}
              onChange={(e) => setMethodFilter(e.target.value)}
              className="w-full sm:w-48 px-3 py-2 rounded-xl border border-stone-200 bg-stone-50 text-xs outline-none focus:bg-white focus:border-[#6B8E23]"
            >
              <option value="All">All Methods</option>
              <option value="UPI">UPI</option>
              <option value="Cash">Cash</option>
              <option value="Bank Transfer">Bank Transfer</option>
              <option value="Cheque">Cheque</option>
              <option value="Other">Other</option>
            </select>
          </div>

          <div className="bg-white border border-stone-200 rounded-2xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-stone-50 border-b border-stone-200 font-semibold text-stone-600">
                    <th className="p-3">Date</th>
                    <th className="p-3">Customer</th>
                    <th className="p-3">Invoice</th>
                    <th className="p-3">Method</th>
                    <th className="p-3">Reference No.</th>
                    <th className="p-3 text-right">Amount Received</th>
                    <th className="p-3 text-center">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100">
                  {filteredPayments.map(p => {
                    const client = clients.find(c => c.id === p.clientId);
                    const invoice = p.invoiceId ? invoices.find(i => i.id === p.invoiceId) : null;
                    return (
                      <tr key={p.id} className="hover:bg-stone-50/50">
                        <td className="p-3 text-stone-500 whitespace-nowrap">{p.paymentDate}</td>
                        <td className="p-3">
                          <div className="font-bold text-stone-800">{client ? client.name : 'Unknown Client'}</div>
                          {p.notes && <div className="text-[10px] text-stone-400 mt-0.5 truncate max-w-[150px]">{p.notes}</div>}
                        </td>
                        <td className="p-3 font-semibold text-stone-600">
                          {invoice ? invoice.invoiceNumber : <span className="text-stone-400 italic">General Account</span>}
                        </td>
                        <td className="p-3">
                          <span className={`inline-flex px-2 py-0.5 rounded font-semibold text-[10px] uppercase ${
                            p.paymentMethod === 'Cash' ? 'bg-amber-50 text-amber-700' :
                            p.paymentMethod === 'UPI' ? 'bg-sky-50 text-sky-700' : 'bg-indigo-50 text-indigo-700'
                          }`}>
                            {p.paymentMethod}
                          </span>
                        </td>
                        <td className="p-3 text-stone-500 font-mono">{p.referenceNumber || '—'}</td>
                        <td className="p-3 text-right font-bold text-emerald-650">{formatCurrency(p.amountReceived)}</td>
                        <td className="p-3 text-center">
                          <button
                            onClick={() => onDelete(p)}
                            className="p-1 text-stone-450 hover:text-red-650 hover:bg-red-50 rounded-lg transition"
                            title="Delete Payment Record"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                  {filteredPayments.length === 0 && (
                    <tr>
                      <td colSpan={7} className="p-4 text-center text-stone-400">No payments found.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PaymentsView;
