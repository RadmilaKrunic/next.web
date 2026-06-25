import { GenericActions } from "../Action/GenericAction";
import Section from "../Section/GenericSection.types";

export interface ActionMandatoryFields {
  fieldList?: string[];
  section?: Section;
}

interface GenericForm {
  name: string;
  formGroup: string;
  position: number;
  sections: Section[];
  actions: GenericActions[] | null;
  permissions?: string[];
}

export default GenericForm;
