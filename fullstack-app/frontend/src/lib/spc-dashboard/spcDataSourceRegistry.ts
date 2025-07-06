import { SPCCdL1Provider, useSPCCdL1 } from "@/contexts/SPCCdL1Context";
import { SPCRegL1Provider, useSPCRegL1 } from "@/contexts/SPCRegL1Context";
import { ComponentType } from "react";

export interface SPCDataSourceConfig {
  name: string;
  dataType: "cd_l1" | "reg_l1" | "overlay_l1"; // Future extensible
  apiEndpoints: {
    data: string;
    stats: string;
    limits: string;
    entities?: string; // Optional - REG L1 doesn't have entities
    processTypes: string;
    productTypes: string;
    monitorNames: string;
    processProductCombinations: string;
  };
  dataFields: {
    hasEntityField: boolean;
    hasShapeField: boolean;
    yFields: string[]; // Available metrics
    colorFields: string[]; // Available correlation fields
    shapeFields?: string[]; // Optional grouping fields
  };
  contextHook: () => any; // Function that returns context data
  Provider: ComponentType<any>; // Provider component
  statisticsConfig: {
    supportedMetrics: string[];
    groupByEntity: boolean;
  };
}

export const SPC_DATA_SOURCES: Record<string, SPCDataSourceConfig> = {
  SPC_CD_L1: {
    name: "SPC_CD_L1",
    dataType: "cd_l1",
    apiEndpoints: {
      data: "/api/spc-cd-l1/",
      stats: "/api/spc-cd-l1/stats",
      limits: "/api/spc-cd-l1/spc-limits",
      entities: "/api/spc-cd-l1/entities",
      processTypes: "/api/spc-cd-l1/process-types",
      productTypes: "/api/spc-cd-l1/product-types",
      monitorNames: "/api/spc-cd-l1/spc-monitor-names",
      processProductCombinations: "/api/spc-cd-l1/process-product-combinations",
    },
    dataFields: {
      hasEntityField: true,
      hasShapeField: true,
      yFields: ["cd_att", "cd_x_y", "cd_6sig"],
      colorFields: ["bias", "bias_x_y"],
      shapeFields: ["fake_property1", "fake_property2"],
    },
    contextHook: useSPCCdL1,
    Provider: SPCCdL1Provider,
    statisticsConfig: {
      supportedMetrics: ["cd_att", "cd_x_y", "cd_6sig"],
      groupByEntity: true,
    },
  },
  SPC_REG_L1: {
    name: "SPC_REG_L1",
    dataType: "reg_l1",
    apiEndpoints: {
      data: "/api/spc-reg-l1/",
      stats: "/api/spc-reg-l1/stats",
      limits: "/api/spc-reg-l1/spc-limits",
      entities: "/api/spc-reg-l1/entities",
      processTypes: "/api/spc-reg-l1/process-types",
      productTypes: "/api/spc-reg-l1/product-types",
      monitorNames: "/api/spc-reg-l1/spc-monitor-names",
      processProductCombinations:
        "/api/spc-reg-l1/process-product-combinations",
    },
    dataFields: {
      hasEntityField: true,
      hasShapeField: true,
      yFields: [
        "scale_x",
        "scale_y",
        "ortho",
        "centrality_x",
        "centrality_y",
        "centrality_rotation",
      ],
      colorFields: ["recipe_scale_x", "recipe_scale_y", "recipe_ortho"],
      shapeFields: ["fake_property1", "fake_property2"],
    },
    contextHook: useSPCRegL1,
    Provider: SPCRegL1Provider,
    statisticsConfig: {
      supportedMetrics: [
        "scale_x",
        "scale_y",
        "ortho",
        "centrality_x",
        "centrality_y",
        "centrality_rotation",
      ],
      groupByEntity: true,
    },
  },
  // Future: 'SPC_OVERLAY_L1', etc.
};

/**
 * Get SPC data source configuration by monitor name
 */
export function getSPCDataSourceConfig(
  spcMonitor: string,
): SPCDataSourceConfig {
  const config = SPC_DATA_SOURCES[spcMonitor];
  if (!config) {
    throw new Error(
      `Unknown SPC monitor: ${spcMonitor}. Available monitors: ${Object.keys(SPC_DATA_SOURCES).join(", ")}`,
    );
  }
  return config;
}

/**
 * Check if an SPC monitor supports entity grouping
 */
export function supportsEntityGrouping(spcMonitor: string): boolean {
  const config = getSPCDataSourceConfig(spcMonitor);
  return (
    config.dataFields.hasEntityField && config.statisticsConfig.groupByEntity
  );
}

/**
 * Check if an SPC monitor supports shape field
 */
export function supportsShapeField(spcMonitor: string): boolean {
  const config = getSPCDataSourceConfig(spcMonitor);
  return config.dataFields.hasShapeField;
}

/**
 * Get available Y fields for an SPC monitor
 */
export function getAvailableYFields(spcMonitor: string): string[] {
  const config = getSPCDataSourceConfig(spcMonitor);
  return config.dataFields.yFields;
}

/**
 * Get available color fields for an SPC monitor
 */
export function getAvailableColorFields(spcMonitor: string): string[] {
  const config = getSPCDataSourceConfig(spcMonitor);
  return config.dataFields.colorFields;
}
