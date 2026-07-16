import fs from 'node:fs';
import { CATEGORY_SEED } from '../src/lib/categoryConfig.js';

const lines = CATEGORY_SEED.map(
  (c) => `    ('${c.name.replace(/'/g, "''")}', '${c.slug}')`
).join(',\n');

const sql = `-- Genişletilmiş kategori seti (${CATEGORY_SEED.length} kanonik kategori)
-- Mevcut slug'lara dokunmaz; yalnızca eksikleri ekler.
INSERT INTO public.categories (name, slug)
SELECT v.name, v.slug
FROM (
  VALUES
${lines}
) AS v(name, slug)
WHERE NOT EXISTS (
  SELECT 1 FROM public.categories c WHERE c.slug = v.slug
);
`;

const out = 'supabase/migrations/20260716190000_expand_categories_v2.sql';
fs.writeFileSync(out, sql);
console.log(`Wrote ${CATEGORY_SEED.length} categories -> ${out}`);
