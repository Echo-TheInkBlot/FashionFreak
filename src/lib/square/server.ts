import "server-only";
import { squareConfig } from "./config";
import { squareClient } from "./client";
import { squareAfterChange } from "./sync";
import type { InventoryRepo } from "../inventory/repo";

export const SQUARE = squareConfig();
export const square = SQUARE ? squareClient(SQUARE) : null;
export const afterChangeFor = (repo: InventoryRepo) => squareAfterChange(repo, square);
