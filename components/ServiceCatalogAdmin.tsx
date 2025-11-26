"use client";

import React, { useEffect, useMemo, useState } from 'react';
import { ServiceItem, loadServices, saveServices, createEmptyService, exportServicesFile, ServiceCategory } from '@/utils/services';

const categories: { value: ServiceCategory; label: string }[] = [
  { value: 'weekday', label: 'Weekday' },
  { value: 'saturday', label: 'Saturday' },
  { value: 'sunday', label: 'Sunday' },
  { value: 'publicHoliday', label: 'Public Holiday' },
  { value: 'travel', label: 'Travel' },
];

export default function ServiceCatalogAdmin() {
  const [items, setItems] = useState<ServiceItem[]>([]);
  const [filter, setFilter] = useState<ServiceCategory | 'all'>('all');
  const [query, setQuery] = useState('');
  const [editing, setEditing] = useState<ServiceItem | null>(null);

  useEffect(() => {
    loadServices().then(setItems).catch(console.error);
  }, []);

  const filtered = useMemo(() => {
    return items.filter(i => {
      const matchesCat = filter === 'all' ? true : i.category === filter;
      const q = query.trim().toLowerCase();
      const matchesQ = q.length === 0 || i.code.toLowerCase().includes(q) || i.description.toLowerCase().includes(q);
      return matchesCat && matchesQ;
    });
  }, [items, filter, query]);

  function onAdd() {
    const newItem = createEmptyService();
    setEditing(newItem);
  }

  function onEdit(item: ServiceItem) {
    setEditing({ ...item });
  }

  function onDelete(id: string) {
    const next = items.filter(i => i.id !== id);
    setItems(next);
    saveServices(next);
  }

  function onSaveEditing() {
    if (!editing) return;
    const { validateService } = require('@/utils/services');
    const errors = validateService(editing, items);
    if (errors.length > 0) {
      alert(errors.map((e: any) => `${String(e.field)}: ${e.message}`).join('\n'));
      return;
    }
    const exists = items.some(i => i.id === editing.id);
    const next = exists ? items.map(i => (i.id === editing.id ? editing : i)) : [editing, ...items];
    setItems(next);
    saveServices(next);
    setEditing(null);
  }

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <div className="flex flex-col sm:flex-row gap-3 items-center justify-between mb-4">
        <div className="flex gap-2 items-center">
          <select value={filter} onChange={e => setFilter(e.target.value as any)} className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent">
            <option value="all">All Categories</option>
            {categories.map(c => (
              <option key={c.value} value={c.value}>{c.label}</option>
            ))}
          </select>
          <input
            placeholder="Search code/description"
            value={query}
            onChange={e => setQuery(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent w-64"
          />
        </div>
        <div className="flex gap-2">
          <button onClick={onAdd} className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">Add Service</button>
          <button onClick={() => exportServicesFile(items)} className="px-4 py-2 bg-gray-700 text-white rounded hover:bg-gray-800">Export JSON</button>
          <label className="px-4 py-2 bg-gray-200 text-gray-800 rounded hover:bg-gray-300 cursor-pointer">
            Import JSON
            <input type="file" accept="application/json" className="hidden" onChange={async (e) => {
              const f = e.target.files?.[0];
              if (!f) return;
              try {
                const { importCatalog } = await import('@/utils/services');
                const next = await importCatalog(f);
                setItems(next);
              } catch (err: any) {
                alert(err?.message || 'Failed to import catalog');
              } finally {
                e.target.value = '';
              }
            }} />
          </label>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-100 border-b">
              <th className="text-left p-2">Category</th>
              <th className="text-left p-2">Code</th>
              <th className="text-left p-2">Description</th>
              <th className="text-right p-2">Rate (AUD)</th>
              <th className="text-center p-2">Active</th>
              <th className="text-right p-2">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(item => (
              <tr key={item.id} className="border-b">
                <td className="p-2 capitalize">{item.category.replace(/([A-Z])/g, ' $1').toLowerCase()}</td>
                <td className="p-2 font-mono text-xs">{item.code}</td>
                <td className="p-2">{item.description}</td>
                <td className="p-2 text-right">{item.rate.toFixed(2)}</td>
                <td className="p-2 text-center">{item.active ? 'Yes' : 'No'}</td>
                <td className="p-2 text-right">
                  <button onClick={() => onEdit(item)} className="px-3 py-1 bg-blue-500 text-white rounded mr-2">Edit</button>
                  <button onClick={() => onDelete(item.id)} className="px-3 py-1 bg-red-600 text-white rounded">Delete</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {editing && (
        <div className="mt-6 border rounded p-4">
          <h3 className="font-semibold mb-3">Edit Service</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <label className="flex flex-col">
              <span className="text-xs text-gray-600">Category</span>
              <select value={editing.category} onChange={e => setEditing({ ...editing, category: e.target.value as ServiceCategory })} className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent">
                {categories.map(c => (
                  <option key={c.value} value={c.value}>{c.label}</option>
                ))}
              </select>
            </label>
            <label className="flex flex-col">
              <span className="text-xs text-gray-600">Code</span>
              <input value={editing.code} onChange={e => setEditing({ ...editing, code: e.target.value })} className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
            </label>
            <label className="flex flex-col md:col-span-2">
              <span className="text-xs text-gray-600">Description</span>
              <input value={editing.description} onChange={e => setEditing({ ...editing, description: e.target.value })} className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
            </label>
            <label className="flex flex-col">
              <span className="text-xs text-gray-600">Rate (AUD)</span>
              <input type="number" step="0.01" value={editing.rate} onChange={e => setEditing({ ...editing, rate: parseFloat(e.target.value) || 0 })} className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
            </label>
            <label className="flex items-center gap-2">
              <input type="checkbox" checked={editing.active} onChange={e => setEditing({ ...editing, active: e.target.checked })} />
              <span>Active</span>
            </label>
          </div>
          <div className="mt-4 flex gap-2">
            <button onClick={onSaveEditing} className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700">Save</button>
            <button onClick={() => setEditing(null)} className="px-4 py-2 bg-gray-300 rounded hover:bg-gray-400">Cancel</button>
          </div>
          <p className="mt-3 text-xs text-gray-600">Note: Changes are stored locally. Use "Export JSON" to download and raise a PR to update <code>data/services.json</code>.</p>
        </div>
      )}
    </div>
  );
}
