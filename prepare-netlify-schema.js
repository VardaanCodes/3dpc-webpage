#!/usr/bin/env node
/**
 * Prepare schema for Netlify deployment by copying the local schema
 * to ensure it's available to the serverless function
 * 
 * @format
 */

import fs from 'fs';
import path from 'path';

const sourceSchema = path.join(process.cwd(), 'netlify', 'functions', 'server', 'schema.js');
const targetDir = path.join(process.cwd(), 'shared');
const targetFile = path.join(targetDir, 'schema.js');

try {
  // Ensure target directory exists
  if (!fs.existsSync(targetDir)) {
    fs.mkdirSync(targetDir, { recursive: true });
  }

  // Copy the schema file
  fs.copyFileSync(sourceSchema, targetFile);
  console.log('Schema file copied to shared directory for Netlify deployment');
} catch (error) {
  console.error('Error preparing schema for Netlify:', error);
  process.exit(1);
}
