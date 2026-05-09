import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Bot, Send, X, Loader2, Sparkles } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

interface WalletAssistantProps {
  walletAddress?: string | null;
  network?: string | null;
}

const QUICK_ACTIONS = [
  { label: '/balance', prompt: 'What is my native balance on the active network?' },
  { label: '/scan', prompt: 'Show me the top 3 pending arbitrage opportunities.' },
  { label: '/points', prompt: 'How many tap-to-earn points do I have?' },
];

export function WalletAssistant({ walletAddress, network }: WalletAssistantProps) {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages, loading]);

  const send = async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || loading) return;
    const next: Message[] = [...messages, { role: 'user', content: trimmed }];
    setMessages(next);
    setInput('');
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('wallet-assistant', {
        body: { messages: next, walletAddress, network },
      });
      if (error) throw error;
      const reply = (data as { message?: string; error?: string })?.message
        ?? (data as { error?: string })?.error
        ?? 'No response.';
      setMessages([...next, { role: 'assistant', content: reply }]);
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Request failed';
      setMessages([...next, { role: 'assistant', content: `\u26a0\ufe0f ${msg}` }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {/* Floating launcher */}
      <motion.button
        onClick={() => setOpen((v) => !v)}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        className={cn(
          'fixed bottom-6 right-6 z-40 h-14 w-14 rounded-full',
          'bg-gradient-to-br from-primary to-accent shadow-lg shadow-primary/30',
          'flex items-center justify-center text-primary-foreground',
          'border border-primary/40 animate-pulse-slow'
        )}
        aria-label="Open AI assistant"
      >
        {open ? <X className="h-5 w-5" /> : <Bot className="h-6 w-6" />}
      </motion.button>

      <AnimatePresence>
        {open && (
          <motion.aside
            initial={{ opacity: 0, x: 50, y: 20 }}
            animate={{ opacity: 1, x: 0, y: 0 }}
            exit={{ opacity: 0, x: 50, y: 20 }}
            transition={{ type: 'spring', stiffness: 280, damping: 28 }}
            className={cn(
              'fixed bottom-24 right-6 z-40 w-[380px] max-w-[calc(100vw-3rem)] h-[520px]',
              'rounded-xl border border-primary/30 bg-card/95 backdrop-blur-xl',
              'shadow-2xl shadow-primary/20 flex flex-col overflow-hidden',
              'font-mono'
            )}
          >
            <header className="flex items-center justify-between px-4 py-3 border-b border-border bg-gradient-to-r from-primary/10 to-accent/10">
              <div className="flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-primary" />
                <span className="text-sm font-semibold tracking-wider text-foreground">FLASHARB ASSISTANT</span>
              </div>
              <span className="text-[10px] text-muted-foreground">
                {walletAddress ? `${walletAddress.slice(0, 6)}\u2026${walletAddress.slice(-4)}` : 'no wallet'}
              </span>
            </header>

            <div ref={scrollRef} className="flex-1 overflow-y-auto p-3 space-y-3 text-sm">
              {messages.length === 0 && (
                <div className="text-center text-muted-foreground py-8 space-y-2">
                  <Bot className="h-8 w-8 mx-auto text-primary/60" />
                  <p className="text-xs">Ask about balances, opportunities, or your points.</p>
                </div>
              )}
              {messages.map((m, i) => (
                <div
                  key={i}
                  className={cn(
                    'rounded-lg px-3 py-2 max-w-[90%]',
                    m.role === 'user'
                      ? 'ml-auto bg-primary/15 border border-primary/30 text-foreground'
                      : 'mr-auto bg-muted/40 border border-border text-foreground'
                  )}
                >
                  <div className="prose prose-sm prose-invert max-w-none break-words [&_p]:my-1 [&_pre]:my-1 [&_code]:text-xs">
                    <ReactMarkdown>{m.content}</ReactMarkdown>
                  </div>
                </div>
              ))}
              {loading && (
                <div className="mr-auto flex items-center gap-2 text-xs text-muted-foreground">
                  <Loader2 className="h-3 w-3 animate-spin" /> {'thinking…'}
                </div>
              )}
            </div>

            <div className="px-3 pt-2 flex flex-wrap gap-1">
              {QUICK_ACTIONS.map((qa) => (
                <button
                  key={qa.label}
                  onClick={() => send(qa.prompt)}
                  disabled={loading}
                  className="text-[10px] px-2 py-1 rounded border border-primary/30 text-primary hover:bg-primary/10 transition-colors disabled:opacity-50"
                >
                  {qa.label}
                </button>
              ))}
            </div>

            <form
              onSubmit={(e) => { e.preventDefault(); send(input); }}
              className="p-3 border-t border-border flex gap-2"
            >
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Ask the terminal…"
                disabled={loading}
                className="flex-1 bg-muted/30 border border-border rounded px-3 py-2 text-sm focus:outline-none focus:border-primary/60"
              />
              <Button type="submit" size="sm" disabled={loading || !input.trim()}>
                <Send className="h-4 w-4" />
              </Button>
            </form>
          </motion.aside>
        )}
      </AnimatePresence>
    </>
  );
}
