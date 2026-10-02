import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import React from "react";

vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}));

let capturedOnClose: ((event?: React.SyntheticEvent) => void) | undefined;

vi.mock("@bosch/react-frok", () => ({
  Dialog: ({ children, onClose, title, ...props }: any) => {
    capturedOnClose = onClose;
    return (
      <div data-testid={props["data-testid"]}>
        <div>{title}</div>
        {children}
      </div>
    );
  },
  Button: ({ children, ...props }: any) => <button {...props}>{children}</button>,
}));

import CustomerChangeConfirmModal from "./CustomerChangeConfirmModal";

describe("CustomerChangeConfirmModal", () => {
  const onClose = vi.fn();
  const onEdit = vi.fn();
  const onCreate = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    capturedOnClose = undefined;
  });

  it("renders comparisons grouped by section and formats values", () => {
    render(
      <CustomerChangeConfirmModal
        isOpen
        onClose={onClose}
        onEdit={onEdit}
        onCreate={onCreate}
        fieldComparisons={[
          {
            fieldName: "firstName",
            fieldLabel: "firstNameLabel",
            originalValue: "John",
            currentValue: "Jane",
          },
          {
            fieldName: "streetName",
            fieldLabel: "streetNameLabel",
            originalValue: true,
            currentValue: false,
          },
          {
            fieldName: "deliveryCity",
            fieldLabel: "deliveryCityLabel",
            originalValue: { city: "Berlin" },
            currentValue: ["Munich", 2],
          },
        ]}
      />,
    );

    expect(screen.getByTestId("customer-change-confirm-modal")).toBeInTheDocument();
    expect(screen.getByText("customerChangeConfirmModalTitle")).toBeInTheDocument();
    expect(screen.getByText("customerChangeConfirmModalText")).toBeInTheDocument();

    expect(screen.getByText("commonCustomerData")).toBeInTheDocument();
    expect(screen.getByText("billingAddressData")).toBeInTheDocument();
    expect(screen.getByText("deliveryAddressData")).toBeInTheDocument();

    expect(screen.getByText("firstNameLabel")).toBeInTheDocument();
    expect(screen.getByText("John")).toBeInTheDocument();
    expect(screen.getByText("Jane")).toBeInTheDocument();

    expect(screen.getByText("streetNameLabel")).toBeInTheDocument();
    expect(screen.getByText("yes")).toBeInTheDocument();
    expect(screen.getByText("no")).toBeInTheDocument();

    expect(screen.getByText("deliveryCityLabel")).toBeInTheDocument();
    expect(screen.getByText('{"city":"Berlin"}')).toBeInTheDocument();
    expect(screen.getByText("Munich, 2")).toBeInTheDocument();

    expect(screen.getAllByText("customerChangeChanged")).toHaveLength(3);
  });

  it("wires action buttons and Dialog close handler", () => {
    render(
      <CustomerChangeConfirmModal
        isOpen
        onClose={onClose}
        onEdit={onEdit}
        onCreate={onCreate}
        fieldComparisons={[]}
      />,
    );

    fireEvent.click(screen.getByTestId("customer-change-confirm-cancel"));
    fireEvent.click(screen.getByTestId("customer-change-confirm-edit"));
    fireEvent.click(screen.getByTestId("customer-change-confirm-create"));

    expect(onClose).toHaveBeenCalledTimes(1);
    expect(onEdit).toHaveBeenCalledTimes(1);
    expect(onCreate).toHaveBeenCalledTimes(1);

    const fakeEvent = {
      preventDefault: vi.fn(),
      stopPropagation: vi.fn(),
    } as unknown as React.SyntheticEvent;

    capturedOnClose?.(fakeEvent);

    expect(fakeEvent.preventDefault).toHaveBeenCalledTimes(1);
    expect(fakeEvent.stopPropagation).toHaveBeenCalledTimes(1);
    expect(onClose).toHaveBeenCalledTimes(2);
  });
});
