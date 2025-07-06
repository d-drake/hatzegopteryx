#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');

const METRICS_DIR = path.join(__dirname, '../src/lib/spc-dashboard/config/metrics');
const GENERATED_DIR = path.join(METRICS_DIR, 'generated');

// Ensure generated directory exists
if (!fs.existsSync(GENERATED_DIR)) {
  fs.mkdirSync(GENERATED_DIR, { recursive: true });
}

/**
 * Convert a YAML file to a TypeScript module
 */
function convertYamlToTs(yamlFilePath) {
  try {
    // Read YAML file
    const yamlContent = fs.readFileSync(yamlFilePath, 'utf8');
    const config = yaml.load(yamlContent);
    
    // Get file name without extension
    const baseName = path.basename(yamlFilePath, '.yaml');
    const tsFilePath = path.join(GENERATED_DIR, `${baseName}.ts`);
    
    // Convert config name from kebab-case to camelCase
    const configName = baseName.replace(/-([a-z])/g, (match, letter) => letter.toUpperCase());
    
    // Generate TypeScript content
    const tsContent = `import { SPCMonitorConfig } from '../../types';

export const ${configName}Config: SPCMonitorConfig = ${JSON.stringify(config, null, 2)};`;
    
    // Write TypeScript file
    fs.writeFileSync(tsFilePath, tsContent, 'utf8');
    console.log(`✅ Converted ${path.basename(yamlFilePath)} to ${path.basename(tsFilePath)}`);
    
  } catch (error) {
    console.error(`❌ Error converting ${yamlFilePath}:`, error.message);
  }
}

/**
 * Main function to convert all YAML files in the metrics directory
 */
function main() {
  console.log('🔄 Converting YAML metric configurations to TypeScript...\n');
  
  // Get all YAML files in the metrics directory
  const yamlFiles = fs.readdirSync(METRICS_DIR)
    .filter(file => file.endsWith('.yaml'))
    .map(file => path.join(METRICS_DIR, file));
  
  if (yamlFiles.length === 0) {
    console.log('⚠️  No YAML files found in the metrics directory');
    return;
  }
  
  // Convert each YAML file
  yamlFiles.forEach(convertYamlToTs);
  
  console.log(`\n✨ Converted ${yamlFiles.length} YAML files to TypeScript`);
  console.log('\n📝 Note: The YAML files remain the source of truth.');
  console.log('   The TypeScript files are generated and should not be edited directly.');
}

// Run the conversion
main();