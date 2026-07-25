import { normalizeWorkmindWorkflow, planWorkmindWorkflow } from '@/lib/kasif/workmindPlanner';

describe('Workmind Kâşif planlayıcı', () => {
  it('e-ticaret hedefinde proje kalıbı üretir', () => {
    const result = planWorkmindWorkflow('Sıfırdan bir e-ticaret sitesi kurup pazarlamak istiyorum');

    expect(result.nodes.length).toBeGreaterThanOrEqual(4);
    expect(result.nodes.length).toBeLessThanOrEqual(6);
    expect(result.edges.length).toBe(result.nodes.length - 1);
    expect(result.meta.source).toBe('kasif');
    expect(result.meta.planner).toBe('project-pattern');
    expect(result.meta.patternId).toBe('ecommerce-launch');
    expect(result.nodes.some((n) => n.categorySlug === 'e-ticaret')).toBe(true);
    expect(result.nodes.some((n) => n.categorySlug === 'pazarlama')).toBe(true);
  });

  it('sunum hedefinde goal şablonu kullanır', () => {
    const result = planWorkmindWorkflow('Müşteri sunumu hazırlamak istiyorum');

    expect(result.nodes.length).toBeGreaterThanOrEqual(3);
    expect(result.meta.planner).toBe('goal-template');
    expect(result.meta.goals).toContain('presentation-creation');
    expect(result.nodes.every((n) => n.label && n.categorySlug)).toBe(true);
  });

  it('podcast hedefinde ses ve pazarlama adımları içerir', () => {
    const result = planWorkmindWorkflow('Yeni bir podcast başlatmak istiyorum');

    expect(result.meta.planner).toBe('project-pattern');
    expect(result.nodes.some((n) => n.categorySlug === 'ses-muzik')).toBe(true);
    expect(result.nodes.some((n) => n.categorySlug === 'pazarlama')).toBe(true);
  });

  it('bilinmeyen hedefte generic yedek akış döner', () => {
    const result = planWorkmindWorkflow('Garip bir şey denemek istiyorum belki');

    expect(result.nodes.length).toBeGreaterThanOrEqual(3);
    expect(result.meta.planner).toBe('generic');
    expect(result.edges[0].source).toBe(result.nodes[0].id);
  });

  it('normalizeWorkmindWorkflow boş label ve fazla node temizler', () => {
    const normalized = normalizeWorkmindWorkflow({
      nodes: [
        { id: 'a', label: 'Bir', description: 'x', categorySlug: 'uretkenlik' },
        { id: 'b', label: '', description: 'y', categorySlug: 'pazarlama' },
        { id: 'c', label: 'İki', description: 'z', categorySlug: 'metin-yazarligi' },
        ...Array.from({ length: 8 }, (_, i) => ({
          id: `extra-${i}`,
          label: `Extra ${i}`,
          description: 'd',
          categorySlug: 'diger',
        })),
      ],
      edges: [{ source: 'a', target: 'c' }],
    });

    expect(normalized.nodes.every((n) => n.label)).toBe(true);
    expect(normalized.nodes.length).toBeLessThanOrEqual(6);
    expect(normalized.edges.some((e) => e.source === 'a' && e.target === 'c')).toBe(true);
  });

  it('edge yoksa linear zincir üretir', () => {
    const normalized = normalizeWorkmindWorkflow({
      nodes: [
        { id: 's1', label: 'A', categorySlug: 'diger' },
        { id: 's2', label: 'B', categorySlug: 'diger' },
        { id: 's3', label: 'C', categorySlug: 'diger' },
      ],
      edges: [],
    });

    expect(normalized.edges).toEqual([
      { id: 'e-s1-s2', source: 's1', target: 's2' },
      { id: 'e-s2-s3', source: 's2', target: 's3' },
    ]);
  });
});
