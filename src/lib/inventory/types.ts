export const CATEGORIES = [
  "dresses", "tops", "denim", "jackets", "accessories", "jewelry", "vintage", "shoes",
] as const;
export type Category = (typeof CATEGORIES)[number];

export type ProductStatus = "available" | "sold" | "hidden";
export type InventoryMethod = "barcode" | "photo_ai" | "manual" | "pos_webhook" | "undo";

export interface Product {
  id: string;
  sku: string;
  name: string;
  description: string;
  category: Category;
  size: string | null;
  color: string | null;
  tags: string[];
  price_cents: number;
  quantity: number;
  status: ProductStatus;
  is_one_of_a_kind: boolean;
  photos: string[];
  ai_description: string | null;
  created_at: string;
  updated_at: string;
  sold_at: string | null;
}

export interface InventoryEvent {
  id: string;
  product_id: string;
  change: number;
  quantity_before: number;
  quantity_after: number;
  status_before: ProductStatus;
  status_after: ProductStatus;
  method: InventoryMethod;
  confidence: number | null;
  note: string | null;
  staff_user: string | null;
  undoes_event_id: string | null;
  undone_by_event_id: string | null;
  created_at: string;
}

export interface StoreSettings {
  sold_visible_days: number;
  ai_confidence_threshold: number;
  low_stock_threshold: number;
}

export const DEFAULT_SETTINGS: StoreSettings = {
  sold_visible_days: 3,
  ai_confidence_threshold: 0.85,
  low_stock_threshold: 1,
};
