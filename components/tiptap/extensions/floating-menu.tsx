"use client";

import {
  Heading1,
  Heading2,
  Heading3,
  ListOrdered,
  List,
  Code2,
  ChevronRight,
  Quote,
  ImageIcon,
  Minus,
  AlignLeft,
  AlignCenter,
  AlignRight,
  CodeSquare,
  TextQuote,
} from "lucide-react";
import { FloatingMenu } from "@tiptap/react/menus";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import type { Editor } from "@tiptap/core";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useDebounce } from "@/hooks/use-debounce";

interface CommandItemType {
  title: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  keywords: string;
  command: (editor: Editor) => void;
  group: string;
}

type CommandGroupType = {
  group: string;
  items: Omit<CommandItemType, "group">[];
};

const groups: CommandGroupType[] = [
  {
    group: "Basic blocks",
    items: [
      {
        title: "Text",
        description: "Just start writing with plain text",
        icon: ChevronRight,
        keywords: "paragraph text",
        command: (editor) => editor.chain().focus().clearNodes().run(),
      },
      {
        title: "Heading 1",
        description: "Large section heading",
        icon: Heading1,
        keywords: "h1 title header",
        command: (editor) =>
          editor.chain().focus().toggleHeading({ level: 1 }).run(),
      },
      {
        title: "Heading 2",
        description: "Medium section heading",
        icon: Heading2,
        keywords: "h2 subtitle",
        command: (editor) =>
          editor.chain().focus().toggleHeading({ level: 2 }).run(),
      },
      {
        title: "Heading 3",
        description: "Small section heading",
        icon: Heading3,
        keywords: "h3 subheader",
        command: (editor) =>
          editor.chain().focus().toggleHeading({ level: 3 }).run(),
      },
      {
        title: "Bullet List",
        description: "Create a simple bullet list",
        icon: List,
        keywords: "unordered ul bullets",
        command: (editor) => editor.chain().focus().toggleBulletList().run(),
      },
      {
        title: "Numbered List",
        description: "Create a ordered list",
        icon: ListOrdered,
        keywords: "numbered ol",
        command: (editor) => editor.chain().focus().toggleOrderedList().run(),
      },
      {
        title: "Code Block",
        description: "Capture code snippets",
        icon: Code2,
        keywords: "code snippet pre",
        command: (editor) => editor.chain().focus().toggleCodeBlock().run(),
      },
      {
        title: "Image",
        description: "Insert an image",
        icon: ImageIcon,
        keywords: "image picture photo",
        command: (editor) =>
          editor.chain().focus().insertImagePlaceholder().run(),
      },
      {
        title: "Horizontal Rule",
        description: "Add a horizontal divider",
        icon: Minus,
        keywords: "horizontal rule divider",
        command: (editor) => editor.chain().focus().setHorizontalRule().run(),
      },
    ],
  },
  {
    group: "Inline",
    items: [
      {
        title: "Quote",
        description: "Capture a quotation",
        icon: Quote,
        keywords: "blockquote cite",
        command: (editor) => editor.chain().focus().toggleBlockquote().run(),
      },
      {
        title: "Code",
        description: "Inline code snippet",
        icon: CodeSquare,
        keywords: "code inline",
        command: (editor) => editor.chain().focus().toggleCode().run(),
      },
      {
        title: "Blockquote",
        description: "Block quote",
        icon: TextQuote,
        keywords: "blockquote quote",
        command: (editor) => editor.chain().focus().toggleBlockquote().run(),
      },
    ],
  },
];

export function TipTapFloatingMenu({ editor }: { editor: Editor }) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState("");
  const commandRef = useRef<HTMLDivElement>(null);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const itemRefs = useRef<(HTMLDivElement | null)[]>([]);
  // const previousQueryRef = useRef<string>("");
  // const debouncedSearch = useDebounce(previousQueryRef.current, 100);
  const [slashPosition, setSlashPosition] = useState<{
    left: number;
    top: number;
  } | null>(null);

  const filteredGroups = useMemo(
    () =>
      groups
        .map((group) => ({
          ...group,
          items: group.items.filter(
            (item) =>
              item.title.toLowerCase().includes(search.toLowerCase()) ||
              item.description.toLowerCase().includes(search.toLowerCase()) ||
              item.keywords.toLowerCase().includes(search.toLowerCase())
          ),
        }))
        .filter((group) => group.items.length > 0),
    [search]
  );

  const flatFilteredItems = useMemo(
    () => filteredGroups.flatMap((g) => g.items),
    [filteredGroups]
  );

  const executeCommand = useCallback(
    (commandFn: (editor: Editor) => void) => {
      if (!editor) return;

      try {
        const { from } = editor.state.selection;
        const slashCommandLength = search.length + 1;

        editor
          .chain()
          .focus()
          .deleteRange({
            from: Math.max(0, from - slashCommandLength),
            to: from,
          })
          .run();

        commandFn(editor);
      } catch (error) {
        console.error("Error executing command:", error);
      } finally {
        setIsOpen(false);
        setSearch("");
        setSelectedIndex(-1);
      }
    },
    [editor]
  );

  const handleSlashCommand = useCallback(() => {
    if (!editor) return;

    const { state } = editor;
    const { $from } = state.selection;
    const currentLineText = $from.parent.textBetween(
      0,
      $from.parentOffset,
      "\n",
      " "
    );

    const isSlashCommand =
      currentLineText.startsWith("/") &&
      $from.parent.type.name !== "codeBlock" &&
      $from.parentOffset === currentLineText.length;

    if (!isSlashCommand) {
      setIsOpen(false);
      setSearch("");
      setSlashPosition(null);
      return;
    }

    // Get coordinates of the cursor position for fixed positioning (relative to viewport)
    const coords = editor.view.coordsAtPos($from.pos);

    // Use viewport coordinates for fixed positioning
    const top = coords.bottom;
    const left = coords.left;

    setSlashPosition({ left, top });
    setIsOpen(true);

    const query = currentLineText.slice(1).trim();
    setSearch(query);
  }, [editor]);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (!editor) return;

      // Check if we're in a slash command context
      const { state } = editor;
      const { $from } = state.selection;
      const currentLineText = $from.parent.textBetween(
        0,
        $from.parentOffset,
        "\n",
        " "
      );

      const isSlashCommand =
        currentLineText.startsWith("/") &&
        $from.parent.type.name !== "codeBlock" &&
        $from.parentOffset === currentLineText.length;

      // If menu is open, handle navigation keys
      if (isOpen && isSlashCommand) {
        const preventDefault = () => {
          e.preventDefault();
          e.stopImmediatePropagation();
        };

        switch (e.key) {
          case "ArrowDown":
            preventDefault();
            setSelectedIndex((prev) => {
              if (flatFilteredItems.length === 0) return -1;
              if (prev === -1) return 0;
              return prev < flatFilteredItems.length - 1 ? prev + 1 : 0;
            });
            return;

          case "ArrowUp":
            preventDefault();
            setSelectedIndex((prev) => {
              if (flatFilteredItems.length === 0) return -1;
              if (prev === -1) return flatFilteredItems.length - 1;
              return prev > 0 ? prev - 1 : flatFilteredItems.length - 1;
            });
            return;

          case "Enter":
            preventDefault();
            if (flatFilteredItems.length > 0) {
              const targetIndex = selectedIndex === -1 ? 0 : selectedIndex;
              if (flatFilteredItems[targetIndex]) {
                executeCommand(flatFilteredItems[targetIndex].command);
              }
            }
            return;

          case "Escape":
            preventDefault();
            setIsOpen(false);
            setSelectedIndex(-1);
            setSlashPosition(null);
            // Delete the slash command
            const { from } = editor.state.selection;
            editor
              .chain()
              .focus()
              .deleteRange({
                from: Math.max(0, from - currentLineText.length),
                to: from,
              })
              .run();
            return;
        }
      }

      // Update slash command state on any key press (for typing after "/")
      // Use requestAnimationFrame to ensure editor state is updated first
      requestAnimationFrame(() => {
        handleSlashCommand();
      });
    },
    [
      isOpen,
      selectedIndex,
      flatFilteredItems,
      executeCommand,
      editor,
      handleSlashCommand,
    ]
  );

  // Auto-select first item when menu opens or when filtered items change
  useEffect(() => {
    if (isOpen && flatFilteredItems.length > 0) {
      // Always select first item when menu opens or search changes
      setSelectedIndex(0);
    } else if (!isOpen) {
      // Reset selection when menu closes
      setSelectedIndex(-1);
    }
  }, [isOpen, flatFilteredItems.length]);

  useEffect(() => {
    if (selectedIndex >= 0 && itemRefs.current[selectedIndex]) {
      // Use setTimeout to ensure DOM is updated before scrolling/focusing
      setTimeout(() => {
        const item = itemRefs.current[selectedIndex];
        if (item) {
          item.scrollIntoView({
            block: "nearest",
            behavior: "smooth",
          });
          item.focus();
        }
      }, 0);
    }
  }, [selectedIndex, flatFilteredItems]);

  // Combined effect: Handle keyboard navigation and update search/isOpen state
  useEffect(() => {
    if (!editor?.view?.dom) return;

    const editorElement = editor.view.dom;
    if (!(editorElement instanceof HTMLElement)) return;

    // Handler for keyboard navigation (arrow keys, enter, escape)
    const handleEditorKeyDown = (e: Event) => handleKeyDown(e as KeyboardEvent);

    // Handler for updating slash command state on input/selection changes
    const handleInput = () => {
      requestAnimationFrame(() => {
        handleSlashCommand();
      });
    };

    const handleSelectionChange = () => {
      requestAnimationFrame(() => {
        handleSlashCommand();
      });
    };

    // Add event listeners
    editorElement.addEventListener("keydown", handleEditorKeyDown);
    editorElement.addEventListener("input", handleInput);
    document.addEventListener("selectionchange", handleSelectionChange);

    // Initial check
    handleSlashCommand();

    // Cleanup: Remove all event listeners
    return () => {
      editorElement.removeEventListener("keydown", handleEditorKeyDown);
      editorElement.removeEventListener("input", handleInput);
      document.removeEventListener("selectionchange", handleSelectionChange);
    };
  }, [editor, handleKeyDown, handleSlashCommand]);

  return (
    <>
      {slashPosition && isOpen && (
        <div
          style={{
            position: "fixed",
            top: `${slashPosition.top + 8}px`,
            left: `${slashPosition.left}px`,
          }}
          className="z-50"
        >
          <Command
            role="listbox"
            ref={commandRef}
            className="z-50 w-72 overflow-hidden rounded-lg border bg-popover shadow-lg"
          >
            <ScrollArea className="max-h-[330px]">
              <CommandList>
                <CommandEmpty className="py-3 text-center text-sm text-muted-foreground">
                  No results found
                </CommandEmpty>

                {filteredGroups.map((group, groupIndex) => (
                  <CommandGroup
                    key={`${group.group}-${groupIndex}`}
                    heading={
                      <div className="px-2 py-1.5 text-xs font-medium text-muted-foreground">
                        {group.group}
                      </div>
                    }
                  >
                    {group.items.map((item, itemIndex) => {
                      const flatIndex =
                        filteredGroups
                          .slice(0, groupIndex)
                          .reduce((acc, g) => acc + g.items.length, 0) +
                        itemIndex;

                      return (
                        <CommandItem
                          role="option"
                          key={`${group.group}-${item.title}-${itemIndex}`}
                          value={`${group.group}-${item.title}`}
                          onSelect={() => executeCommand(item.command)}
                          className={cn(
                            "gap-3 aria-selected:bg-accent/50",
                            flatIndex === selectedIndex ? "bg-accent/50" : ""
                          )}
                          aria-selected={flatIndex === selectedIndex}
                          ref={(el) => {
                            itemRefs.current[flatIndex] = el;
                          }}
                          tabIndex={flatIndex === selectedIndex ? 0 : -1}
                        >
                          <div className="flex h-9 w-9 items-center justify-center rounded-md border bg-background">
                            <item.icon className="h-4 w-4" />
                          </div>
                          <div className="flex flex-1 flex-col">
                            <span className="text-sm font-medium">
                              {item.title}
                            </span>
                            <span className="text-xs text-muted-foreground">
                              {item.description}
                            </span>
                          </div>
                          <kbd className="ml-auto flex h-5 items-center rounded bg-muted px-1.5 text-xs text-muted-foreground">
                            ↵
                          </kbd>
                        </CommandItem>
                      );
                    })}
                  </CommandGroup>
                ))}
              </CommandList>
            </ScrollArea>
          </Command>
        </div>
      )}
    </>
  );
}
