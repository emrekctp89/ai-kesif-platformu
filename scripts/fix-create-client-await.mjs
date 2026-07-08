import fs from 'fs';
import path from 'path';

const exclude = new Set([
  'src/components/ChatWindow.js',
  'src/components/ActivityFeedClient.js',
  'src/components/ToolComments.js',
  'src/utils/redis-client.js',
  'src/utils/supabase/admin.js',
  'src/app/api/v1/tools/route.js',
  'src/utils/supabase/actions.js',
  'src/utils/supabase/server.js',
]);

function walk(dir, files = []) {
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, ent.name);
    if (ent.isDirectory()) walk(p, files);
    else if (/\.(js|jsx)$/.test(ent.name)) files.push(p.split(path.sep).join('/'));
  }
  return files;
}

let updated = 0;
for (const file of walk('src')) {
  if (exclude.has(file)) continue;
  let content = fs.readFileSync(file, 'utf8');
  if (!/from ['"]@\/utils\/supabase\/(actions|server)['"]/.test(content)) continue;
  const orig = content;
  content = content.replace(/await await createClient\(/g, 'await createClient(');
  content = content.replace(
    /createClient\(await cookies\(\)\)/g,
    'await createClient(await cookies())'
  );
  content = content.replace(/await createClient\(\)/g, '<<<AWAIT_CC>>>');
  content = content.replace(/createClient\(\)/g, 'await createClient()');
  content = content.replace(/<<<AWAIT_CC>>>/g, 'await createClient()');
  content = content.replace(
    /await createClient\(\)\s*\n\s*\.auth\.getUser\(\)/g,
    'await createClient()\n      .then((supabase) => supabase.auth.getUser())'
  );
  content = content.replace(
    /await createClient\(\)\.auth\.getUser\(\)/g,
    '(await createClient()).auth.getUser()'
  );
  if (content !== orig) {
    fs.writeFileSync(file, content);
    console.log('Updated:', file);
    updated++;
  }
}
console.log('Total:', updated);