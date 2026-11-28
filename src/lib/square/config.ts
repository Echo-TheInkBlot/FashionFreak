/** Square settings from env. Square is optional: without a token the app runs and simply skips syncing. */
export interface SquareConfig {
  token: string;
  environment: "sandbox" | "production";
  locationId: string;
  webhookSignatureKey: string;
  webhookUrl: string;     // must match the URL registered in the Square Developer Dashboard exactly
  apiVersion: string;
}

export function squareConfig(env: Record<string, string | undefined> = process.env): SquareConfig | null {
  if (!env.SQUARE_ACCESS_TOKEN || !env.SQUARE_LOCATION_ID) return null;
  return {
    token: env.SQUARE_ACCESS_TOKEN,
    environment: env.SQUARE_ENVIRONMENT === "production" ? "production" : "sandbox",
    locationId: env.SQUARE_LOCATION_ID,
    webhookSignatureKey: env.SQUARE_WEBHOOK_SIGNATURE_KEY ?? "",
    webhookUrl: env.SQUARE_WEBHOOK_URL ?? "",
    apiVersion: env.SQUARE_API_VERSION ?? "2025-10-16",
  };
}

export const squareBaseUrl = (c: Pick<SquareConfig, "environment">) =>
  c.environment === "production" ? "https://connect.squareup.com" : "https://connect.squareupsandbox.com";
