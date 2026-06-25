import { useHasPermission } from "../../hooks/useHasPermission";
import type { DashboardSlot } from "./Dashboard.types";

interface DashboardGridProps {
  readonly slots: DashboardSlot[];
  readonly emptyState?: React.ReactNode;
}

function DashboardGridSlot({ slot }: Readonly<{ slot: DashboardSlot }>) {
  const hasPermission = useHasPermission(slot.permissions ?? []);

  if (!hasPermission) return null;

  return (
    <div
      className="dashboard-grid__slot"
      data-slot-id={slot.id}
      data-testid={`dashboard-slot-${slot.id}`}
      style={{
        gridColumn: `${slot.col} / span ${slot.width}`,
        gridRow: `${slot.row} / span ${slot.height}`,
      }}
    >
      {slot.content}
    </div>
  );
}

function DashboardGrid({ slots, emptyState }: Readonly<DashboardGridProps>) {
  if (slots.length === 0) {
    return <div className="dashboard-grid dashboard-grid--empty">{emptyState}</div>;
  }

  return (
    <div className="dashboard-grid" data-testid="dashboard-grid">
      {slots.map((slot) => (
        <DashboardGridSlot key={slot.id} slot={slot} />
      ))}
    </div>
  );
}

export default DashboardGrid;
