/*
* ---------------------------------------------------
* 1. YENİ BİLEŞEN: src/components/AiConcierge.js
* Bu, sitenin her yerinden erişilebilen, şık sohbet penceresidir.
* ---------------------------------------------------
*/
'use client'

import * as React from 'react'
import { useTransition } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Bot, User, CornerDownLeft, X, Loader, Link as LinkIcon, BookOpen } from 'lucide-react'
import { getAiConciergeResponse } from '@/app/actions'
import Link from 'next/link'

// AI'ın önerdiği içerikleri gösteren kartlar
function SuggestedContentCards({ content }) {
    if (!content || content.length === 0) return null;
    const iconMap = { 'Araç': <Bot />, 'Blog Yazısı': <BookOpen /> };
    return (
        <div className="mt-2 grid grid-cols-1 gap-2">
            {content.map((item, index) => (
                <Link key={index} href={item.url || '#'}>
                    <Card className="bg-background/50 hover:bg-background/80 transition-colors">
                        <CardHeader className="p-3 flex flex-row items-center gap-3">
                            {iconMap[item.type] || <LinkIcon />}
                            <CardTitle className="text-sm">{item.title}</CardTitle>
                        </CardHeader>
                    </Card>
                </Link>
            ))}
        </div>
    );
}

export function AiConcierge() {
  const [isOpen, setIsOpen] = React.useState(false);
  const [messages, setMessages] = React.useState([
      { role: 'ai', content: "Merhaba! Ben platformun AI konsiyerjiyim. Size nasıl yardımcı olabilirim? Örneğin, 'Sosyal medya için görseller nasıl oluştururum?' diye sorabilirsiniz." }
  ]);
  const [input, setInput] = React.useState('');
  const [isPending, startTransition] = useTransition();
  const chatContainerRef = React.useRef(null);

  React.useEffect(() => {
    chatContainerRef.current?.scrollTo(0, chatContainerRef.current.scrollHeight);
  }, [messages]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!input.trim() || isPending) return;
    const newUserMessage = { role: 'user', content: input };
    const newMessages = [...messages, newUserMessage];
    setMessages(newMessages);
    setInput('');

    startTransition(async () => {
        const result = await getAiConciergeResponse(input, newMessages);
        if (result.error) {
            setMessages(prev => [...prev, { role: 'ai', content: `Bir hata oluştu: ${result.error}` }]);
        } else {
            setMessages(prev => [...prev, { role: 'ai', content: result.data }]);
        }
    });
  }

  return (
    <>
      {/* Yüzen Buton */}
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ delay: 1, duration: 0.5 }}
        className="fixed bottom-6 right-6 z-[100]"
      >
        <Button onClick={() => setIsOpen(true)} size="icon" className="w-16 h-16 rounded-full shadow-lg">
          <Bot className="h-8 w-8" />
        </Button>
      </motion.div>

      {/* Sohbet Penceresi */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="fixed bottom-24 right-6 z-[100] w-[90vw] max-w-sm h-[70vh] bg-card border rounded-lg shadow-2xl flex flex-col"
          >
            <header className="p-4 border-b flex items-center justify-between">
                <h3 className="font-semibold">AI Konsiyerj</h3>
                <Button onClick={() => setIsOpen(false)} variant="ghost" size="icon" className="h-7 w-7"><X className="h-4 w-4" /></Button>
            </header>
            <div ref={chatContainerRef} className="flex-1 overflow-y-auto p-4 space-y-4">
                {messages.map((msg, index) => (
                    <div key={index} className={`flex items-start gap-3 text-sm ${msg.role === 'user' ? 'justify-end' : ''}`}>
                        {msg.role === 'ai' && (<Avatar className="h-8 w-8 border"><AvatarFallback><Bot /></AvatarFallback></Avatar>)}
                        <div className={`max-w-xs rounded-lg p-3 ${msg.role === 'user' ? 'bg-primary text-primary-foreground' : 'bg-muted'}`}>
                           {typeof msg.content === 'string' 
                               ? <p>{msg.content}</p>
                               : <>
                                   <p>{msg.content.spoken_response}</p>
                                   <SuggestedContentCards content={msg.content.suggested_content} />
                                 </>
                           }
                        </div>
                        {msg.role === 'user' && (<Avatar className="h-8 w-8"><AvatarFallback><User /></AvatarFallback></Avatar>)}
                    </div>
                ))}
                {isPending && (<div className="flex items-start gap-3"><Avatar className="h-8 w-8 border"><AvatarFallback><Bot /></AvatarFallback></Avatar><div className="max-w-xs rounded-lg p-3 bg-muted"><Loader className="w-5 h-5 animate-spin" /></div></div>)}
            </div>
            <div className="p-2 border-t">
                <form onSubmit={handleSubmit} className="relative">
                    <Textarea value={input} onChange={(e) => setInput(e.target.value)} placeholder="Bir soru sorun..." className="pr-12" rows={2} onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSubmit(e); } }} />
                    <Button type="submit" size="icon" className="absolute bottom-3 right-3 h-7 w-7" disabled={isPending || !input.trim()}><CornerDownLeft className="h-4 w-4" /></Button>
                </form>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}


