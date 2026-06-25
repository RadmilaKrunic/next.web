import { Icon, Popover } from "@bosch/react-frok";
import "./AccountManagement.scss";
import { useState } from "react";
import PopoverContent from "./PopoverContent/PopoverContent";
import { useTranslation } from "react-i18next";
import { useQueryClient } from "@tanstack/react-query";
import { HeaderUserData } from "../../../../api/services/header/action";

const AccountManagement = () => {
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);
  const { t } = useTranslation("translation", { keyPrefix: "app" });
  const queryClient = useQueryClient();
  const user = queryClient.getQueryData<HeaderUserData>(["user"]);

  return (
    <div className="profile-info-container">
      <Popover
        position="bottom-right"
        className="profile-popover"
        onTriggerClick={() => setIsPopoverOpen(!isPopoverOpen)}
        onCloseButtonClick={() => setIsPopoverOpen(false)}
        onCloseKeyPressed={() => setIsPopoverOpen(false)}
        onOutsideClick={() => setIsPopoverOpen(false)}
        closeButton
        headline={t("myAccount")}
        trigger={
          <div className="profile-flyout">
            <Icon iconName="my-brand-frame" />
            {user?.firstName || t("user")}
            <Icon iconName={isPopoverOpen ? "up" : "down"} />
          </div>
        }
      >
        <PopoverContent />
      </Popover>
    </div>
  );
};

export default AccountManagement;
