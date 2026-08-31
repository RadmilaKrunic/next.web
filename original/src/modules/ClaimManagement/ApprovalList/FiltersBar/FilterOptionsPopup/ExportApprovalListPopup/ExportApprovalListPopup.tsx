import { Button, Popover } from "@bosch/react-frok";
import { useState } from "react";
import { useTranslation } from "react-i18next";

function ExportApprovalListPopup() {
  const [isOpen, setIsOpen] = useState(false);
  const { t } = useTranslation("translation", { keyPrefix: "app" });
  return (
    <Popover
      position="left-top"
      data-testid="export-approval-list-popover"
      isPopoverArrowMissing={true}
      open={isOpen}
      className="export-list-popover"
      onOutsideClick={() => setIsOpen(false)}
      trigger={
        <Button
          className="popover-button-secondary"
          icon="export"
          mode="integrated"
          as="button"
          onClick={() => setIsOpen(!isOpen)}
        >
          {t("exportJobList")}
        </Button>
      }
    >
      <Button className="popover-button-primary" mode="integrated" as="button">
        {t("exportAsXslx")}
      </Button>
      <hr className="popover-divider" />
      <Button className="popover-button-secondary" mode="integrated" as="button">
        {t("exportAsCsv")}
      </Button>
    </Popover>
  );
}

export default ExportApprovalListPopup;
