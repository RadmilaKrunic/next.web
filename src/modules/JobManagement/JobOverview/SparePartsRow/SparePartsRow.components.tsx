import { Divider } from "@bosch/react-frok";
import GenericField from "components/generics/Field/GenericField";
import Field from "components/generics/Field/GenericField.types";

export function SparePartsMainFields({
  mainFields,
  positionFieldsWithDisabledOptions,
  applyFieldPermissions,
}: {
  readonly mainFields: Field[];
  readonly positionFieldsWithDisabledOptions: Field[];
  readonly applyFieldPermissions: (field: Field) => Field;
}) {
  return (
    <>
      {mainFields
        .toSorted((a, b) => (a.position || 0) - (b.position || 0))
        .map((field) => {
          const enrichedField =
            positionFieldsWithDisabledOptions.find((f) => f.name === field.name) ?? field;
          return (
            <GenericField
              field={applyFieldPermissions(enrichedField)}
              key={field.name}
              className={`spare-parts-field ${field?.size === "2" ? "small" : ""}`}
            />
          );
        })}
    </>
  );
}

export function SparePartsCollapsedSection({
  isRowCollapsed,
  hasPriceViewPermission,
  collapsableFields,
  applyFieldPermissions,
}: {
  readonly isRowCollapsed: boolean;
  readonly hasPriceViewPermission: boolean;
  readonly collapsableFields: Field[];
  readonly applyFieldPermissions: (field: Field) => Field;
}) {
  if (!isRowCollapsed || !hasPriceViewPermission) return null;
  return (
    <>
      <Divider />
      <div className="spare-parts-row-collapsed">
        {collapsableFields
          .toSorted((a, b) => (a.position || 0) - (b.position || 0))
          .map((field) => (
            <GenericField
              field={applyFieldPermissions(field)}
              key={field.name}
              className={`spare-parts-field ${field?.size === "2" ? "small" : ""}`}
            />
          ))}
      </div>
    </>
  );
}
