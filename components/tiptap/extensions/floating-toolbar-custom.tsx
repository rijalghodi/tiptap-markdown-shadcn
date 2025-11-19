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
              console.log("selectionchange event DOM");
              // Dispatch custom event when selection changes
              window.dispatchEvent(new CustomEvent("floating-toolbar-update"));
              return false;
            },
          },
        },
        view() {
          let lastFrom: number | null = null;
          let lastTo: number | null = null;

          return {
            update(view, prevState) {
              const sel = view.state.selection;

              const finished =
                !sel.empty && // selection exists (not collapsed)
                (sel.from !== lastFrom || // and selection changed
                  sel.to !== lastTo);

              if (finished) {
                lastFrom = sel.from;
                lastTo = sel.to;

                window.dispatchEvent(
                  new CustomEvent("floating-toolbar-update", {
                    detail: {
                      from: sel.from,
                      to: sel.to,
                    },
                  })
                );
              }
            },
          };
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
  const openDebounced = useDebounce(open, 100);

  const isMobile = useMediaQuery("(max-width: 640px)");
  const { refs, floatingStyles, update } = useFloating({
    placement: "bottom",
    middleware: [offset(10), flip(), shift()],
  });

  const shouldShow = useCallback(() => {
    if (!editor || isMobile) return false;

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

    // Don't show if selection is not finished

    return true;
  }, [editor, isMobile]);

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
    if (!editor || isMobile) {
      setOpen(false);
      return;
    }

    const handleUpdate = () => {
      console.log("floating-toolbar-custom, handleUpdate in useEffect");
      const shouldShowToolbar = shouldShow();
      console.log(
        "floating-toolbar-custom, shouldShowToolbar in useEffect",
        shouldShowToolbar
      );
      setOpen(shouldShowToolbar);

      if (shouldShowToolbar) {
        // Update position after a short delay to ensure DOM is ready
        requestAnimationFrame(() => {
          updatePosition();
        });
      }
    };

    // Listen to custom events from the extension
    window.addEventListener("floating-toolbar-update", handleUpdate);

    // Also listen to editor updates
    // const handleEditorUpdate = () => {
    //   handleUpdate();
    // };

    // editor.on("selectionUpdate", handleEditorUpdate);
    // editor.on("update", handleEditorUpdate);
    // editor.on("focus", handleUpdate);
    // editor.on("blur", () => setOpen(false));

    // Initial check
    handleUpdate();

    return () => {
      window.removeEventListener("floating-toolbar-update", handleUpdate);
      // editor.off("selectionUpdate", handleEditorUpdate);
      // editor.off("update", handleEditorUpdate);
      // editor.off("focus", handleUpdate);
      // editor.off("blur", () => setOpen(false));
    };
  }, [editor, isMobile, shouldShow, updatePosition]);

  // // Prevent default context menu on mobile
  // useEffect(() => {
  //   if (!editor?.options.element || !isMobile) return;

  //   const handleContextMenu = (e: Event) => {
  //     e.preventDefault();
  //   };

  //   const el = editor.options.element;
  //   if (el instanceof HTMLElement) {
  //     el.addEventListener("contextmenu", handleContextMenu);
  //     return () => el.removeEventListener("contextmenu", handleContextMenu);
  //   }
  // }, [editor, isMobile]);

  if (!editor || isMobile || !openDebounced) return null;

  return (
    <div
      ref={refs.setFloating}
      style={{ ...floatingStyles, display: openDebounced ? "block" : "none" }}
      className="z-50"
    >
      <TooltipProvider>
        <div className="w-full min-w-full mx-0 shadow-sm border rounded-sm bg-background">
          <ToolbarProvider editor={editor}>
            <ScrollArea className="h-fit py-0.5 w-full">
              <div className="flex items-center px-2 gap-0.5">
                <div className="flex items-center gap-0.5 p-1">
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
                  <ColorHighlightToolbar />
                  <LinkToolbar />
                  <ImagePlaceholderToolbar />
                  <Separator orientation="vertical" className="h-6 mx-1" />

                  {/* Additional controls */}
                  <AlignmentTooolbar />
                  <BlockquoteToolbar />
                </div>
              </div>
              <ScrollBar className="h-0.5" orientation="horizontal" />
            </ScrollArea>
          </ToolbarProvider>
        </div>
      </TooltipProvider>
    </div>
  );
};
