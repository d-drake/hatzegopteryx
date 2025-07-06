import { ISPCDataService } from './ISPCDataService';
import { SPCCdL1DataService } from './SPCCdL1DataService';
import { SPCRegL1DataService } from './SPCRegL1DataService';
import { SPCDataItem } from '@/types';

export class SPCDataServiceFactory {
  private static serviceCache = new Map<string, ISPCDataService<any>>();

  // Registry of supported monitors and their service classes
  private static readonly MONITOR_REGISTRY = {
    'CD': {
      monitors: ['SPC_CD_L1', 'SPC_CD_L2', 'SPC_CD_L3'],
      serviceClass: SPCCdL1DataService
    },
    'REG': {
      monitors: ['SPC_REG_L1', 'SPC_REG_L2', 'SPC_REG_L3'],
      serviceClass: SPCRegL1DataService
    }
  };

  static create(spcMonitor: string): ISPCDataService<any> {
    // Check cache first
    const cachedService = this.serviceCache.get(spcMonitor);
    if (cachedService) {
      return cachedService;
    }

    let service: ISPCDataService<any> | null = null;

    // Find the appropriate service for this monitor
    for (const [, config] of Object.entries(this.MONITOR_REGISTRY)) {
      if (config.monitors.includes(spcMonitor)) {
        service = new config.serviceClass();
        break;
      }
    }

    if (!service) {
      const supportedMonitors = this.getSupportedMonitors().join(', ');
      throw new Error(`Unknown SPC monitor: ${spcMonitor}. Supported monitors are: ${supportedMonitors}`);
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

  static getSupportedMonitors(): string[] {
    const monitors: string[] = [];
    for (const config of Object.values(this.MONITOR_REGISTRY)) {
      monitors.push(...config.monitors);
    }
    return monitors;
  }

  static clearCache(): void {
    this.serviceCache.clear();
  }
}