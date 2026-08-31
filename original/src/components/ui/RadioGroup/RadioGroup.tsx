import { RadioButton } from "@bosch/react-frok";
import "./RadioGroup.scss";
import { useTranslation } from "react-i18next";
import { useFormikContext } from "formik";
import { useEffect } from "react";
import { FieldValueType, RadioButtonOption } from "components/generics/Field/GenericField.types";
import InfoIconWithTooltip from "../TooltipContent/InfoIconWithTooltip";

interface RadioGroupProps {
  name: string;
  radioButtons: RadioButtonOption[];
  direction: "row" | "column";
  defaultValue?: FieldValueType;
  disabled?: boolean;
  onChange?: (value: FieldValueType) => void;
}

export default function RadioGroup({
  name,
  radioButtons,
  direction,
  defaultValue,
  disabled,
  onChange,
}: Readonly<RadioGroupProps>) {
  const { t } = useTranslation("translation", { keyPrefix: "app" });
  const { values, setFieldValue } = useFormikContext<Record<string, unknown>>();

  const currentValue = values[name] as FieldValueType;

  useEffect(() => {
    if (currentValue === undefined && radioButtons.length > 0) {
      const initialValue = defaultValue ?? radioButtons[0].value;
      void setFieldValue(name, initialValue);
    }
  }, [currentValue, defaultValue, name, radioButtons, setFieldValue]);

  return (
    <fieldset
      disabled={disabled}
      className={`radio-group --${direction}`}
      data-testid={`radio-group-${name}`}
    >
      {radioButtons.map((radioBtn: RadioButtonOption) => (
        <div
          className="radio-group-option"
          key={`${name}-${String(radioBtn.value)}-${String(currentValue)}`}
        >
          <RadioButton
            name={name}
            id={`${name}-${String(radioBtn.value)}`}
            label={t(radioBtn.label)}
            value={radioBtn.value as string | number}
            disabled={radioBtn.disabled}
            onChange={() => {
              onChange?.(radioBtn.value);
              void setFieldValue(name, radioBtn.value);
            }}
            checked={currentValue === radioBtn.value}
          />
          {radioBtn.infoText || radioBtn.infoPayload ? (
            <InfoIconWithTooltip
              name={`${name}-${String(radioBtn.value)}`}
              infoText={radioBtn.infoText}
              infoPayload={radioBtn.infoPayload}
            />
          ) : null}
        </div>
      ))}
    </fieldset>
  );
}
