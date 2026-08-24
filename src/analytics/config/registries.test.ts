import { describe, it, expect } from "vitest";
import { EVENT_REGISTRY, getAllowedParameters, VIRTUAL_PAGE_REGISTRY } from "./registries";
import { AnalyticsEventName, VirtualUrl } from "../domain/enums";
import { AnalyticsParameterKey as P } from "../domain/types";

const COMMON = [
  P.ENVIRONMENT,
  P.LANGUAGE,
  P.VIRTUAL_URL,
  P.USER_ROLE,
  P.LOCAL_TIME_HOUR,
  P.LOCAL_DAY_OF_WEEK,
];

describe("EVENT_REGISTRY", () => {
  it("defines every event and requires the common context on each", () => {
    const names = Object.values(AnalyticsEventName);
    expect(names).toHaveLength(14); // 13 business events + virtual_page_view
    for (const name of names) {
      const definition = EVENT_REGISTRY[name];
      expect(definition.name).toBe(name);
      expect(definition.requiredParameters).toEqual(expect.arrayContaining(COMMON));
    }
  });

  it("requires page descriptors only for pageview and help events", () => {
    expect(EVENT_REGISTRY[AnalyticsEventName.VIRTUAL_PAGE_VIEW].requiresPageDescriptor).toBe(true);
    expect(EVENT_REGISTRY[AnalyticsEventName.HELP_CENTER_CLICKED].requiresPageDescriptor).toBe(
      true,
    );
    expect(EVENT_REGISTRY[AnalyticsEventName.JOB_CREATED].requiresPageDescriptor).toBe(false);
  });

  it("requires job_status + job_type on mid-workflow job events", () => {
    for (const name of [
      AnalyticsEventName.DIAGNOSTIC_VALIDATED,
      AnalyticsEventName.REPAIR_STARTED,
      AnalyticsEventName.PRE_APPROVAL_REQUESTED,
    ]) {
      expect(EVENT_REGISTRY[name].requiredParameters).toEqual(
        expect.arrayContaining([P.JOB_STATUS, P.JOB_TYPE]),
      );
    }
  });

  it("treats job_type as optional (required-where-available) for creation events", () => {
    for (const name of [AnalyticsEventName.JOB_CREATED, AnalyticsEventName.JOB_SAVED_AS_DRAFT]) {
      expect(EVENT_REGISTRY[name].requiredParameters).toContain(P.JOB_STATUS);
      expect(EVENT_REGISTRY[name].requiredParameters).not.toContain(P.JOB_TYPE);
      expect(EVENT_REGISTRY[name].optionalParameters).toContain(P.JOB_TYPE);
    }
  });

  it("requires the decision parameters on review events", () => {
    expect(EVENT_REGISTRY[AnalyticsEventName.CLAIM_REVIEWED].requiredParameters).toEqual(
      expect.arrayContaining([P.CLAIM_STATUS, P.CLAIM_ACTION]),
    );
    expect(EVENT_REGISTRY[AnalyticsEventName.PRE_APPROVAL_REVIEWED].requiredParameters).toEqual(
      expect.arrayContaining([P.JOB_STATUS, P.PRE_APPROVAL_ACTION]),
    );
  });

  it("exposes allowed parameters including the event key + optionals", () => {
    const allowed = getAllowedParameters(AnalyticsEventName.JOB_CREATED);
    expect(allowed).toContain(P.EVENT);
    expect(allowed).toContain(P.JOB_CREATION_DURATION_SECONDS);
    expect(allowed).toContain(P.COUNTRY_CODE);
  });
});

describe("VIRTUAL_PAGE_REGISTRY", () => {
  const definitions = Object.values(VIRTUAL_PAGE_REGISTRY);

  it("defines exactly one entry for every one of the 22 documented virtual URLs", () => {
    const urls = Object.values(VirtualUrl);
    expect(urls).toHaveLength(22);
    expect(definitions).toHaveLength(22);
    for (const url of urls) {
      const definition = VIRTUAL_PAGE_REGISTRY[url];
      expect(definition).toBeDefined();
      expect(definition.virtualUrl).toBe(url);
      expect(definition.reference).toMatch(/^VPV_\d{3}$/);
      expect(definition.pageName.length).toBeGreaterThan(0);
      expect(definition.moduleName.length).toBeGreaterThan(0);
    }
  });

  it("uses unique VPV references", () => {
    const references = definitions.map((definition) => definition.reference);
    expect(new Set(references).size).toBe(references.length);
  });
});
