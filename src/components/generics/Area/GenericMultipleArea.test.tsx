import { describe, it, expect, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { Formik } from "formik";
import { useState } from "react";
import Area from "./GenericArea.types";
import Field from "../Field/GenericField.types";
import {
  GenericFormContext,
  type MultipleAreaConfig,
  type MultipleAreaRowProps,
  type MultipleAreaRowsChange,
} from "../Form/GenericForm.context";
import { defineMultipleArea, getListPath } from "../multipleArea";
import GenericArea from "./GenericArea";

vi.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));
vi.mock("hooks/useHasPermission", () => ({ useHasPermission: () => true }));
vi.mock("../Field/GenericField", () => ({
  default: ({ field }: { field: Field }) => <div data-testid={field.name} />,
}));

const buildTemplate = (): Area => ({
  name: "claims_archivedRows#0",
  label: "archivedRows",
  position: 0,
  isMultiple: true,
  index: 0,
  dependFieldCondition: "",
  dependentFields: [],
  actions: null,
  isSubArea: false,
  fields: [
    {
      name: "claims_archivedRows#0_partNumber",
      label: "Part",
      type: "text",
      attributeMapping: "archivedMaterials#.partNumber",
    } as Field,
  ],
});

interface Item {
  id: string;
  partNumber: string;
}

const RowProbe = ({ area, index, item }: MultipleAreaRowProps<Item>) => (
  <div data-testid={`row-${index}`}>
    {area.name}:{item.partNumber}
  </div>
);

function Harness({
  items,
  sync,
  config,
  initialFields = [],
}: Readonly<{
  items: Item[];
  sync: (change: MultipleAreaRowsChange) => void;
  config?: Partial<MultipleAreaConfig<Item>>;
  initialFields?: Field[];
}>) {
  const multipleAreas = {
    "archivedMaterials#": defineMultipleArea<Item>({
      items,
      toRowValues: (item, fields) => ({ [fields[0].name]: item.partNumber }),
      rowComponent: RowProbe,
      getKey: (item) => item.id,
      ...config,
    }),
  };
  return (
    <Formik initialValues={{}} onSubmit={() => {}}>
      <GenericFormContext.Provider
        value={{
          allFields: initialFields,
          setAllFields: vi.fn(),
          mandatoryFields: null,
          setMandatoryFields: vi.fn(),
          actionCallbacks: {},
          multipleAreas,
          syncMultipleAreaRows: sync,
        }}
      >
        <GenericArea area={buildTemplate()} />
      </GenericFormContext.Provider>
    </Formik>
  );
}

describe("getListPath", () => {
  it("returns the first attributeMapping segment ending in #", () => {
    expect(getListPath(buildTemplate())).toBe("archivedMaterials#");
  });

  it("returns undefined when no field maps into a list", () => {
    const area = buildTemplate();
    area.fields[0].attributeMapping = "order.partNumber";
    expect(getListPath(area)).toBeUndefined();
  });
});

describe("GenericMultipleArea", () => {
  const items: Item[] = [
    { id: "a", partNumber: "P-A" },
    { id: "b", partNumber: "P-B" },
  ];

  it("renders one renamed row per item", () => {
    render(<Harness items={items} sync={vi.fn()} />);
    expect(screen.getByTestId("row-0")).toHaveTextContent("claims_archivedRows#0:P-A");
    expect(screen.getByTestId("row-1")).toHaveTextContent("claims_archivedRows#1:P-B");
  });

  it("renders nothing for an empty list", () => {
    const { container } = render(<Harness items={[]} sync={vi.fn()} />);
    expect(container).toBeEmptyDOMElement();
  });

  it("registers the row fields and seeds their values", async () => {
    const sync = vi.fn();
    render(<Harness items={items} sync={sync} />);
    await waitFor(() => expect(sync).toHaveBeenCalledTimes(1));
    const change = sync.mock.calls[0][0] as MultipleAreaRowsChange;
    expect(change.addedFields.map((f) => f.name)).toEqual([
      "claims_archivedRows#0_partNumber",
      "claims_archivedRows#1_partNumber",
    ]);
    expect(change.removedFieldNames.size).toBe(0);
    expect(change.values).toEqual({
      "claims_archivedRows#0_partNumber": "P-A",
      "claims_archivedRows#1_partNumber": "P-B",
    });
  });

  it("does not re-sync when rerendered with an equal list", async () => {
    const sync = vi.fn();
    const { rerender } = render(<Harness items={items} sync={sync} />);
    await waitFor(() => expect(sync).toHaveBeenCalledTimes(1));
    rerender(<Harness items={[...items]} sync={sync} />);
    expect(sync).toHaveBeenCalledTimes(1);
  });

  it("unregisters the last row's fields when the list shrinks", async () => {
    const sync = vi.fn();
    const registered = [
      { name: "claims_archivedRows#0_partNumber" },
      { name: "claims_archivedRows#1_partNumber" },
    ] as Field[];
    const { rerender } = render(
      <Harness items={items} sync={sync} initialFields={registered} />,
    );
    await waitFor(() => expect(sync).toHaveBeenCalledTimes(1));
    rerender(<Harness items={items.slice(0, 1)} sync={sync} initialFields={registered} />);
    await waitFor(() => expect(sync).toHaveBeenCalledTimes(2));
    const change = sync.mock.calls[1][0] as MultipleAreaRowsChange;
    expect([...change.removedFieldNames]).toEqual(["claims_archivedRows#1_partNumber"]);
    expect(change.addedFields).toEqual([]);
    expect(screen.queryByTestId("row-1")).not.toBeInTheDocument();
  });

  it("re-projects values when an item changes without the count changing", async () => {
    const sync = vi.fn();
    const registered = [
      { name: "claims_archivedRows#0_partNumber" },
      { name: "claims_archivedRows#1_partNumber" },
    ] as Field[];
    const { rerender } = render(
      <Harness items={items} sync={sync} initialFields={registered} />,
    );
    await waitFor(() => expect(sync).toHaveBeenCalledTimes(1));
    rerender(
      <Harness
        items={[items[0], { id: "c", partNumber: "P-C" }]}
        sync={sync}
        initialFields={registered}
      />,
    );
    await waitFor(() => expect(sync).toHaveBeenCalledTimes(2));
    expect((sync.mock.calls[1][0] as MultipleAreaRowsChange).values).toMatchObject({
      "claims_archivedRows#1_partNumber": "P-C",
    });
  });

  it("wraps the rows once when a wrapper is configured", () => {
    const Wrapper = ({ count, children }: { count: number; children: React.ReactNode }) => (
      <section data-testid="wrapper" data-count={count}>
        {children}
      </section>
    );
    render(<Harness items={items} sync={vi.fn()} config={{ wrapper: Wrapper }} />);
    expect(screen.getAllByTestId("wrapper")).toHaveLength(1);
    expect(screen.getByTestId("wrapper")).toHaveAttribute("data-count", "2");
  });

  it("falls back to the default area rendering without a config", () => {
    const StateHarness = () => {
      const [items] = useState<Item[]>([]);
      return <Harness items={items} sync={vi.fn()} config={{ rowComponent: undefined }} />;
    };
    const { container } = render(<StateHarness />);
    expect(container).toBeEmptyDOMElement();
  });
});
