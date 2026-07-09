/** Reads a page number from the URL; anything that isn't a positive integer means page 1. */
export function parsePage(value: string | null): number {
  const page = Number(value ?? 1);
  return Number.isInteger(page) && page >= 1 ? page : 1;
}

/** Reads an id such as `?collection=3`; anything that isn't a positive integer is ignored. */
export function parseId(value: string | null): number | null {
  if (!value) return null;
  const id = Number(value);
  return Number.isInteger(id) && id >= 1 ? id : null;
}
