import React, { useState, useMemo } from 'react';
import { Client, MilkDelivery, formatCurrency } from '@/lib/farmData';
import {
  Droplet, Calendar, Plus, Trash2, Search, Filter,
  TrendingUp, IndianRupee, X, ShieldAlert, CheckCircle
} from 'lucide-react';

interface Props {
  clients: Client[];
  deliveries: MilkDelivery[];
  onAdd: (d: Omit<MilkDelivery, 'id'>) => Promise<void>;
  onDelete: (d: MilkDelivery) => Promise<void>;
}

const MilkDeliveriesView: React.FC<Props> = ({
  clients,
  deliveries,
  onAdd,
  onDelete
}) => {
  const activeClients = useMemo(() => clients.filter(c => c.active), [clients]);
  
  // Form state
  const [selectedClientId, setSelectedClientId] = useState(activeClients[0]?.id || '');
  const [quantity, setQuantity] = useState('');
  const [unitPrice, setUnitPrice] = useState('60'); // Default ₹60/L
  const [deliveryDate, setDeliveryDate] = useState(new Date().toISOString().slice(0, 10));
  const [notes, setNotes] = useState('');
  
  // Filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [clientFilter, setClientFilter] = useState('All');

  // Stats
  const stats = useMemo(() => {
    const activeDel = deliveries.filter(d => d.status === 'Delivered');
    const totalQty = activeDel.reduce((sum, d) => sum + d.quantity, 0);
    const totalVal = activeDel.reduce((sum, d) => sum + d.totalAmount, 0);
    const avgPrice = totalQty > 0 ? totalVal / totalQty : 0;
    return {
      totalQty,
      totalVal,
      avgPrice,
      count: activeDel.length
    };
  }, [deliveries]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedClientId || !quantity || !unitPrice) return;

    const qty = parseFloat(quantity);
    const price = parseFloat(unitPrice);
    
    await onAdd({
      clientId: selectedClientId,
      date: deliveryDate,
      quantity: qty,
      unitPrice: price,
      totalAmount: qty * price,
      notes,
      status: 'Delivered'
    });

    setQuantity('');
    setNotes('');
  };

  // Filter deliveries
  const filteredDeliveries = useMemo(() => {
    return deliveries.filter(d => {
      const client = clients.find(c => c.id === d.clientId);
      const nameMatch = client?.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          client?.contactPerson?.toLowerCase().includes(searchQuery.toLowerCase());
      const clientMatch = clientFilter === 'All' || d.clientId === clientFilter;
      return nameMatch && clientMatch;
    });
  }, [deliveries, clients, searchQuery, clientFilter]);

  return (
    <div className="space-y-6">
      {/* Overview stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-2xl border border-stone-200 p-5 hover:shadow-md transition">
          <div className="flex items-center justify-between">
            <div className="w-10 h-10 rounded-xl bg-[#6B8E23]/10 flex items-center justify-center text-[#6B8E23]">
              <Droplet className="w-5 h-5" />
            </div>
            <span className="text-[10px] bg-stone-100 text-stone-600 px-2 py-0.5 rounded font-bold uppercase tracking-wider">Liters</span>
          </div>
          <div className="mt-4">
            <div className="text-2xl font-bold text-stone-850">{stats.totalQty.toFixed(1)} <span className="text-xs font-normal text-stone-500">L</span></div>
            <div className="text-xs text-stone-500 mt-1">Total milk delivered</div>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-stone-200 p-5 hover:shadow-md transition">
          <div className="flex items-center justify-between">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-600">
              <TrendingUp className="w-5 h-5" />
            </div>
            <span className="text-[10px] bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded font-bold uppercase tracking-wider">Gross Value</span>
          </div>
          <div className="mt-4">
            <div className="text-2xl font-bold text-stone-850">{formatCurrency(stats.totalVal)}</div>
            <div className="text-xs text-stone-500 mt-1">Accumulated sales value</div>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-stone-200 p-5 hover:shadow-md transition">
          <div className="flex items-center justify-between">
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center text-amber-600">
              <IndianRupee className="w-5 h-5" />
            </div>
            <span className="text-[10px] bg-amber-50 text-amber-700 px-2 py-0.5 rounded font-bold uppercase tracking-wider">Avg Rate</span>
          </div>
          <div className="mt-4">
            <div className="text-2xl font-bold text-stone-850">{formatCurrency(stats.avgPrice)}<span className="text-xs font-normal text-stone-500">/L</span></div>
            <div className="text-xs text-stone-500 mt-1">Average unit price received</div>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-stone-200 p-5 hover:shadow-md transition">
          <div className="flex items-center justify-between">
            <div className="w-10 h-10 rounded-xl bg-indigo-500/10 flex items-center justify-center text-indigo-600">
              <Calendar className="w-5 h-5" />
            </div>
            <span className="text-[10px] bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded font-bold uppercase tracking-wider">Deliveries</span>
          </div>
          <div className="mt-4">
            <div className="text-2xl font-bold text-stone-855">{stats.count}</div>
            <div className="text-xs text-stone-500 mt-1">Total active deliveries logged</div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Form */}
        <div className="lg:col-span-1">
          <div className="bg-white border border-stone-200 rounded-2xl p-5">
            <h2 className="font-bold text-stone-800 text-sm mb-4 uppercase tracking-wider flex items-center gap-2">
              <Droplet className="w-4 h-4 text-[#6B8E23]" /> Log Milk Delivery
            </h2>
            
            {activeClients.length === 0 ? (
              <div className="text-xs text-stone-500 py-4 text-center">
                Please register active clients first in the CRM section to record milk deliveries.
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="text-[10px] font-bold uppercase text-stone-500 block mb-1.5">Customer / Client *</label>
                  <select
                    value={selectedClientId}
                    onChange={(e) => setSelectedClientId(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-stone-250 bg-stone-50 text-sm outline-none focus:bg-white focus:border-[#6B8E23]"
                  >
                    {activeClients.map(c => (
                      <option key={c.id} value={c.id}>{c.name} {c.contactPerson ? `(${c.contactPerson})` : ''}</option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[10px] font-bold uppercase text-stone-500 block mb-1.5">Qty Delivered (L) *</label>
                    <input
                      required
                      type="number"
                      step="0.1"
                      placeholder="e.g. 50"
                      value={quantity}
                      onChange={(e) => setQuantity(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg border border-stone-250 bg-stone-50 text-sm outline-none focus:bg-white focus:border-[#6B8E23]"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold uppercase text-stone-500 block mb-1.5">Rate (₹ / Litre) *</label>
                    <input
                      required
                      type="number"
                      step="0.5"
                      placeholder="e.g. 60"
                      value={unitPrice}
                      onChange={(e) => setUnitPrice(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg border border-stone-250 bg-stone-50 text-sm outline-none focus:bg-white focus:border-[#6B8E23]"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-3">
                  <div>
                    <label className="text-[10px] font-bold uppercase text-stone-500 block mb-1.5">Delivery Date</label>
                    <input
                      type="date"
                      value={deliveryDate}
                      onChange={(e) => setDeliveryDate(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg border border-stone-255 bg-stone-50 text-xs outline-none focus:bg-white focus:border-[#6B8E23]"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold uppercase text-stone-500 block mb-1.5">Notes / Memo</label>
                    <input
                      type="text"
                      placeholder="Special instructions or quality comments..."
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg border border-stone-250 bg-stone-50 text-sm outline-none focus:bg-white focus:border-[#6B8E23]"
                    />
                  </div>
                </div>

                {quantity && unitPrice && (
                  <div className="bg-stone-50 border border-stone-150 p-3 rounded-xl flex items-center justify-between">
                    <span className="text-xs text-stone-500">Calculated Value:</span>
                    <span className="text-sm font-bold text-stone-800">
                      {formatCurrency(parseFloat(quantity) * parseFloat(unitPrice))}
                    </span>
                  </div>
                )}

                <button
                  type="submit"
                  className="w-full bg-[#6B8E23] hover:bg-[#5a7a1d] text-white py-2.5 rounded-xl text-sm font-semibold transition shadow-sm"
                >
                  Log Delivery
                </button>
              </form>
            )}
          </div>
        </div>

        {/* Right Column: Deliveries List */}
        <div className="lg:col-span-2 space-y-4">
          <div className="bg-white border border-stone-200 rounded-2xl p-4 flex flex-col sm:flex-row gap-3 items-center">
            <div className="relative flex-1 w-full">
              <Search className="absolute left-3 top-2.5 w-4 h-4 text-stone-400" />
              <input
                type="text"
                placeholder="Search customer name..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-2 rounded-xl border border-stone-200 bg-stone-50 text-xs outline-none focus:bg-white focus:border-[#6B8E23]"
              />
            </div>
            
            <select
              value={clientFilter}
              onChange={(e) => setClientFilter(e.target.value)}
              className="w-full sm:w-48 px-3 py-2 rounded-xl border border-stone-200 bg-stone-50 text-xs outline-none focus:bg-white focus:border-[#6B8E23]"
            >
              <option value="All">Filter: All Clients</option>
              {clients.map(c => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>

          <div className="bg-white border border-stone-200 rounded-2xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-stone-50 border-b border-stone-200 font-semibold text-stone-600">
                    <th className="p-3">Date</th>
                    <th className="p-3">Customer</th>
                    <th className="p-3 text-right">Quantity</th>
                    <th className="p-3 text-right">Rate</th>
                    <th className="p-3 text-right">Total Amount</th>
                    <th className="p-3">Status</th>
                    <th className="p-3 text-center">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100">
                  {filteredDeliveries.map(d => {
                    const client = clients.find(c => c.id === d.clientId);
                    return (
                      <tr key={d.id} className={`hover:bg-stone-50/50 ${d.status === 'Cancelled' ? 'bg-red-50/20 opacity-70' : ''}`}>
                        <td className="p-3 text-stone-500 font-medium whitespace-nowrap">{d.date}</td>
                        <td className="p-3">
                          <div className="font-bold text-stone-800">{client ? client.name : 'Unknown Client'}</div>
                          {d.notes && <div className="text-[10px] text-stone-400 mt-0.5 truncate max-w-[150px]">{d.notes}</div>}
                        </td>
                        <td className="p-3 text-right font-medium text-stone-700">{d.quantity} L</td>
                        <td className="p-3 text-right text-stone-600">{formatCurrency(d.unitPrice)}</td>
                        <td className="p-3 text-right font-bold text-stone-800">{formatCurrency(d.totalAmount)}</td>
                        <td className="p-3">
                          <span className={`inline-flex items-center gap-1 text-[9px] font-bold uppercase px-2 py-0.5 rounded-full ${
                            d.status === 'Delivered' ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'
                          }`}>
                            {d.status === 'Delivered' ? (
                              <CheckCircle className="w-2.5 h-2.5" />
                            ) : (
                              <ShieldAlert className="w-2.5 h-2.5" />
                            )}
                            {d.status}
                          </span>
                        </td>
                        <td className="p-3 text-center">
                          {d.status === 'Delivered' && (
                            <button
                              onClick={() => onDelete(d)}
                              className="p-1 text-stone-450 hover:text-red-650 hover:bg-red-50 rounded-lg transition"
                              title="Cancel Delivery"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                  {filteredDeliveries.length === 0 && (
                    <tr>
                      <td colSpan={7} className="p-4 text-center text-stone-400">No delivery records found.</td>
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

export default MilkDeliveriesView;
