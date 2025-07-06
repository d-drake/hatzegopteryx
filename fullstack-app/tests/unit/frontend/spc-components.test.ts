/**
 * Unit tests for SPC domain functionality in components
 */

import { calculateSPCDomain, calculateAllEntitiesStdDev, validateSPCDomain } from '../../../frontend/src/lib/charts/spc-domain';

describe('SPC Domain Integration', () => {
  const mockData = [
    { cd_att: 45, entity: 'TOOL1', date_process: '2025-01-01' },
    { cd_att: 55, entity: 'TOOL2', date_process: '2025-01-02' }
  ];

  const mockSPCLimits = {
    id: 1,
    process_type: '1000',
    product_type: 'BNT44',
    spc_monitor_name: 'SPC_CD_L1',
    spc_chart_name: 'cd_att',
    cl: 50,
    lcl: 40,
    ucl: 60,
    effective_date: '2025-01-01'
  };

  describe('SPC Domain Calculation in Component Context', () => {
    it('should calculate standard deviation for timeline data', () => {
      const stdDev = calculateAllEntitiesStdDev(mockData, 'cd_att');
      expect(stdDev).toBeCloseTo(5, 0); // √((45-50)² + (55-50)²)/2 = √25 = 5
    });

    it('should create proper domain with SPC limits', () => {
      const dataExtent: [number, number] = [45, 55];
      const result = calculateSPCDomain({
        dataExtent,
        spcLimits: mockSPCLimits,
        allEntityStdDev: 5,
        chartName: 'cd_att'
      });

      // Should expand beyond data extent based on control limits
      expect(result[0]).toBeLessThan(dataExtent[0]); // yMin should be less than 45
      expect(result[1]).toBeGreaterThan(dataExtent[1]); // yMax should be greater than 55
    });

    it('should validate domain bounds', () => {
      const validDomain: [number, number] = [30, 70];
      const result = validateSPCDomain(validDomain, 'cd_att');
      expect(result).toEqual(validDomain);
    });

    it('should handle edge cases in validation', () => {
      const invalidDomain: [number, number] = [70, 30]; // yMax < yMin
      const result = validateSPCDomain(invalidDomain, 'cd_att');
      expect(result[0]).toBeLessThan(result[1]);
    });
  });
});