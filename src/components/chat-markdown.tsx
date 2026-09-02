'use client';

import hljs from 'highlight.js';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import 'highlight.js/styles/github-dark.css';

import { cn } from '@/lib/utils';

function highlightCode(code: string, specified?: string) {
  const lang = specified?.trim();
  if (lang && hljs.getLanguage(lang)) {
    return {
      html: hljs.highlight(code, { language: lang, ignoreIllegals: true }).value,
      language: lang,
    };
  }
  const result = hljs.highlightAuto(code);
  return {
    html: result.value,
    language: result.language ?? lang ?? 'text',
  };
}

function CodeBlock({
  code,
  specifiedLang,
}: {
  code: string;
  specifiedLang?: string;
}) {
  const { html, language } = highlightCode(code, specifiedLang);

  return (
    <div className="my-2 w-full min-w-0 max-w-full rounded-lg bg-neutral-900">
      <div className="border-b border-white/10 px-3 py-1">
        <span className="font-mono text-[11px] text-neutral-400">{language}</span>
      </div>
      <div className="overflow-x-auto overscroll-x-contain">
        <pre className="w-max min-w-full p-3 font-mono text-[13px] leading-5 whitespace-pre">
          <code
            className="hljs overflow-visible bg-transparent p-0"
            dangerouslySetInnerHTML={{ __html: html }}
          />
        </pre>
      </div>
    </div>
  );
}

export function ChatMarkdown({
  children,
  className,
}: {
  children: string;
  className?: string;
}) {
  return (
    <div
      className={cn(
        'text-[15px] leading-6 break-words min-w-0 max-w-full overflow-x-hidden',
        '[&_p]:my-2 [&_p:first-child]:mt-0 [&_p:last-child]:mb-0',
        '[&_ul]:my-2 [&_ul]:list-disc [&_ul]:pl-5',
        '[&_ol]:my-2 [&_ol]:list-decimal [&_ol]:pl-5',
        '[&_li]:my-0.5',
        '[&_a]:text-blue-600 [&_a]:underline',
        className,
      )}
    >
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          pre: ({ children }) => <>{children}</>,
          code: ({ className, children }) => {
            const text = String(children).replace(/\n$/, '');
            const specifiedLang = className?.startsWith('language-')
              ? className.slice('language-'.length)
              : undefined;
            const isBlock = Boolean(specifiedLang) || text.includes('\n');

            if (!isBlock) {
              return (
                <code className="rounded bg-muted px-1 py-0.5 font-mono text-[0.85em]">
                  {text}
                </code>
              );
            }

            return <CodeBlock code={text} specifiedLang={specifiedLang} />;
          },
        }}
      >
        {children}
      </ReactMarkdown>
    </div>
  );
}
