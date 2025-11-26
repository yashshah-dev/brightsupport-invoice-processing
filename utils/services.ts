import { asset } from '@/utils/asset';

export type ServiceCategory = 'weekday' | 'saturday' | 'sunday' | 'publicHoliday' | 'travel';

export type ServiceItem = {
  id: string;
  category: ServiceCategory;
  code: string;
  description: string;
  rate: number;
  active: boolean;
};

const STORAGE_KEY = 'services_catalog_override_v1';

export async function loadServices(): Promise<ServiceItem[]> {
  // If overrides exist (user edited), prefer them
  const override = typeof window !== 'undefined' ? localStorage.getItem(STORAGE_KEY) : null;
  if (override) {
    try {
      return JSON.parse(override) as ServiceItem[];
    } catch {}
  }
  // Else fetch default JSON from static file (PR-managed)
  const res = await fetch(asset('/data/services.json'));
  if (!res.ok) throw new Error('Failed to load services.json');
  return (await res.json()) as ServiceItem[];
}

export function saveServices(items: ServiceItem[]) {
  if (typeof window !== 'undefined') {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  }
}

export function exportServicesFile(items: ServiceItem[]) {
  const blob = new Blob([JSON.stringify(items, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `services-catalog-${new Date().toISOString()}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function createEmptyService(): ServiceItem {
  return {
    id: crypto.randomUUID(),
    category: 'weekday',
    code: '',
    description: '',
    rate: 0,
    active: true,
  };
}

export type ValidationError = { field: keyof ServiceItem | 'catalog'; message: string };

export function validateService(item: ServiceItem, existing: ServiceItem[]): ValidationError[] {
  const errors: ValidationError[] = [];
  if (!item.code || item.code.trim().length === 0) errors.push({ field: 'code', message: 'Code is required' });
  if (!item.description || item.description.trim().length === 0) errors.push({ field: 'description', message: 'Description is required' });
  if (item.rate < 0) errors.push({ field: 'rate', message: 'Rate must be non-negative' });
  if (!item.category) errors.push({ field: 'category', message: 'Category is required' });
  const dup = existing.find((e) => e.id !== item.id && e.category === item.category && e.code.trim().toLowerCase() === item.code.trim().toLowerCase());
  if (dup) errors.push({ field: 'code', message: 'Duplicate code within category' });
  return errors;
}

export function validateCatalog(items: ServiceItem[]): ValidationError[] {
  const errors: ValidationError[] = [];
  // unique (category, code) pair
  const seen = new Set<string>();
  for (const i of items) {
    const key = `${i.category}|${i.code.trim().toLowerCase()}`;
    if (seen.has(key)) errors.push({ field: 'catalog', message: `Duplicate entry: ${i.category} + ${i.code}` });
    seen.add(key);
  }
  return errors;
}

export async function importCatalog(file: File): Promise<ServiceItem[]> {
  const text = await file.text();
  const parsed = JSON.parse(text) as ServiceItem[];
  const errs = validateCatalog(parsed);
  if (errs.length > 0) {
    throw new Error(`Invalid catalog: ${errs.map(e => e.message).join('; ')}`);
  }
  saveServices(parsed);
  return parsed;
}

export function mapCategoryToCode(items: ServiceItem[]): Record<ServiceCategory, ServiceItem[]> {
  return items.reduce((acc, item) => {
    const arr = acc[item.category] ?? [];
    arr.push(item);
    acc[item.category] = arr;
    return acc;
  }, {
    weekday: [],
    saturday: [],
    sunday: [],
    publicHoliday: [],
    travel: [],
  } as Record<ServiceCategory, ServiceItem[]>);
}