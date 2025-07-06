import { useSPCCdL1 } from "@/contexts/SPCCdL1Context";
import { useSPCRegL1 } from "@/contexts/SPCRegL1Context";

// This is a problematic pattern - hooks cannot be called conditionally
// Instead, the component should use the specific hook directly or use a provider pattern
export function useSPCDataByMonitor(spcMonitor: string) {
  throw new Error(
    `useSPCDataByMonitor cannot be implemented safely due to React hooks rules. ` +
      `Please use the appropriate context hook directly (useSPCCdL1 or useSPCRegL1) ` +
      `or use the SPCProviderSelector component.`,
  );
}
