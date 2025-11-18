"use client";
import "./tiptap.css";
import { cn } from "@/lib/utils";
import { ImageExtension } from "@/components/tiptap/extensions/image";
import { ImagePlaceholder } from "@/components/tiptap/extensions/image-placeholder";
import SearchAndReplace from "@/components/tiptap/extensions/search-and-replace";
import { Color } from "@tiptap/extension-color";
import Highlight from "@tiptap/extension-highlight";
import Link from "@tiptap/extension-link";
import Subscript from "@tiptap/extension-subscript";
import Superscript from "@tiptap/extension-superscript";
import TextAlign from "@tiptap/extension-text-align";
import { TextStyle } from "@tiptap/extension-text-style";
import Typography from "@tiptap/extension-typography";
import Underline from "@tiptap/extension-underline";
import {
  EditorContent,
  type Extension,
  useEditor,
  type Editor,
} from "@tiptap/react";
import { Markdown } from "@tiptap/markdown";
import StarterKit from "@tiptap/starter-kit";
import { TipTapFloatingMenu } from "@/components/tiptap/extensions/floating-menu";
import { FloatingToolbar } from "@/components/tiptap/extensions/floating-toolbar";
import { EditorToolbar } from "./toolbars/editor-toolbar";
import Placeholder from "@tiptap/extension-placeholder";
import { content } from "@/lib/content";
import { forwardRef, useImperativeHandle } from "react";

const extensions = [
  StarterKit.configure({
    orderedList: {
      HTMLAttributes: {
        class: "list-decimal",
      },
    },
    bulletList: {
      HTMLAttributes: {
        class: "list-disc",
      },
    },
    heading: {
      levels: [1, 2, 3, 4],
    },
  }),
  Placeholder.configure({
    emptyNodeClass: "is-editor-empty",
    placeholder: ({ node }) => {
      switch (node.type.name) {
        case "heading":
          return `Heading ${node.attrs.level}`;
        case "detailsSummary":
          return "Section title";
        case "codeBlock":
          // never show the placeholder when editing code
          return "";
        default:
          return "Write, type '/' for commands";
      }
    },
    includeChildren: false,
  }),
  TextAlign.configure({
    types: ["heading", "paragraph"],
  }),
  TextStyle,
  Subscript,
  Superscript,
  Underline,
  Link,
  Color,
  Highlight.configure({
    multicolor: true,
  }),
  ImageExtension,
  ImagePlaceholder,
  SearchAndReplace,
  Typography,
  Markdown,
];

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
    // content,
    editorProps: {
      attributes: {
        class: "max-w-full focus:outline-none",
      },
    },
    contentType: "markdown",
    content:
      '# Markdown Test\n\nClick **"Parse Markdown"** to load content from the left panel.',
    onUpdate: ({ editor }) => {
      // do what you want to do with output
      // Update stats
      // saving as text/json/hmtml
      // const text = editor.getHTML();
      console.log(editor.getText());
    },
  });

  useImperativeHandle(ref, () => ({
    editor,
    getMarkdown: () => {
      if (!editor) return "";
      // Try to get markdown from storage, fallback to text
      try {
        const markdownStorage = editor.storage.markdown as any;
        if (
          markdownStorage &&
          typeof markdownStorage.getMarkdown === "function"
        ) {
          return markdownStorage.getMarkdown();
        }
      } catch (e) {
        // Fallback if markdown storage method doesn't exist
      }
      return editor.getText();
    },
  }));

  if (!editor) return null;

  return (
    <div
      className={cn(
        "relative max-h-[calc(100dvh-6rem)] border w-full overflow-hidden overflow-y-scroll bg-card pb-[60px] sm:pb-0",
        className
      )}
    >
      <EditorToolbar editor={editor} />
      <FloatingToolbar editor={editor} />
      <TipTapFloatingMenu editor={editor} />
      <EditorContent
        editor={editor}
        className=" min-h-[600px] w-full min-w-full cursor-text"
      />
    </div>
  );
});

RichTextEditorDemo.displayName = "RichTextEditorDemo";
