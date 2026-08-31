export interface TileProps {
  icon: string;
  value: number | string;
  label: string;
  onClick?: () => void;
  disabled?: boolean;
  className?: string;
  showArrow?: boolean;
}
