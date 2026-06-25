import Section from "components/generics/Section/GenericSection.types";
import { Filter } from "../../List.types";

export type FiltersPopupProps = {
  filters: Section;
  applyAdvancedFilters?: (filters: Filter[]) => void;
  resetAdvancedFilters?: () => void;
  activeFilters?: Filter[];
  type?: "job" | "claim" | "approval" | "employee";
};
