import { Icon } from "@bosch/react-frok";
import StatusIndicator from "components/ui/StatusIndicator/StatusIndicator";
import "./OverviewHeader.scss";
import { Link } from "react-router-dom";
import { OverviewHeaderProps } from "./OverviewHeader.types";
import TechnicianSelect from "./TechnicianSelect/TechnicianSelect";
import { useTranslation } from "react-i18next";
import { useHasPermission } from "hooks/useHasPermission";
import { PERMISSIONS } from "utils/Permissions";

const TECHNICIAN_SELECT_DISABLED_STATUSES = new Set(["REPAIR_DONE", "SCRAP_TOOL", "DELIVERED"]);

function OverviewHeader({
  type,
  id,
  idLabel,
  createdAt,
  createdAtLabel,
  historyLink,
  items,
  technicianSelectProps,
  assigneeInfo,
  status,
  showStatus,
  ascName,
  isDisabled = false,
}: Readonly<OverviewHeaderProps>) {
  const { t } = useTranslation("translation", { keyPrefix: "app" });
  const canAssignTechnician = useHasPermission([
    PERMISSIONS.ORDER.CAN_ASSIGN_TECHNICIAN,
    PERMISSIONS.ORDER.CAN_ASSIGN_SELF,
  ]);
  const isTechnicianSelectDisabled =
    isDisabled || (!!status && TECHNICIAN_SELECT_DISABLED_STATUSES.has(status));
  const resolveName = (name: string | null | undefined) =>
    name && name !== "un-assigned" ? name : t("unassigned");

  function renderSummaryBlock() {
    if (canAssignTechnician && technicianSelectProps) {
      return (
        <div className="header-item">
          <Icon iconName="user" className="item-icon" />
          <div className="item-content">
            <TechnicianSelect
              assigneeName={technicianSelectProps.assigneeName}
              ascId={technicianSelectProps.ascId}
              jobId={technicianSelectProps.jobId}
              disabled={isTechnicianSelectDisabled}
            />
          </div>
        </div>
      );
    }
    if (!canAssignTechnician && ascName && type === "claim") {
      return (
        <div className="header-item">
          <Icon iconName="building" className="item-icon" />
          <div className="item-content">
            <div className="item-title">{ascName}</div>
          </div>
        </div>
      );
    }
    if (assigneeInfo) {
      return (
        <div className="header-item">
          <Icon iconName={assigneeInfo.icon} className="item-icon" />
          <div className="item-content">
            <div className="item-title">{resolveName(assigneeInfo.name)}</div>
            {assigneeInfo.subtitle && <div className="item-subtitle">{assigneeInfo.subtitle}</div>}
          </div>
        </div>
      );
    }
    return null;
  }

  return (
    <div className="overview-header">
      <div className="overview-meta">
        <div className="overview-info">
          <div className="overview-id">
            {idLabel} ({id})
          </div>
          <div className="overview-creation-date">
            {createdAtLabel}: {createdAt}
          </div>
        </div>
        {historyLink && <Link to={historyLink.href}>{historyLink.label}</Link>}
      </div>
      <div className="header-summary">
        {items.map((item) => (
          <div key={`${item.icon}-${item.title}`} className="header-item">
            <Icon iconName={item.icon} className="item-icon" />
            <div className="item-content">
              <div className="item-title">{item.title}</div>
              {item.subtitle && <div className="item-subtitle">{item.subtitle}</div>}
            </div>
          </div>
        ))}
        {showStatus && status && (
          <div className="header-item">
            <StatusIndicator status={status} showStatusMessage={true} type={type} />
          </div>
        )}
        {renderSummaryBlock()}
      </div>
    </div>
  );
}

export default OverviewHeader;
