"use client";
import "./tiptap.css";
import { cn } from "@/lib/utils";
import {
  EditorContent,
  type Extension,
  useEditor,
  type Editor,
} from "@tiptap/react";
import { EditorToolbar } from "./toolbars/editor-toolbar";
import { forwardRef, useImperativeHandle } from "react";
import { SlashCommand } from "./extensions/slash-command";
import { FloatingToolbarCustom } from "./extensions/floating-toolbar-custom";
import { extensions } from "./extensions/extensions";

export interface RichTextEditorRef {
  editor: Editor | null;
  getMarkdown: () => string;
}

export const RichTextEditorDemo = forwardRef<
  RichTextEditorRef,
  { className?: string }
>(({ className }, ref) => {
  const editor = useEditor({
    immediatelyRender: false,
    extensions: extensions as Extension[],
    editorProps: {
      attributes: {
        class: "max-w-full focus:outline-none",
      },
    },
    contentType: "markdown",
    content:
      '# Markdown Test\n\nClick **"Parse Markdown"** to load content from the left panel.',
    onUpdate: ({ editor }) => {
      console.log(editor.getText());
    },
  });

  useImperativeHandle(ref, () => ({
    editor,
    getMarkdown: () => {
      if (!editor) return "";
      try {
        const markdownStorage = editor.storage.markdown as any;
        if (
          markdownStorage &&
          typeof markdownStorage.getMarkdown === "function"
        ) {
          return markdownStorage.getMarkdown();
        }
      } catch (e) {
        // Fallback to text if markdown storage is unavailable
      }
      return editor.getText();
    },
  }));

  if (!editor) return null;

  return (
    <div
      className={cn(
        "relative max-h-[calc(100dvh-6rem)] border w-full overflow-y-scroll bg-card pb-[60px] sm:pb-0",
        className
      )}
    >
      <EditorToolbar editor={editor} />
      <FloatingToolbarCustom editor={editor} />
      <SlashCommand editor={editor} />
      <EditorContent
        editor={editor}
        className=" min-h-[600px] w-full min-w-full cursor-text"
      />
    </div>
  );
});

RichTextEditorDemo.displayName = "RichTextEditorDemo";
