export function formatSubtext(s1?: string, s2?: string, s3?: string): string {
  const a = (s1 ?? "").trim();
  const b = (s2 ?? "").trim();
  const c = (s3 ?? "").trim();
  const left = a || b;
  if (left && c) return `${left} | ${c}`;
  if (left) return left;
  return c;
}
