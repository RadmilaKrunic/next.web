export interface AnswerOption {
  value: string;
  label: string;
}

export const CUSTOMER_ANSWER_OPTIONS: AnswerOption[] = [
  { value: "REPAIR", label: "REPAIR" },
  { value: "RETURN_ASSEMBLY", label: "RETURN_ASSEMBLY" },
  { value: "RETURN_UNASSEMBLY", label: "RETURN_UNASSEMBLY" },
  { value: "SCRAP_TOOL", label: "SCRAP_TOOL" },
  { value: "EXCHANGE", label: "EXCHANGE" },
];

export const APPROVER_ANSWER_OPTIONS: AnswerOption[] = [
  { value: "approve", label: "approve" },
  { value: "reject", label: "reject" },
];
