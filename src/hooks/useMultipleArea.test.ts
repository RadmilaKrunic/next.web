import { describe, it, expect, vi } from "vitest";
import { renderHook, act } from "@testing-library/react";
import Section from "components/generics/Section/GenericSection.types";
import Field from "components/generics/Field/GenericField.types";
import { useMultipleArea } from "./useMultipleArea";

const row0Field = (): Field => ({
  name: "tab_row#0_partNumber",
  label: "Part number",
  type: "text",
  isMultiple: false,
});

const makeTabs = (rowCount = 1): Section[] => [
  {
    name: "tab",
    label: "Tab",
    areas: Array.from({ length: rowCount }, (_, index) => ({
      name: `tab_row#${index}`,
      label: index === 0 ? "Row" : "",
      position: 1,
      fields: [{ ...row0Field(), name: `tab_row#${index}_partNumber` }],
      dependFieldCondition: "AND",
      dependentFields: [],
      isSubArea: false,
      actions: null,
      isMultiple: true,
      index,
    })),
  } as unknown as Section,
];

describe("useMultipleArea", () => {
  it("returns the current rows for the section/areaName it was given", () => {
    const { result } = renderHook(() =>
      useMultipleArea({
        list: [{}],
        areaName: "row",
        sectionName: "tab",
        tabs: makeTabs(1),
        setTabs: vi.fn(),
        setAllFields: vi.fn(),
        setInitialFormValues: vi.fn(),
        skipFormResetRef: { current: false },
        buildRowValues: () => ({}),
      }),
    );

    expect(result.current.rows).toHaveLength(1);
    expect(result.current.rows[0].name).toBe("tab_row#0");
  });

  it("does not re-run when only buildRowValues gets a new closure — regression test for an infinite render loop", () => {
    // Every real caller passes an inline buildRowValues, recreated on every
    // render. If the effect depended on it directly, its own setInitialFormValues
    // call would re-render the caller, produce a new closure, and re-trigger the
    // effect forever ("Maximum update depth exceeded").
    const setInitialFormValues = vi.fn();
    const setTabs = vi.fn();
    const setAllFields = vi.fn();
    const list = [{ partNumber: "A" }];

    const { rerender } = renderHook(
      ({ buildRowValues }) =>
        useMultipleArea({
          list,
          areaName: "row",
          sectionName: "tab",
          tabs: makeTabs(1),
          setTabs,
          setAllFields,
          setInitialFormValues,
          skipFormResetRef: { current: false },
          buildRowValues,
        }),
      { initialProps: { buildRowValues: () => ({ "tab_row#0_partNumber": "A" }) } },
    );

    expect(setInitialFormValues).toHaveBeenCalledTimes(1);

    act(() => {
      rerender({ buildRowValues: () => ({ "tab_row#0_partNumber": "B" }) });
    });

    expect(setInitialFormValues).toHaveBeenCalledTimes(1);
    expect(setTabs).not.toHaveBeenCalled();
    expect(setAllFields).not.toHaveBeenCalled();
  });

  it("grows: clones the template for each new list item and appends fields/areas", () => {
    const setTabs = vi.fn();
    const setAllFields = vi.fn();
    const setInitialFormValues = vi.fn();
    const skipFormResetRef = { current: false };

    renderHook(() =>
      useMultipleArea({
        list: [{ partNumber: "A" }, { partNumber: "B" }, { partNumber: "C" }],
        areaName: "row",
        sectionName: "tab",
        tabs: makeTabs(1),
        setTabs,
        setAllFields,
        setInitialFormValues,
        skipFormResetRef,
        buildRowValues: ({ rows }) =>
          Object.fromEntries(rows.map((row, i) => [row.fields[0].name, `value-${i}`])),
      }),
    );

    expect(skipFormResetRef.current).toBe(true);

    const fieldsUpdater = setAllFields.mock.calls[0][0] as (prev: Field[] | null) => Field[];
    const updatedFields = fieldsUpdater([row0Field()]);
    expect(updatedFields.map((f) => f.name)).toEqual([
      "tab_row#0_partNumber",
      "tab_row#1_partNumber",
      "tab_row#2_partNumber",
    ]);

    const tabsUpdater = setTabs.mock.calls[0][0] as (prev: Section[]) => Section[];
    const updatedTabs = tabsUpdater(makeTabs(1));
    const tab = updatedTabs.find((t) => t.name === "tab")!;
    expect(tab.areas.map((a) => a.name)).toEqual(["tab_row#0", "tab_row#1", "tab_row#2"]);
    expect(tab.areas[1].index).toBe(1);
    expect(tab.areas[2].index).toBe(2);

    const valuesUpdater = setInitialFormValues.mock.calls[0][0] as (
      prev: Record<string, unknown>,
    ) => Record<string, unknown>;
    expect(valuesUpdater({})).toEqual({
      "tab_row#0_partNumber": "value-0",
      "tab_row#1_partNumber": "value-1",
      "tab_row#2_partNumber": "value-2",
    });
  });

  it("passes the pre-sync row count so callers can tell new rows from existing ones", () => {
    const buildRowValues = vi.fn(() => ({}));

    renderHook(() =>
      useMultipleArea({
        list: [{}, {}, {}],
        areaName: "row",
        sectionName: "tab",
        tabs: makeTabs(1),
        setTabs: vi.fn(),
        setAllFields: vi.fn(),
        setInitialFormValues: vi.fn(),
        skipFormResetRef: { current: false },
        buildRowValues,
      }),
    );

    expect(buildRowValues).toHaveBeenCalledWith(
      expect.objectContaining({ previousCount: 1 }),
    );
  });

  it("shrinks: truncates rows from the end and drops their fields", () => {
    const setTabs = vi.fn();
    const setAllFields = vi.fn();

    renderHook(() =>
      useMultipleArea({
        list: [{}],
        areaName: "row",
        sectionName: "tab",
        tabs: makeTabs(3),
        setTabs,
        setAllFields,
        setInitialFormValues: vi.fn(),
        skipFormResetRef: { current: false },
        buildRowValues: () => ({}),
      }),
    );

    const fieldsUpdater = setAllFields.mock.calls[0][0] as (prev: Field[] | null) => Field[];
    const remainingFields = fieldsUpdater([
      { ...row0Field(), name: "tab_row#0_partNumber" },
      { ...row0Field(), name: "tab_row#1_partNumber" },
      { ...row0Field(), name: "tab_row#2_partNumber" },
    ]);
    expect(remainingFields.map((f) => f.name)).toEqual(["tab_row#0_partNumber"]);

    const tabsUpdater = setTabs.mock.calls[0][0] as (prev: Section[]) => Section[];
    const updatedTabs = tabsUpdater(makeTabs(3));
    expect(updatedTabs[0].areas.map((a) => a.name)).toEqual(["tab_row#0"]);
  });

  it("does not touch tabs/allFields when the row count already matches the list", () => {
    const setTabs = vi.fn();
    const setAllFields = vi.fn();
    const skipFormResetRef = { current: false };

    renderHook(() =>
      useMultipleArea({
        list: [{}],
        areaName: "row",
        sectionName: "tab",
        tabs: makeTabs(1),
        setTabs,
        setAllFields,
        setInitialFormValues: vi.fn(),
        skipFormResetRef,
        buildRowValues: () => ({}),
      }),
    );

    expect(setTabs).not.toHaveBeenCalled();
    expect(setAllFields).not.toHaveBeenCalled();
    expect(skipFormResetRef.current).toBe(false);
  });

  it("recomputes and commits initial values when a list resync produces genuinely different content", () => {
    const setInitialFormValues = vi.fn();
    const buildRowValues = vi.fn(({ list }: { list: { partNumber: string }[] }) => ({
      "tab_row#0_partNumber": list[0]?.partNumber,
    }));

    const { rerender } = renderHook(
      ({ list }) =>
        useMultipleArea({
          list,
          areaName: "row",
          sectionName: "tab",
          tabs: makeTabs(1),
          setTabs: vi.fn(),
          setAllFields: vi.fn(),
          setInitialFormValues,
          skipFormResetRef: { current: false },
          buildRowValues,
        }),
      { initialProps: { list: [{ partNumber: "A" }] } },
    );

    expect(buildRowValues).toHaveBeenCalledTimes(1);
    expect(setInitialFormValues).toHaveBeenCalledTimes(1);

    act(() => {
      rerender({ list: [{ partNumber: "A-resynced" }] });
    });

    expect(buildRowValues).toHaveBeenCalledTimes(2);
    expect(setInitialFormValues).toHaveBeenCalledTimes(2);
  });

  it("does not recommit values a resync leaves unchanged — regression test for a Formik enableReinitialize loop", () => {
    // <Formik enableReinitialize> re-derives its state whenever initialValues
    // changes. If this hook committed a "new but equal" values object on every
    // run (e.g. the list got a fresh array reference but the same content —
    // exactly what a resync-from-API often does), Formik would reinitialize,
    // which can itself cause a re-render, feeding back into another commit.
    const setInitialFormValues = vi.fn();
    const buildRowValues = vi.fn(() => ({ "tab_row#0_partNumber": "same" }));

    const { rerender } = renderHook(
      ({ list }) =>
        useMultipleArea({
          list,
          areaName: "row",
          sectionName: "tab",
          tabs: makeTabs(1),
          setTabs: vi.fn(),
          setAllFields: vi.fn(),
          setInitialFormValues,
          skipFormResetRef: { current: false },
          buildRowValues,
        }),
      { initialProps: { list: [{}] as unknown[] } },
    );

    expect(setInitialFormValues).toHaveBeenCalledTimes(1);

    act(() => {
      rerender({ list: [{}] }); // new array reference, same resulting row values
    });

    expect(buildRowValues).toHaveBeenCalledTimes(2);
    expect(setInitialFormValues).toHaveBeenCalledTimes(1);
  });

  it("by default never shrinks below one row, so the #0 template stays visible with an empty list", () => {
    const setTabs = vi.fn();
    const setAllFields = vi.fn();

    renderHook(() =>
      useMultipleArea({
        list: [] as unknown[],
        areaName: "row",
        sectionName: "tab",
        tabs: makeTabs(1),
        setTabs,
        setAllFields,
        setInitialFormValues: vi.fn(),
        skipFormResetRef: { current: false },
        buildRowValues: () => ({}),
      }),
    );

    expect(setTabs).not.toHaveBeenCalled();
    expect(setAllFields).not.toHaveBeenCalled();
  });

  it("falls back to a cached template so it can grow again after shrinking to zero rows", () => {
    const setTabs = vi.fn();
    const setAllFields = vi.fn();

    const { rerender } = renderHook(
      ({ list }) =>
        useMultipleArea({
          list,
          areaName: "row",
          sectionName: "tab",
          tabs: makeTabs(1),
          setTabs,
          setAllFields,
          setInitialFormValues: vi.fn(),
          skipFormResetRef: { current: false },
          buildRowValues: () => ({}),
          minRows: 0,
        }),
      { initialProps: { list: [] as unknown[] } },
    );

    // Shrink to zero: apply what setTabs/setAllFields would have committed.
    let currentTabs = makeTabs(1);
    if (setTabs.mock.calls.length > 0) {
      const updater = setTabs.mock.calls.at(-1)![0] as (prev: Section[]) => Section[];
      currentTabs = updater(currentTabs);
    }
    expect(currentTabs[0].areas).toHaveLength(0);

    act(() => {
      rerender({ list: [{}, {}] });
    });

    const grownUpdater = setTabs.mock.calls.at(-1)![0] as (prev: Section[]) => Section[];
    const grownTabs = grownUpdater(currentTabs);
    expect(grownTabs[0].areas.map((a) => a.name)).toEqual(["tab_row#0", "tab_row#1"]);
  });
});
