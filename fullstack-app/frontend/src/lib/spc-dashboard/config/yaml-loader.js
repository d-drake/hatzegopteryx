const yaml = require("js-yaml");
const fs = require("fs");
const path = require("path");

/**
 * Webpack loader for YAML files
 * This allows importing YAML files directly in TypeScript/JavaScript
 */
module.exports = function (source) {
  try {
    const config = yaml.load(source);
    return `module.exports = ${JSON.stringify(config)}`;
  } catch (error) {
    this.emitError(error);
    return null;
  }
};

