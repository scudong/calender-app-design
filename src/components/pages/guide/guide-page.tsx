"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import ReactMarkdown, { type Components } from "react-markdown";
import remarkGfm from "remark-gfm";
import { Button } from "@/components/ui/button";
import { PageHeader, PageRoot } from "@/components/pages/shared/page-chrome";
import { useT } from "@/hooks/use-i18n";

const components: Components = {
  h1: ({ node: _node, ...props }) => <h1 className="mb-5 mt-2 text-[26px] font-semibold tracking-[-0.5px] text-fg" {...props} />,
  h2: ({ node: _node, ...props }) => (
    <h2 className="mb-3 mt-9 border-b border-hairline pb-2 text-[18px] font-semibold tracking-[-0.3px] text-fg" {...props} />
  ),
  h3: ({ node: _node, ...props }) => <h3 className="mb-2 mt-6 text-[15px] font-semibold text-fg" {...props} />,
  h4: ({ node: _node, ...props }) => <h4 className="mb-2 mt-5 text-[14px] font-semibold text-fg" {...props} />,
  p: ({ node: _node, ...props }) => <p className="my-3 text-[14px] leading-[1.75] text-fg-2" {...props} />,
  ul: ({ node: _node, ...props }) => <ul className="my-3 list-disc space-y-1.5 pl-5 text-[14px] text-fg-2" {...props} />,
  ol: ({ node: _node, ...props }) => <ol className="my-3 list-decimal space-y-1.5 pl-5 text-[14px] text-fg-2" {...props} />,
  li: ({ node: _node, ...props }) => <li className="leading-[1.7]" {...props} />,
  strong: ({ node: _node, ...props }) => <strong className="font-medium text-fg" {...props} />,
  a: ({ node: _node, ...props }) => <a className="text-brand underline underline-offset-2" {...props} />,
  blockquote: ({ node: _node, ...props }) => (
    <blockquote className="my-4 border-l-2 border-hairline pl-4 text-[13px] text-fg-2" {...props} />
  ),
  hr: () => <hr className="my-8 border-hairline" />,
  code: ({ node: _node, ...props }) => (
    <code className="rounded bg-app px-1.5 py-0.5 font-mono text-[12px] text-fg" {...props} />
  ),
  pre: ({ node: _node, ...props }) => (
    <pre
      className="my-4 overflow-x-auto rounded-lg border border-hairline bg-app p-4 font-mono text-[12px] leading-[1.6] text-fg [&>code]:bg-transparent [&>code]:p-0"
      {...props}
    />
  ),
  table: ({ node: _node, ...props }) => (
    <div className="my-4 overflow-x-auto rounded-lg border border-hairline">
      <table className="w-full border-collapse text-[13px]" {...props} />
    </div>
  ),
  thead: ({ node: _node, ...props }) => <thead className="bg-app" {...props} />,
  th: ({ node: _node, ...props }) => (
    <th className="border-b border-hairline px-3 py-2 text-left font-medium text-fg" {...props} />
  ),
  td: ({ node: _node, ...props }) => <td className="border-b border-subtle px-3 py-2 align-top text-fg-2" {...props} />,
};

export function GuidePage() {
  const t = useT();
  const [markdown, setMarkdown] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let alive = true;
    fetch("/docs/user-guide.md")
      .then((res) => {
        if (!res.ok) throw new Error(String(res.status));
        return res.text();
      })
      .then((text) => {
        if (alive) setMarkdown(text);
      })
      .catch(() => {
        if (alive) setFailed(true);
      });
    return () => {
      alive = false;
    };
  }, []);

  return (
    <PageRoot>
      <PageHeader
        title={t("User guide")}
        description={t("Everything you need to run the workspace.")}
        actions={
          <Button variant="secondary" size="sm" asChild>
            <Link href="/time-off">{t("Back to app")}</Link>
          </Button>
        }
      />
      <div className="mx-auto w-full max-w-[860px] px-4 pb-12">
        <article className="rounded-xl border border-hairline bg-surface px-6 py-7 md:px-10">
          {failed ? (
            <p className="text-[14px] text-danger">{t("Couldn’t load the guide.")}</p>
          ) : markdown === null ? (
            <p className="text-[14px] text-fg-2">{t("Loading…")}</p>
          ) : (
            <ReactMarkdown remarkPlugins={[remarkGfm]} components={components}>
              {markdown}
            </ReactMarkdown>
          )}
        </article>
      </div>
    </PageRoot>
  );
}
