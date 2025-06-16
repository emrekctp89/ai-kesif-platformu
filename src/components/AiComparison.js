"use client";

import * as React from "react";
import { useTransition } from "react";
import { getAiComparison } from "@/app/actions";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { CheckCircle, XCircle } from "lucide-react";
import toast from "react-hot-toast";

export function AiComparison({ tools }) {
  const [isPending, startTransition] = useTransition();
  const [analysisResult, setAnalysisResult] = React.useState(null);

  const handleCompareClick = () => {
    startTransition(async () => {
      const result = await getAiComparison(tools);
      if (result.error) {
        toast.error(result.error);
        setAnalysisResult(null);
      } else {
        setAnalysisResult(result.data);
      }
    });
  };

  return (
    <div className="space-y-8">
      <div className="text-center">
        <Button
          onClick={handleCompareClick}
          disabled={isPending || tools.length < 2}
          size="lg"
        >
          {isPending
            ? "Analiz Ediliyor..."
            : "Bu Araçları Yapay Zekaya Karşılaştır"}
        </Button>
        {tools.length < 2 && (
          <p className="text-sm text-muted-foreground mt-2">
            Lütfen karşılaştırmak için en az 2 araç seçin.
          </p>
        )}
      </div>

      {analysisResult && (
        <Card className="bg-muted/50">
          <CardHeader>
            <CardTitle>Yapay Zeka Analizi</CardTitle>
            <CardDescription>
              {analysisResult.comparison_summary}
            </CardDescription>
          </CardHeader>
          <CardContent className="grid md:grid-cols-2 gap-6">
            {analysisResult.detailed_analysis.map((tool) => (
              <div key={tool.tool_name} className="space-y-4">
                <h3 className="font-bold text-lg">{tool.tool_name}</h3>
                <p className="text-sm">
                  <span className="font-semibold">En İyisi:</span>{" "}
                  {tool.best_for}
                </p>
                <div>
                  <h4 className="font-semibold mb-2">Artıları</h4>
                  <ul className="space-y-1">
                    {tool.pros.map((pro, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm">
                        <CheckCircle className="w-4 h-4 text-green-500 mt-0.5 shrink-0" />
                        <span>{pro}</span>
                      </li>
                    ))}
                  </ul>
                </div>
                <div>
                  <h4 className="font-semibold mb-2">Eksileri</h4>
                  <ul className="space-y-1">
                    {tool.cons.map((con, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm">
                        <XCircle className="w-4 h-4 text-destructive mt-0.5 shrink-0" />
                        <span>{con}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
