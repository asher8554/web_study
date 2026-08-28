import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Knowledge Log",
  description: "프로그래밍 및 자기계발 지식 정리 웹페이지",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="ko" className="h-full antialiased" suppressHydrationWarning>
      <head>
        <link
          rel="stylesheet"
          href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard/dist/web/static/pretendard.css"
        />
        <link
          rel="stylesheet"
          href="https://cdn.jsdelivr.net/npm/katex@0.16.11/dist/katex.min.css"
          integrity="sha384-nB0miv6/jRmo5YCBER1viS0U2l7EoVxU2VHIVOKJLO3R5I/LOp6hKJfGQ5KfVGP"
          crossOrigin="anonymous"
        />
      </head>
      <body className="min-h-full flex flex-col font-pretendard">{children}</body>
    </html>
  );
}
