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