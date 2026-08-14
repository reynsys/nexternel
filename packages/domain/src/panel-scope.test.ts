import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  defaultPanelContentMode,
  resolvePanelContentMode,
  type PanelScope,
} from "./panel-scope.js";

describe("resolvePanelContentMode", () => {
  it("uses explicit contentMode when set", () => {
    const scope: PanelScope = {
      areaIds: [],
      systemIds: [],
      groupIds: [],
      contentMode: "auto",
      capabilityIds: ["00000000-0000-4000-8000-000000000001"],
      cameraIds: [],
    };
    assert.equal(resolvePanelContentMode(scope), "auto");
  });

  it("infers manual from non-empty capabilityIds when contentMode omitted", () => {
    const scope: PanelScope = {
      areaIds: [],
      systemIds: [],
      groupIds: [],
      capabilityIds: ["00000000-0000-4000-8000-000000000001"],
      cameraIds: [],
    };
    assert.equal(resolvePanelContentMode(scope), "manual");
  });

  it("infers manual from non-empty cameraIds when contentMode omitted", () => {
    const scope: PanelScope = {
      areaIds: [],
      systemIds: [],
      groupIds: [],
      capabilityIds: [],
      cameraIds: ["00000000-0000-4000-8000-000000000002"],
    };
    assert.equal(resolvePanelContentMode(scope), "manual");
  });

  it("infers auto from empty capabilityIds when contentMode omitted", () => {
    const scope: PanelScope = {
      areaIds: [],
      systemIds: [],
      groupIds: [],
      capabilityIds: [],
      cameraIds: [],
    };
    assert.equal(resolvePanelContentMode(scope), "auto");
  });
});

describe("defaultPanelContentMode", () => {
  it("defaults charts to manual", () => {
    assert.equal(defaultPanelContentMode("panel.charts"), "manual");
  });

  it("defaults status and controls to auto", () => {
    assert.equal(defaultPanelContentMode("panel.status"), "auto");
    assert.equal(defaultPanelContentMode("panel.controls"), "auto");
  });
});
