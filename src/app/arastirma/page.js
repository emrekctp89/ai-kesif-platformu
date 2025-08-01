import { createClient } from '@/utils/supabase/server';
import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Book, Users, Building } from 'lucide-react';

// Veritabanındaki yeni RPC fonksiyonunu çağıran fonksiyon
async function getResearchPapers() {
    const supabase = createClient();
    const { data, error } = await supabase.rpc('get_all_published_papers');

    if (error) {
        console.error("Araştırma makaleleri çekilirken hata:", error);
        return [];
    }
    return data;
}

export const metadata = {
    title: 'Araştırma Portalı | AI Keşif Platformu',
    description: 'Yapay zeka alanındaki en son bilimsel makaleleri, araştırmaları ve öncü akademisyenleri keşfedin.',
};

export default async function ResearchPortalPage() {
    const papers = await getResearchPapers();

    return (
        <div className="container mx-auto max-w-4xl py-12 px-4">
            <div className="text-center mb-12">
                <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight text-foreground">
                    Araştırma Portalı
                </h1>
                <p className="mt-4 max-w-2xl mx-auto text-lg text-muted-foreground">
                    Yapay zekanın bilimsel temellerini keşfedin. En son makaleler, araştırmalar ve daha fazlası.
                </p>
            </div>

            <div className="space-y-8">
                {papers.length > 0 ? (
                    papers.map((paper) => (
                        <Card key={paper.paper_id}>
                            <CardHeader>
                                <a href={paper.paper_doi_url} target="_blank" rel="noopener noreferrer" className="hover:text-primary">
                                    <CardTitle className="text-xl">{paper.paper_title}</CardTitle>
                                </a>
                                <CardDescription className="pt-2 line-clamp-3">{paper.paper_summary}</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                    <Users className="w-4 h-4" />
                                    <span>{paper.authors.map(a => a.name).join(', ')}</span>
                                </div>
                                <div className="flex items-center gap-2 text-sm text-muted-foreground mt-1">
                                    <Building className="w-4 h-4" />
                                     <span>{paper.authors.map(a => a.institution).join(', ')}</span>
                                </div>
                            </CardContent>
                        </Card>
                    ))
                ) : (
                    <p className="text-center text-muted-foreground py-16">Henüz yayınlanmış bir akademik makale bulunmuyor.</p>
                )}
            </div>
        </div>
    );
}
