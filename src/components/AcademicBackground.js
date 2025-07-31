'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"
import { Users, Building, FileText } from 'lucide-react'

export function AcademicBackground({ papers }) {
    if (!papers || papers.length === 0) {
        return (
            <div className="text-center py-12">
                <FileText className="mx-auto h-12 w-12 text-muted-foreground" />
                <h3 className="mt-2 text-sm font-medium text-foreground">Akademik Arka Plan Bulunamadı</h3>
                <p className="mt-1 text-sm text-muted-foreground">Bu araçla ilişkili bir bilimsel makale henüz eklenmemiş.</p>
            </div>
        )
    }

    return (
        <Accordion type="single" collapsible className="w-full">
            {papers.map((paper) => (
                <AccordionItem key={paper.id} value={`item-${paper.id}`}>
                    <AccordionTrigger>{paper.title}</AccordionTrigger>
                    <AccordionContent className="space-y-4">
                        <p className="text-sm text-muted-foreground italic">{paper.summary}</p>
                        
                        {paper.authors && (
                            <div>
                                <h4 className="font-semibold text-sm mb-2 flex items-center gap-2"><Users className="w-4 h-4" />Yazarlar</h4>
                                <div className="flex flex-wrap gap-2">
                                    {paper.authors.map(author => (
                                        <div key={author.id} className="text-xs p-2 bg-muted rounded-md">
                                            <p className="font-medium">{author.name}</p>
                                            <p className="text-muted-foreground flex items-center gap-1"><Building className="w-3 h-3" />{author.institution}</p>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                        
                        <a href={paper.doi_url} target="_blank" rel="noopener noreferrer" className="text-sm text-primary hover:underline">
                            Makalenin Tamamını Oku &rarr;
                        </a>
                    </AccordionContent>
                </AccordionItem>
            ))}
        </Accordion>
    )
}
