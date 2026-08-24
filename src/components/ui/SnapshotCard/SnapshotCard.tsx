import { SnapshotProps } from "./Snapshot.types";
import "./SnapshotCard.scss";
import { Button } from "@bosch/react-frok";

function SnapshotCard({
  title,
  items,
  buttonLabel,
  onButtonClick,
  className,
}: Readonly<SnapshotProps>) {
  const classes = ["snapshot", className].filter(Boolean).join(" ");

  return (
    <section className={classes}>
      <div className="snapshot__header">
        <span>{title}</span>
      </div>

      <div className="snapshot__content">
        {items.map((item) => (
          <div key={item.label} className="snapshot__row">
            <span className="snapshot__label">{item.label}</span>
            <span className="snapshot__value">{item.value}</span>
          </div>
        ))}
      </div>

      {buttonLabel && (
        <Button type="button" className="snapshot__button" onClick={onButtonClick}>
          {buttonLabel}
        </Button>
      )}
    </section>
  );
}

export default SnapshotCard;
