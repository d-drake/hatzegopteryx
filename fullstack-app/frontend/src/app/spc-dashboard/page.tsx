"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function SPCDashboardRedirect() {
  const router = useRouter();

  useEffect(() => {
    // Redirect to default URL structure with defaults:
    // SPC_MONITOR_NAME = SPC_CD_L1
    // PROCESS_TYPE = 1000
    // PRODUCT_TYPE = BNT44
    // ENTITY = FAKE_TOOL1
    // StartDate = Today - 30 days
    // EndDate = Today

    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 30);

    const formatDate = (date: Date) => {
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, "0");
      const day = String(date.getDate()).padStart(2, "0");
      return `${year}-${month}-${day}`;
    };

    const defaultSPCMonitor = "SPC_REG_L1"; // Can also be 'SPC_CD_L1'
    const defaultProcessProduct = "1000-BNT44";
    const defaultEntity = "FAKE_TOOL1";
    const defaultStartDate = formatDate(startDate);
    const defaultEndDate = formatDate(endDate);

    const queryParams = new URLSearchParams({
      entity: defaultEntity,
      startDate: defaultStartDate,
      endDate: defaultEndDate,
    });

    const redirectUrl = `/spc-dashboard/${encodeURIComponent(defaultSPCMonitor)}/${encodeURIComponent(defaultProcessProduct)}?${queryParams.toString()}`;

    router.replace(redirectUrl);
  }, [router]);

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="text-gray-500">Redirecting to SPC Dashboard...</div>
    </div>
  );
}
