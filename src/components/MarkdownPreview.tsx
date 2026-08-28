"use client";

import { useEffect, useRef } from "react";
import katex from "katex";

interface MarkdownPreviewProps {
  content: string;
}

function renderKaTeX(text: string): string {
  // Inline math: $...$
  let result = text.replace(/\$([^$\n]+)\$/g, (_, math) => {
    try {
      return katex.renderToString(math, { throwOnError: false });
    } catch {
      return `$${math}$`;
    }
  });

  // Display math: $$...$$
  result = result.replace(/\$\$([^$]+)\$\$/g, (_, math) => {
    try {
      return katex.renderToString(math, {
        displayMode: true,
        throwOnError: false,
      });
    } catch {
      return `$$${math}$$`;
    }
  });

  return result;
}

function parseMarkdown(text: string): string {
  let html = text;

  // Code blocks (```...```)
  html = html.replace(
    /```(\w+)?\n([\s\S]*?)```/g,
    (_, lang, code) =>
      `<pre class="bg-black/5 dark:bg-white/5 rounded-lg p-4 overflow-x-auto"><code class="text-sm font-mono">${escapeHtml(code.trim())}</code></pre>`
  );

  // Inline code
  html = html.replace(
    /`([^`]+)`/g,
    '<code class="bg-black/5 dark:bg-white/5 px-1.5 py-0.5 rounded text-sm font-mono">$1</code>'
  );

  // Headers
  html = html.replace(
    /^### (.+)$/gm,
    '<h3 class="text-lg font-semibold mt-6 mb-2">$1</h3>'
  );
  html = html.replace(
    /^## (.+)$/gm,
    '<h2 class="text-xl font-bold mt-8 mb-3">$1</h2>'
  );
  html = html.replace(
    /^# (.+)$/gm,
    '<h1 class="text-2xl font-bold mt-8 mb-4">$1</h1>'
  );

  // Bold and italic
  html = html.replace(/\*\*\*(.+?)\*\*\*/g, "<strong><em>$1</em></strong>");
  html = html.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");
  html = html.replace(/\*(.+?)\*/g, "<em>$1</em>");

  // Links
  html = html.replace(
    /\[([^\]]+)\]\(([^)]+)\)/g,
    '<a href="$2" class="text-indigo-500 hover:underline" target="_blank" rel="noopener noreferrer">$1</a>'
  );

  // Images
  html = html.replace(
    /!\[([^\]]*)\]\(([^)]+)\)/g,
    '<img src="$2" alt="$1" class="max-w-full rounded-lg my-4" />'
  );

  // Unordered lists
  html = html.replace(
    /^[*-] (.+)$/gm,
    '<li class="ml-4 list-disc">$1</li>'
  );

  // Ordered lists
  html = html.replace(/^\d+\. (.+)$/gm, '<li class="ml-4 list-decimal">$1</li>');

  // Blockquotes
  html = html.replace(
    /^> (.+)$/gm,
    '<blockquote class="border-l-4 border-indigo-500 pl-4 text-foreground/70 italic">$1</blockquote>'
  );

  // Horizontal rules
  html = html.replace(
    /^---$/gm,
    '<hr class="my-6 border-white/20" />'
  );

  // Line breaks
  html = html.replace(/\n\n/g, "</p><p class='mb-4'>");
  html = html.replace(/\n/g, "<br />");

  // Wrap in paragraph
  html = `<p class="mb-4">${html}</p>`;

  // Apply KaTeX
  html = renderKaTeX(html);

  return html;
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

export default function MarkdownPreview({ content }: MarkdownPreviewProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (containerRef.current) {
      containerRef.current.innerHTML = parseMarkdown(content);
    }
  }, [content]);

  return (
    <div
      ref={containerRef}
      className="prose prose-sm dark:prose-invert max-w-none text-foreground"
    />
  );
}
