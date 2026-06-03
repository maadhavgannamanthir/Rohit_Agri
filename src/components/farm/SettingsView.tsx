import React, { useState } from 'react';
import { FarmSettings } from '@/lib/farmData';
import { Settings, Save, AlertCircle, CheckCircle } from 'lucide-react';

interface Props {
  settings: FarmSettings | null;
  onSave: (settings: Omit<FarmSettings, 'userId'>) => Promise<void>;
}

const SettingsView: React.FC<Props> = ({ settings, onSave }) => {
  const [farmName, setFarmName] = useState(settings?.farmName || '');
  const [address, setAddress] = useState(settings?.address || '');
  const [phone, setPhone] = useState(settings?.phone || '');
  const [email, setEmail] = useState(settings?.email || '');
  const [gstNumber, setGstNumber] = useState(settings?.gstNumber || '');
  const [invoicePrefix, setInvoicePrefix] = useState(settings?.invoicePrefix || 'INV');
  const [currency, setCurrency] = useState(settings?.currency || 'INR');
  const [logoUrl, setLogoUrl] = useState(settings?.logoUrl || '');
  
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!farmName.trim()) return;
    setLoading(true);
    setMessage(null);
    try {
      await onSave({
        farmName: farmName.trim(),
        address: address.trim(),
        phone: phone.trim(),
        email: email.trim(),
        gstNumber: gstNumber.trim().toUpperCase(),
        invoicePrefix: invoicePrefix.trim().toUpperCase(),
        currency: currency.trim(),
        logoUrl: logoUrl.trim(),
      });
      setMessage({ text: 'Settings updated successfully!', type: 'success' });
    } catch (err) {
      setMessage({ 
        text: err instanceof Error ? err.message : 'Failed to update settings', 
        type: 'error' 
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Title Panel */}
      <div className="flex items-center gap-3">
        <div className="w-12 h-12 rounded-2xl bg-[#6B8E23]/10 flex items-center justify-center text-[#6B8E23]">
          <Settings className="w-6 h-6" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-stone-850">Farm Profile Settings</h1>
          <p className="text-xs text-stone-500">Configure your business metadata, invoicing templates, and system parameters</p>
        </div>
      </div>

      <div className="bg-white border border-stone-200 rounded-2xl p-6 shadow-sm">
        <form onSubmit={handleSubmit} className="space-y-5">
          {message && (
            <div className={`p-4 rounded-xl border flex items-start gap-2.5 text-xs ${
              message.type === 'success' ? 'bg-emerald-50 border-emerald-250 text-emerald-800' : 'bg-red-50 border-red-200 text-red-800'
            }`}>
              {message.type === 'success' ? <CheckCircle className="w-4 h-4 shrink-0" /> : <AlertCircle className="w-4 h-4 shrink-0" />}
              <span className="font-medium">{message.text}</span>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <label className="text-[10px] font-bold uppercase text-stone-500 block mb-1.5">
                Farm / Business Name *
              </label>
              <input
                required
                type="text"
                value={farmName}
                onChange={(e) => setFarmName(e.target.value)}
                placeholder="e.g. Rohit Agro Dairy"
                className="w-full px-3.5 py-2.5 rounded-xl border border-stone-250 bg-stone-50 text-sm outline-none focus:bg-white focus:border-[#6B8E23] transition-all"
              />
            </div>

            <div>
              <label className="text-[10px] font-bold uppercase text-stone-500 block mb-1.5">
                Invoice Prefix Code
              </label>
              <input
                type="text"
                value={invoicePrefix}
                onChange={(e) => setInvoicePrefix(e.target.value)}
                placeholder="e.g. INV"
                maxLength={10}
                className="w-full px-3.5 py-2.5 rounded-xl border border-stone-250 bg-stone-50 text-sm outline-none focus:bg-white focus:border-[#6B8E23] transition-all"
              />
            </div>

            <div>
              <label className="text-[10px] font-bold uppercase text-stone-500 block mb-1.5">
                Currency Tag
              </label>
              <input
                type="text"
                value={currency}
                onChange={(e) => setCurrency(e.target.value)}
                placeholder="e.g. INR, USD"
                className="w-full px-3.5 py-2.5 rounded-xl border border-stone-250 bg-stone-50 text-sm outline-none focus:bg-white focus:border-[#6B8E23] transition-all"
              />
            </div>

            <div>
              <label className="text-[10px] font-bold uppercase text-stone-500 block mb-1.5">
                Mobile Number / Phone
              </label>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="e.g. +91 98765 43210"
                className="w-full px-3.5 py-2.5 rounded-xl border border-stone-250 bg-stone-50 text-sm outline-none focus:bg-white focus:border-[#6B8E23] transition-all"
              />
            </div>

            <div>
              <label className="text-[10px] font-bold uppercase text-stone-500 block mb-1.5">
                Email Address
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="e.g. billing@rohitagro.com"
                className="w-full px-3.5 py-2.5 rounded-xl border border-stone-250 bg-stone-50 text-sm outline-none focus:bg-white focus:border-[#6B8E23] transition-all"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="text-[10px] font-bold uppercase text-stone-500 block mb-1.5">
                Tax Identification / GST Number
              </label>
              <input
                type="text"
                value={gstNumber}
                onChange={(e) => setGstNumber(e.target.value)}
                placeholder="e.g. 27AAAAA1111A1Z1"
                className="w-full px-3.5 py-2.5 rounded-xl border border-stone-250 bg-stone-50 text-sm outline-none focus:bg-white focus:border-[#6B8E23] transition-all"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="text-[10px] font-bold uppercase text-stone-500 block mb-1.5">
                Billing Address
              </label>
              <textarea
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="e.g. Gat No. 402, Agro Park, Pune, Maharashtra - 411001"
                rows={3}
                className="w-full px-3.5 py-2.5 rounded-xl border border-stone-250 bg-stone-50 text-sm outline-none focus:bg-white focus:border-[#6B8E23] transition-all resize-none"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="text-[10px] font-bold uppercase text-stone-500 block mb-1.5">
                Farm Logo URL
              </label>
              <input
                type="url"
                value={logoUrl}
                onChange={(e) => setLogoUrl(e.target.value)}
                placeholder="e.g. https://domain.com/logo.png"
                className="w-full px-3.5 py-2.5 rounded-xl border border-stone-250 bg-stone-50 text-sm outline-none focus:bg-white focus:border-[#6B8E23] transition-all"
              />
            </div>
          </div>

          <div className="border-t border-stone-150 pt-4 flex justify-end">
            <button
              type="submit"
              disabled={loading}
              className="bg-[#6B8E23] hover:bg-[#5a7a1d] disabled:bg-stone-300 text-white px-5 py-2.5 rounded-xl text-xs font-semibold flex items-center gap-2 transition shadow-sm"
            >
              <Save className="w-4 h-4" /> {loading ? 'Saving...' : 'Save Settings'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default SettingsView;
