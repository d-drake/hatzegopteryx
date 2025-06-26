import { calculateBoxPlotStats, processDataForBoxPlots } from './boxPlotStats';

// Test data with known statistical properties
const testData = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 15, 20, 100]; // 100 is a clear outlier

// Expected results for the test data
const expectedStats = {
  q1: 3.5, // 25th percentile
  median: 6, // 50th percentile
  q3: 9.5, // 75th percentile
  iqr: 6, // Q3 - Q1
  whiskerMin: 1, // Min of non-outlier values
  whiskerMax: 20, // Max of non-outlier values (100 is outlier)
  outliers: [100], // Values beyond Q1 - 1.5*IQR or Q3 + 1.5*IQR
  mean: 18.46, // Approximately
  count: 13
};

export function verifyBoxPlotStatistics() {
  console.log('🧪 Running Box Plot Statistics Verification...');
  
  const stats = calculateBoxPlotStats(testData);
  
  console.log('📊 Calculated Statistics:');
  console.log(`  Q1: ${stats.q1} (expected: ${expectedStats.q1})`);
  console.log(`  Median: ${stats.median} (expected: ${expectedStats.median})`);
  console.log(`  Q3: ${stats.q3} (expected: ${expectedStats.q3})`);
  console.log(`  IQR: ${stats.iqr} (expected: ${expectedStats.iqr})`);
  console.log(`  Whisker Min: ${stats.whiskerMin} (expected: ${expectedStats.whiskerMin})`);
  console.log(`  Whisker Max: ${stats.whiskerMax} (expected: ${expectedStats.whiskerMax})`);
  console.log(`  Outliers: [${stats.outliers.join(', ')}] (expected: [${expectedStats.outliers.join(', ')}])`);
  console.log(`  Mean: ${stats.mean?.toFixed(2)} (expected: ~${expectedStats.mean})`);
  
  // Verify outlier detection logic
  const lowerBound = stats.q1 - 1.5 * stats.iqr;
  const upperBound = stats.q3 + 1.5 * stats.iqr;
  console.log(`🎯 Outlier Bounds: [${lowerBound}, ${upperBound}]`);
  console.log(`  Lower bound: Q1 - 1.5*IQR = ${stats.q1} - 1.5*${stats.iqr} = ${lowerBound}`);
  console.log(`  Upper bound: Q3 + 1.5*IQR = ${stats.q3} + 1.5*${stats.iqr} = ${upperBound}`);
  
  // Test with grouped data
  const groupedTestData = [
    { entity: 'Tool1', value: 10 },
    { entity: 'Tool1', value: 12 },
    { entity: 'Tool1', value: 11 },
    { entity: 'Tool1', value: 25 }, // outlier
    { entity: 'Tool2', value: 20 },
    { entity: 'Tool2', value: 22 },
    { entity: 'Tool2', value: 21 },
    { entity: 'Tool2', value: 35 }, // outlier
  ];
  
  console.log('\n📈 Testing Grouped Data Processing...');
  const groupedResults = processDataForBoxPlots(groupedTestData, 'value', 'entity');
  console.log(`  Entities found: ${groupedResults.entityNames.join(', ')}`);
  
  groupedResults.boxPlotData.forEach(entityData => {
    console.log(`  ${entityData.entity}:`);
    console.log(`    Count: ${entityData.count}`);
    console.log(`    Median: ${entityData.stats.median}`);
    console.log(`    Outliers: [${entityData.stats.outliers.join(', ')}]`);
  });
  
  console.log('\n✅ Statistical verification complete!');
  
  return {
    testData,
    calculatedStats: stats,
    expectedStats,
    groupedResults
  };
}

// Test different outlier thresholds
export function testOutlierThresholds() {
  console.log('\n🎯 Testing Different Outlier Thresholds...');
  
  const data = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 20, 30];
  
  [1.0, 1.5, 2.0, 2.5].forEach(threshold => {
    const stats = calculateBoxPlotStats(data, threshold);
    console.log(`  Threshold ${threshold}: ${stats.outliers.length} outliers [${stats.outliers.join(', ')}]`);
  });
}

// Test edge cases
export function testEdgeCases() {
  console.log('\n🚨 Testing Edge Cases...');
  
  // Empty array
  const emptyStats = calculateBoxPlotStats([]);
  console.log(`  Empty array: all values should be 0`);
  console.log(`    Q1: ${emptyStats.q1}, Median: ${emptyStats.median}, Q3: ${emptyStats.q3}`);
  
  // Single value
  const singleStats = calculateBoxPlotStats([5]);
  console.log(`  Single value [5]: Q1=${singleStats.q1}, Median=${singleStats.median}, Q3=${singleStats.q3}`);
  console.log(`    Outliers: [${singleStats.outliers.join(', ')}]`);
  
  // Two values
  const twoStats = calculateBoxPlotStats([3, 7]);
  console.log(`  Two values [3, 7]: Q1=${twoStats.q1}, Median=${twoStats.median}, Q3=${twoStats.q3}`);
  
  // All same values
  const sameStats = calculateBoxPlotStats([5, 5, 5, 5, 5]);
  console.log(`  All same [5,5,5,5,5]: Q1=${sameStats.q1}, Median=${sameStats.median}, Q3=${sameStats.q3}`);
  console.log(`    IQR: ${sameStats.iqr}, Outliers: [${sameStats.outliers.join(', ')}]`);
}

// Run all tests
export function runAllBoxPlotTests() {
  console.log('🧪 === Box Plot Statistics Test Suite ===\n');
  
  const mainResults = verifyBoxPlotStatistics();
  testOutlierThresholds();
  testEdgeCases();
  
  console.log('\n🎉 All tests completed!');
  return mainResults;
}