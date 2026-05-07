const fs = require('fs');
const path = require('path');

const ROOT_DIR = path.join(__dirname, '..', 'src');

const patterns = [
  /collection\s*\(\s*.*['"`]employees['"`]/g,
  /collection\s*\(\s*.*['"`]punches['"`]/g,
  /collection\s*\(\s*.*['"`]schedules['"`]/g,
  /collection\s*\(\s*.*['"`]sectors['"`]/g,
  /collection\s*\(\s*.*['"`]scales['"`]/g,
  /collection\s*\(\s*.*['"`]occurrences['"`]/g,
  /where\s*\(\s*['"`]tenantId['"`]/g,
  /userData\?\.\s*tenantId/g,
  /doc\s*\(\s*.*['"`]companies['"`]/g,
];

const allowedExtensions = ['.ts', '.tsx', '.js', '.jsx'];

function scanDir(dir) {
  const files = fs.readdirSync(dir);

  for (const file of files) {
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);

    if (stat.isDirectory()) {
      scanDir(fullPath);
      continue;
    }

    if (!allowedExtensions.includes(path.extname(fullPath))) continue;

    const content = fs.readFileSync(fullPath, 'utf8');

    patterns.forEach((pattern) => {
      const matches = content.match(pattern);
      if (matches) {
        console.log(`\n[PROBLEMA] ${fullPath}`);
        matches.forEach((m) => console.log(`   -> ${m}`));
      }
    });
  }
}

console.log('Auditando projeto multi-tenant...\n');
scanDir(ROOT_DIR);
console.log('\nAuditoria finalizada.');