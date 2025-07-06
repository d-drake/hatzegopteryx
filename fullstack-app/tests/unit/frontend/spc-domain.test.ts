import { calculateSPCDomain, calculateAllEntitiesStdDev, validateSPCDomain } from '../../../frontend/src/lib/charts/spc-domain';
import { SPCLimits } from '../../../frontend/src/types';

describe('SPC Domain Calculation', () => {
  const mockSPCLimits: SPCLimits = {
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

  const mockData = [
    { cd_att: 45, entity: 'TOOL1' },
    { cd_att: 55, entity: 'TOOL2' },
    { cd_att: 48, entity: 'TOOL3' },
    { cd_att: 52, entity: 'TOOL4' }
  ];

  describe('calculateSPCDomain', () => {
    it('should calculate domain with UCL and LCL present', () => {
      const options = {
        dataExtent: [45, 55] as [number, number],
        spcLimits: mockSPCLimits,
        allEntityStdDev: 3,
        chartName: 'cd_att'
      };

      const result = calculateSPCDomain(options);
      
      // yMax = CL + abs(UCL-CL)*2 = 50 + abs(60-50)*2 = 50 + 20 = 70
      // yMin = CL - abs(LCL-CL)*2 = 50 - abs(40-50)*2 = 50 - 20 = 30
      // But should include original data extent: [45, 55]
      // Final: [min(30, 45), max(70, 55)] = [30, 70]
      expect(result).toEqual([30, 70]);
    });

    it('should use standard deviation when UCL is missing', () => {
      const limitsWithoutUCL = { ...mockSPCLimits, ucl: undefined };
      const options = {
        dataExtent: [45, 55] as [number, number],
        spcLimits: limitsWithoutUCL,
        allEntityStdDev: 3,
        chartName: 'cd_att'
      };

      const result = calculateSPCDomain(options);
      
      // yMax = CL + abs(STD)*4 = 50 + 3*4 = 62
      // yMin = CL - abs(LCL-CL)*2 = 50 - abs(40-50)*2 = 30
      // Final: [min(30, 45), max(62, 55)] = [30, 62]
      expect(result).toEqual([30, 62]);
    });

    it('should use standard deviation when LCL is missing', () => {
      const limitsWithoutLCL = { ...mockSPCLimits, lcl: undefined };
      const options = {
        dataExtent: [45, 55] as [number, number],
        spcLimits: limitsWithoutLCL,
        allEntityStdDev: 3,
        chartName: 'cd_att'
      };

      const result = calculateSPCDomain(options);
      
      // yMax = CL + abs(UCL-CL)*2 = 50 + abs(60-50)*2 = 70
      // yMin = CL - abs(STD)*4 = 50 - 3*4 = 38
      // Final: [min(38, 45), max(70, 55)] = [38, 70]
      expect(result).toEqual([38, 70]);
    });

    it('should fallback to data extent when no limits available', () => {
      const options = {
        dataExtent: [45, 55] as [number, number],
        spcLimits: undefined,
        allEntityStdDev: 3,
        chartName: 'cd_att'
      };

      const result = calculateSPCDomain(options);
      expect(result).toEqual([45, 55]);
    });

    it('should fallback to data extent when CL is undefined', () => {
      const limitsWithoutCL = { ...mockSPCLimits, cl: undefined };
      const options = {
        dataExtent: [45, 55] as [number, number],
        spcLimits: limitsWithoutCL,
        allEntityStdDev: 3,
        chartName: 'cd_att'
      };

      const result = calculateSPCDomain(options);
      expect(result).toEqual([45, 55]);
    });
  });

  describe('calculateAllEntitiesStdDev', () => {
    it('should calculate standard deviation correctly', () => {
      const result = calculateAllEntitiesStdDev(mockData, 'cd_att');
      
      // Values: [45, 55, 48, 52]
      // Mean: (45 + 55 + 48 + 52) / 4 = 50
      // Variance: ((45-50)² + (55-50)² + (48-50)² + (52-50)²) / 4
      //         = (25 + 25 + 4 + 4) / 4 = 58 / 4 = 14.5
      // StdDev: √14.5 ≈ 3.81
      expect(result).toBeCloseTo(3.81, 2);
    });

    it('should return 0 for empty data', () => {
      const result = calculateAllEntitiesStdDev([], 'cd_att');
      expect(result).toBe(0);
    });

    it('should handle null and undefined values', () => {
      const dataWithNulls = [
        { cd_att: 45, entity: 'TOOL1' },
        { cd_att: null, entity: 'TOOL2' },
        { cd_att: 48, entity: 'TOOL3' },
        { cd_att: undefined, entity: 'TOOL4' },
        { cd_att: 52, entity: 'TOOL5' }
      ];

      const result = calculateAllEntitiesStdDev(dataWithNulls, 'cd_att');
      
      // Should only use valid values: [45, 48, 52]
      // Mean: (45 + 48 + 52) / 3 = 48.33
      // Should calculate std dev correctly
      expect(result).toBeGreaterThan(0);
    });
  });

  describe('validateSPCDomain', () => {
    it('should return valid domain unchanged', () => {
      const domain: [number, number] = [30, 70];
      const result = validateSPCDomain(domain, 'cd_att');
      expect(result).toEqual([30, 70]);
    });

    it('should fix invalid domain where yMax <= yMin', () => {
      const domain: [number, number] = [70, 30]; // Invalid: yMax < yMin
      const result = validateSPCDomain(domain, 'cd_att');
      
      // Should create valid domain with padding
      expect(result[0]).toBeLessThan(result[1]);
      expect(result[1] - result[0]).toBeGreaterThan(0);
    });

    it('should handle infinite values', () => {
      const domain: [number, number] = [Infinity, -Infinity];
      const result = validateSPCDomain(domain, 'cd_att');
      expect(result).toEqual([0, 1]); // Safe fallback
    });

    it('should handle NaN values', () => {
      const domain: [number, number] = [NaN, NaN];
      const result = validateSPCDomain(domain, 'cd_att');
      expect(result).toEqual([0, 1]); // Safe fallback
    });
  });
});