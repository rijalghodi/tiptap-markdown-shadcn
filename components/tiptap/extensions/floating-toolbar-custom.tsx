"use client";

import { Editor, Extension } from "@tiptap/core";
import { Plugin } from "@tiptap/pm/state";
import { useCallback, useEffect, useState } from "react";
import { useFloating, offset, flip, shift } from "@floating-ui/react-dom";
import { BoldToolbar } from "../toolbars/bold";
import { ItalicToolbar } from "../toolbars/italic";
import { UnderlineToolbar } from "../toolbars/underline";
import { LinkToolbar } from "../toolbars/link";
import { ColorHighlightToolbar } from "../toolbars/color-and-highlight";
import { ToolbarProvider } from "../toolbars/toolbar-provider";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useMediaQuery } from "@/hooks/use-media-querry";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { HeadingsToolbar } from "../toolbars/headings";
import { BulletListToolbar } from "../toolbars/bullet-list";
import { OrderedListToolbar } from "../toolbars/ordered-list";
import { ImagePlaceholderToolbar } from "../toolbars/image-placeholder-toolbar";
import { AlignmentTooolbar } from "../toolbars/alignment";
import { BlockquoteToolbar } from "../toolbars/blockquote";
import { useDebounce } from "@/hooks/use-debounce";

export const FloatingToolbarCustomExtension = Extension.create({
  name: "floatingToolbarCustom",

  addProseMirrorPlugins() {
    return [
      new Plugin({
        props: {
          handleDOMEvents: {
            selectionchange: () => {
              window.dispatchEvent(new CustomEvent("floating-toolbar-update"));
              return false;
            },
          },
        },
        appendTransaction(transactions, oldState, newState) {
          if (transactions.some((tr) => tr.selectionSet || tr.docChanged)) {
            window.dispatchEvent(new CustomEvent("floating-toolbar-update"));
          }
          return null;
        },
      }),
    ];
  },
});

export const FloatingToolbarCustom = ({
  editor,
}: {
  editor: Editor | null;
}) => {
  const [open, setOpen] = useState(false);
  const [isSelecting, setIsSelecting] = useState(false);

  const { refs, floatingStyles, update } = useFloating({
    placement: "bottom",
    middleware: [offset(10), flip(), shift()],
  });

  const shouldShow = useCallback(() => {
    if (!editor) return false;

    const { state } = editor;
    const { selection } = state;
    const { from, to } = selection;

    // Don't show if there's no selection or selection is empty
    if (from === to) return false;

    // Don't show if editor is not editable or not focused
    if (!editor.isEditable || !editor.isFocused) return false;

    // Don't show if selection is in code block
    const $from = state.doc.resolve(from);
    if ($from.parent.type.name === "codeBlock") return false;

    // Don't show if user is actively selecting
    if (isSelecting) return false;

    return true;
  }, [editor, isSelecting]);

  const updatePosition = useCallback(() => {
    if (!editor || !open) return;

    const { state } = editor;
    const { selection } = state;
    const { from } = selection;

    try {
      // Get the DOM node for the selection
      const dom = editor.view.domAtPos(from);
      let referenceNode: Element | null = null;

      // Handle text nodes by getting their parent element
      if (dom.node.nodeType === Node.TEXT_NODE) {
        referenceNode = dom.node.parentElement;
      } else if (dom.node instanceof Element) {
        referenceNode = dom.node;
      }

      // Fallback: try to get element from the editor's DOM
      if (!referenceNode) {
        const coords = editor.view.coordsAtPos(from);
        // Try to find the element at the coordinates
        const elementAtPoint = document.elementFromPoint(
          coords.left,
          coords.top
        );
        if (elementAtPoint) {
          // Find the closest element within the editor
          const editorElement = editor.view.dom;
          if (editorElement.contains(elementAtPoint)) {
            referenceNode = elementAtPoint;
          }
        }
      }

      if (referenceNode) {
        refs.setReference(referenceNode);
        update();
      }
    } catch (error) {
      console.error("Error updating floating toolbar position:", error);
    }
  }, [editor, open, refs, update]);

  useEffect(() => {
    if (!editor) {
      setOpen(false);
      return;
    }

    const handleUpdate = () => {
      // Only update if not actively selecting
      if (!isSelecting) {
        const shouldShowToolbar = shouldShow();
        setOpen(shouldShowToolbar);

        if (shouldShowToolbar) {
          // Update position after a short delay to ensure DOM is ready
          requestAnimationFrame(() => {
            updatePosition();
          });
        }
      }
    };

    // Listen to custom events from the extension
    window.addEventListener("floating-toolbar-update", handleUpdate);

    // Initial check
    handleUpdate();

    return () => {
      window.removeEventListener("floating-toolbar-update", handleUpdate);
    };
  }, [editor, shouldShow, updatePosition, isSelecting]);

  // Track mouse events to detect when user is actively selecting
  useEffect(() => {
    if (!editor) return;

    const editorElement = editor.view.dom;
    if (!(editorElement instanceof HTMLElement)) return;

    let mouseDown = false;
    let isDragging = false;

    const handleMouseDown = (e: MouseEvent) => {
      // Only track if it's a left mouse button click
      if (e.button === 0) {
        mouseDown = true;
        setIsSelecting(true);
        setOpen(false); // Hide toolbar when starting to select
      }
    };

    const handleMouseMove = (e: MouseEvent) => {
      if (mouseDown) {
        isDragging = true;
        setIsSelecting(true);
        setOpen(false); // Keep toolbar hidden while dragging
      }
    };

    const handleMouseUp = () => {
      if (mouseDown) {
        mouseDown = false;
        isDragging = false;

        // Small delay to ensure selection is updated in ProseMirror
        setTimeout(() => {
          setIsSelecting(false);
          // Trigger update to show toolbar after selection is complete
          window.dispatchEvent(new CustomEvent("floating-toolbar-update"));
        }, 50);
      }
    };

    // Also handle touch events for mobile
    const handleTouchStart = () => {
      setIsSelecting(true);
      setOpen(false);
    };

    const handleTouchMove = () => {
      setIsSelecting(true);
      setOpen(false);
    };

    const handleTouchEnd = () => {
      setTimeout(() => {
        setIsSelecting(false);
        window.dispatchEvent(new CustomEvent("floating-toolbar-update"));
      }, 100); // Slightly longer delay for touch
    };

    // Listen to selection changes to detect keyboard selection
    const handleSelectionChange = () => {
      // If selection changes but mouse is not down, it might be keyboard selection
      if (!mouseDown) {
        // Check if there's an active selection
        const selection = window.getSelection();
        if (selection && selection.toString().length > 0) {
          // Small delay to ensure ProseMirror has updated
          setTimeout(() => {
            setIsSelecting(false);
            window.dispatchEvent(new CustomEvent("floating-toolbar-update"));
          }, 100);
        }
      }
    };

    editorElement.addEventListener("mousedown", handleMouseDown);
    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);
    editorElement.addEventListener("touchstart", handleTouchStart);
    editorElement.addEventListener("touchmove", handleTouchMove);
    editorElement.addEventListener("touchend", handleTouchEnd);
    document.addEventListener("selectionchange", handleSelectionChange);

    return () => {
      editorElement.removeEventListener("mousedown", handleMouseDown);
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
      editorElement.removeEventListener("touchstart", handleTouchStart);
      editorElement.removeEventListener("touchmove", handleTouchMove);
      editorElement.removeEventListener("touchend", handleTouchEnd);
      document.removeEventListener("selectionchange", handleSelectionChange);
    };
  }, [editor]);

  if (!editor || !open) return null;

  return (
    <div
      ref={refs.setFloating}
      style={{ ...floatingStyles, display: open ? "block" : "none" }}
      className="z-50"
    >
      <TooltipProvider>
        <div className="w-full min-w-full mx-0 shadow-md border rounded-md bg-background">
          <ToolbarProvider editor={editor}>
            <ScrollArea className="h-fit py-0.5 w-full">
              <div className="flex items-center gap-0.5">
                {/* Primary formatting */}
                <BoldToolbar />
                <ItalicToolbar />
                <UnderlineToolbar />
                <Separator orientation="vertical" className="h-6 mx-1" />

                {/* Structure controls */}
                <HeadingsToolbar />
                <BulletListToolbar />
                <OrderedListToolbar />
                <Separator orientation="vertical" className="h-6 mx-1" />

                {/* Rich formatting */}
                {/* <ColorHighlightToolbar /> */}
                <LinkToolbar />
                {/* <ImagePlaceholderToolbar /> */}
                <Separator orientation="vertical" className="h-6 mx-1" />

                {/* Additional controls */}
                {/* <AlignmentTooolbar /> */}
                <BlockquoteToolbar />
              </div>
              <ScrollBar className="h-0.5" orientation="horizontal" />
            </ScrollArea>
          </ToolbarProvider>
        </div>
      </TooltipProvider>
    </div>
  );
};
