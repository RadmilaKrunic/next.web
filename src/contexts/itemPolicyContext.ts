import { createContext, useContext } from "react";
import type { ItemPolicy } from "api/services/itemPolicy/itemPolicy.types";

/** Null until the policy is fetched, or when backend-driven diagnostics is off. */
export const ItemPolicyContext = createContext<ItemPolicy | null>(null);

export const useItemPolicy = (): ItemPolicy | null => useContext(ItemPolicyContext);
