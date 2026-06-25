import { Button, Icon, TextField } from "@bosch/react-frok";
import "./NumberInputField.scss";
import { useEffect, useRef, useState } from "react";

export default function NumberInputFiled({
  name,
  label,
  step,
  value,
  onChange,
  disabled = false,
  minValue,
}: Readonly<{
  name: string;
  label: string;
  step: number;
  value: string | number;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  disabled?: boolean;
  minValue?: number;
}>) {
  const stepValue = step || 1;
  const min = minValue ?? 0;

  const externalValue =
    value === "" || value === null || value === undefined ? "" : value.toString();
  const [inputValue, setInputValue] = useState(externalValue);
  const isFocusedRef = useRef(false);

  // Sync external value changes into local state when not actively editing
  useEffect(() => {
    if (!isFocusedRef.current) {
      setInputValue(externalValue);
    }
  }, [externalValue]);

  const currentNumericValue = inputValue === "" ? min : Number(inputValue) || min;

  const handleIncrement = () => {
    const newValue = currentNumericValue + stepValue;
    const newStr = newValue.toString();
    setInputValue(newStr);
    const syntheticEvent = {
      target: { value: newStr, name },
    } as React.ChangeEvent<HTMLInputElement>;
    onChange(syntheticEvent);
  };

  const handleDecrement = () => {
    const newValue = currentNumericValue - stepValue;
    if (newValue < min) return;
    const newStr = newValue.toString();
    setInputValue(newStr);
    const syntheticEvent = {
      target: { value: newStr, name },
    } as React.ChangeEvent<HTMLInputElement>;
    onChange(syntheticEvent);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;

    if (val === "") {
      setInputValue("");
      onChange(e);
      return;
    }

    const numValue = Number(val);
    if (!Number.isNaN(numValue) && numValue >= min) {
      setInputValue(val);
      onChange(e);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key !== "Backspace" && e.key !== "Delete") return;
    const input = e.target as HTMLInputElement;
    const selStart = input.selectionStart ?? 0;
    const selEnd = input.selectionEnd ?? 0;
    const currentLen = input.value.length;
    const willBeEmpty = currentLen === 1 || (selStart === 0 && selEnd === currentLen);
    if (willBeEmpty) {
      e.preventDefault();
      setInputValue("");
      const syntheticEvent = {
        target: { value: "", name },
      } as React.ChangeEvent<HTMLInputElement>;
      onChange(syntheticEvent);
    }
  };

  return (
    <div className="number-input">
      <TextField
        id={name}
        label={label}
        type="text"
        className="a-text-field text-field"
        value={inputValue}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        onFocus={() => {
          isFocusedRef.current = true;
          if (inputValue === "0") {
            setInputValue("");
          }
        }}
        onBlur={() => {
          isFocusedRef.current = false;
          if (inputValue === "") {
            const restoreValue = min.toString();
            setInputValue(restoreValue);
            const syntheticEvent = {
              target: { value: restoreValue, name },
            } as React.ChangeEvent<HTMLInputElement>;
            onChange(syntheticEvent);
          }
        }}
        disabled={disabled}
      />
      <Button
        type="button"
        className="input-button"
        aria-label={`Decrease value for ${label}`}
        onClick={handleDecrement}
        disabled={disabled}
      >
        <Icon iconName="less-minimize" aria-hidden="true" />
      </Button>
      <Button
        type="button"
        className="input-button"
        aria-label={`Increase value for ${label}`}
        onClick={handleIncrement}
        disabled={disabled}
      >
        <Icon iconName="add" aria-hidden="true" />
      </Button>
    </div>
  );
}
