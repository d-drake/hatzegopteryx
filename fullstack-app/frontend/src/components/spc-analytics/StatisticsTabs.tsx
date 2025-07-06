'use client';

import { SPCCdL1, MetricConfig } from '@/types';
import GenericStatisticsTabs from './GenericStatisticsTabs';

interface StatisticsTabsProps {
  data: SPCCdL1[];
  selectedEntity?: string;
}

// Define CD L1 metrics
const CD_L1_METRICS: MetricConfig[] = [
  {
    key: 'cd_att',
    label: 'CD ATT',
    precision: 2,
    unit: 'nm'
  },
  {
    key: 'cd_x_y',
    label: 'CD X-Y',
    precision: 2,
    unit: 'nm'
  },
  {
    key: 'cd_6sig',
    label: 'CD 6σ',
    precision: 2,
    unit: 'nm'
  }
];

// Wrapper component for backward compatibility
export default function StatisticsTabs({ data, selectedEntity }: StatisticsTabsProps) {
  return (
    <GenericStatisticsTabs
      data={data}
      selectedEntity={selectedEntity}
      metrics={CD_L1_METRICS}
      defaultMetric="cd_att"
    />
  );
}