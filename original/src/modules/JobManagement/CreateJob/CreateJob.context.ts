import Field from "components/generics/Field/GenericField.types";
import { createContext } from "react";

export interface Accessory {
  assetIndex: string;
  accessoriesIndex: string;
  fields: Field[];
}

export interface CreateJobContextType {
  assetsAccessories: Accessory[];
  setAssetsAccessories: React.Dispatch<React.SetStateAction<Accessory[]>>;
  isDeletingFile?: boolean;
  setIsDeletingFile?: React.Dispatch<React.SetStateAction<boolean>>;
}

export const CreateJobContext = createContext<CreateJobContextType>({
  assetsAccessories: [],
  setAssetsAccessories: () => {},
  isDeletingFile: false,
  setIsDeletingFile: () => {},
});
