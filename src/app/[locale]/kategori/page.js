import { createClient } from '@/utils/supabase/server';
import { CategoryGrid } from '@/components/CategoryGrid';

export const revalidate = 3600;

export const metadata = {
  title: 'Kategoriler | AI Keşif Platformu',
  description:
    'Yapay zeka araçlarını kategoriye göre keşfedin: görsel, kod, pazarlama, ses, eğitim ve daha fazlası.',
};

async function getCategories() {
  const supabase = await createClient();
  const { data, error } = await supabase.from('categories').select('name, slug').order('name');

  if (error) {
    console.error('Kategoriler çekilirken hata:', error);
    return [];
  }
  return data || [];
}

export default async function CategoriesIndexPage() {
  const categories = await getCategories();

  return (
    <div className="container mx-auto max-w-6xl px-4 py-12">
      <header className="mb-10 text-center">
        <h1 className="text-3xl font-extrabold tracking-tight text-foreground sm:text-5xl">
          Tüm Kategoriler
        </h1>
        <p className="mx-auto mt-3 max-w-2xl text-base text-muted-foreground sm:text-lg">
          Platformdaki yapay zeka araçlarını ihtiyacına göre gruplanmış kategorilerde keşfet.
        </p>
      </header>

      <CategoryGrid categories={categories} limit={null} showAllLink={false} />
    </div>
  );
}
