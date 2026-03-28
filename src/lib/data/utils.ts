import slugify from "slugify";

export function generateSlug(name: string): string {
  const base = slugify(name, { lower: true, strict: true });
  if (!base) {
    return `company-${Date.now()}`;
  }
  return base;
}

export function todayStr(): string {
  return new Date().toISOString().split("T")[0];
}

export function toISODate(d: string | null | undefined): string {
  if (!d) return "";
  return typeof d === "string" ? d.split("T")[0] : "";
}

export function toISODateTime(d: string | null | undefined): string {
  if (!d) return "";
  if (typeof d !== "string") return "";

  const parsed = new Date(d);
  if (Number.isNaN(parsed.getTime())) return d;
  return parsed.toISOString();
}

export function isValidDateOnly(value: unknown): value is string {
  if (typeof value !== "string") return false;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;

  const parsed = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(parsed.getTime());
}

export function normalizeDateOnly(value: unknown): string | undefined {
  if (value == null || value === "") return undefined;
  if (!isValidDateOnly(value)) return undefined;
  return value;
}

export function normalizeDateTime(value: unknown): string | undefined {
  if (value == null || value === "") return undefined;
  if (typeof value !== "string") return undefined;

  const noZonePattern = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/;
  const normalized = noZonePattern.test(value) ? `${value}:00` : value;
  const parsed = new Date(normalized);

  if (Number.isNaN(parsed.getTime())) return undefined;
  return parsed.toISOString();
}
