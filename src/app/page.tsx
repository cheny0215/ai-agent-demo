'use client';

import { useChat } from '@ai-sdk/react';
import {
  DefaultChatTransport,
  getToolName,
  isToolUIPart,
  type UIMessage,
} from 'ai';
import {
  Bot,
  ChevronDown,
  Home as HomeIcon,
  MessageSquare,
  Send,
  Settings,
  User,
} from 'lucide-react';
import { useLayoutEffect, useMemo, useRef, useState } from 'react';

import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';
import { log } from 'console';

function ToolCallCard({
  name,
  state,
  input,
  output,
}: {
  name: string;
  state: string;
  input: unknown;
  output: unknown;
}) {
  const [open, setOpen] = useState(true);
  const statusLabel =
    state === 'output-available'
      ? '完成'
      : state === 'output-error'
        ? '失败'
        : '调用中';

  return (
    <Collapsible open={open} onOpenChange={setOpen} className="w-full max-w-md">
      <Card className="gap-0 py-0 shadow-sm">
        <CollapsibleTrigger asChild>
          <button
            type="button"
            className="flex w-full items-center justify-between gap-3 px-3 py-2 text-left"
          >
            <span className="font-mono text-[13px]">{name}</span>
            <span className="flex items-center gap-2">
              <Badge
                variant={state === 'output-error' ? 'destructive' : 'secondary'}
              >
                {statusLabel}
              </Badge>
              <ChevronDown
                className={cn(
                  'size-4 text-muted-foreground transition-transform',
                  open && 'rotate-180',
                )}
              />
            </span>
          </button>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <Separator />
          <CardContent className="bg-muted/50 py-2">
            <pre className="font-mono text-xs leading-5 whitespace-pre-wrap text-muted-foreground">
              {`工具: ${name}
入参: ${JSON.stringify(input ?? {}, null, 2)}
结果: ${JSON.stringify(output ?? undefined, null, 2)}`}
            </pre>
          </CardContent>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  );
}

function MessageRow({ message }: { message: UIMessage }) {
  const isUser = message.role === 'user';

  return (
    <div
      className={cn(
        'flex items-start gap-2',
        isUser ? 'justify-end' : 'justify-start',
      )}
    >
      {!isUser && (
        <Avatar>
          <AvatarFallback className="bg-neutral-800 text-white">
            <Bot className="size-4" />
          </AvatarFallback>
        </Avatar>
      )}
      <div
        className={cn(
          'flex min-w-0 max-w-[75%] flex-col gap-2',
          isUser ? 'items-end' : 'items-start',
        )}
      >
        {message.parts.map((part, i) => {
          if (part.type === 'text' && part.text.trim()) {
            return (
              <div
                key={i}
                className={cn(
                  'rounded-2xl px-3.5 py-2 text-[15px] leading-6',
                  isUser
                    ? 'bg-blue-100 text-foreground'
                    : 'border bg-card text-card-foreground',
                )}
              >
                {part.text}
              </div>
            );
          }

          if (isToolUIPart(part)) {
            return (
              <ToolCallCard
                key={i}
                name={getToolName(part)}
                state={part.state}
                input={part.input}
                output={part.state === 'output-available' ? part.output : undefined}
              />
            );
          }

          return null;
        })}
      </div>
      {isUser && (
        <Avatar>
          <AvatarFallback className="bg-blue-100 text-blue-700">
            <User className="size-4" />
          </AvatarFallback>
        </Avatar>
      )}
    </div>
  );
}

function isNearBottom(el: HTMLElement, threshold = 80) {
  return el.scrollHeight - el.scrollTop - el.clientHeight < threshold;
}

export default function Home() {
  const transport = useMemo(
    () => new DefaultChatTransport({ api: '/api/chat' }),
    [],
  );
  const { messages, sendMessage, status, error } = useChat({ transport });
  const [input, setInput] = useState('');
  const busy = status === 'submitted' || status === 'streaming';
  const viewportRef = useRef<HTMLDivElement>(null);
  const stickToBottom = useRef(true);
  const lastMessageFingerprint = messages.at(-1)
    ? JSON.stringify(messages.at(-1)?.parts)
    : '';

  useLayoutEffect(() => {
    const viewport = viewportRef.current;
    if (!viewport || !stickToBottom.current) return;
    viewport.scrollTop = viewport.scrollHeight;
  }, [messages, status, error, lastMessageFingerprint, busy]);

  return (
    <div className="flex h-svh bg-muted text-foreground">
      <aside className="flex w-14 flex-col items-center gap-3 border-r bg-sidebar py-4">
        <Avatar className="size-8 rounded-lg">
          <AvatarFallback className="rounded-lg bg-blue-500 text-xs font-bold text-white">
            AI
          </AvatarFallback>
        </Avatar>
        <Button variant="ghost" size="icon" type="button" aria-label="Home">
          <HomeIcon />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          type="button"
          aria-label="Chat"
          className="text-blue-500"
        >
          <MessageSquare />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          type="button"
          className="mt-auto"
          aria-label="Settings"
        >
          <Settings />
        </Button>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-12 items-center justify-center border-b bg-background text-[15px] font-medium">
          AI Agent Chat
        </header>

        <ScrollArea
          className="min-h-0 flex-1"
          viewportRef={viewportRef}
          onViewportScroll={() => {
            const viewport = viewportRef.current;
            if (!viewport) return;
            stickToBottom.current = isNearBottom(viewport);
          }}
        >
          <div className="space-y-4 px-6 py-5">
            {messages.length === 0 && (
              <p className="pt-16 text-center text-sm text-muted-foreground">
                输入问题开始对话，工具调用会显示在回复下方
              </p>
            )}
            {messages.map((m) => (
              <MessageRow key={m.id} message={m} />
            ))}
            {busy && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Avatar>
                  <AvatarFallback className="bg-neutral-800 text-white">
                    <Bot className="size-4" />
                  </AvatarFallback>
                </Avatar>
                正在回复…
              </div>
            )}
            {error && (
              <p className="text-sm text-destructive">出错了：{error.message}</p>
            )}
          </div>
        </ScrollArea>

        <form
          className="border-t bg-muted px-4 py-3"
          onSubmit={(e) => {
            e.preventDefault();
            if (!input.trim() || busy) return;
            stickToBottom.current = true;
            sendMessage({ text: input });
            setInput('');
          }}
        >
          <div className="flex items-center gap-2 rounded-xl border bg-background px-2 py-1.5 shadow-sm">
            <Input
              className="border-0 shadow-none focus-visible:ring-0"
              type="text"
              value={input}
              placeholder="输入你的问题..."
              onChange={(e) => setInput(e.target.value)}
              disabled={busy}
            />
            <Button
              type="submit"
              className="bg-blue-500 text-white hover:bg-blue-600"
              disabled={busy || !input.trim()}
            >
              发送/生成
              <Send data-icon="inline-end" />
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
