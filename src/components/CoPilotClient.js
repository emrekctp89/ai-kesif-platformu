import logger from '@/utils/logger';
('use client');

import * as React from 'react';
import { useTransition, useRef, useEffect } from 'react';
import {
  Bot,
  User,
  CornerDownLeft,
  Lightbulb,
  Clipboard,
  ThumbsUp,
  ThumbsDown,
} from 'lucide-react';
import { useTranslations } from 'next-intl';
import toast from 'react-hot-toast';
import { js as beautify } from 'js-beautify';

import { getAdminCoPilotResponse } from '@/app/actions';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';

function AiResponse({ data }) {
  const t = useTranslations('CoPilot');

  if (!data) return <p className="text-destructive">{t('noData')}</p>;

  const handleCopy = (code) => {
    navigator.clipboard.writeText(code);
    toast.success(t('copied'));
  };

  const handleFeedback = (isHelpful) => {
    toast.success(`${t('feedbackThanks')} ${isHelpful ? '👍' : '👎'}`);
  };

  return (
    <Card className="border bg-background/50">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Lightbulb className="h-5 w-5 text-yellow-500" aria-hidden="true" />
          {data.response_title || t('analysisFallback')}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4 text-sm">
        {data.response_text ? <p className="text-muted-foreground">{data.response_text}</p> : null}

        {data.code_suggestion && data.code_suggestion.code ? (
          <div className="space-y-2">
            <h4 className="font-semibold">{t('codeSuggestion')}</h4>
            <p className="text-xs text-muted-foreground">{data.code_suggestion.explanation}</p>
            <div className="relative rounded-md bg-black p-4 font-mono text-xs text-white">
              <Button
                variant="ghost"
                size="icon"
                className="absolute right-2 top-2 h-6 w-6"
                onClick={() => handleCopy(data.code_suggestion.code)}
                aria-label={t('copied')}
              >
                <Clipboard className="h-4 w-4" />
              </Button>
              <pre>
                <code className={`language-${data.code_suggestion.language}`}>
                  {data.code_suggestion.code}
                </code>
              </pre>
            </div>
          </div>
        ) : null}

        <div className="flex justify-end gap-2">
          <Button variant="outline" size="sm" onClick={() => handleFeedback(true)}>
            <ThumbsUp className="mr-2 h-4 w-4" aria-hidden="true" />
            {t('helpful')}
          </Button>
          <Button variant="outline" size="sm" onClick={() => handleFeedback(false)}>
            <ThumbsDown className="mr-2 h-4 w-4" aria-hidden="true" />
            {t('notHelpful')}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

export function CoPilotClient() {
  const t = useTranslations('CoPilot');
  const [messages, setMessages] = React.useState([]);
  const [input, setInput] = React.useState('');
  const [isPending, startTransition] = useTransition();
  const chatContainerRef = useRef(null);
  const welcomeSeeded = useRef(false);

  useEffect(() => {
    if (!welcomeSeeded.current) {
      welcomeSeeded.current = true;
      setMessages([{ role: 'ai', content: t('welcome') }]);
    }
  }, [t]);

  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!input.trim() || isPending) return;

    const newUserMessage = { role: 'user', content: input };
    const newMessages = [...messages, newUserMessage];
    setMessages(newMessages);
    setInput('');

    startTransition(async () => {
      const result = await getAdminCoPilotResponse(input, newMessages);
      if (result.error) {
        setMessages((prev) => [
          ...prev,
          { role: 'ai', content: t('errorPrefix', { error: result.error }) },
        ]);
      } else {
        let aiResponseContent = result.data;
        if (result.data.code_suggestion && result.data.code_suggestion.code) {
          try {
            const formattedCode = beautify(result.data.code_suggestion.code, {
              indent_size: 4,
              space_in_empty_paren: true,
            });
            aiResponseContent = {
              ...result.data,
              code_suggestion: { ...result.data.code_suggestion, code: formattedCode },
            };
          } catch (error) {
            logger.error('Kod formatlama hatası:', error);
          }
        }
        setMessages((prev) => [
          ...prev,
          { role: 'ai', content: aiResponseContent, isResponse: true },
        ]);
      }
    });
  };

  return (
    <div className="flex h-full flex-col">
      <div ref={chatContainerRef} className="flex-1 space-y-6 overflow-y-auto p-4">
        {messages.map((msg, index) => (
          <div
            key={index}
            className={`flex items-start gap-4 ${msg.role === 'user' ? 'justify-end' : ''}`}
          >
            {msg.role === 'ai' ? (
              <Avatar className="h-9 w-9 border-2 border-primary">
                <AvatarFallback>
                  <Bot aria-hidden="true" />
                </AvatarFallback>
              </Avatar>
            ) : null}
            <div
              className={`max-w-xl rounded-2xl p-3 ${
                msg.role === 'user' ? 'bg-primary text-primary-foreground' : 'bg-muted'
              }`}
            >
              {msg.isResponse ? (
                <AiResponse data={msg.content} />
              ) : (
                <p className="whitespace-pre-wrap">{msg.content}</p>
              )}
            </div>
            {msg.role === 'user' ? (
              <Avatar className="h-9 w-9">
                <AvatarFallback>
                  <User aria-hidden="true" />
                </AvatarFallback>
              </Avatar>
            ) : null}
          </div>
        ))}
        {isPending ? (
          <div className="flex animate-pulse items-start gap-4">
            <Avatar className="h-9 w-9 border-2 border-primary">
              <AvatarFallback>
                <Bot aria-hidden="true" />
              </AvatarFallback>
            </Avatar>
            <div className="max-w-sm rounded-2xl bg-muted p-4">
              <div className="h-2 w-24 rounded bg-slate-400" />
              <span className="sr-only">{t('sending')}</span>
            </div>
          </div>
        ) : null}
      </div>

      <div className="border-t border-border/60 bg-background p-4">
        <form onSubmit={handleSubmit} className="relative">
          <Textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={t('placeholder')}
            className="min-h-[50px] resize-none pr-20"
            aria-label={t('placeholder')}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSubmit(e);
              }
            }}
          />
          <Button
            type="submit"
            size="icon"
            className="absolute bottom-3 right-3"
            disabled={isPending || !input.trim()}
            aria-label={isPending ? t('sending') : t('send')}
          >
            <CornerDownLeft className="h-4 w-4" />
          </Button>
        </form>
      </div>
    </div>
  );
}
