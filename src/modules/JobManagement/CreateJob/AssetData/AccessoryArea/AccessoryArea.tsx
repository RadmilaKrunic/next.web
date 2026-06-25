import { useTranslation } from "react-i18next";
import "./AccessoryArea.scss";
import { Button } from "@bosch/react-frok";
import Area from "../../../../../components/generics/Area/GenericArea.types";
import { useContext, useEffect, useRef, type Dispatch, type SetStateAction } from "react";
import { CreateJobContext, type Accessory } from "../../CreateJob.context";
import GenericField from "../../../../../components/generics/Field/GenericField";
import { useFormikContext } from "formik";

const ASSET_PREFIX = "assetData#";
const ACCESSORY_PREFIX = "accessory#";

interface AccessoryAreaProps {
  readonly area: Area;
  readonly readOnly?: boolean;
}

function cleanupAccessories(
  values: Record<string, unknown>,
  setValues: (v: Record<string, unknown>) => void,
  assetsIndex: string,
  setAssetsAccessories: Dispatch<SetStateAction<Accessory[]>>,
): void {
  const newFormValues = { ...values };
  setAssetsAccessories((prev) => {
    prev.forEach((acc) => {
      acc.fields.forEach((field) => {
        delete newFormValues[field.name];
      });
    });
    return [];
  });
  newFormValues[`${ASSET_PREFIX}${assetsIndex}_accessories_accessories`] = false;
  setValues(newFormValues);
}

function AccessoryArea({ area, readOnly = false }: AccessoryAreaProps) {
  const { t } = useTranslation("translation", { keyPrefix: "app" });
  const { assetsAccessories, setAssetsAccessories } = useContext(CreateJobContext);
  const splitName = area.name ? area.name.split("_") : [];
  const assetsIndex =
    splitName.length > 1 && splitName[0].includes("#")
      ? splitName[0].replace(ASSET_PREFIX, "")
      : "0";
  const accessoriesIndex = splitName.length > 1 ? splitName[1].replace(ACCESSORY_PREFIX, "") : "0";
  const areaFields = structuredClone(area.fields);
  const formikContext = useFormikContext<Record<string, unknown>>();
  const { setValues, values } = formikContext;

  const hasMounted = useRef(false);

  useEffect(() => {
    if (hasMounted.current) {
      const voidSetValues = (v: Record<string, unknown>) => {
        void setValues(v);
      };
      return () => cleanupAccessories(values, voidSetValues, assetsIndex, setAssetsAccessories);
    } else {
      hasMounted.current = true;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const { setFieldValue } = formikContext;

  useEffect(() => {
    if (readOnly) return;

    const acc = {
      assetIndex: assetsIndex,
      accessoriesIndex: accessoriesIndex,
      fields: area.fields || areaFields,
    };

    if (!assetsAccessories || assetsAccessories.length === 0) {
      setAssetsAccessories([acc]);
    }
  }, [
    area.fields,
    assetsAccessories,
    setAssetsAccessories,
    assetsIndex,
    accessoriesIndex,
    areaFields,
    readOnly,
  ]);

  const addAccessory = () => {
    const accessories = assetsAccessories.filter((a) => {
      return a.assetIndex === assetsIndex;
    });
    if (accessories.length === 5) return; // limit to 5 accessories.
    const newAccessory = duplicateAccessory(accessories.length);
    const updatedAssetsAccessories = [...assetsAccessories, newAccessory];

    newAccessory.fields.forEach((field) => {
      if (field.defaultValue !== undefined && field.defaultValue !== null) {
        void setFieldValue(field.name, field.defaultValue);
      }
    });

    setAssetsAccessories(updatedAssetsAccessories);
  };

  const removeAccessory = (indexToRemove: number) => {
    const accessories = assetsAccessories.filter((a) => {
      return a.assetIndex === assetsIndex;
    });

    const accessoryToDelete = accessories.find((_, i) => i === indexToRemove);
    accessoryToDelete?.fields.forEach((field) => {
      delete formikContext.values[field.name];
    });
    const updatedAssetsAccessories = accessories
      .filter((_, i) => i !== indexToRemove)
      .map((a) => {
        if (a.accessoriesIndex > `${indexToRemove}`) {
          const newAccessoryIndex = Number.parseInt(a.accessoriesIndex, 10) - 1;
          a.fields.forEach((field) => {
            const oldValue = formikContext.values[field.name];
            delete formikContext.values[field.name];
            field.name = field.name.replace(
              `accessory#${a.accessoriesIndex}`,
              `accessory#${newAccessoryIndex}`,
            );
            formikContext.values[field.name] = oldValue;
          });
          a.accessoriesIndex = `${newAccessoryIndex}`;
        }
        return a;
      });

    setAssetsAccessories([
      ...assetsAccessories.filter((a) => a.assetIndex !== assetsIndex),
      ...updatedAssetsAccessories,
    ]);

    if (updatedAssetsAccessories.length === 0) {
      void setFieldValue(`assetData#${assetsIndex}_accessories_accessories`, false);
    }
  };

  const duplicateAccessory = (index: number) => {
    const acc = assetsAccessories.find((a) => a.assetIndex === assetsIndex);

    if (!acc) return { assetIndex: assetsIndex, accessoriesIndex: `${index}`, fields: [] };

    const newFields = acc.fields.map((field) => {
      const newField = { ...field };
      newField.name = newField.name.replace(
        `accessory#${acc.accessoriesIndex}`,
        `accessory#${index}`,
      );
      return newField;
    });
    return {
      assetIndex: assetsIndex,
      accessoriesIndex: `${index}`,
      fields: newFields,
    };
  };
  const accessoriesForDisplay = assetsAccessories.filter((a) => a.assetIndex === assetsIndex);

  if (accessoriesForDisplay.length === 0 && readOnly) {
    return null;
  }

  return (
    <div className="accessory-area">
      {!readOnly && (
        <div className="accessory-header">
          <p className="accessory-notice">{t("addAccessoryForRepair")}</p>
          <Button
            className="add-new-accessory"
            label={t("addNewAccessory")}
            mode="secondary"
            onClick={addAccessory}
            icon={{ iconName: "add", title: "Add Accessory" }}
          />
        </div>
      )}

      {accessoriesForDisplay.map((accessory, index: number) => {
        const sortedFields = [...accessory.fields].sort(
          (a, b) => (a.position ?? 0) - (b.position ?? 0),
        );
        return (
          <div key={`accessory-${accessory.accessoriesIndex}`}>
            <div className="accessory-title">
              <span>
                {t(area.label)} {`${index + 1}`}
              </span>
              {!readOnly && (
                <Button
                  mode="secondary"
                  onClick={() => removeAccessory(index)}
                  aria-label={`Remove accessory ${index + 1}`}
                  icon={{ iconName: "delete", title: `Remove accessory ${index + 1}` }}
                />
              )}
            </div>
            <div className="accessory-item">
              {sortedFields.map((field) => (
                <GenericField key={field.name} field={field} />
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

export default AccessoryArea;
