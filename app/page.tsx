"use client";

import {
  RichTextEditorDemo,
  type RichTextEditorRef,
} from "@/components/tiptap/rich-text-editor";
import { useRef, useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import { useDebounce } from "@/hooks/use-debounce";

const content =
  '# Markdown Test\n\nClick **"Parse Markdown"** to load content from the left panel.';

export default function Home() {
  const [markdownInput, setMarkdownInput] = useState(content);
  const [error, setError] = useState<string | null>(null);
  const editorRef = useRef<RichTextEditorRef>(null);

  const parseMarkdown = (markdown: string) => {
    const editor = editorRef.current?.editor;
    if (!editor || !editor.markdown) {
      setError("Editor or MarkdownManager not available");
      return;
    }

    try {
      setError(null);
      editor.commands.setContent(markdown, { contentType: "markdown" });
    } catch (err) {
      console.error(err);
      setError(
        `Error parsing markdown: ${
          err instanceof Error ? err.message : String(err)
        }`
      );
    }
  };

  const getEditorAsMarkdown = () => {
    const editor = editorRef.current?.editor;
    if (!editor) {
      return "";
    }

    try {
      return editor.getMarkdown();
    } catch {
      return editor.getText();
    }
  };

  return (
    <div className="min-h-screen bg-background p-4 sm:p-6 lg:p-8">
      <div className="mx-auto max-w-screen-5xl space-y-4">
        {/* Control Buttons */}
        <div className="flex items-center justify-center gap-3">
          <button
            type="button"
            onClick={() => parseMarkdown(markdownInput)}
            disabled={!editorRef.current?.editor || !markdownInput.trim()}
            className="rounded-md bg-secondary px-4 py-2 text-sm font-medium text-secondary-foreground transition-colors hover:bg-secondary/80 disabled:cursor-not-allowed disabled:opacity-50"
            title="Manually parse markdown (auto-parsing is enabled)"
          >
            Parse Markdown →
          </button>

          <button
            type="button"
            onClick={() => {
              const editor = editorRef.current?.editor;
              if (editor) {
                const markdown = getEditorAsMarkdown();
                setMarkdownInput(markdown);
              }
            }}
            className="rounded-md bg-secondary px-4 py-2 text-sm font-medium text-secondary-foreground transition-colors hover:bg-secondary/80"
          >
            ← Extract Markdown
          </button>
        </div>

        {/* Error Message */}
        {error && (
          <div className="rounded-lg border border-destructive bg-destructive/10 p-4 text-sm text-destructive">
            {error}
          </div>
        )}

        {/* Side by Side Layout */}
        <div className="grid min-h-[600px] grid-cols-1 gap-4 lg:grid-cols-2">
          {/* Markdown Input Panel */}
          <div className="flex min-h-[600px] flex-col lg:min-h-0">
            <h2 className="text-base font-semibold text-foreground mb-4">
              Markdown Input
            </h2>

            <div className="flex min-h-0 flex-1">
              <textarea
                className={cn(
                  "min-h-0 w-full flex-1 resize-none font-mono border border-input rounded-lg bg-background p-4 text-sm text-foreground placeholder:text-muted-foreground",
                  "focus:outline-none focus:ring-none"
                )}
                value={markdownInput}
                onChange={(e) => setMarkdownInput(e.target.value)}
                placeholder="Enter markdown here..."
              />
            </div>
          </div>

          {/* Editor Panel */}
          <div className="flex min-h-[600px] flex-col rounded-lg bg-card lg:min-h-0">
            <h2 className="text-base font-semibold text-foreground mb-4">
              Tiptap Editor
            </h2>
            <div className="flex min-h-0 flex-1">
              <RichTextEditorDemo
                className="h-full w-full rounded-xl"
                ref={editorRef}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
