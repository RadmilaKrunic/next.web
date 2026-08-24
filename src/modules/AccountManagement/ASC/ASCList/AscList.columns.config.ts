import { ReactNode, createElement } from "react";
import { ServiceCenter } from "../../../../api/services/serviceCenters/serviceCenters.types";
import StatusIndicator from "components/ui/StatusIndicator/StatusIndicator";

export type AscColumnKey = "name" | "email" | "phone" | "status";

export type AscColumnConfig = {
  key: AscColumnKey;
  label: string;
  render: (asc: ServiceCenter) => string | ReactNode;
};

export const getAscColumns = (t: (key: string) => string): AscColumnConfig[] => {
  return [
    {
      key: "name",
      label: t("ascName"),
      render: (asc) => `${asc.name}`,
    },
    {
      key: "email",
      label: t("email"),
      render: (asc) => asc.email || "-",
    },
    {
      key: "phone",
      label: t("phone"),
      render: (asc) => asc.phoneNumber || "-",
    },
    {
      key: "status",
      label: t("status"),
      render: ({ isActive, isDraft }) => {
        let status = "INACTIVE";

        if (isDraft) {
          status = "DRAFT";
        } else if (isActive) {
          status = "ACTIVE";
        }

        return createElement(StatusIndicator, {
          status,
        });
      },
    },
  ];
};
