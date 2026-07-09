export function formatNaira(amount: number): string {
  return new Intl.NumberFormat('en-NG', {
    style: 'currency',
    currency: 'NGN',
    minimumFractionDigits: 0,
  }).format(amount);
}

export function formatPhoneNG(phone: string): string {
  const cleaned = phone.replace(/\D/g, '');
  if (cleaned.startsWith('0') && cleaned.length === 11) {
    return '+234' + cleaned.slice(1);
  }
  if (cleaned.startsWith('234') && cleaned.length === 13) {
    return '+' + cleaned;
  }
  return phone;
}

export function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export function interpolateTemplate(
  template: string,
  vars: Record<string, string>,
): string {
  return template.replace(/\{\{(\w+)\}\}/g, (_, key) => vars[key] ?? '');
}

export function paginate<T>(
  data: T[],
  page: number,
  limit: number,
) {
  const total = data.length;
  const start = (page - 1) * limit;
  return {
    data: data.slice(start, start + limit),
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
  };
}
