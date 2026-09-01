'use client';

import { useChat } from '@ai-sdk/react';
import { DefaultChatTransport } from 'ai';
import { useMemo, useState } from 'react';

export default function Home() {
  const transport = useMemo(
    () => new DefaultChatTransport({ api: '/api/chat' }),
    [],
  );
  const { messages, sendMessage, status, error } = useChat({ transport });
  const [input, setInput] = useState('');
  const busy = status === 'submitted' || status === 'streaming';

  return (
    <div>
      <h1>Chat</h1>
      <div className='flex flex-col gap-2 p-2 max-h-[500px] overflow-y-auto '>
        {messages.map((m) => (
          <div key={m.id} className='flex flex-col gap-2'>
            <div className='text-sm text-gray-500'>{m.role}</div>
            {m.parts.map((part, i) =>
              part.type === 'text' ? <span key={i}>{part.text}</span> : null,
            )}
          </div>
        ))}
        {busy && <div className="text-sm text-gray-400">正在回复…</div>}
        {error && (
          <div className="text-sm text-red-600">出错了：{error.message}</div>
        )}
      </div>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (!input.trim() || busy) return;
          sendMessage({ text: input });
          setInput('');
        }}
      >
        <input
          className='border-1 p-2'
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          disabled={busy}
        />
        <button type="submit" className="ml-2 border p-2" disabled={busy}>
          发送
        </button>
      </form>
    </div>
  );
}
