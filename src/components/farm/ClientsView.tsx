import React, { useState, useMemo } from 'react';
import { Client, MilkDelivery, Invoice, Payment, formatCurrency } from '@/lib/farmData';
import {
  User, Phone, MapPin, Plus, Edit2, Trash2, Search, Filter,
  Check, X, FileText, CreditCard, ChevronRight, AlertCircle, Droplet
} from 'lucide-react';

interface Props {
  clients: Client[];
  deliveries: MilkDelivery[];
  invoices: Invoice[];
  payments: Payment[];
  onAdd: (c: Omit<Client, 'id'>) => Promise<void>;
  onEdit: (id: string, patch: Partial<Client>) => Promise<void>;
  onDelete: (c: Client) => Promise<void>;
}

const ClientsView: React.FC<Props> = ({
  clients,
  deliveries,
  invoices,
  payments,
  onAdd,
  onEdit,
  onDelete
}) => {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'All' | 'Active' | 'Inactive'>('Active');
  const [selectedClientId, setSelectedClientId] = useState<string | null>(null);
  
  // Modals state
  const [showAddModal, setShowAddModal] = useState(false);
  const [editClient, setEditClient] = useState<Client | null>(null);
  
  // Form fields state
  const [name, setName] = useState('');
  const [contactPerson, setContactPerson] = useState('');
  const [mobile, setMobile] = useState('');
  const [alternateMobile, setAlternateMobile] = useState('');
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('');
  const [stateField, setStateField] = useState('');
  const [postalCode, setPostalCode] = useState('');
  const [notes, setNotes] = useState('');
  const [active, setActive] = useState(true);

  const resetForm = () => {
    setName('');
    setContactPerson('');
    setMobile('');
    setAlternateMobile('');
    setAddress('');
    setCity('');
    setStateField('');
    setPostalCode('');
    setNotes('');
    setActive(true);
  };

  const handleOpenAdd = () => {
    resetForm();
    setShowAddModal(true);
  };

  const handleOpenEdit = (c: Client) => {
    setEditClient(c);
    setName(c.name);
    setContactPerson(c.contactPerson);
    setMobile(c.mobile);
    setAlternateMobile(c.alternateMobile);
    setAddress(c.address);
    setCity(c.city);
    setStateField(c.state);
    setPostalCode(c.postalCode);
    setNotes(c.notes);
    setActive(c.active);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !mobile) return;
    
    const clientData = {
      name,
      contactPerson,
      mobile,
      alternateMobile,
      address,
      city,
      state: stateField,
      postalCode,
      notes,
      active
    };

    try {
      if (editClient) {
        await onEdit(editClient.id, clientData);
        setEditClient(null);
      } else {
        await onAdd(clientData);
        setShowAddModal(false);
      }
      resetForm();
    } catch (err) {
      console.error(err);
    }
  };

  // Client stats helper
  const getClientBalances = (clientId: string) => {
    const clientDeliveries = deliveries.filter(d => d.clientId === clientId && d.status === 'Delivered');
    const clientInvoices = invoices.filter(i => i.clientId === clientId);
    const clientPayments = payments.filter(p => p.clientId === clientId);

    const totalDelivered = clientDeliveries.reduce((sum, d) => sum + d.totalAmount, 0);
    const totalInvoiced = clientInvoices.reduce((sum, i) => sum + i.grandTotal, 0);
    const totalInvoicedSubtotal = clientInvoices.reduce((sum, i) => sum + i.subtotal, 0);
    const totalPaid = clientPayments.reduce((sum, p) => sum + p.amountReceived, 0);

    const invoicedOutstanding = Math.max(0, totalInvoiced - totalPaid);
    // Unbilled = delivered amount - invoiced subtotal (since deliveries correspond to invoice items / subtotals)
    const unbilledDeliveries = Math.max(0, totalDelivered - totalInvoicedSubtotal);
    const currentBalance = totalDelivered - totalPaid; // overall outstanding

    return {
      totalDelivered,
      totalInvoiced,
      totalPaid,
      invoicedOutstanding,
      unbilledDeliveries,
      currentBalance
    };
  };

  // Filters & search
  const filteredClients = useMemo(() => {
    return clients.filter(c => {
      const matchSearch = c.name.toLowerCase().includes(search.toLowerCase()) || 
                          (c.contactPerson && c.contactPerson.toLowerCase().includes(search.toLowerCase())) ||
                          c.mobile.includes(search);
      const matchStatus = statusFilter === 'All' || 
                          (statusFilter === 'Active' && c.active) || 
                          (statusFilter === 'Inactive' && !c.active);
      return matchSearch && matchStatus;
    });
  }, [clients, search, statusFilter]);

  const selectedClient = useMemo(() => {
    if (!selectedClientId) return null;
    return clients.find(c => c.id === selectedClientId) || null;
  }, [clients, selectedClientId]);

  // Selected client detail calculations
  const clientDetails = useMemo(() => {
    if (!selectedClient) return null;
    const balances = getClientBalances(selectedClient.id);
    const cDeliveries = deliveries.filter(d => d.clientId === selectedClient.id).slice(0, 10);
    const cInvoices = invoices.filter(i => i.clientId === selectedClient.id).slice(0, 10);
    const cPayments = payments.filter(p => p.clientId === selectedClient.id).slice(0, 10);
    return {
      ...balances,
      deliveries: cDeliveries,
      invoices: cInvoices,
      payments: cPayments
    };
  }, [selectedClient, deliveries, invoices, payments]);

  return (
    <div className="space-y-6">
      {/* Header Panel */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-[#6B8E23]/10 flex items-center justify-center text-[#6B8E23]">
            <User className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-stone-850">Client Management</h1>
            <p className="text-xs text-stone-500">Manage dairy customers, delivery metrics & outstanding balances</p>
          </div>
        </div>
        <button
          onClick={handleOpenAdd}
          className="bg-[#6B8E23] hover:bg-[#5a7a1d] text-white px-4 py-2.5 rounded-xl text-sm font-semibold flex items-center gap-2 transition shadow-sm"
        >
          <Plus className="w-4 h-4" /> Add New Client
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left column: Clients list & search */}
        <div className="lg:col-span-1 space-y-4">
          <div className="bg-white border border-stone-200 rounded-2xl p-4 space-y-3">
            <div className="relative">
              <Search className="absolute left-3 top-2.5 w-4 h-4 text-stone-400" />
              <input
                type="text"
                placeholder="Search name, contact, mobile..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-9 pr-3 py-2 rounded-xl border border-stone-200 bg-stone-50 text-xs outline-none focus:bg-white focus:border-[#6B8E23]"
              />
            </div>
            
            <div className="flex gap-2">
              {(['Active', 'Inactive', 'All'] as const).map((filterOpt) => (
                <button
                  key={filterOpt}
                  onClick={() => setStatusFilter(filterOpt)}
                  className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-semibold border transition ${
                    statusFilter === filterOpt
                      ? 'bg-[#6B8E23] border-[#6B8E23] text-white'
                      : 'bg-white border-stone-250 text-stone-600 hover:bg-stone-50'
                  }`}
                >
                  {filterOpt}
                </button>
              ))}
            </div>
          </div>

          <div className="bg-white border border-stone-200 rounded-2xl overflow-hidden max-h-[600px] overflow-y-auto">
            <div className="divide-y divide-stone-100">
              {filteredClients.map(c => {
                const balances = getClientBalances(c.id);
                const isSelected = selectedClientId === c.id;
                return (
                  <div
                    key={c.id}
                    onClick={() => setSelectedClientId(isSelected ? null : c.id)}
                    className={`p-4 cursor-pointer transition flex items-center justify-between hover:bg-stone-50/80 ${
                      isSelected ? 'bg-stone-50 border-l-4 border-[#6B8E23]' : ''
                    }`}
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-stone-800 text-sm truncate">{c.name}</span>
                        {!c.active && (
                          <span className="text-[9px] bg-stone-100 text-stone-500 px-1.5 py-0.5 rounded font-bold uppercase">
                            Inactive
                          </span>
                        )}
                      </div>
                      <div className="text-[11px] text-stone-500 mt-1 flex items-center gap-1">
                        <Phone className="w-3 h-3 text-stone-400" /> {c.mobile}
                      </div>
                      <div className="text-[10px] text-stone-400 mt-0.5 truncate">
                        {c.contactPerson ? `Contact: ${c.contactPerson}` : 'No contact person'}
                      </div>
                    </div>

                    <div className="text-right ml-4">
                      <div className="text-xs font-bold text-stone-800">
                        {formatCurrency(balances.currentBalance)}
                      </div>
                      <div className="text-[9px] text-stone-500 mt-0.5 uppercase tracking-wider">
                        Balance
                      </div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-stone-400 ml-2 shrink-0" />
                  </div>
                );
              })}

              {filteredClients.length === 0 && (
                <div className="p-8 text-center text-stone-400 text-sm">
                  No clients match your filter.
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right column: Client Details / Sub-dashboard */}
        <div className="lg:col-span-2">
          {selectedClient && clientDetails ? (
            <div className="space-y-6">
              {/* Client Profile Card */}
              <div className="bg-white border border-stone-200 rounded-2xl p-5 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                  <div>
                    <h2 className="text-lg font-bold text-stone-850 flex items-center gap-2">
                      {selectedClient.name}
                      <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase ${
                        selectedClient.active ? 'bg-emerald-50 text-emerald-700' : 'bg-stone-100 text-stone-500'
                      }`}>
                        {selectedClient.active ? 'Active Customer' : 'Inactive'}
                      </span>
                    </h2>
                    {selectedClient.contactPerson && (
                      <p className="text-xs text-stone-500 mt-0.5">Contact: {selectedClient.contactPerson}</p>
                    )}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-1.5 mt-3 text-xs text-stone-600">
                      <div className="flex items-center gap-2">
                        <Phone className="w-3.5 h-3.5 text-stone-400" />
                        <span>{selectedClient.mobile} {selectedClient.alternateMobile && ` / ${selectedClient.alternateMobile}`}</span>
                      </div>
                      {selectedClient.address && (
                        <div className="flex items-start gap-2">
                          <MapPin className="w-3.5 h-3.5 text-stone-400 shrink-0 mt-0.5" />
                          <span>{selectedClient.address}, {selectedClient.city}, {selectedClient.state} {selectedClient.postalCode}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex gap-2 self-start">
                    <button
                      onClick={() => handleOpenEdit(selectedClient)}
                      className="p-2 border border-stone-250 hover:bg-stone-50 rounded-xl transition text-stone-500 hover:text-stone-800"
                      title="Edit Client"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => onDelete(selectedClient)}
                      className="p-2 border border-red-200 hover:bg-red-50 rounded-xl transition text-red-500 hover:text-red-700"
                      title="Delete Client"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {selectedClient.notes && (
                  <div className="p-3 bg-stone-50 rounded-xl text-xs text-stone-600 border border-stone-150">
                    <strong className="text-stone-700">Notes:</strong> {selectedClient.notes}
                  </div>
                )}
              </div>

              {/* Client Balance Dashboard */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="bg-white rounded-2xl border border-stone-200 p-4">
                  <span className="text-[9px] font-bold text-stone-500 uppercase tracking-wider block">Total Billed Outstanding</span>
                  <div className="text-xl font-bold text-stone-800 mt-1">{formatCurrency(clientDetails.invoicedOutstanding)}</div>
                  <span className="text-[10px] text-stone-400 mt-1 block">Unpaid invoices</span>
                </div>
                <div className="bg-white rounded-2xl border border-stone-200 p-4">
                  <span className="text-[9px] font-bold text-stone-500 uppercase tracking-wider block">Unbilled Deliveries</span>
                  <div className="text-xl font-bold text-amber-700 mt-1">{formatCurrency(clientDetails.unbilledDeliveries)}</div>
                  <span className="text-[10px] text-stone-400 mt-1 block">Delivered but not invoiced</span>
                </div>
                <div className="bg-white rounded-2xl border border-stone-200 p-4 bg-[#6B8E23]/5 border-[#6B8E23]/20">
                  <span className="text-[9px] font-bold text-[#6B8E23] uppercase tracking-wider block">Net Balance Due</span>
                  <div className="text-xl font-bold text-[#6B8E23] mt-1">{formatCurrency(clientDetails.currentBalance)}</div>
                  <span className="text-[10px] text-stone-450 mt-1 block">Total unbilled + billed unpaid</span>
                </div>
              </div>

              {/* Tabbed Client Sub-ledger */}
              <div className="bg-white border border-stone-200 rounded-2xl overflow-hidden p-5">
                <h3 className="font-bold text-xs uppercase tracking-wider text-stone-500 mb-4">Customer Ledger Summary</h3>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {/* Recent Deliveries */}
                  <div>
                    <h4 className="font-semibold text-xs text-stone-800 border-b border-stone-150 pb-2 mb-3 flex items-center justify-between">
                      <span>Recent Deliveries</span>
                      <Droplet className="w-3.5 h-3.5 text-[#6B8E23]" />
                    </h4>
                    <div className="space-y-2">
                      {clientDetails.deliveries.map(d => (
                        <div key={d.id} className="text-xs flex justify-between items-center py-1 border-b border-stone-50">
                          <div>
                            <div className="font-semibold text-stone-750">{d.quantity}L @ {formatCurrency(d.unitPrice)}</div>
                            <div className="text-[9px] text-stone-400">{d.date}</div>
                          </div>
                          <span className={`text-[10px] font-bold ${d.status === 'Cancelled' ? 'text-red-500' : 'text-stone-700'}`}>
                            {formatCurrency(d.totalAmount)}
                          </span>
                        </div>
                      ))}
                      {clientDetails.deliveries.length === 0 && (
                        <div className="text-center py-4 text-xs text-stone-400">No deliveries registered</div>
                      )}
                    </div>
                  </div>

                  {/* Recent Invoices */}
                  <div>
                    <h4 className="font-semibold text-xs text-stone-800 border-b border-stone-150 pb-2 mb-3 flex items-center justify-between">
                      <span>Recent Invoices</span>
                      <FileText className="w-3.5 h-3.5 text-stone-500" />
                    </h4>
                    <div className="space-y-2">
                      {clientDetails.invoices.map(i => (
                        <div key={i.id} className="text-xs flex justify-between items-center py-1 border-b border-stone-50">
                          <div>
                            <div className="font-semibold text-stone-750">{i.invoiceNumber}</div>
                            <div className="text-[9px] text-stone-400">{i.invoiceDate}</div>
                          </div>
                          <div className="text-right">
                            <span className="font-bold block text-stone-800">{formatCurrency(i.grandTotal)}</span>
                            <span className={`text-[9px] font-bold ${
                              i.status === 'Paid' ? 'text-emerald-600' : i.status === 'Overdue' ? 'text-red-600' : 'text-amber-600'
                            }`}>{i.status}</span>
                          </div>
                        </div>
                      ))}
                      {clientDetails.invoices.length === 0 && (
                        <div className="text-center py-4 text-xs text-stone-400">No invoices generated</div>
                      )}
                    </div>
                  </div>

                  {/* Recent Payments */}
                  <div>
                    <h4 className="font-semibold text-xs text-stone-800 border-b border-stone-150 pb-2 mb-3 flex items-center justify-between">
                      <span>Recent Payments</span>
                      <CreditCard className="w-3.5 h-3.5 text-[#D2691E]" />
                    </h4>
                    <div className="space-y-2">
                      {clientDetails.payments.map(p => (
                        <div key={p.id} className="text-xs flex justify-between items-center py-1 border-b border-stone-50">
                          <div>
                            <div className="font-semibold text-stone-750">{p.paymentMethod}</div>
                            <div className="text-[9px] text-stone-400">{p.paymentDate}</div>
                          </div>
                          <span className="font-bold text-emerald-650">
                            {formatCurrency(p.amountReceived)}
                          </span>
                        </div>
                      ))}
                      {clientDetails.payments.length === 0 && (
                        <div className="text-center py-4 text-xs text-stone-400">No payments logged</div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="h-full bg-white border border-stone-200 rounded-2xl p-8 flex flex-col items-center justify-center text-center text-stone-400">
              <User className="w-12 h-12 text-stone-300 mb-3" />
              <div className="text-sm font-semibold text-stone-700">No Client Selected</div>
              <div className="text-xs text-stone-500 mt-1 max-w-xs">
                Select a client from the left pane to view contact details, billing statements, and activity histories.
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Add / Edit Client Modal */}
      {(showAddModal || editClient) && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white border border-stone-200 rounded-2xl w-full max-w-lg shadow-xl overflow-hidden">
            <div className="px-5 py-4 border-b border-stone-100 flex items-center justify-between bg-stone-50">
              <h3 className="font-bold text-sm text-stone-800 uppercase tracking-wider">
                {editClient ? `Edit Customer Details` : `Register New Client`}
              </h3>
              <button
                onClick={() => { setShowAddModal(false); setEditClient(null); }}
                className="p-1 rounded-lg text-stone-400 hover:bg-stone-200 hover:text-stone-850"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            
            <form onSubmit={handleSubmit} className="p-5 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="text-[10px] font-bold uppercase text-stone-500 block mb-1.5">Client/Business Name *</label>
                  <input
                    required
                    type="text"
                    placeholder="e.g. Swastik Dairy"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-stone-250 bg-stone-50 text-sm outline-none focus:bg-white focus:border-[#6B8E23]"
                  />
                </div>
                
                <div>
                  <label className="text-[10px] font-bold uppercase text-stone-500 block mb-1.5">Contact Person</label>
                  <input
                    type="text"
                    placeholder="e.g. Rohit Sharma"
                    value={contactPerson}
                    onChange={(e) => setContactPerson(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-stone-250 bg-stone-50 text-sm outline-none focus:bg-white focus:border-[#6B8E23]"
                  />
                </div>

                <div>
                  <label className="text-[10px] font-bold uppercase text-stone-500 block mb-1.5">Mobile Number *</label>
                  <input
                    required
                    type="tel"
                    placeholder="e.g. 9876543210"
                    value={mobile}
                    onChange={(e) => setMobile(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-stone-250 bg-stone-50 text-sm outline-none focus:bg-white focus:border-[#6B8E23]"
                  />
                </div>

                <div>
                  <label className="text-[10px] font-bold uppercase text-stone-500 block mb-1.5">Alternate Mobile</label>
                  <input
                    type="tel"
                    placeholder="Secondary contact"
                    value={alternateMobile}
                    onChange={(e) => setAlternateMobile(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-stone-250 bg-stone-50 text-sm outline-none focus:bg-white focus:border-[#6B8E23]"
                  />
                </div>

                <div>
                  <label className="text-[10px] font-bold uppercase text-stone-500 block mb-1.5">Status</label>
                  <select
                    value={active ? 'true' : 'false'}
                    onChange={(e) => setActive(e.target.value === 'true')}
                    className="w-full px-3 py-2 rounded-lg border border-stone-250 bg-stone-50 text-sm outline-none focus:bg-white focus:border-[#6B8E23]"
                  >
                    <option value="true">Active Customer</option>
                    <option value="false">Inactive</option>
                  </select>
                </div>
              </div>

              <div className="border-t border-stone-100 pt-3">
                <label className="text-[10px] font-bold uppercase text-stone-500 block mb-1.5">Address</label>
                <input
                  type="text"
                  placeholder="Street details"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-stone-250 bg-stone-50 text-sm outline-none focus:bg-white focus:border-[#6B8E23] mb-3"
                />
                
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="text-[10px] font-bold uppercase text-stone-500 block mb-1">City</label>
                    <input
                      type="text"
                      placeholder="City"
                      value={city}
                      onChange={(e) => setCity(e.target.value)}
                      className="w-full px-2.5 py-1.5 rounded-lg border border-stone-250 bg-stone-50 text-xs outline-none focus:bg-white focus:border-[#6B8E23]"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold uppercase text-stone-500 block mb-1">State</label>
                    <input
                      type="text"
                      placeholder="State"
                      value={stateField}
                      onChange={(e) => setStateField(e.target.value)}
                      className="w-full px-2.5 py-1.5 rounded-lg border border-stone-250 bg-stone-50 text-xs outline-none focus:bg-white focus:border-[#6B8E23]"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold uppercase text-stone-500 block mb-1">Pincode</label>
                    <input
                      type="text"
                      placeholder="Pincode"
                      value={postalCode}
                      onChange={(e) => setPostalCode(e.target.value)}
                      className="w-full px-2.5 py-1.5 rounded-lg border border-stone-250 bg-stone-50 text-xs outline-none focus:bg-white focus:border-[#6B8E23]"
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="text-[10px] font-bold uppercase text-stone-500 block mb-1.5">Internal Notes</label>
                <textarea
                  placeholder="Notes about supply timings, preferences, pricing agreements..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={2}
                  className="w-full px-3 py-2 rounded-lg border border-stone-250 bg-stone-50 text-xs outline-none focus:bg-white focus:border-[#6B8E23]"
                />
              </div>

              <div className="flex gap-3 justify-end pt-3 border-t border-stone-100">
                <button
                  type="button"
                  onClick={() => { setShowAddModal(false); setEditClient(null); }}
                  className="px-4 py-2 border border-stone-250 rounded-xl text-stone-600 text-xs font-semibold hover:bg-stone-50 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="bg-[#6B8E23] hover:bg-[#5a7a1d] text-white px-4 py-2 rounded-xl text-xs font-semibold transition"
                >
                  {editClient ? 'Save Changes' : 'Register Customer'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default ClientsView;
