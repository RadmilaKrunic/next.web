export interface SnapshotItem {
  label: string;
  value: number | string;
}

export interface SnapshotProps {
  title: string;
  items: SnapshotItem[];
  buttonLabel?: string;
  onButtonClick?: () => void;
  className?: string;
}
