/** Spec attribute shapes. Types only — the reads live in attributes.server.ts. */

export interface ProductAttribute {
  key: string;
  label: string;
  unit: string | null;
  value: string;
  position: number;
}

export interface Facet {
  key: string;
  label: string;
  unit: string | null;
  values: { value: string; count: number }[];
}

