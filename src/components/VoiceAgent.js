'use client'

import * as React from 'react'
import { useTransition } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Bot, Mic, MicOff, X, Loader, Link as LinkIcon, BookOpen } from 'lucide-react'
import { cn } from '@/lib/utils'
import { getAdvancedVoiceAgentResponse } from '@/app/actions'
import toast from 'react-hot-toast'
import Link from 'next/link'

// ✅ SpeechRecognition API desteği kontrolü
const SpeechRecognition =
  typeof window !== 'undefined' ? (window.SpeechRecognition || window.webkitSpeechRecognition) : null;

// ✅ Önerilen içerik kartları
function SuggestedContentCards({ content }) {
    if (!content || content.length === 0) return null;

    const iconMap = {
        'Araç': <Bot className="w-5 h-5 text-primary" />,
        'Blog Yazısı': <BookOpen className="w-5 h-5 text-orange-500" />,
    };

    return (
        <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-6 w-full max-w-3xl"
        >
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {content.map((item, index) => (
                    <Link key={index} href={item.url || '#'}>
                        <Card className="h-full hover:border-primary transition-colors">
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2 text-base">
                                    {iconMap[item.type] || <LinkIcon className="w-5 h-5" />}
                                    {item.type}
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <p className="font-semibold text-sm">{item.title}</p>
                            </CardContent>
                        </Card>
                    </Link>
                ))}
            </div>
        </motion.div>
    );
}

export function VoiceAgent() {
  const [isOpen, setIsOpen] = React.useState(false);
  const [isListening, setIsListening] = React.useState(false);
  const [isSpeaking, setIsSpeaking] = React.useState(false);
  const [isThinking, startTransition] = useTransition();
  const [transcript, setTranscript] = React.useState('');
  const [aiResponse, setAiResponse] = React.useState(null);
  const [history, setHistory] = React.useState([]);
  const recognitionRef = React.useRef(null);

  // ✅ Konuşmayı sesli okut
const speak = (text) => {
    if (typeof window === 'undefined' || !window.speechSynthesis) return;

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'tr-TR';
    utterance.rate = 1;
    utterance.pitch = 1;

    utterance.onstart = () => setIsSpeaking(true);
    utterance.onend = () => {
      setIsSpeaking(false);
      handleListen(); // Konuşma biter bitmez yeniden dinlemeye başla
    };

    window.speechSynthesis.cancel(); // Önceki konuşmaları iptal et
    window.speechSynthesis.speak(utterance);
  };

  // ✅ Kullanıcıyı dinlemeye başla/durdur
  const handleListen = () => {
    if (isListening) {
      recognitionRef.current?.stop();
      return;
    }

    if (!SpeechRecognition) {
      toast.error("Tarayıcınız ses tanımayı desteklemiyor.");
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = 'tr-TR';
    recognition.continuous = true;
    recognition.interimResults = true;

    recognitionRef.current = recognition;

    recognition.onstart = () => setIsListening(true);
    recognition.onend = () => setIsListening(false);
    recognition.onerror = (event) => {
      console.error("Ses tanıma hatası:", event.error);
      setIsListening(false);
    };

    recognition.onresult = (event) => {
      const fullTranscript = Array.from(event.results)
        .map(result => result[0].transcript)
        .join('');

      setTranscript(fullTranscript);

      // ✅ Cümle tamamlandığında AI'a gönder
      if (event.results[event.results.length - 1].isFinal) {
        recognition.stop();

        const updatedHistory = [...history, { role: 'user', content: fullTranscript }];
        setHistory(updatedHistory);

        startTransition(async () => {
          setAiResponse(null);
          const result = await getAdvancedVoiceAgentResponse(fullTranscript, updatedHistory);

          const responseText = result?.success
            ? result.data.spoken_response
            : result.error || "Bir hata oluştu.";

          setAiResponse(result.success ? result.data : { spoken_response: responseText });
          setHistory(prev => [...prev, { role: 'ai', content: responseText }]);
          speak(responseText);
        });
      }
    };

    recognition.start();
  };

  return (
    <>
      {/* Ana Buton */}
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ delay: 1, duration: 0.5 }}
        className="fixed bottom-6 right-6 z-50"
      >
        <Button
  onClick={() => setIsOpen(true)}
  size="icon"
  className="group w-16 h-16 rounded-full shadow-lg transition-all hover:scale-105"
>
  <Bot className="h-8 w-8 group-hover:animate-bounce transition" />
</Button>

      </motion.div>

      {/* Agent Arayüzü */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex flex-col items-center justify-center"
          >
            <Button onClick={() => setIsOpen(false)} variant="ghost" size="icon" className="absolute top-4 right-4 z-10">
              <X className="h-6 w-6" />
            </Button>

            <div className="flex flex-col items-center justify-center text-center p-8">
              <p className="text-muted-foreground mb-4">Sizi dinliyorum...</p>
              <h2 className="text-3xl font-semibold min-h-[80px] max-w-3xl">{transcript}</h2>
              
              {/* Mikrofon Butonu */}
              <div className="my-12">
                <Button 
                  onClick={handleListen} 
                  size="icon" 
                  className={cn("w-24 h-24 rounded-full transition-all duration-300", 
                    isListening && "bg-red-500 hover:bg-red-600 animate-pulse scale-110")}
                  disabled={isThinking || isSpeaking}
                >
                  {isListening ? <MicOff className="h-10 w-10" /> : <Mic className="h-10 w-10" />}
                </Button>
              </div>

              {/* AI Yanıtı */}
              <div className="min-h-[80px]">
                {isThinking ? (
                  <Loader className="w-10 h-10 animate-spin text-primary" />
                ) : aiResponse?.spoken_response ? (
                  <div className="flex items-center gap-3">
                    <Avatar className="h-9 w-9 border-2 border-primary">
                      <AvatarFallback><Bot /></AvatarFallback>
                    </Avatar>
                    <p className="max-w-2xl text-lg text-left">{aiResponse.spoken_response}</p>
                  </div>
                ) : null}
              </div>

              {/* İçerik Önerileri */}
              <SuggestedContentCards content={aiResponse?.suggested_content} />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}
