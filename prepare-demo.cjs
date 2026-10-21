'use strict';
const fs = require('node:fs');
const path = require('node:path');
const source = fs.readFileSync(path.join(__dirname, 'content.js'), 'utf8');
const marker = 'const END_BUFFER_MS = 60000;';
if (!source.includes(marker)) throw new Error('Demo süre işareti bulunamadı.');
fs.writeFileSync(path.join(__dirname, 'content.demo.js'), source.replace(marker, 'const END_BUFFER_MS = 3000;'), 'utf8');
console.log('Demo hazır: content.demo.js');
