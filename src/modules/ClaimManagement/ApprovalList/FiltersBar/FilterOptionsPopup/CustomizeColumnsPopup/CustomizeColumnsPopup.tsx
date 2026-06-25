import { Button, Checkbox, Popover } from "@bosch/react-frok";
import { useTranslation } from "react-i18next";
import { useState, useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  ApprovalColumnKey,
  getApprovalColumns,
} from "../../../ApprovalListTable/ApprovalListColumns.config";
import {
  saveVisibleColumns,
  isColumnDisabled,
  getDefaultFixedColumns,
  type ApprovalColumnConfiguration,
} from "../../../ApprovalList.columns.utils";

type CustomizeColumnsPopupProps = {
  columnConfig: ApprovalColumnConfiguration[];
  setColumnConfig: (config: ApprovalColumnConfiguration[]) => void;
};

function CustomizeColumnsPopup({
  columnConfig,
  setColumnConfig,
}: Readonly<CustomizeColumnsPopupProps>) {
  const { t } = useTranslation("translation", { keyPrefix: "app" });
  const queryClient = useQueryClient();
  const [isOpen, setIsOpen] = useState(false);

  const [pendingConfig, setPendingConfig] = useState<ApprovalColumnConfiguration[]>(columnConfig);

  useEffect(() => {
    setPendingConfig(columnConfig);
  }, [columnConfig]);

  const handleCheckboxChange = (columnKey: ApprovalColumnKey, checked: boolean) => {
    setPendingConfig((prev) =>
      prev.map((col) => (col.key === columnKey ? { ...col, isChecked: checked } : col)),
    );
  };

  const handleSave = async () => {
    const previousConfig = columnConfig;
    setColumnConfig(pendingConfig);
    setIsOpen(false);
    try {
      await saveVisibleColumns(pendingConfig);
      void queryClient.invalidateQueries({ queryKey: ["user"] });
    } catch (error) {
      console.error("Failed to save column preferences:", error);
      setColumnConfig(previousConfig);
    }
  };

  const handleReset = (e: React.MouseEvent) => {
    e.stopPropagation();
    setPendingConfig(getDefaultFixedColumns());
  };

  return (
    <Popover
      position="left-center"
      data-testid="customize-columns-popover"
      isPopoverArrowMissing={true}
      className="customize-columns-popup"
      open={isOpen}
      onOutsideClick={() => setIsOpen(false)}
      trigger={
        <Button
          icon="settings-editor"
          mode="integrated"
          as="button"
          className="popover-button-primary"
          onClick={() => setIsOpen(!isOpen)}
        >
          {t("customizeColumns")}
        </Button>
      }
    >
      <div>
        <div className="header-text">{t("customizeColumnsPopupHeader")}</div>
        <div className="customize-columns-popup-content">
          {pendingConfig
            .toSorted((a, b) => a.order - b.order)
            .map((config) => {
              const isChecked = config.isChecked;
              const isDisabled = isColumnDisabled(config.key, pendingConfig);

              return (
                <Checkbox
                  key={config.key}
                  id={config.key}
                  label={`${getApprovalColumns(t)[config.key].label}`}
                  value={config.key}
                  checked={isChecked}
                  disabled={isDisabled}
                  onChange={(e) => {
                    handleCheckboxChange(config.key, e.target.checked);
                  }}
                />
              );
            })}
        </div>
        <div className="filters-buttons">
          <Button
            icon="reset"
            data-testid="reset-columns-button"
            mode="integrated"
            label={t("resetAllFilters")}
            onClick={handleReset}
          />
          <Button
            mode="secondary"
            data-testid="save-columns-button"
            label={t("save")}
            onClick={() => {
              void handleSave();
            }}
          />
        </div>
      </div>
    </Popover>
  );
}

export default CustomizeColumnsPopup;
