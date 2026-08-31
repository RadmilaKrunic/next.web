const CLAIM_MESSAGE_TYPES = new Set(["CLAIM_OVERALL_DECISION", "CLAIM_LINE_ITEM", "GENERAL_CLAIM"]);

export function getMessageCategory(messageType: string): "job" | "claim" {
  if (CLAIM_MESSAGE_TYPES.has(messageType)) return "claim";
  return "job";
}
