/**
 * Checkout seam. The demo uses "in-store" mode: no cart, just "Come find it in store" and "Ask about this item".
 * To add online checkout later, implement CheckoutProvider for Stripe or Square (create a checkout session in an
 * API route, then call recordSale(..., method: "pos_webhook") from the payment webhook) and switch ACTIVE_PROVIDER.
 */
import type { Product } from "../inventory/types";

export interface CheckoutAction {
  label: string;
  href: string;
  kind: "primary" | "secondary";
}

export interface CheckoutProvider {
  id: "in_store" | "stripe" | "square";
  actionsFor(product: Product): CheckoutAction[];
}

const inStore: CheckoutProvider = {
  id: "in_store",
  actionsFor: (p) => [
    { label: "Ask about this item", href: `/contact?item=${encodeURIComponent(p.sku)}`, kind: "primary" },
    { label: "Come find it in store", href: "/visit", kind: "secondary" },
  ],
};

export const ACTIVE_PROVIDER: CheckoutProvider = inStore;
