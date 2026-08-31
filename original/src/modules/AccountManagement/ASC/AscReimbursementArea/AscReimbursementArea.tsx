import Area from "components/generics/Area/GenericArea.types";
import { Notification, Table, TableBody, TableCell, TableHead, TableRow } from "@bosch/react-frok";
import "./AscReimbursementArea.scss";
import { useEffect, useState } from "react";
import GenericField from "components/generics/Field/GenericField";
import { useTranslation } from "react-i18next";
import { HeaderUserData } from "api/services/header/action";
import { useQueryClient } from "@tanstack/react-query";
import {
  CountryConfig,
  ReimbursementConfiguration,
} from "api/services/countryConfiguration/countryConfiguration";
import { useParams } from "react-router-dom";
import {
  DraftServiceCenter,
  ServiceCenter,
} from "api/services/serviceCenters/serviceCenters.types";
import { useFormikContext } from "formik";

function AscReimbursementArea({ area }: Readonly<{ area: Area }>) {
  const { t } = useTranslation("translation", { keyPrefix: "app" });
  const { ascId: paramsAscId } = useParams<{ ascId: string }>();
  const queryClient = useQueryClient();

  const user = queryClient.getQueryData<HeaderUserData>(["user"]);
  const ascId = paramsAscId || user?.ascId || "";

  const { values, setFieldValue } = useFormikContext<Record<string, unknown>>();
  const [config, setConfig] = useState<ReimbursementConfiguration[]>([]);
  const [displayNotification, setDisplayNotification] = useState(true);
  const infoTextField = area.fields.find((field) => field.type === "infoIcon");
  const reimbursementGenericDropdown = area.fields.find(
    (field) => field.name === "reimbursementMethod" && field.type === "dropdown",
  );

  const countryConfig = queryClient.getQueryData<CountryConfig>([
    "countryConfiguration",
    user?.countryCode,
  ]);
  const asc = queryClient.getQueryData<ServiceCenter | DraftServiceCenter>(["ASC", ascId]);

  useEffect(() => {
    if (ascId && asc) {
      if ("serviceCenter" in asc) {
        setConfig(asc.serviceCenter.reimbursementConfig);
      } else {
        setConfig(asc.reimbursementConfig);
      }
    }

    if (!ascId && countryConfig?.reimbursementConfig) {
      setConfig(countryConfig.reimbursementConfig);
    }
  }, [ascId, asc, countryConfig]);

  useEffect(() => {
    if (!reimbursementGenericDropdown?.name || !config?.length) return;

    config.forEach((config) => {
      const repairName = `${reimbursementGenericDropdown.name}_${config.category}_repair`;
      const exchangeName = `${reimbursementGenericDropdown.name}_${config.category}_exchange`;

      if (values[repairName] === undefined) {
        void setFieldValue(repairName, config.reimbursementMethods.REPAIR || "");
      }

      if (values[exchangeName] === undefined) {
        void setFieldValue(exchangeName, config.reimbursementMethods.EXCHANGE || "");
      }
    });
  }, [reimbursementGenericDropdown?.name, config, setFieldValue, values]);

  return (
    <div className="asc-reimbursement-area">
      {displayNotification && (
        <Notification
          key={"reimbursement-info-message"}
          onCloseClick={() => setDisplayNotification(false)}
          variant="banner"
          open
          type="warning"
          icon="alert-warning"
        >
          <span>
            <b>{t("reimbursementInfoMessage1")}</b>
          </span>
          <br />
          <span>{t("reimbursementInfoMessage2")}</span>
        </Notification>
      )}
      <Table className="asc-reimbursement-table">
        <TableHead>
          <TableRow>
            <TableCell header>{t("category")}</TableCell>
            <TableCell header>{t("repair")}</TableCell>
            <TableCell header>{t("exchange")}</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {reimbursementGenericDropdown &&
            config?.map((config: ReimbursementConfiguration) => (
              <TableRow key={config.category}>
                <TableCell>{t(config.category)}</TableCell>
                <TableCell>
                  <GenericField
                    field={{
                      ...reimbursementGenericDropdown,
                      name: `${reimbursementGenericDropdown.name}_${config.category}_repair`,
                      defaultValue: config.reimbursementMethods.REPAIR || "",
                    }}
                  />
                </TableCell>
                <TableCell>
                  <GenericField
                    field={{
                      ...reimbursementGenericDropdown,
                      name: `${reimbursementGenericDropdown.name}_${config.category}_exchange`,
                      defaultValue: config.reimbursementMethods.EXCHANGE || "",
                    }}
                  />
                </TableCell>
              </TableRow>
            ))}
        </TableBody>
      </Table>
      {infoTextField && <GenericField field={infoTextField} />}
    </div>
  );
}

export default AscReimbursementArea;
