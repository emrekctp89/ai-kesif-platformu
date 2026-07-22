import { render, screen } from '@testing-library/react';

const getWorkmindToolRecommendations = jest.fn();

jest.mock('@/app/actions/workmind', () => ({
  getWorkmindToolRecommendations: (...args) => getWorkmindToolRecommendations(...args),
}));
jest.mock('next-intl', () => ({
  useTranslations: () => (key) =>
    ({
      suggestedTools: 'Önerilen araçlar',
      sourceKasif: 'Hedefine göre Kâşif tarafından sıralandı.',
      sourceCategoryFallback: 'Kategori eşleşmesine göre listelendi.',
      kasifPick: 'Kâşif seçimi',
      kasifReason: 'Neden',
      betaBadge: 'Beta',
      sidebarBetaNote: 'Deneme amaçlıdır.',
      openTool: 'Aracı aç',
      noTools: 'Araç bulunamadı.',
      close: 'Kapat',
      details: 'Detaylar',
    })[key] || key,
}));

import { NodeSidebar } from '@/components/workmind/NodeSidebar';

const node = {
  id: 'step-1',
  data: {
    raw: {
      label: 'Sunumu hazırla',
      description: 'Ürün için slayt oluştur.',
      categorySlug: 'sunum',
    },
  },
};

describe('Workmind Kâşif araç paneli', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('Kâşif önerisini kaynağı ve gerekçesiyle gösterir', async () => {
    getWorkmindToolRecommendations.mockResolvedValue({
      source: 'kasif',
      tools: [
        {
          id: 1,
          name: 'Sunum Aracı',
          slug: 'sunum-araci',
          description: 'Hızlı sunum üretir.',
          kasifReason: 'Sunum görevine doğrudan uygun.',
        },
      ],
    });

    render(<NodeSidebar node={node} workflowGoal="Ürünümü tanıt" onClose={jest.fn()} />);

    expect(await screen.findByText('Sunum Aracı')).toBeInTheDocument();
    expect(screen.getByText('Hedefine göre Kâşif tarafından sıralandı.')).toBeInTheDocument();
    expect(screen.getByText('Kâşif seçimi')).toBeInTheDocument();
    expect(screen.getByText('Sunum görevine doğrudan uygun.')).toBeInTheDocument();
    expect(getWorkmindToolRecommendations).toHaveBeenCalledWith('sunum', {
      goal: 'Ürünümü tanıt',
      label: 'Sunumu hazırla',
      description: 'Ürün için slayt oluştur.',
    });
  });

  it('kategori yedeğinin kaynağını açıkça belirtir', async () => {
    getWorkmindToolRecommendations.mockResolvedValue({
      source: 'category',
      tools: [{ id: 2, name: 'Kategori Aracı', slug: 'kategori-araci' }],
    });

    render(<NodeSidebar node={node} workflowGoal="Ürünümü tanıt" onClose={jest.fn()} />);

    expect(await screen.findByText('Kategori Aracı')).toBeInTheDocument();
    expect(screen.getByText('Kategori eşleşmesine göre listelendi.')).toBeInTheDocument();
    expect(screen.queryByText('Kâşif seçimi')).not.toBeInTheDocument();
  });
});
