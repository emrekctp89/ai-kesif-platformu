"use client";

import * as React from "react";
import { useTransition } from "react";
import { getAiProjectStrategy } from "@/app/actions";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Bot, Lightbulb, CheckCircle } from "lucide-react";
import toast from "react-hot-toast";

export function AiProjectStrategist({ projectId }) {
  const [isPending, startTransition] = useTransition();
  const [analysis, setAnalysis] = React.useState(null);

  const handleAnalysisRequest = () => {
    startTransition(async () => {
      setAnalysis(null);
      const result = await getAiProjectStrategy(projectId);
      if (result.error) {
        toast.error(result.error);
      } else {
        setAnalysis(result.data);
        toast.success("Analiz tamamlandı!");
      }
    });
  };

  return (
    <Card className="bg-muted/50 border-dashed">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Bot className="w-6 h-6 text-primary" />
          AI Proje Stratejisti
        </CardTitle>
        <CardDescription>
          Projenizin verilerini yapay zekaya analiz ettirerek stratejik öneriler
          ve yeni fikirler alın.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <Button
          onClick={handleAnalysisRequest}
          disabled={isPending}
          className="w-full"
        >
          {isPending ? "Analiz Ediliyor..." : "Strateji Oluştur"}
        </Button>

        {analysis && (
          <div className="space-y-4 pt-4 border-t animate-in fade-in-50">
            {/* DÜZELTME: Her bölümü render etmeden önce var olup olmadığını kontrol ediyoruz */}
            {analysis.project_summary && (
              <div>
                <h4 className="font-semibold mb-2">Proje Özeti</h4>
                <p className="text-sm text-muted-foreground">
                  {analysis.project_summary}
                </p>
              </div>
            )}
            {analysis.strategic_suggestions?.length > 0 && (
              <div>
                <h4 className="font-semibold mb-2">Stratejik Öneriler</h4>
                <ul className="space-y-2">
                  {analysis.strategic_suggestions.map((suggestion, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm">
                      <Lightbulb className="w-4 h-4 text-yellow-500 mt-0.5 shrink-0" />
                      <span>{suggestion}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {analysis.potential_tools?.length > 0 && (
              <div>
                <h4 className="font-semibold mb-2">
                  Potansiyel Araç Önerileri
                </h4>
                <ul className="space-y-2">
                  {analysis.potential_tools.map((tool, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm">
                      <CheckCircle className="w-4 h-4 text-green-500 mt-0.5 shrink-0" />
                      <span>{tool}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
