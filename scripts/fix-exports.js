const fs = require('fs');
const path = require('path');

const filesToFix = [
  'src/config/app-config.js',
  'src/config/database.js',
  'src/config/documentation-setup.js',
  'src/config/middleware-setup.js',
  'src/config/route-setup.js',
  'src/config/swagger-config.js',
  'src/controllers/health-controller.js',
  'src/middleware/error-middleware.js',
  'src/routes/auth-routes.js',
  'src/routes/health-routes.js',
  'src/routes/user-routes.js',
  'src/utils/api-response.js',
  'src/utils/cache-manager.js',
  'src/utils/compression.js',
  'src/utils/config.js',
  'src/utils/error-middleware.js',
  'src/utils/event-emitter.js',
  'src/utils/event-queue.js',
  'src/utils/file-upload.js',
  'src/utils/image-optimizer.js',
  'src/utils/jwt-manager.js',
  'src/utils/password-hasher.js',
  'src/utils/query-builder.js',
  'src/utils/redis-client.js',
  'src/utils/route-handler-factory.js',
  'src/utils/security-headers.js',
  'src/utils/session-manager.js',
  'src/utils/storage-manager.js',
  'src/utils/transaction-manager.js',
  'src/utils/webhook-manager.js',
];

for (const relPath of filesToFix) {
  const filePath = path.join(__dirname, '..', relPath);
  if (!fs.existsSync(filePath)) {
    console.log(`File not found: ${filePath}`);
    continue;
  }

  let content = fs.readFileSync(filePath, 'utf-8');

  // Replace "export default {" with:
  // "const defaultExport = {"
  // and append "export default defaultExport;" at the end of the file.

  if (content.includes('export default {')) {
    content = content.replace(/export default\s*\{/g, 'const defaultExport = {');

    // Check if it already has export default defaultExport (to prevent double appending if run twice)
    if (!content.includes('export default defaultExport;')) {
      content += '\nexport default defaultExport;\n';
      fs.writeFileSync(filePath, content, 'utf-8');
      console.log(`Fixed ${relPath}`);
    } else {
      console.log(`Already fixed ${relPath}`);
    }
  } else {
    console.log(`Could not find 'export default {' in ${relPath}`);
  }
}
