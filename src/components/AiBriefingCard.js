// DEĞİŞİKLİK: Bu bileşen artık bir "Server Component" değil,
// sadece veri gösteren basit bir UI bileşenidir.
// 'use client' direktifine ihtiyacı yoktur.

import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Lightbulb, AlertTriangle, CheckCircle, Bot } from 'lucide-react';

// DEĞİŞİKLİK: Bileşen artık veriyi bir prop olarak alıyor.
export function AiBriefingCard({ briefing }) {

    if (!briefing) {
        return (
            <Card>
                <CardHeader>
                    <CardTitle>Haftalık Stratejik Brifing</CardTitle>
                    <CardDescription>
                        AI Stratejisti&apos;nin en son analizleri ve önerileri burada görünecektir.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <p className="text-sm text-muted-foreground">Henüz bir brifing oluşturulmadı. Haftalık görevin çalışmasını bekleyin veya manuel olarak tetikleyin.</p>
                </CardContent>
            </Card>
        );
    }

    const analysis = briefing.analysis_data;

    return (
        <Card className="border-primary/50">
            <CardHeader>
                <CardTitle>{analysis.briefing_title || 'Haftalık Stratejik Brifing'}</CardTitle>
                <CardDescription>
                    {new Date(briefing.created_at).toLocaleDateString('tr-TR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })} tarihli analiz.
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
                <div>
                    <h4 className="font-semibold mb-2 flex items-center gap-2"><Lightbulb className="w-5 h-5 text-yellow-500" />Fırsatlar</h4>
                    <ul className="space-y-2 list-disc pl-5 text-sm text-muted-foreground">
                        {analysis.opportunities?.map((opp, i) => <li key={`opp-${i}`}>{opp}</li>)}
                    </ul>
                </div>
                <div>
                    <h4 className="font-semibold mb-2 flex items-center gap-2"><AlertTriangle className="w-5 h-5 text-destructive" />Riskler</h4>
                    <ul className="space-y-2 list-disc pl-5 text-sm text-muted-foreground">
                         {analysis.risks?.map((risk, i) => <li key={`risk-${i}`}>{risk}</li>)}
                    </ul>
                </div>
                {analysis.action_suggestion && (
                    <div className="pt-4 border-t">
                         <h4 className="font-semibold mb-2 flex items-center gap-2"><CheckCircle className="w-5 h-5 text-green-500" />AI Aksiyon Önerisi</h4>
                         <div className="p-4 bg-background rounded-md space-y-3">
                            <p className="text-sm italic">&quot;{analysis.action_suggestion}&quot;</p>
                            <Button asChild size="sm">
                                <Link href={`/admin/co-pilot?prompt=${encodeURIComponent(`Aksiyon önerisini detaylandır: ${analysis.action_suggestion}`)}`}>
                                    <Bot className="w-4 h-4 mr-2" />
                                    Co-Pilot ile Detaylandır
                                </Link>
                            </Button>
                         </div>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
