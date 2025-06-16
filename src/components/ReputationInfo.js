"use client";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Trophy, Star, MessageSquare, Plus, Heart, Award } from "lucide-react";

// Hangi olayın hangi ikonu ve rengi kullanacağını belirleyen yardımcı obje
const eventIcons = {
  yeni_prompt_gonderdi: {
    icon: <Plus className="w-4 h-4 text-green-500" />,
    text: "Yeni Prompt Paylaşımı",
  },
  prompt_oyu_aldi: {
    icon: <Star className="w-4 h-4 text-yellow-500" />,
    text: "Prompt'unuz Oy Aldı",
  },
  prompt_oyu_iptal_edildi: {
    icon: <Star className="w-4 h-4 text-muted-foreground" />,
    text: "Prompt Oyu Geri Alındı",
  },
  araca_puan_verdi: {
    icon: <Heart className="w-4 h-4 text-red-500" />,
    text: "Bir Araca Puan Verdiniz",
  },
  yeni_yorum_yapti: {
    icon: <MessageSquare className="w-4 h-4 text-blue-500" />,
    text: "Yeni Yorum Yaptınız",
  },
  arac_onerisi_onaylandi: {
    icon: <Trophy className="w-4 h-4 text-orange-500" />,
    text: "Araç Öneriniz Onaylandı",
  },
};

export function ReputationInfo({ reputationPoints, events }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Award className="w-6 h-6 text-primary" />
          İtibar Puanı
        </CardTitle>
        <CardDescription>
          Platforma yaptığınız katkılarla kazandığınız puanlar.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="text-center bg-muted/50 p-6 rounded-lg">
          <p className="text-5xl font-bold">{reputationPoints}</p>
          <p className="text-sm text-muted-foreground">Toplam Puan</p>
        </div>
        <div>
          <h4 className="font-semibold mb-3">Son Aktiviteler</h4>
          <div className="space-y-4">
            {events && events.length > 0 ? (
              events.map((event) => (
                <div
                  key={event.id}
                  className="flex items-center justify-between"
                >
                  <div className="flex items-center gap-3">
                    {eventIcons[event.event_type]?.icon || (
                      <Award className="w-4 h-4" />
                    )}
                    <span className="text-sm">
                      {eventIcons[event.event_type]?.text || event.event_type}
                    </span>
                  </div>
                  <p
                    className={`text-sm font-bold ${event.points_awarded > 0 ? "text-green-500" : "text-red-500"}`}
                  >
                    {event.points_awarded > 0
                      ? `+${event.points_awarded}`
                      : event.points_awarded}
                  </p>
                </div>
              ))
            ) : (
              <p className="text-sm text-muted-foreground text-center py-4">
                Henüz puan kazandıran bir aktiviteniz bulunmuyor.
              </p>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
