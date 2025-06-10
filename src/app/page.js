// src/app/page.js (Düzeltilmiş Hali)

import { supabase } from '@/lib/supabaseClient';
import Link from 'next/link';

export const revalidate = 60;

async function getCategories() {
  const { data, error } = await supabase.from('categories').select('name, slug');
  if (error) {
    console.error('Kategori çekme hatası:', error);
    return [];
  }
  return data;
}

// FİLTRELEME İÇİN GÜNCELLENMİŞ VE DÜZELTİLMİŞ FONKSİYON
async function getTools(categorySlug) {
  let query = supabase
    .from('tools')
    .select(`
      id,
      name,
      description,
      link,
      categories!inner( name, slug ) 
    `) // DÜZELTME: categories yanına !inner ekledik.
    .eq('is_approved', true);

  if (categorySlug) {
    query = query.eq('categories.slug', categorySlug);
  }

  const { data, error } = await query;

  if (error) {
    // Hatayı daha anlaşılır göstermek için güncelledik
    console.error('Araçları filtrelerken hata:', error.message);
    return [];
  }
  return data;
}

export default async function HomePage({ searchParams }) {
  const categorySlug = searchParams.category;
  const tools = await getTools(categorySlug);
  const categories = await getCategories();

  return (
    <div>
      <div className="text-center mb-10">
        <h1 className="text-4xl font-extrabold tracking-tight text-gray-900 sm:text-5xl md:text-6xl">
          Yapay Zeka Araçlarını Keşfet
        </h1>
        <p className="mt-3 max-w-md mx-auto text-base text-gray-500 sm:text-lg md:mt-5 md:text-xl md:max-w-3xl">
          Projeniz veya günlük işleriniz için en iyi AI araçları burada.
        </p>
      </div>

      <div className="flex justify-center flex-wrap gap-2 mb-10">
        <Link href="/"
              className={`px-4 py-2 rounded-full text-sm font-semibold transition ${!categorySlug ? 'bg-indigo-600 text-white shadow' : 'bg-white text-gray-700 hover:bg-gray-200'}`}>
          Tümü
        </Link>
        {categories.map((category) => (
          <Link key={category.slug}
                href={`/?category=${category.slug}`}
                className={`px-4 py-2 rounded-full text-sm font-semibold transition ${categorySlug === category.slug ? 'bg-indigo-600 text-white shadow' : 'bg-white text-gray-700 hover:bg-gray-200'}`}>
            {category.name}
          </Link>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {tools.length > 0 ? (
            tools.map((tool) => (
              <div key={tool.id} className="border rounded-xl p-6 shadow-lg bg-white flex flex-col transition hover:shadow-xl hover:-translate-y-1">
                <div className="flex-grow">
                  <div className="flex justify-between items-start mb-3">
                     <h2 className="text-xl font-bold text-gray-900">{tool.name}</h2>
                     <span className="bg-indigo-100 text-indigo-800 text-xs font-semibold px-2.5 py-0.5 rounded-full">
                       {/* Düzeltme: categories artık bir nesne, dizi değil */}
                       {tool.categories.name}
                     </span>
                  </div>
                  <p className="text-gray-600 mb-4">{tool.description}</p>
                </div>
                <a
                  href={tool.link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-4 block w-full bg-gray-800 text-white text-center font-bold py-2 px-4 rounded-lg hover:bg-black transition-colors"
                >
                  Aracı Ziyaret Et
                </a>
              </div>
            ))
        ) : (
            <p className="col-span-full text-center text-gray-500">Bu kategoride gösterilecek araç bulunamadı.</p>
        )}
      </div>
    </div>
  );
}