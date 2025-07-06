"use client";

import React from "react";
import { SPCRegL1 } from "@/types";
import {
  createSPCDataContext,
  SPCDataProvider,
  createUseSPCData,
} from "./SPCDataContext";

// Create specific context for REG L1 data
const SPCRegL1Context = createSPCDataContext<SPCRegL1>();

// Export the provider with backward compatibility
export function SPCRegL1Provider(props: {
  children: React.ReactNode;
  processType: string;
  productType: string;
  spcMonitorName: string;
  processProduct: string;
}) {
  return <SPCDataProvider<SPCRegL1> {...props} context={SPCRegL1Context} />;
}

// Export the hook with backward compatibility
export const useSPCRegL1 = createUseSPCData(SPCRegL1Context);