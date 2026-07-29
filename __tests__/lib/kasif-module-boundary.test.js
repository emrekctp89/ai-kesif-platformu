/**
 * @jest-environment node
 */

const fs = require('node:fs');
const path = require('node:path');

function walk(directory) {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const target = path.join(directory, entry.name);
    return entry.isDirectory() ? walk(target) : [target];
  });
}

describe('Kâşif module boundary', () => {
  it('platform production code imports only public Kâşif entrypoints', () => {
    const sourceRoot = path.join(process.cwd(), 'src');
    const allowedDomainDirectories = [
      `${path.sep}lib${path.sep}kasif${path.sep}`,
      `${path.sep}app${path.sep}api${path.sep}kasif${path.sep}`,
      `${path.sep}components${path.sep}kasif${path.sep}`,
    ];
    const violations = [];

    for (const file of walk(sourceRoot)) {
      if (!/\.[cm]?[jt]sx?$/.test(file)) continue;
      if (allowedDomainDirectories.some((directory) => file.includes(directory))) continue;
      const content = fs.readFileSync(file, 'utf8');
      const internalImports = content.match(/@\/lib\/kasif\/(?!server(?:['"]|\/))[^'"]+/g) || [];
      if (internalImports.length > 0) {
        violations.push({
          file: path.relative(process.cwd(), file).replaceAll('\\', '/'),
          imports: internalImports,
        });
      }
    }

    expect(violations).toEqual([]);
  });
});
