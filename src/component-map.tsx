/* eslint-disable @typescript-eslint/no-explicit-any */
import { type ComponentType } from "react";
import * as Primer from "@primer/react";
import * as PrimerExperimental from "@primer/react/experimental";

function isComponent(val: unknown): val is ComponentType<any> {
  if (typeof val === "function") return true;
  // ForwardRef / memo components have $$typeof
  if (val && typeof val === "object" && "$$typeof" in val) return true;
  return false;
}

function discoverComponents(
  exports: object,
  map: Record<string, ComponentType<any>>,
) {
  for (const [name, val] of Object.entries(exports as Record<string, unknown>)) {
    // Only PascalCase exports (components), skip hooks/utils/types
    if (!/^[A-Z]/.test(name)) continue;
    if (!isComponent(val)) continue;

    map[name] = val as ComponentType<any>;

    // Discover sub-components (e.g. ActionList.Item, Table.Head)
    if (typeof val === "object" || typeof val === "function") {
      for (const [subName, subVal] of Object.entries(val as unknown as Record<string, unknown>)) {
        if (!/^[A-Z]/.test(subName)) continue;
        if (!isComponent(subVal)) continue;
        map[`${name}.${subName}`] = subVal as ComponentType<any>;
      }
    }
  }
}

const COMPONENT_MAP: Record<string, ComponentType<any>> = {};
discoverComponents(Primer, COMPONENT_MAP);
discoverComponents(PrimerExperimental, COMPONENT_MAP);

export function resolveComponent(name: string): ComponentType<any> | undefined {
  return COMPONENT_MAP[name];
}

export function getComponentNames(): string[] {
  return Object.keys(COMPONENT_MAP).sort();
}
