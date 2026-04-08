"use client";

import React, { useEffect, useMemo, useState } from 'react';
import {
  ServiceItem,
  ServiceCategory,
  loadServices,
  saveServices,
  clearServicesOverride,
  createEmptyService,
  exportServicesFile,
  validateService,
  importCatalog,
} from '@/utils/services';

// ─── Category config ────────────────────────────────────────────────────────

type CatConfig = { value: ServiceCategory; label: string; badge: string };

const CATEGORIES: CatConfig[] = [
  { value: 'weekday',         label: 'Weekday Daytime', badge: 'bg-blue-100 text-blue-800 border-blue-200'     },
  { value: 'weekday_evening', label: 'Weekday Evening', badge: 'bg-purple-100 text-purple-800 border-purple-200' },
  { value: 'weekday_night',   label: 'Weekday Night',   badge: 'bg-slate-100 text-slate-800 border-slate-300'   },
  { value: 'saturday',        label: 'Saturday',        badge: 'bg-green-100 text-green-800 border-green-200'   },
  { value: 'sunday',          label: 'Sunday',          badge: 'bg-teal-100 text-teal-800 border-teal-200'      },
  { value: 'publicHoliday',   label: 'Public Holiday',  badge: 'bg-red-100 text-red-800 border-red-200'         },
  { value: 'travel',          label: 'Travel',          badge: 'bg-amber-100 text-amber-800 border-amber-200'   },
];

function getCat(cat: ServiceCategory): CatConfig {
  return CATEGORIES.find(c => c.value === cat) ?? { value: cat, label: cat, badge: 'bg-gray-100 text-gray-700 border-gray-200' };
}

// ─── Main component ──────────────────────────────────────────────────────────

export default function ServiceCatalogAdmin() {
  const [items, setItems]       = useState<ServiceItem[]>([]);
  const [filter, setFilter]     = useState<ServiceCategory | 'all'>('all');
  const [query, setQuery]       = useState('');
  const [editing, setEditing]   = useState<ServiceItem | null>(null);
  const [isAdding, setIsAdding] = useState(false);

  useEffect(() => {
    loadServices().then(setItems).catch(console.error);
  }, []);

  const filtered = useMemo(() =>
    items.filter(item => {
      if (filter !== 'all' && item.category !== filter) return false;
      const q = query.trim().toLowerCase();
      if (!q) return true;
      return (
        item.code.toLowerCase().includes(q) ||
        item.description.toLowerCase().includes(q) ||
        item.registrationGroupNumber.toLowerCase().includes(q) ||
        item.registrationGroupName.toLowerCase().includes(q)
      );
    }),
  [items, filter, query]);

  const counts = useMemo(() => {
    const c: Record<string, number> = { all: items.length };
    for (const cat of CATEGORIES) c[cat.value] = items.filter(i => i.category === cat.value).length;
    return c;
  }, [items]);

  function persist(next: ServiceItem[]) {
    setItems(next);
    saveServices(next);
  }

  function onAdd() {
    setEditing(createEmptyService());
    setIsAdding(true);
  }

  function onEdit(item: ServiceItem) {
    setEditing({ ...item });
    setIsAdding(false);
  }

  function onCancelEdit() {
    setEditing(null);
    setIsAdding(false);
  }

  function onDelete(id: string) {
    if (!confirm('Delete this service entry?')) return;
    persist(items.filter(i => i.id !== id));
  }

  function onToggleActive(id: string) {
    persist(items.map(i => i.id === id ? { ...i, active: !i.active } : i));
  }

  function onSave() {
    if (!editing) return;
    const errors = validateService(editing, items);
    if (errors.length > 0) {
      alert(errors.map(e => e.message).join('\n'));
      return;
    }
    const exists = items.some(i => i.id === editing.id);
    persist(exists ? items.map(i => i.id === editing.id ? editing : i) : [editing, ...items]);
    onCancelEdit();
  }

  async function onResetDefaults() {
    if (!confirm('Reset to NDIS 2025-26 VIC defaults? Your local changes will be cleared.')) return;
    clearServicesOverride();
    const fresh = await loadServices();
    setItems(fresh);
  }

  return (
    <div className="bg-white rounded-xl shadow-md overflow-hidden">

      {/* ── Header ────────────────────────────────────────────────── */}
      <div className="px-6 py-5 bg-gradient-to-r from-blue-600 to-indigo-700">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h2 className="text-lg font-bold text-white">Service Catalog</h2>
            <p className="text-blue-200 text-sm mt-0.5">
              NDIS 2025-26 &middot; VIC Price Limits &middot; {items.length} services
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={onAdd}
              className="px-3 py-1.5 bg-white text-blue-700 font-medium text-sm rounded-lg hover:bg-blue-50 transition-colors"
            >
              + Add Service
            </button>
            <button
              onClick={onResetDefaults}
              className="px-3 py-1.5 text-white text-sm rounded-lg border border-blue-400/50 bg-blue-500/40 hover:bg-blue-500/60 transition-colors"
            >
              Reset to Defaults
            </button>
            <button
              onClick={() => exportServicesFile(items)}
              className="px-3 py-1.5 text-white text-sm rounded-lg border border-blue-400/50 bg-blue-500/40 hover:bg-blue-500/60 transition-colors"
            >
              Export JSON
            </button>
            <label className="px-3 py-1.5 text-white text-sm rounded-lg border border-blue-400/50 bg-blue-500/40 hover:bg-blue-500/60 transition-colors cursor-pointer">
              Import JSON
              <input
                type="file"
                accept="application/json"
                className="hidden"
                onChange={async e => {
                  const f = e.target.files?.[0];
                  if (!f) return;
                  try {
                    const next = await importCatalog(f);
                    setItems(next);
                  } catch (err: any) {
                    alert(err?.message || 'Failed to import catalog');
                  } finally {
                    e.target.value = '';
                  }
                }}
              />
            </label>
          </div>
        </div>
      </div>

      {/* ── Filters ───────────────────────────────────────────────── */}
      <div className="px-6 py-3 border-b bg-gray-50 space-y-3">
        {/* Category tabs */}
        <div className="flex flex-wrap gap-1.5">
          <button
            onClick={() => setFilter('all')}
            className={`px-3 py-1 rounded-full text-xs font-medium border transition-all ${
              filter === 'all'
                ? 'bg-gray-800 text-white border-gray-800'
                : 'bg-white text-gray-500 border-gray-200 hover:border-gray-400'
            }`}
          >
            All <span className="ml-1 opacity-60">{counts.all}</span>
          </button>
          {CATEGORIES.map(c => (
            <button
              key={c.value}
              onClick={() => setFilter(c.value)}
              className={`px-3 py-1 rounded-full text-xs font-medium border transition-all ${
                filter === c.value
                  ? c.badge
                  : 'bg-white text-gray-500 border-gray-200 hover:border-gray-300'
              }`}
            >
              {c.label} <span className="ml-1 opacity-60">{counts[c.value] ?? 0}</span>
            </button>
          ))}
        </div>

        {/* Search */}
        <div className="relative">
          <svg className="absolute left-3 top-2.5 w-4 h-4 text-gray-400 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Search by support code, description or registration group…"
            className="w-full pl-9 pr-9 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
          {query && (
            <button onClick={() => setQuery('')} className="absolute right-3 top-2.5 text-gray-400 hover:text-gray-600">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>
      </div>

      {/* ── Add form panel ────────────────────────────────────────── */}
      {isAdding && editing && (
        <div className="px-6 py-4 bg-indigo-50 border-b border-indigo-200">
          <p className="text-xs font-semibold text-indigo-700 uppercase tracking-wide mb-3">New Service</p>
          <EditForm editing={editing} setEditing={setEditing} onSave={onSave} onCancel={onCancelEdit} />
        </div>
      )}

      {/* ── Table ─────────────────────────────────────────────────── */}
      <div className="overflow-x-auto">
        {filtered.length === 0 ? (
          <div className="py-16 text-center text-gray-400">
            <svg className="mx-auto w-10 h-10 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
            <p className="font-medium text-gray-500">No services found</p>
            <p className="text-sm mt-1">Adjust your search or filter</p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-y border-gray-200 text-xs text-gray-500 uppercase tracking-wide">
                <th className="text-left px-4 py-3 font-semibold">Support Code</th>
                <th className="text-left px-4 py-3 font-semibold">Description</th>
                <th className="text-left px-4 py-3 font-semibold">Reg. Group</th>
                <th className="text-left px-4 py-3 font-semibold">Category</th>
                <th className="text-right px-4 py-3 font-semibold">VIC Rate</th>
                <th className="text-center px-4 py-3 font-semibold">Active</th>
                <th className="text-right px-4 py-3 font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filtered.map(item => {
                const cat = getCat(item.category);
                const isEditingThis = !isAdding && editing?.id === item.id;
                return (
                  <React.Fragment key={item.id}>
                    <tr className={`transition-colors ${isEditingThis ? 'bg-blue-50' : 'hover:bg-gray-50'} ${!item.active ? 'opacity-50' : ''}`}>

                      {/* Code */}
                      <td className="px-4 py-3">
                        <span className="font-mono text-xs bg-gray-100 text-gray-800 px-2 py-1 rounded select-all">
                          {item.code}
                        </span>
                      </td>

                      {/* Description */}
                      <td className="px-4 py-3 text-gray-800 max-w-xs">
                        <span className="line-clamp-2 leading-snug">{item.description}</span>
                      </td>

                      {/* Reg group */}
                      <td className="px-4 py-3">
                        <div className="font-mono text-xs text-gray-600">{item.registrationGroupNumber}</div>
                        <div className="text-xs text-gray-400 truncate max-w-[140px] mt-0.5">{item.registrationGroupName}</div>
                      </td>

                      {/* Category */}
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${cat.badge}`}>
                          {cat.label}
                        </span>
                      </td>

                      {/* Rate */}
                      <td className="px-4 py-3 text-right font-semibold text-gray-900">
                        ${item.rate.toFixed(2)}
                      </td>

                      {/* Toggle */}
                      <td className="px-4 py-3 text-center">
                        <button
                          onClick={() => onToggleActive(item.id)}
                          title={item.active ? 'Click to deactivate' : 'Click to activate'}
                          className={`relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors ${item.active ? 'bg-blue-600' : 'bg-gray-200'}`}
                        >
                          <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow-sm transition-transform ${item.active ? 'translate-x-[18px]' : 'translate-x-[2px]'}`} />
                        </button>
                      </td>

                      {/* Actions */}
                      <td className="px-4 py-3 text-right whitespace-nowrap">
                        <button
                          onClick={() => isEditingThis ? onCancelEdit() : onEdit(item)}
                          className={`px-2.5 py-1 text-xs font-medium rounded mr-1 transition-colors ${
                            isEditingThis
                              ? 'bg-blue-600 text-white hover:bg-blue-700'
                              : 'text-blue-700 bg-blue-50 hover:bg-blue-100'
                          }`}
                        >
                          {isEditingThis ? 'Close' : 'Edit'}
                        </button>
                        <button
                          onClick={() => onDelete(item.id)}
                          className="px-2.5 py-1 text-xs font-medium text-red-700 bg-red-50 rounded hover:bg-red-100 transition-colors"
                        >
                          Delete
                        </button>
                      </td>
                    </tr>

                    {/* Inline edit expanded row */}
                    {isEditingThis && (
                      <tr>
                        <td colSpan={7} className="px-6 py-4 bg-blue-50 border-b border-blue-200">
                          <EditForm editing={editing!} setEditing={setEditing} onSave={onSave} onCancel={onCancelEdit} />
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* ── Footer ────────────────────────────────────────────────── */}
      <div className="px-6 py-3 bg-gray-50 border-t text-xs text-gray-400 flex flex-col sm:flex-row sm:justify-between gap-1">
        <span>NDIS Support Catalogue 2025-26 v1.1 &middot; VIC Price Limits &middot; Effective 24 November 2025</span>
        <span>Changes are saved locally. Export JSON to update the source catalog file.</span>
      </div>
    </div>
  );
}

// ─── Inline edit form ────────────────────────────────────────────────────────

interface EditFormProps {
  editing: ServiceItem;
  setEditing: (item: ServiceItem) => void;
  onSave: () => void;
  onCancel: () => void;
}

function EditForm({ editing, setEditing, onSave, onCancel }: EditFormProps) {
  const inp = (label: string, key: keyof ServiceItem, opts?: { mono?: boolean; wide?: boolean }) => (
    <label className={`flex flex-col gap-1 ${opts?.wide ? 'md:col-span-2' : ''}`}>
      <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">{label}</span>
      <input
        value={String(editing[key])}
        onChange={e =>
          setEditing({ ...editing, [key]: key === 'rate' ? parseFloat(e.target.value) || 0 : e.target.value })
        }
        className={`px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent ${opts?.mono ? 'font-mono' : ''}`}
      />
    </label>
  );

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
      {inp('Reg. Group Number', 'registrationGroupNumber', { mono: true })}
      {inp('Reg. Group Name', 'registrationGroupName', { wide: true })}
      {inp('Support Item Code', 'code', { mono: true })}
      {inp('Description', 'description', { wide: true })}

      <label className="flex flex-col gap-1">
        <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">Category</span>
        <select
          value={editing.category}
          onChange={e => setEditing({ ...editing, category: e.target.value as ServiceCategory })}
          className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        >
          {CATEGORIES.map(c => (
            <option key={c.value} value={c.value}>{c.label}</option>
          ))}
        </select>
      </label>

      <label className="flex flex-col gap-1">
        <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">Rate (AUD)</span>
        <input
          type="number"
          step="0.01"
          min="0"
          value={editing.rate}
          onChange={e => setEditing({ ...editing, rate: parseFloat(e.target.value) || 0 })}
          className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
      </label>

      <label className="flex items-center gap-2 self-end pb-1.5">
        <input
          type="checkbox"
          checked={editing.active}
          onChange={e => setEditing({ ...editing, active: e.target.checked })}
          className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
        />
        <span className="text-sm text-gray-700">Active</span>
      </label>

      <div className="md:col-span-3 flex gap-2 pt-2 border-t border-blue-200 mt-1">
        <button
          onClick={onSave}
          className="px-4 py-1.5 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
        >
          Save
        </button>
        <button
          onClick={onCancel}
          className="px-4 py-1.5 bg-white text-gray-700 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
