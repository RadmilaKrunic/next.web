import { Icon } from "@bosch/react-frok";
import { TileProps } from "./Tile.types";
import "./Tile.scss";

function Tile({
  icon,
  value,
  label,
  onClick,
  disabled,
  className,
  showArrow = true,
}: Readonly<TileProps>) {
  const classes = ["tile", disabled && "tile--disabled", className].filter(Boolean).join(" ");

  return (
    <button className={classes} onClick={onClick} disabled={disabled} type="button">
      <div className="tile__header">
        <Icon iconName={icon} className="tile__icon" aria-hidden="true" />
        <span className="tile__value">{value}</span>
      </div>
      <div className="tile__footer">
        <span className="tile__label">{label}</span>
        {showArrow && <Icon iconName="forward-right" className="tile__arrow" aria-hidden="true" />}
      </div>
    </button>
  );
}

export default Tile;
