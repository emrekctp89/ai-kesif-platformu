'use client'

import * as React from 'react'
import { useTransition } from 'react'
import { getAiMentorFeedback } from '@/app/actions'
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Lightbulb, Sparkles, Clipboard } from 'lucide-react'
import toast from 'react-hot-toast'

export function AiMentorTab() {
    const [isPending, startTransition] = useTransition();
    const [prompt, setPrompt] = React.useState('');
    const [feedback, setFeedback] = React.useState(null);

    const handleGetFeedback = () => {
        startTransition(async () => {
            setFeedback(null);
            const result = await getAiMentorFeedback(prompt);
            if (result.error) {
                toast.error(result.error);
            } else {
                setFeedback(result.data);
                toast.success("İşte mentorun önerileri!");
            }
        });
    };
    
    const handleCopyToClipboard = (text) => {
        navigator.clipboard.writeText(text);
        toast.success("Prompt panoya kopyalandı!");
    };

    return (
        <Card>
            <CardHeader>
                <CardTitle>Yaratıcı Atölye</CardTitle>
                <CardDescription>
                    Bir fikrin veya basit bir prompt'un var mı? AI Mentor'dan geri bildirim alarak onu mükemmelleştir.
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
                <div className="space-y-2">
                    <Label htmlFor="mentor-prompt">Fikrin veya Prompt'un</Label>
                    <Textarea
                        id="mentor-prompt"
                        value={prompt}
                        onChange={(e) => setPrompt(e.target.value)}
                        placeholder="Örn: 'şapkalı bir kedi'"
                        className="min-h-[100px]"
                    />
                </div>
                <Button onClick={handleGetFeedback} disabled={isPending || prompt.length < 10} className="w-full">
                    <Sparkles className="mr-2 h-4 w-4" />
                    {isPending ? 'Düşünüyorum...' : 'Mentor\'dan Geri Bildirim Al'}
                </Button>

                {feedback && (
                    <div className="space-y-4 pt-6 border-t animate-in fade-in-50">
                        <div>
                            <h4 className="font-semibold mb-2 flex items-center gap-2"><Lightbulb className="w-5 h-5 text-yellow-500" />Mentor Analizi</h4>
                            <p className="text-sm text-muted-foreground italic">&quot;{feedback.analysis}&quot;</p>
                        </div>
                        <div>
                            <h4 className="font-semibold mb-2">Öneriler</h4>
                            <ul className="space-y-2 list-disc pl-5 text-sm">
                                {feedback.suggestions.map((suggestion, i) => <li key={i}>{suggestion}</li>)}
                            </ul>
                        </div>
                        <div>
                            <h4 className="font-semibold mb-2">Geliştirilmiş Prompt</h4>
                            <div className="relative">
                                <Textarea value={feedback.improved_prompt} readOnly className="pr-10 min-h-[120px]" />
                                <Button variant="ghost" size="icon" className="absolute top-2 right-2 h-7 w-7" onClick={() => handleCopyToClipboard(feedback.improved_prompt)}>
                                    <Clipboard className="h-4 w-4" />
                                </Button>
                            </div>
                        </div>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}