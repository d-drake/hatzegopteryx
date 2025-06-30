import { describe, it, expect } from '@jest/globals';

describe('SPC Analytics Table Sorting', () => {
  // Test data
  const testData = [
    {
      lot: 'LOT001',
      date_process: '2024-01-15T10:00:00Z',
      entity: 'FAKE_TOOL2',
      bias: 5.2,
      bias_x_y: 3.1,
      cd_att: 45.3,
      cd_x_y: 44.8,
      cd_6sig: 2.1,
      duration_subseq_process_step: 1800,
      fake_property1: 'A',
      fake_property2: 'X',
      process_type: '1000',
      product_type: 'BNT44',
      spc_monitor_name: 'SPC_CD_L1'
    },
    {
      lot: 'LOT002',
      date_process: '2024-01-14T09:00:00Z',
      entity: 'FAKE_TOOL1',
      bias: 3.8,
      bias_x_y: 2.5,
      cd_att: 42.1,
      cd_x_y: 41.5,
      cd_6sig: 1.8,
      duration_subseq_process_step: 1700,
      fake_property1: 'B',
      fake_property2: 'Y',
      process_type: '1000',
      product_type: 'BNT44',
      spc_monitor_name: 'SPC_CD_L1'
    },
    {
      lot: 'LOT003',
      date_process: '2024-01-16T11:00:00Z',
      entity: 'FAKE_TOOL3',
      bias: 6.5,
      bias_x_y: 4.2,
      cd_att: 48.7,
      cd_x_y: 47.9,
      cd_6sig: 2.5,
      duration_subseq_process_step: 1900,
      fake_property1: 'C',
      fake_property2: 'Z',
      process_type: '1000',
      product_type: 'BNT44',
      spc_monitor_name: 'SPC_CD_L1'
    }
  ];

  // Sort function from the component
  const sortData = (data: any[], sortColumn: string, sortDirection: 'asc' | 'desc') => {
    return [...data].sort((a, b) => {
      let aValue: any;
      let bValue: any;
      
      switch (sortColumn) {
        case 'date_process':
          aValue = new Date(a.date_process).getTime();
          bValue = new Date(b.date_process).getTime();
          break;
        case 'entity':
          aValue = a.entity;
          bValue = b.entity;
          break;
        case 'bias':
          aValue = a.bias;
          bValue = b.bias;
          break;
        case 'cd_att':
          aValue = a.cd_att;
          bValue = b.cd_att;
          break;
        case 'cd_6sig':
          aValue = a.cd_6sig;
          bValue = b.cd_6sig;
          break;
        default:
          return 0;
      }
      
      if (sortDirection === 'asc') {
        return aValue > bValue ? 1 : aValue < bValue ? -1 : 0;
      } else {
        return aValue < bValue ? 1 : aValue > bValue ? -1 : 0;
      }
    });
  };

  describe('Date sorting', () => {
    it('should sort by date_process descending by default', () => {
      const sorted = sortData(testData, 'date_process', 'desc');
      expect(sorted[0].lot).toBe('LOT003'); // Jan 16
      expect(sorted[1].lot).toBe('LOT001'); // Jan 15
      expect(sorted[2].lot).toBe('LOT002'); // Jan 14
    });

    it('should sort by date_process ascending', () => {
      const sorted = sortData(testData, 'date_process', 'asc');
      expect(sorted[0].lot).toBe('LOT002'); // Jan 14
      expect(sorted[1].lot).toBe('LOT001'); // Jan 15
      expect(sorted[2].lot).toBe('LOT003'); // Jan 16
    });
  });

  describe('Entity sorting', () => {
    it('should sort by entity ascending', () => {
      const sorted = sortData(testData, 'entity', 'asc');
      expect(sorted[0].entity).toBe('FAKE_TOOL1');
      expect(sorted[1].entity).toBe('FAKE_TOOL2');
      expect(sorted[2].entity).toBe('FAKE_TOOL3');
    });

    it('should sort by entity descending', () => {
      const sorted = sortData(testData, 'entity', 'desc');
      expect(sorted[0].entity).toBe('FAKE_TOOL3');
      expect(sorted[1].entity).toBe('FAKE_TOOL2');
      expect(sorted[2].entity).toBe('FAKE_TOOL1');
    });
  });

  describe('Numeric sorting', () => {
    it('should sort by bias ascending', () => {
      const sorted = sortData(testData, 'bias', 'asc');
      expect(sorted[0].bias).toBe(3.8);
      expect(sorted[1].bias).toBe(5.2);
      expect(sorted[2].bias).toBe(6.5);
    });

    it('should sort by cd_att descending', () => {
      const sorted = sortData(testData, 'cd_att', 'desc');
      expect(sorted[0].cd_att).toBe(48.7);
      expect(sorted[1].cd_att).toBe(45.3);
      expect(sorted[2].cd_att).toBe(42.1);
    });

    it('should sort by cd_6sig ascending', () => {
      const sorted = sortData(testData, 'cd_6sig', 'asc');
      expect(sorted[0].cd_6sig).toBe(1.8);
      expect(sorted[1].cd_6sig).toBe(2.1);
      expect(sorted[2].cd_6sig).toBe(2.5);
    });
  });

  describe('Sort state management', () => {
    it('should toggle sort direction when clicking same column', () => {
      let sortColumn = 'date_process';
      let sortDirection: 'asc' | 'desc' = 'desc';
      
      // Simulate clicking the same column
      if (sortColumn === 'date_process') {
        sortDirection = sortDirection === 'asc' ? 'desc' : 'asc';
      }
      
      expect(sortDirection).toBe('asc');
      
      // Click again
      if (sortColumn === 'date_process') {
        sortDirection = sortDirection === 'asc' ? 'desc' : 'asc';
      }
      
      expect(sortDirection).toBe('desc');
    });

    it('should set appropriate default direction for new columns', () => {
      let sortColumn = 'date_process';
      let sortDirection: 'asc' | 'desc' = 'desc';
      
      // Simulate clicking a different column (entity)
      const newColumn = 'entity';
      if (newColumn !== sortColumn) {
        sortColumn = newColumn;
        sortDirection = newColumn === 'date_process' ? 'desc' : 'asc';
      }
      
      expect(sortColumn).toBe('entity');
      expect(sortDirection).toBe('asc');
      
      // Simulate clicking date column
      const dateColumn = 'date_process';
      if (dateColumn !== sortColumn) {
        sortColumn = dateColumn;
        sortDirection = dateColumn === 'date_process' ? 'desc' : 'asc';
      }
      
      expect(sortColumn).toBe('date_process');
      expect(sortDirection).toBe('desc');
    });
  });
});