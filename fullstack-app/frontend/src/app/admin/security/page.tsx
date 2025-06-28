'use client';

import { useState, useEffect } from 'react';
import axios from 'axios';

// Configure axios
const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000',
});
import { ExclamationTriangleIcon, ShieldCheckIcon, ShieldExclamationIcon } from '@heroicons/react/24/outline';

interface SecurityDashboard {
  timestamp: string;
  summary: {
    suspicious_patterns: number;
    weak_passwords: number;
    inactive_users: number;
    privilege_alerts: number;
    alerts_today: number;
  };
  recommendations: {
    immediate: (string | null)[];
    scheduled: (string | null)[];
  };
  health_status: 'good' | 'warning' | 'critical';
}

interface SecurityScan {
  scan_type: string;
  findings: any[];
  timestamp: string;
  recommendations: string[];
}

export default function SecurityDashboard() {
  const [dashboard, setDashboard] = useState<SecurityDashboard | null>(null);
  const [loading, setLoading] = useState(true);
  const [scanResults, setScanResults] = useState<Record<string, SecurityScan>>({});
  const [scanning, setScanning] = useState<string | null>(null);

  useEffect(() => {
    loadDashboard();
  }, []);

  const loadDashboard = async () => {
    try {
      const token = localStorage.getItem('access_token');
      const response = await api.get('/api/security/dashboard', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      setDashboard(response.data);
    } catch (error) {
      console.error('Error loading security dashboard:', error);
    } finally {
      setLoading(false);
    }
  };

  const runScan = async (scanType: string) => {
    setScanning(scanType);
    try {
      const token = localStorage.getItem('access_token');
      const response = await api.get(`/api/security/scan/${scanType}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      setScanResults(prev => ({ ...prev, [scanType]: response.data }));
      // Reload dashboard to update counts
      await loadDashboard();
    } catch (error) {
      console.error(`Error running ${scanType} scan:`, error);
    } finally {
      setScanning(null);
    }
  };

  const getHealthIcon = () => {
    if (!dashboard) return null;
    
    switch (dashboard.health_status) {
      case 'good':
        return <ShieldCheckIcon className="h-12 w-12 text-green-500" />;
      case 'warning':
        return <ShieldExclamationIcon className="h-12 w-12 text-yellow-500" />;
      case 'critical':
        return <ExclamationTriangleIcon className="h-12 w-12 text-red-500" />;
    }
  };

  const getHealthColor = () => {
    if (!dashboard) return 'gray';
    
    switch (dashboard.health_status) {
      case 'good':
        return 'green';
      case 'warning':
        return 'yellow';
      case 'critical':
        return 'red';
      default:
        return 'gray';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Security Dashboard</h1>
        <p className="text-gray-600 mt-2">Monitor security health and run vulnerability scans</p>
      </div>

      {/* Health Status */}
      <div className={`bg-${getHealthColor()}-50 border border-${getHealthColor()}-200 rounded-lg p-6 mb-8`}>
        <div className="flex items-center">
          {getHealthIcon()}
          <div className="ml-4">
            <h2 className="text-2xl font-semibold capitalize">
              Security Status: {dashboard?.health_status}
            </h2>
            <p className="text-gray-600 mt-1">
              Last updated: {dashboard && new Date(dashboard.timestamp).toLocaleString()}
            </p>
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4 mb-8">
        <div className="bg-white p-6 rounded-lg shadow">
          <div className="text-2xl font-bold text-red-600">
            {dashboard?.summary.privilege_alerts || 0}
          </div>
          <div className="text-sm text-gray-600">Privilege Alerts</div>
        </div>
        
        <div className="bg-white p-6 rounded-lg shadow">
          <div className="text-2xl font-bold text-orange-600">
            {dashboard?.summary.suspicious_patterns || 0}
          </div>
          <div className="text-sm text-gray-600">Suspicious Patterns</div>
        </div>
        
        <div className="bg-white p-6 rounded-lg shadow">
          <div className="text-2xl font-bold text-yellow-600">
            {dashboard?.summary.weak_passwords || 0}
          </div>
          <div className="text-sm text-gray-600">Weak Passwords</div>
        </div>
        
        <div className="bg-white p-6 rounded-lg shadow">
          <div className="text-2xl font-bold text-blue-600">
            {dashboard?.summary.inactive_users || 0}
          </div>
          <div className="text-sm text-gray-600">Inactive Users</div>
        </div>
        
        <div className="bg-white p-6 rounded-lg shadow">
          <div className="text-2xl font-bold text-purple-600">
            {dashboard?.summary.alerts_today || 0}
          </div>
          <div className="text-sm text-gray-600">Alerts Today</div>
        </div>
      </div>

      {/* Recommendations */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold mb-4 text-red-600">Immediate Actions Required</h3>
          <ul className="space-y-2">
            {dashboard?.recommendations.immediate.filter(r => r).map((rec, idx) => (
              <li key={idx} className="flex items-start">
                <ExclamationTriangleIcon className="h-5 w-5 text-red-500 mr-2 flex-shrink-0 mt-0.5" />
                <span className="text-sm">{rec}</span>
              </li>
            ))}
            {!dashboard?.recommendations.immediate.some(r => r) && (
              <li className="text-sm text-gray-500">No immediate actions required</li>
            )}
          </ul>
        </div>
        
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold mb-4 text-yellow-600">Scheduled Maintenance</h3>
          <ul className="space-y-2">
            {dashboard?.recommendations.scheduled.filter(r => r).map((rec, idx) => (
              <li key={idx} className="flex items-start">
                <ShieldExclamationIcon className="h-5 w-5 text-yellow-500 mr-2 flex-shrink-0 mt-0.5" />
                <span className="text-sm">{rec}</span>
              </li>
            ))}
            {!dashboard?.recommendations.scheduled.some(r => r) && (
              <li className="text-sm text-gray-500">No scheduled maintenance required</li>
            )}
          </ul>
        </div>
      </div>

      {/* Security Scans */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold mb-4">Security Scans</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <button
            onClick={() => runScan('weak-passwords')}
            disabled={scanning !== null}
            className="p-4 border rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <h4 className="font-medium">Password Security Scan</h4>
            <p className="text-sm text-gray-600 mt-1">Check for weak or old passwords</p>
            {scanning === 'weak-passwords' && (
              <div className="mt-2 text-sm text-blue-600">Scanning...</div>
            )}
            {scanResults['weak-passwords'] && (
              <div className="mt-2 text-sm text-green-600">
                Found {scanResults['weak-passwords'].findings.length} issues
              </div>
            )}
          </button>
          
          <button
            onClick={() => runScan('inactive-users')}
            disabled={scanning !== null}
            className="p-4 border rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <h4 className="font-medium">Inactive Users Scan</h4>
            <p className="text-sm text-gray-600 mt-1">Find inactive accounts</p>
            {scanning === 'inactive-users' && (
              <div className="mt-2 text-sm text-blue-600">Scanning...</div>
            )}
            {scanResults['inactive-users'] && (
              <div className="mt-2 text-sm text-green-600">
                Found {scanResults['inactive-users'].findings.length} users
              </div>
            )}
          </button>
          
          <button
            onClick={() => runScan('privilege-escalation')}
            disabled={scanning !== null}
            className="p-4 border rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <h4 className="font-medium">Privilege Audit</h4>
            <p className="text-sm text-gray-600 mt-1">Check for unusual privilege changes</p>
            {scanning === 'privilege-escalation' && (
              <div className="mt-2 text-sm text-blue-600">Scanning...</div>
            )}
            {scanResults['privilege-escalation'] && (
              <div className="mt-2 text-sm text-green-600">
                Found {scanResults['privilege-escalation'].findings.length} alerts
              </div>
            )}
          </button>
        </div>

        {/* Scan Results */}
        {Object.entries(scanResults).map(([scanType, result]) => (
          <div key={scanType} className="mt-6 border-t pt-6">
            <h4 className="font-medium mb-3 capitalize">
              {scanType.replace(/-/g, ' ')} Results
            </h4>
            {result.findings.length === 0 ? (
              <p className="text-sm text-gray-600">No issues found</p>
            ) : (
              <div className="space-y-2">
                <div className="text-sm text-gray-600">
                  Found {result.findings.length} issue(s)
                </div>
                <details className="cursor-pointer">
                  <summary className="text-sm text-blue-600 hover:text-blue-800">
                    View details
                  </summary>
                  <div className="mt-2 bg-gray-50 p-4 rounded-lg">
                    <pre className="text-xs overflow-auto">
                      {JSON.stringify(result.findings, null, 2)}
                    </pre>
                  </div>
                </details>
                <div className="mt-3">
                  <h5 className="text-sm font-medium">Recommendations:</h5>
                  <ul className="mt-1 space-y-1">
                    {result.recommendations.map((rec, idx) => (
                      <li key={idx} className="text-sm text-gray-600">• {rec}</li>
                    ))}
                  </ul>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}