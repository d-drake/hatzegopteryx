"use client";

import React from "react";
import { SPCCdL1 } from "@/types";
import {
  createSPCDataContext,
  SPCDataProvider,
  createUseSPCData,
} from "./SPCDataContext";

// Create specific context for CD L1 data
const SPCCdL1Context = createSPCDataContext<SPCCdL1>();

// Export the provider with backward compatibility
export function SPCCdL1Provider(props: {
  children: React.ReactNode;
  processType: string;
  productType: string;
  spcMonitorName: string;
  processProduct: string;
}) {
  return <SPCDataProvider<SPCCdL1> {...props} context={SPCCdL1Context} />;
}

// Export the hook with backward compatibility
export const useSPCCdL1 = createUseSPCData(SPCCdL1Context);
