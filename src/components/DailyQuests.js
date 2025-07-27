'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { Flame, Star, MessageSquare, Heart, UserPlus, CheckCircle } from "lucide-react"
import { cn } from "@/lib/utils"

// Görev türüne göre ikon belirleyen yardımcı obje
const questIcons = {
    'rating': <Star className="w-5 h-5 text-yellow-500" />,
    'comment': <MessageSquare className="w-5 h-5 text-blue-500" />,
    'favorite': <Heart className="w-5 h-5 text-red-500" />,
    'follow_user': <UserPlus className="w-5 h-5 text-green-500" />,
    // Diğer görev türleri için de eklenebilir
};

export function DailyQuests({ quests, streak }) {
    return (
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center justify-between">
                    <span>Günün Görevleri</span>
                    {streak > 0 && (
                        <TooltipProvider>
                            <Tooltip>
                                <TooltipTrigger>
                                    <div className="flex items-center gap-1 text-orange-500 font-bold">
                                        <Flame className="w-5 h-5" />
                                        <span>{streak} Günlük Seri</span>
                                    </div>
                                </TooltipTrigger>
                                <TooltipContent>
                                    <p>Görevleri tamamlamaya devam ederek serini koru!</p>
                                </TooltipContent>
                            </Tooltip>
                        </TooltipProvider>
                    )}
                </CardTitle>
                <CardDescription>
                     Bu görevleri tamamlayarak itibar puanı kazanın ve serinizi devam ettirin.
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                {quests && quests.length > 0 ? (
                    quests.map(quest => {
                        const progress = (quest.current_progress / quest.quests.target_count) * 100;
                        return (
                            <div key={quest.quest_id} className="space-y-2">
                                <div className="flex items-center justify-between text-sm">
                                    <div className="flex items-center gap-2 font-medium">
                                        {quest.is_completed 
                                            ? <CheckCircle className="w-5 h-5 text-green-500" /> 
                                            : questIcons[quest.quests.action_type]
                                        }
                                        <span>{quest.quests.description}</span>
                                    </div>
                                    <span className="font-semibold text-primary">+{quest.quests.reputation_reward} Puan</span>
                                </div>
                                {!quest.is_completed && (
                                    <div className="flex items-center gap-2">
                                        <Progress value={progress} className="w-full" />
                                        <span className="text-xs text-muted-foreground">{quest.current_progress}/{quest.quests.target_count}</span>
                                    </div>
                                )}
                            </div>
                        )
                    })
                ) : (
                    <p className="text-sm text-muted-foreground text-center py-4">Bugün için yeni görevleriniz henüz atanmadı. Lütfen daha sonra tekrar kontrol edin.</p>
                )}
            </CardContent>
        </Card>
    );
}
