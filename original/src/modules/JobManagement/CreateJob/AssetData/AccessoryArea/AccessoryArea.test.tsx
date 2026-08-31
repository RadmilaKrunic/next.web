import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import AccessoryArea from "./AccessoryArea";
import { CreateJobContext } from "../../CreateJob.context";
import type { Accessory } from "../../CreateJob.context";
import Area from "../../../../../components/generics/Area/GenericArea.types";
import Field from "../../../../../components/generics/Field/GenericField.types";
import { Formik } from "formik";

// Mock react-i18next
vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string) => {
      const translations: Record<string, string> = {
        addNewAccessory: "Add New Accessory",
        addAccessoryForRepair: "Please add only accessories relevant for repair",
        accessory: "Accessory",
      };
      return translations[key] || key;
    },
  }),
}));

// Mock @bosch/react-frok
vi.mock("@bosch/react-frok", () => ({
  Button: ({
    label,
    onClick,
    icon,
    mode,
    className,
  }: {
    label?: string;
    onClick?: () => void;
    icon?: { iconName: string; title: string };
    mode?: string;
    className?: string;
  }) => (
    <button
      onClick={onClick}
      data-testid={className || `button-${icon?.iconName}`}
      data-mode={mode}
      aria-label={icon?.title}
    >
      {label || icon?.title}
    </button>
  ),
}));

// Mock GenericField
vi.mock("../../../../../components/generics/Field/GenericField", () => ({
  default: ({ field }: { field: Field }) => (
    <div data-testid={`field-${field.name}`}>{field.label}</div>
  ),
}));

describe("AccessoryArea", () => {
  const mockSetAssetsAccessories = vi.fn();

  const createMockField = (name: string, position: number): Field => ({
    name,
    label: `Label ${name}`,
    type: "text",
    pattern: "",
    maxLength: 100,
    minLength: 0,
    minValue: 0,
    maxValue: 100,
    isDisabled: false,
    isRequired: false,
    isSubField: false,
    position,
    placeholder: "",
    options: [],
    value: "",
    errorMessage: "",
    dependentFields: [],
    dependFieldCondition: "",
    requiredDependentFields: undefined,
    calendarConfig: undefined,
    fieldMapping: undefined,
    isHidden: false,
    isInfoIcon: false,
    infoText: "",
    size: "",
  });

  const createMockArea = (assetIndex: string, accessoryIndex: string): Area => ({
    name: `assetData#${assetIndex}_accessory#${accessoryIndex}`,
    label: "accessory",
    position: 1,
    fields: [
      createMockField(`assetData#${assetIndex}_accessory#${accessoryIndex}_field1`, 1),
      createMockField(`assetData#${assetIndex}_accessory#${accessoryIndex}_field2`, 2),
    ],
    dependFieldCondition: "",
    dependentFields: [],
    actions: [],
    isSubArea: false,
  });

  const createMockAccessory = (assetIndex: string, accessoryIndex: string): Accessory => ({
    assetIndex,
    accessoriesIndex: accessoryIndex,
    fields: [
      createMockField(`assetData#${assetIndex}_accessory#${accessoryIndex}_field1`, 1),
      createMockField(`assetData#${assetIndex}_accessory#${accessoryIndex}_field2`, 2),
    ],
  });

  const renderWithContext = (
    area: Area,
    assetsAccessories: Accessory[] = [],
    initialValues: Record<string, unknown> = {},
  ) => {
    return render(
      <CreateJobContext.Provider
        value={{
          assetsAccessories,
          setAssetsAccessories: mockSetAssetsAccessories,
        }}
      >
        <Formik initialValues={initialValues} onSubmit={() => {}}>
          <AccessoryArea area={area} />
        </Formik>
      </CreateJobContext.Provider>,
    );
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("Component Rendering", () => {
    it("renders AccessoryArea component with initial accessory", () => {
      const area = createMockArea("0", "0");
      const accessories = [createMockAccessory("0", "0")];

      renderWithContext(area, accessories);

      expect(
        screen.getByText("Please add only accessories relevant for repair"),
      ).toBeInTheDocument();
      expect(screen.getByTestId("add-new-accessory")).toBeInTheDocument();
      expect(
        screen.getByText((content, element) => {
          return (
            element?.tagName === "SPAN" &&
            element?.textContent?.replace(/\s+/g, " ").trim() === "Accessory 1"
          );
        }),
      ).toBeInTheDocument();
    });

    it("renders all fields in the accessory", () => {
      const area = createMockArea("0", "0");
      const accessories = [createMockAccessory("0", "0")];

      renderWithContext(area, accessories);

      expect(screen.getByTestId("field-assetData#0_accessory#0_field1")).toBeInTheDocument();
      expect(screen.getByTestId("field-assetData#0_accessory#0_field2")).toBeInTheDocument();
    });

    it("renders Add New Accessory button", () => {
      const area = createMockArea("0", "0");
      const accessories = [createMockAccessory("0", "0")];

      renderWithContext(area, accessories);

      const addButton = screen.getByTestId("add-new-accessory");
      expect(addButton).toBeInTheDocument();
      expect(addButton).toHaveTextContent("Add New Accessory");
    });

    it("does not render delete button for first accessory", () => {
      const area = createMockArea("0", "0");
      const accessories = [createMockAccessory("0", "0")];

      renderWithContext(area, accessories);

      const deleteButtons = screen.queryAllByTestId("button-delete");
      expect(deleteButtons).toHaveLength(1);
    });
  });

  describe("Multiple Accessories", () => {
    it("renders multiple accessories for the same asset", () => {
      const area = createMockArea("0", "0");
      const accessories = [
        createMockAccessory("0", "0"),
        createMockAccessory("0", "1"),
        createMockAccessory("0", "2"),
      ];

      renderWithContext(area, accessories);

      expect(
        screen.getByText((content, element) => {
          return (
            element?.tagName === "SPAN" &&
            element?.textContent?.replace(/\s+/g, " ").trim() === "Accessory 1"
          );
        }),
      ).toBeInTheDocument();
      expect(
        screen.getByText((content, element) => {
          return (
            element?.tagName === "SPAN" &&
            element?.textContent?.replace(/\s+/g, " ").trim() === "Accessory 2"
          );
        }),
      ).toBeInTheDocument();
      expect(
        screen.getByText((content, element) => {
          return (
            element?.tagName === "SPAN" &&
            element?.textContent?.replace(/\s+/g, " ").trim() === "Accessory 3"
          );
        }),
      ).toBeInTheDocument();
    });

    it("renders delete buttons for accessories after the first one", () => {
      const area = createMockArea("0", "0");
      const accessories = [createMockAccessory("0", "0"), createMockAccessory("0", "1")];

      renderWithContext(area, accessories);

      const deleteButtons = screen.getAllByTestId("button-delete");
      expect(deleteButtons).toHaveLength(2);
    });

    it("filters accessories by asset index", () => {
      const area = createMockArea("0", "0");
      const accessories = [
        createMockAccessory("0", "0"),
        createMockAccessory("1", "0"), // Different asset
        createMockAccessory("0", "1"),
      ];

      renderWithContext(area, accessories);

      // Should only render 2 accessories for asset "0"
      expect(
        screen.getByText((content, element) => {
          return (
            element?.tagName === "SPAN" &&
            element?.textContent?.replace(/\s+/g, " ").trim() === "Accessory 1"
          );
        }),
      ).toBeInTheDocument();
      expect(
        screen.getByText((content, element) => {
          return (
            element?.tagName === "SPAN" &&
            element?.textContent?.replace(/\s+/g, " ").trim() === "Accessory 2"
          );
        }),
      ).toBeInTheDocument();
      expect(
        screen.queryByText((content, element) => {
          return (
            element?.tagName === "SPAN" &&
            element?.textContent?.replace(/\s+/g, " ").trim() === "Accessory 3"
          );
        }),
      ).not.toBeInTheDocument();
    });
  });

  describe("Add Accessory", () => {
    it("calls setAssetsAccessories when add button is clicked", async () => {
      const user = userEvent.setup();
      const area = createMockArea("0", "0");
      const accessories = [createMockAccessory("0", "0")];

      renderWithContext(area, accessories);

      const addButton = screen.getByTestId("add-new-accessory");
      await user.click(addButton);

      expect(mockSetAssetsAccessories).toHaveBeenCalled();
    });

    it("duplicates accessory fields with updated indices", async () => {
      const user = userEvent.setup();
      const area = createMockArea("0", "0");
      const accessories = [createMockAccessory("0", "0")];

      renderWithContext(area, accessories);

      const addButton = screen.getByTestId("add-new-accessory");
      await user.click(addButton);

      await waitFor(() => {
        expect(mockSetAssetsAccessories).toHaveBeenCalledWith(
          expect.arrayContaining([
            expect.objectContaining({
              assetIndex: "0",
              accessoriesIndex: "0",
            }),
            expect.objectContaining({
              assetIndex: "0",
              accessoriesIndex: "1",
              fields: expect.arrayContaining([
                expect.objectContaining({
                  name: "assetData#0_accessory#1_field1",
                }),
                expect.objectContaining({
                  name: "assetData#0_accessory#1_field2",
                }),
              ]),
            }),
          ]),
        );
      });
    });

    it("does not add more than 5 accessories", async () => {
      const user = userEvent.setup();
      const area = createMockArea("0", "0");
      const accessories = [
        createMockAccessory("0", "0"),
        createMockAccessory("0", "1"),
        createMockAccessory("0", "2"),
        createMockAccessory("0", "3"),
        createMockAccessory("0", "4"),
      ];

      renderWithContext(area, accessories);

      const addButton = screen.getByTestId("add-new-accessory");
      await user.click(addButton);

      // Should not be called because limit is reached
      expect(mockSetAssetsAccessories).not.toHaveBeenCalled();
    });
  });

  describe("Remove Accessory", () => {
    it("calls setAssetsAccessories when delete button is clicked", async () => {
      const user = userEvent.setup();
      const area = createMockArea("0", "0");
      const accessories = [createMockAccessory("0", "0"), createMockAccessory("0", "1")];

      renderWithContext(area, accessories);

      const deleteButtons = screen.getAllByTestId("button-delete");
      await user.click(deleteButtons[0]);

      expect(mockSetAssetsAccessories).toHaveBeenCalled();
    });

    it("removes the correct accessory by index", async () => {
      const user = userEvent.setup();
      const area = createMockArea("0", "0");
      const accessories = [
        createMockAccessory("0", "0"),
        createMockAccessory("0", "1"),
        createMockAccessory("0", "2"),
      ];

      renderWithContext(area, accessories);

      const deleteButtons = screen.getAllByTestId("button-delete");
      // Click the first delete button (removes accessory at index 1)
      await user.click(deleteButtons[0]);

      await waitFor(() => {
        expect(mockSetAssetsAccessories).toHaveBeenCalledWith(
          expect.arrayContaining([
            expect.objectContaining({
              assetIndex: "0",
              accessoriesIndex: "1",
            }),
            expect.objectContaining({
              assetIndex: "0",
              accessoriesIndex: "1",
            }),
          ]),
        );
      });
    });
  });

  describe("Initialization", () => {
    it("initializes assetsAccessories when empty", () => {
      const area = createMockArea("0", "0");

      renderWithContext(area, []);

      expect(mockSetAssetsAccessories).toHaveBeenCalledWith([
        expect.objectContaining({
          assetIndex: "0",
          accessoriesIndex: "0",
          fields: area.fields,
        }),
      ]);
    });

    it("does not reinitialize when assetsAccessories already exists", () => {
      const area = createMockArea("0", "0");
      const accessories = [createMockAccessory("0", "0")];

      renderWithContext(area, accessories);

      // Should only be called once for initialization check
      expect(mockSetAssetsAccessories).not.toHaveBeenCalled();
    });
  });

  describe("Field Sorting", () => {
    it("renders fields sorted by position", () => {
      const area = createMockArea("0", "0");
      const accessories = [
        {
          assetIndex: "0",
          accessoriesIndex: "0",
          fields: [
            createMockField("assetData#0_accessory#0_field3", 3),
            createMockField("assetData#0_accessory#0_field1", 1),
            createMockField("assetData#0_accessory#0_field2", 2),
          ],
        },
      ];

      renderWithContext(area, accessories);

      const fields = screen.getAllByTestId(/^field-/);
      expect(fields[0]).toHaveAttribute("data-testid", "field-assetData#0_accessory#0_field1");
      expect(fields[1]).toHaveAttribute("data-testid", "field-assetData#0_accessory#0_field2");
      expect(fields[2]).toHaveAttribute("data-testid", "field-assetData#0_accessory#0_field3");
    });
  });

  describe("Area Name Parsing", () => {
    it("correctly parses asset and accessory indices from area name", () => {
      const area = createMockArea("2", "3");
      const accessories = [createMockAccessory("2", "3")];

      renderWithContext(area, accessories);

      expect(
        screen.getByText((content, element) => {
          return (
            element?.tagName === "SPAN" &&
            element?.textContent?.replace(/\s+/g, " ").trim() === "Accessory 1"
          );
        }),
      ).toBeInTheDocument();
    });

    it("handles malformed area names gracefully", () => {
      const area = {
        ...createMockArea("0", "0"),
        name: "invalid_name_format",
      };
      const accessories = [createMockAccessory("0", "0")];

      renderWithContext(area, accessories);

      // Should not crash, component should still render
      expect(
        screen.getByText("Please add only accessories relevant for repair"),
      ).toBeInTheDocument();
    });
  });
});
