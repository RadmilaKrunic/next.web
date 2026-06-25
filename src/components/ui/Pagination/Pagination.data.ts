export type OptionProp = {
  value: string;
  label: string;
  name: string;
};

export const defaultPageSizeOptions: OptionProp[] = [
  { value: "10", label: "10", name: "10" },
  { value: "20", label: "20", name: "20" },
  { value: "50", label: "50", name: "50" },
  { value: "100", label: "100", name: "100" },
];

export const PAGINATION_IDS = {
  CONTAINER: "pagination-container",
  LEFT_SECTION: "pagination-left-section",
  RESULTS_LABEL: "pagination-results-label",
  DROPDOWN_CONTAINER: "pagination-dropdown-container",
  SHOW_LABEL: "pagination-show-label",
  DROPDOWN: "pagination-dropdown",
  INDICATOR_SECTION: "pagination-indicator-section",
  INDICATOR: "pagination-indicator",
} as const;
