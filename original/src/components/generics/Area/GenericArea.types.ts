import Field, { DependentField } from "../Field/GenericField.types";
import { GenericActions } from "../Action/GenericAction.types";

interface Area {
  name: string;
  label: string;
  position: number;
  fields: Field[];
  dependFieldCondition: string;
  dependentFields: DependentField[];
  actions: GenericActions[] | null;
  isSubArea: boolean;
  index?: number;
  isMultiple?: boolean;
  hiddenForStatuses?: string[];
  permissions?: string[];
  //calculated prop - all fields in area are disabled
  isDisabled?: boolean;
}

export default Area;
