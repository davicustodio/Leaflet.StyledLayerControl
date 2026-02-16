#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');

const envPath = path.join(__dirname, '..', '.env');
const configPath = path.join(__dirname, '..', 'examples', 'config.js');

let key = '';
if (fs.existsSync(envPath)) {
  const content = fs.readFileSync(envPath, 'utf8');
  const match = content.match(/GOOGLE_MAPS_API_KEY=(.+)/);
  if (match) key = match[1].trim();
}

const output = `// Gerado automaticamente - não versionar\nvar GOOGLE_MAPS_API_KEY = '${key}';\n`;
fs.writeFileSync(configPath, output);
console.log('config.js gerado em examples/config.js');
