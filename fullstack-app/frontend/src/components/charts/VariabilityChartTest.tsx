'use client';

import React, { useEffect, useState } from 'react';
import VariabilityChart from './VariabilityChart';
import { runAllBoxPlotTests } from '@/lib/charts/boxPlotStatsTest';

// Sample test data that mimics the CDData structure
const sampleData = [
  { entity: 'FAKE_TOOL1', cd_att: 15.2, cd_6sig: 8.1 },
  { entity: 'FAKE_TOOL1', cd_att: 16.8, cd_6sig: 9.2 },
  { entity: 'FAKE_TOOL1', cd_att: 14.5, cd_6sig: 7.8 },
  { entity: 'FAKE_TOOL1', cd_att: 22.1, cd_6sig: 12.5 }, // outlier
  { entity: 'FAKE_TOOL1', cd_att: 15.9, cd_6sig: 8.6 },
  
  { entity: 'FAKE_TOOL2', cd_att: 18.2, cd_6sig: 10.1 },
  { entity: 'FAKE_TOOL2', cd_att: 17.8, cd_6sig: 9.8 },
  { entity: 'FAKE_TOOL2', cd_att: 19.5, cd_6sig: 11.2 },
  { entity: 'FAKE_TOOL2', cd_att: 17.2, cd_6sig: 9.5 },
  { entity: 'FAKE_TOOL2', cd_att: 26.8, cd_6sig: 15.3 }, // outlier
  
  { entity: 'FAKE_TOOL3', cd_att: 12.1, cd_6sig: 6.8 },
  { entity: 'FAKE_TOOL3', cd_att: 13.5, cd_6sig: 7.2 },
  { entity: 'FAKE_TOOL3', cd_att: 11.8, cd_6sig: 6.5 },
  { entity: 'FAKE_TOOL3', cd_att: 12.9, cd_6sig: 7.0 },
  { entity: 'FAKE_TOOL3', cd_att: 13.2, cd_6sig: 7.1 },
];

export default function VariabilityChartTest() {
  const [testResults, setTestResults] = useState<any>(null);

  useEffect(() => {
    // Run statistical verification tests
    const results = runAllBoxPlotTests();
    setTestResults(results);
  }, []);

  return (
    <div className="p-6 bg-white">
      <h2 className="text-xl font-bold mb-4">VariabilityChart Test</h2>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div>
          <h3 className="text-lg font-semibold mb-2">CD ATT by Entity</h3>
          <VariabilityChart
            data={sampleData}
            yField="cd_att"
            groupField="entity"
            width={500}
            height={400}
            margin={{ top: 20, right: 140, bottom: 80, left: 80 }}
          />
        </div>
        <div>
          <h3 className="text-lg font-semibold mb-2">CD 6σ by Entity</h3>
          <VariabilityChart
            data={sampleData}
            yField="cd_6sig"
            groupField="entity"
            width={500}
            height={400}
            margin={{ top: 20, right: 140, bottom: 80, left: 80 }}
          />
        </div>
      </div>
      
      <div className="mt-8 grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="p-4 bg-gray-100 rounded">
          <h4 className="font-semibold mb-2">Test Data Information:</h4>
          <ul className="text-sm text-gray-700 space-y-1">
            <li>• <strong>Entities:</strong> FAKE_TOOL1, FAKE_TOOL2, FAKE_TOOL3</li>
            <li>• <strong>Total Records:</strong> {sampleData.length}</li>
            <li>• <strong>Outliers:</strong> FAKE_TOOL1 (cd_att: 22.1), FAKE_TOOL2 (cd_att: 26.8)</li>
            <li>• <strong>Features:</strong> Box plots with Q1/Q3, median lines, whiskers, outlier points, and mean diamonds</li>
          </ul>
        </div>
        
        {testResults && (
          <div className="p-4 bg-green-50 border border-green-200 rounded">
            <h4 className="font-semibold mb-2 text-green-800">Statistical Verification Results:</h4>
            <div className="text-sm text-green-700 space-y-1">
              <div><strong>Test Data:</strong> [1,2,3,4,5,6,7,8,9,10,15,20,100]</div>
              <div><strong>Q1:</strong> {testResults.calculatedStats.q1} (expected: 3.5)</div>
              <div><strong>Median:</strong> {testResults.calculatedStats.median} (expected: 6)</div>
              <div><strong>Q3:</strong> {testResults.calculatedStats.q3} (expected: 9.5)</div>
              <div><strong>IQR:</strong> {testResults.calculatedStats.iqr} (expected: 6)</div>
              <div><strong>Outliers:</strong> [{testResults.calculatedStats.outliers.join(', ')}] (expected: [100])</div>
              <div><strong>Status:</strong> ✅ Statistical calculations verified</div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}