export interface SparePartListItem {
  partNumber: string;
  partNumberFormatted: string;
  partName: string;
  position: string;
  quantity: number;
  price: number;
  multiple?: boolean;
  posxmax: number;
  posxmin: number;
  posymax: number;
  posymin: number;
  illustrationNumber?: string;
  highlight?: boolean;
  style?: {
    width: string;
    height: string;
    left: string;
    top: string;
  };
  styleTooltip?: {
    left: string;
    top: string;
    height: string;
    right?: string;
  };
}

export interface IllustrationItem {
  page: number;
  ImagePath: string;
}

export interface SparePartIllustration {
  currentIllustrationPath: string;
  currentIllustrationPage: number;
  illustrationList: IllustrationItem[];
  list: SparePartListItem[];
}

export interface PositionItem {
  partNumber: string;
  type: string;
  partName: string;
  positionType: string;
  position: string;
  quantity: number;
  unitPrice: number;
}
