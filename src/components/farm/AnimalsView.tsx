import React, { useState, useMemo } from 'react';
import { Animal, formatCurrency, calcAnimalROI } from '@/lib/farmData';
import { Search, Plus, Filter, Camera, Tag, Calendar, TrendingUp } from 'lucide-react';

interface Props {
  animals: Animal[];
  onAdd: () => void;
  onSelect: (a: Animal) => void;
}

const AnimalsView: React.FC<Props> = ({ animals, onAdd, onSelect }) => {
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<'All' | 'Active' | 'Sold' | 'Sheep' | 'Goat' | 'Cow' | 'Country Chicken'>('All');

  const filtered = useMemo(() => {
    return animals.filter((a) => {
      const q = query.toLowerCase();
      const matchQ =
        !q ||
        a.name.toLowerCase().includes(q) ||
        a.tagId.toLowerCase().includes(q) ||
        a.breed.toLowerCase().includes(q);
      const matchF =
        filter === 'All' ||
        (filter === 'Active' && a.status === 'Active') ||
        (filter === 'Sold' && a.status === 'Sold') ||
        (filter === 'Sheep' && a.species === 'Sheep') ||
        (filter === 'Goat' && a.species === 'Goat') ||
        (filter === 'Cow' && a.species === 'Cow') ||
        (filter === 'Country Chicken' && a.species === 'Country Chicken');
      return matchQ && matchF;
    });
  }, [animals, query, filter]);

  const filters: typeof filter[] = ['All', 'Active', 'Sold', 'Sheep', 'Goat', 'Cow', 'Country Chicken'];

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold text-stone-800">Livestock Registry</h1>
          <p className="text-stone-500 mt-1">{filtered.length} of {animals.length} animals</p>
        </div>
        <button
          onClick={onAdd}
          className="inline-flex items-center gap-2 bg-[#6B8E23] hover:bg-[#5a7a1d] text-white px-4 py-2.5 rounded-xl text-sm font-medium shadow-sm transition"
        >
          <Plus className="w-4 h-4" /> Add Animal
        </button>
      </div>

      <div className="bg-white rounded-2xl border border-stone-200 p-4 flex flex-col sm:flex-row gap-3">
        <div className="flex-1 relative">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
          <input
            type="text"
            placeholder="Search by name, tag ID, or breed..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-2.5 rounded-lg border border-stone-200 bg-stone-50 focus:bg-white focus:border-[#6B8E23] focus:ring-2 focus:ring-[#6B8E23]/20 outline-none text-sm"
          />
        </div>
        <div className="flex gap-2 overflow-x-auto">
          {filters.map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition ${
                filter === f
                  ? 'bg-[#6B8E23] text-white'
                  : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
              }`}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {filtered.map((a) => {
          const lastWeight = a.weights[a.weights.length - 1]?.weightKg || 0;
          const firstWeight = a.weights[0]?.weightKg || 0;
          const gain = lastWeight - firstWeight;
          const roi = calcAnimalROI(a);
          return (
            <button
              key={a.id}
              onClick={() => onSelect(a)}
              className="bg-white rounded-2xl border border-stone-200 overflow-hidden text-left hover:shadow-lg hover:-translate-y-0.5 transition group"
            >
              <div className="relative h-40 overflow-hidden bg-stone-100">
                <img
                  src={a.photoUrl}
                  alt={a.name}
                  className="w-full h-full object-cover group-hover:scale-105 transition duration-300"
                />
                <div className="absolute top-2 left-2 flex gap-1.5">
                  <span
                    className={`text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-md ${
                      a.status === 'Active'
                        ? 'bg-emerald-500 text-white'
                        : a.status === 'Sold'
                        ? 'bg-stone-600 text-white'
                        : 'bg-red-500 text-white'
                    }`}
                  >
                    {a.status}
                  </span>
                  <span className="text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-md bg-white/90 text-stone-700">
                    {a.species}
                  </span>
                </div>
                <div className="absolute bottom-2 right-2 bg-black/60 backdrop-blur text-white text-xs px-2 py-0.5 rounded-md flex items-center gap-1">
                  <Camera className="w-3 h-3" /> {a.photos.length}
                </div>
              </div>
              <div className="p-4 space-y-2">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="font-bold text-stone-800">{a.name}</div>
                    <div className="text-xs text-stone-500 flex items-center gap-1">
                      <Tag className="w-3 h-3" /> {a.tagId} · {a.breed}
                    </div>
                  </div>
                  <span className="text-[10px] font-semibold text-stone-500 bg-stone-100 px-1.5 py-0.5 rounded">
                    {a.sex === 'Male' ? '♂' : '♀'} {a.sex}
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-2 pt-2 border-t border-stone-100">
                  <div>
                    <div className="text-[10px] uppercase text-stone-400 font-semibold">Weight</div>
                    <div className="text-sm font-bold text-stone-800">{lastWeight.toFixed(1)} kg</div>
                    <div className="text-[10px] text-emerald-600 flex items-center gap-0.5">
                      <TrendingUp className="w-2.5 h-2.5" /> +{gain.toFixed(1)} kg
                    </div>
                  </div>
                  <div>
                    <div className="text-[10px] uppercase text-stone-400 font-semibold">
                      {a.status === 'Sold' ? 'ROI' : 'Cost'}
                    </div>
                    <div className="text-sm font-bold text-stone-800">
                      {a.status === 'Sold'
                        ? formatCurrency(roi)
                        : formatCurrency(a.acquisitionCost)}
                    </div>
                    <div className="text-[10px] text-stone-500 flex items-center gap-0.5">
                      <Calendar className="w-2.5 h-2.5" /> {a.acquisitionDate.slice(0, 7)}
                    </div>
                  </div>
                </div>
              </div>
            </button>
          );
        })}
      </div>

      {filtered.length === 0 && (
        <div className="bg-white rounded-2xl border border-stone-200 p-12 text-center">
          <Filter className="w-10 h-10 text-stone-300 mx-auto mb-3" />
          <div className="font-medium text-stone-700">No animals match your filters</div>
          <div className="text-sm text-stone-500 mt-1">Try adjusting your search or filter</div>
        </div>
      )}
    </div>
  );
};

export default AnimalsView;
