import Section from "components/generics/Section/GenericSection.types";
import { Filter, QuickFilter } from "../List.types";

export type FiltersBarProps = {
  quickFilters?: QuickFilter[];
  filters?: Section;
  onToggleFilter?: (key: string) => void;
  searchValue?: string;
  onSearchChange?: (value: string) => void;
  onSearchReset?: () => void;
  actionButton?: {
    label: string;
    icon?: string;
    onClick: () => void;
    disabled?: boolean;
  };
  applyAdvancedFilters?: (filters: Filter[]) => void;
  resetAdvancedFilters?: () => void;
  optionsContent?: React.ReactNode;
  type?: "job" | "claim" | "approval" | "employee";
};
