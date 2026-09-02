import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';

const DOCS_DIR = path.join(process.cwd(), 'docs');
const QUESTION_FILLER =
  /请问|如何|怎么|怎样|什么|是否|可以|一下|告诉我|我想问|还有|这个|那个/g;

const STOP_NGRAMS = new Set([
  '什么',
  '怎么',
  '怎样',
  '可以',
  '是否',
  '这个',
  '那个',
  '还有',
  '一下',
  '我们',
  '你们',
  '他们',
  '一个',
  '不是',
  '就是',
  '如果',
  '因为',
  '所以',
  '几天',
  '多少',
  '时候',
  '哪里',
  '为何',
  '要几',
  '有没',
  '支持',
  '使用',
  '进行',
  '提供',
  '包括',
  '需要',
  '通过',
  '当前',
  '本地',
  '根据',
]);

export type DocHit = {
  file: string;
  excerpt: string;
};

type DocFile = {
  name: string;
  content: string;
};

async function readAllMarkdown(dir: string): Promise<DocFile[]> {
  const abs = path.resolve(dir);
  const cwd = path.resolve(process.cwd());
  if (!abs.startsWith(cwd)) return [];

  try {
    const names = await readdir(abs);
    const docs = names.filter(
      (name) => name.endsWith('.md') || name.endsWith('.txt'),
    );
    return Promise.all(
      docs.map(async (name) => ({
        name,
        content: await readFile(path.join(abs, name), 'utf8'),
      })),
    );
  } catch {
    return [];
  }
}

function splitIntoChunks(content: string): string[] {
  return content
    .split(/\n\s*\n/)
    .map((chunk) => chunk.trim())
    .filter((chunk) => chunk.length > 0);
}

const QUERY_ALIASES: { test: RegExp; extra: string[] }[] = [
  {
    test: /叫什么|叫啥|你叫|你是谁|贵姓|姓名|名字/,
    extra: ['名字', '你的名字'],
  },
];

function expandQuery(query: string): string[] {
  const extras = QUERY_ALIASES.flatMap((alias) =>
    alias.test.test(query) ? alias.extra : [],
  );
  return [...new Set([query, ...extras])];
}

function keywordsFrom(query: string): string[] {
  const normalized = query.toLowerCase().trim();
  const withoutFiller = normalized.replace(QUESTION_FILLER, ' ');
  const tokens = withoutFiller
    .split(/[\s\p{P}\p{S}]+/u)
    .map((t) => t.replace(/[的了吗呢吧啊呀嘛么]+$/g, ''))
    .filter((t) => t.length >= 2);

  const cjk = withoutFiller.replace(/[^\u4e00-\u9fff]/g, '');
  const ngrams: string[] = [];
  for (const n of [2, 3] as const) {
    if (cjk.length < n) continue;
    for (let i = 0; i <= cjk.length - n; i++) {
      const gram = cjk.slice(i, i + n);
      if (!STOP_NGRAMS.has(gram)) ngrams.push(gram);
    }
  }

  return [...new Set([...tokens, ...ngrams])];
}

function scoreChunk(text: string, tokens: string[]): number {
  const haystack = text.toLowerCase();
  let score = 0;
  for (const token of tokens) {
    if (haystack.includes(token)) score += Math.min(token.length, 8);
  }
  return score;
}

export async function getPersonaFacts(): Promise<string[]> {
  const files = await readAllMarkdown(DOCS_DIR);
  const facts: string[] = [];
  for (const file of files) {
    const name = file.content.match(/你的名字\s*[：:]\s*(.+)/);
    if (name?.[1]) {
      facts.push(
        `你的名字是「${name[1].trim()}」。被问到「你叫什么」「你的名字」「你是谁」时，必须只回答这个名字，禁止自称 AI 或 AI 助手。`,
      );
    }
  }
  return facts;
}

export async function listDocIndex(): Promise<string[]> {
  const files = await readAllMarkdown(DOCS_DIR);
  return files.map((file) => {
    const heading = file.content
      .split('\n')
      .find((line) => line.startsWith('#'))
      ?.replace(/^#+\s*/, '')
      .trim();
    return heading ? `${file.name}（${heading}）` : file.name;
  });
}

export async function searchDocs(query: string): Promise<DocHit[]> {
  const q = query.trim();
  if (!q) return [];

  const files = await readAllMarkdown(DOCS_DIR);
  const tokens = [...new Set(expandQuery(q).flatMap(keywordsFrom))];

  return files
    .flatMap((file) =>
      splitIntoChunks(file.content)
        .map((chunk) => ({
          file: file.name,
          excerpt: chunk,
          score: scoreChunk(chunk, tokens),
        }))
        .filter((hit) => hit.score > 0),
    )
    .sort((a, b) => b.score - a.score)
    .slice(0, 3)
    .map(({ file, excerpt }) => ({ file, excerpt }));
}
