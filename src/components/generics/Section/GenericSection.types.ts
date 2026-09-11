import Area from "../Area/GenericArea.types";
import { GenericActions } from "../Action/GenericAction.types";
import { DependentField } from "../Field/GenericField.types";
interface SectionMapping {
  originalName: string;
}

interface Section {
  name: string;
  isHidden: boolean;
  hiddenForStatuses?: string[];
  label: string;
  dependFieldCondition: string;
  dependentFields?: DependentField[];
  position: number;
  areas: Area[];
  actions: GenericActions[] | null;
  isSubSection: boolean;
  isAccordion: boolean;
  isTab: boolean;
  isMultiple?: boolean;
  index?: number;
  permissions?: string[];
  //calculated prop - all fields in section are disabled
  isDisabled?: boolean;
  mapping?: SectionMapping;
}

export default Section;
