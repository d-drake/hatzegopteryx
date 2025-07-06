import { ISPCDataService } from './ISPCDataService';
import { SPCCdL1DataService } from './SPCCdL1DataService';
import { SPCRegL1DataService } from './SPCRegL1DataService';
import { SPCDataItem } from '@/types';

export class SPCDataServiceFactory {
  private static serviceCache = new Map<string, ISPCDataService<any>>();

  static create(spcMonitor: string): ISPCDataService<any> {
    // Check cache first
    const cachedService = this.serviceCache.get(spcMonitor);
    if (cachedService) {
      return cachedService;
    }

    let service: ISPCDataService<any>;

    switch (spcMonitor) {
      case 'SPC_CD_L1':
      case 'SPC_CD_L2':
      case 'SPC_CD_L3':
        // All CD monitors use the same service but different data
        service = new SPCCdL1DataService();
        break;
      
      case 'SPC_REG_L1':
      case 'SPC_REG_L2':
      case 'SPC_REG_L3':
        // All REG monitors use the same service but different data
        service = new SPCRegL1DataService();
        break;
      
      default:
        throw new Error(`Unknown SPC monitor: ${spcMonitor}. Supported monitors are: SPC_CD_L1, SPC_CD_L2, SPC_CD_L3, SPC_REG_L1, SPC_REG_L2, SPC_REG_L3`);
    }

    // Cache the service instance
    this.serviceCache.set(spcMonitor, service);
    return service;
  }

  static getDataType(spcMonitor: string): 'CD' | 'REG' | 'UNKNOWN' {
    if (spcMonitor.includes('_CD_')) {
      return 'CD';
    } else if (spcMonitor.includes('_REG_')) {
      return 'REG';
    }
    return 'UNKNOWN';
  }

  static clearCache(): void {
    this.serviceCache.clear();
  }
}