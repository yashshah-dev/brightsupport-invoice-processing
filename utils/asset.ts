export const BASE_PATH = process.env.NODE_ENV === 'production' ? '/brightsupport-invoice-processing' : '';

export function asset(path: string): string {
  const p = path.startsWith('/') ? path : `/${path}`;
  return `${BASE_PATH}${p}`;
}
