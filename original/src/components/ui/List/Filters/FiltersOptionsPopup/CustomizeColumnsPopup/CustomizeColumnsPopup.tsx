import { Button, Checkbox, Popover } from "@bosch/react-frok";
import { useTranslation } from "react-i18next";
import { useState, useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";

type ColumnOptionConfig<K extends string> = {
  key: K;
  label: string;
};

type ColumnConfigBase<K extends string> = {
  key: K;
  isChecked: boolean;
  order: number;
};

type CustomizeColumnsPopupProps<K extends string, C extends ColumnConfigBase<K>> = {
  columnConfig: C[];
  setColumnConfig: (config: C[]) => void;
  getColumnOptions: (t: (key: string) => string) => Record<K, ColumnOptionConfig<K>>;
  isColumnDisabled: (columnKey: K, config: C[]) => boolean;
  getDefaultFixedColumns: () => C[];
  saveVisibleColumns: (config: C[]) => Promise<void>;
  saveErrorMessage: string;
  type?: "claims" | "jobs";
  isExportOpen?: boolean;
  setIsExportOpen?: (isOpen: boolean) => void;
};

function CustomizeColumnsPopup<K extends string, C extends ColumnConfigBase<K>>({
  columnConfig,
  setColumnConfig,
  getColumnOptions,
  isColumnDisabled,
  getDefaultFixedColumns,
  saveVisibleColumns,
  saveErrorMessage,
  type,
  isExportOpen,
}: Readonly<CustomizeColumnsPopupProps<K, C>>) {
  const { t } = useTranslation("translation", { keyPrefix: "app" });
  const queryClient = useQueryClient();
  const [isOpen, setIsOpen] = useState(false);

  const [pendingConfig, setPendingConfig] = useState<C[]>(columnConfig);

  useEffect(() => {
    setPendingConfig(columnConfig);
  }, [columnConfig]);

  const handleCheckboxChange = (columnKey: K, checked: boolean) => {
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
      console.error(saveErrorMessage, error);
      setColumnConfig(previousConfig);
    }
  };

  const handleReset = (e: React.MouseEvent) => {
    e.stopPropagation();
    setPendingConfig(getDefaultFixedColumns());
  };

  const columnOptions = getColumnOptions(t);
  const headerKey =
    type === "claims" ? "customizeColumnsClaimPopupHeader" : "customizeColumnsPopupHeader";

  return (
    <Popover
      position="left-center"
      data-testid="customize-columns-popover"
      isPopoverArrowMissing={true}
      className={`customize-columns-popup ${isExportOpen ? "export-open" : ""}`}
      open={isOpen || isExportOpen}
      onOutsideClick={() => {
        setIsOpen(false);
      }}
      trigger={
        <div className="list-popover-buttons">
          <Button
            icon="settings-editor"
            mode="integrated"
            as="button"
            className="popover-button-primary"
            onClick={() => setIsOpen(!isOpen)}
          >
            {t("customizeColumns")}
          </Button>
        </div>
      }
    >
      {isOpen && (
        <div>
          <div className="header-text">{t(headerKey)}</div>
          <div className="customize-columns-popup-content">
            {pendingConfig
              .toSorted((a, b) => a.order - b.order)
              .map((config) => {
                const isChecked = config.isChecked;
                const disabled = isColumnDisabled(config.key, pendingConfig);

                return (
                  <Checkbox
                    key={config.key}
                    id={config.key}
                    label={`${columnOptions[config.key]?.label}`}
                    value={config.key}
                    checked={isChecked}
                    disabled={disabled}
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
      )}
    </Popover>
  );
}

export default CustomizeColumnsPopup;
