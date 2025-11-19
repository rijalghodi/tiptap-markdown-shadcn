import { Editor, Extension } from "@tiptap/core";
import { Plugin } from "@tiptap/pm/state";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useFloating, offset, flip, shift } from "@floating-ui/react-dom";
import { cn } from "@/lib/utils";
import {
  Code,
  List,
  Minus,
  Quote,
  TextQuote,
  ChevronRight,
  Heading1,
  Heading2,
  Heading3,
  ListOrdered,
  Code2,
} from "lucide-react";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandItem,
} from "@/components/ui/command";
import { ScrollArea } from "@/components/ui/scroll-area";
import { CommandList } from "@/components/ui/command";

interface CommandItemType {
  title: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  keywords: string;
  command: (editor: Editor) => void;
}

const menuItems: CommandItemType[] = [
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
    title: "Horizontal Rule",
    description: "Add a horizontal divider",
    icon: Minus,
    keywords: "horizontal rule divider",
    command: (editor) => editor.chain().focus().setHorizontalRule().run(),
  },
  {
    title: "Blockquote",
    description: "Block quote",
    icon: TextQuote,
    keywords: "blockquote quote",
    command: (editor) => editor.chain().focus().toggleBlockquote().run(),
  },
];

export const SlashCommandExtension = Extension.create({
  name: "slashCommand",

  addProseMirrorPlugins() {
    return [
      new Plugin({
        props: {
          handleKeyDown(view, event) {
            console.log("slash-commmand, handleKeyDown", event.key);
            if (event.key === "Backspace") {
              const { state } = view;
              const { $from } = state.selection;
              const currentLineText = $from.parent.textBetween(
                0,
                $from.parentOffset,
                "\n",
                " "
              );

              const isRemoveSlashCommand =
                currentLineText === "/" &&
                $from.parent.type.name !== "codeBlock";

              if (isRemoveSlashCommand) {
                window.dispatchEvent(new CustomEvent("slash-menu-close"));
              }
            }
            return false;
          },
          // This only runs for text input (inserted text), not for deletions like Backspace.
          // To handle Backspace, you also need to implement handleKeyDown or handleDOMEvents.
          handleTextInput(view, from, to, text) {
            const { state } = view;
            const { $from } = state.selection;
            const currentLineText = $from.parent.textBetween(
              0,
              $from.parentOffset,
              "\n",
              " "
            );

            const updatedLineText = currentLineText + text;

            const isSlashCommand =
              updatedLineText.startsWith("/") &&
              $from.parent.type.name !== "codeBlock" &&
              $from.parentOffset === currentLineText.length;

            console.log("slash-commmand, isSlashCommand", isSlashCommand);
            console.log("slash-commmand, currentLineText", currentLineText);
            console.log("slash-commmand, text.length", text.length);
            console.log(
              "slash-commmand, currentLineText.length",
              currentLineText.length
            );
            console.log(
              "slash-commmand, $from.parent.type.name",
              $from.parent.type.name
            );
            console.log(
              "slash-commmand, $from.parent.textContent",
              $from.parent.textContent
            );
            console.log(
              "slash-commmand, $from.parentOffset",
              $from.parentOffset
            );
            console.log("slash-commmand, $from", $from);
            console.log("slash-commmand, text", text);

            if (isSlashCommand) {
              // munculkan menu di posisi ini
              window.dispatchEvent(
                new CustomEvent("slash-menu-open", {
                  detail: {
                    text: updatedLineText,
                  },
                })
              );
            }
            return false;
          },
        },
      }),
    ];
  },
});

export const SlashCommand = ({ editor }: { editor: Editor }) => {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const commandRef = useRef<HTMLDivElement>(null);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const itemRefs = useRef<(HTMLDivElement | null)[]>([]);
  const { refs, floatingStyles, update } = useFloating({
    placement: "bottom-start",
    middleware: [offset(6), flip(), shift()],
  });

  // Handle the open and close of the menu
  useEffect(() => {
    function openSlashMenu(e: any) {
      console.log("slash-commmand, openSlashMenu", e);
      setOpen(true);
    }

    function closeSlashMenu(e: any) {
      console.log("slash-commmand, closeSlashMenu", e);
      setOpen(false);
    }

    window.addEventListener("slash-menu-open", openSlashMenu);
    window.addEventListener("slash-menu-close", closeSlashMenu);
    return () => {
      window.removeEventListener("slash-menu-open", openSlashMenu);
      window.removeEventListener("slash-menu-close", closeSlashMenu);
    };
  }, []);

  // Handle the position of the menu
  useEffect(() => {
    if (!editor || !open) return;

    const { from } = editor.state.selection;
    const dom = editor.view.domAtPos(from).node;

    refs.setReference(dom as Element);
    update();
  }, [open, editor]);

  //  Handle execute command
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
        setOpen(false);
        setSearch("");
        setSelectedIndex(-1);
      }
    },
    [editor, search]
  );

  // Handle filter menu items
  const filteredMenuItems = useMemo(
    () =>
      menuItems.filter(
        (item) =>
          item.title.toLowerCase().includes(search.toLowerCase()) ||
          item.description.toLowerCase().includes(search.toLowerCase()) ||
          item.keywords.toLowerCase().includes(search.toLowerCase())
      ),
    [search]
  );

  // Hanndle search and arrow keys
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (!open || !editor) return;

      const preventDefault = () => {
        e.preventDefault();
        e.stopImmediatePropagation();
      };

      switch (e.key) {
        case "ArrowDown":
          preventDefault();
          setSelectedIndex((prev) => {
            if (prev === -1) return 0;
            return prev < filteredMenuItems.length - 1 ? prev + 1 : 0;
          });
          break;

        case "ArrowUp":
          preventDefault();
          setSelectedIndex((prev) => {
            if (prev === -1) return filteredMenuItems.length - 1;
            return prev > 0 ? prev - 1 : filteredMenuItems.length - 1;
          });
          break;

        case "Enter":
          preventDefault();
          const targetIndex = selectedIndex === -1 ? 0 : selectedIndex;
          if (filteredMenuItems[targetIndex]) {
            executeCommand(filteredMenuItems[targetIndex].command);
          }
          break;

        case "Escape":
          preventDefault();
          setOpen(false);
          setSelectedIndex(-1);
          break;
      }
    },
    [open, selectedIndex, filteredMenuItems, executeCommand, editor]
  );

  useEffect(() => {
    if (!editor?.options.element) return;

    const editorElement = editor.options.element;
    const handleEditorKeyDown = (e: Event) => handleKeyDown(e as KeyboardEvent);

    (editorElement as HTMLElement).addEventListener(
      "keydown",
      handleEditorKeyDown
    );
    return () =>
      (editorElement as HTMLElement).removeEventListener(
        "keydown",
        handleEditorKeyDown
      );
  }, [handleKeyDown, editor]);

  // Auto-select active item
  useEffect(() => {
    setSelectedIndex(filteredMenuItems.length > 0 && open ? 0 : -1);
  }, [filteredMenuItems, open]);

  // Auto-focus active item (to scroll)
  useEffect(() => {
    if (selectedIndex >= 0 && itemRefs.current[selectedIndex]) {
      itemRefs.current[selectedIndex]?.focus();
    }
  }, [selectedIndex]);

  return (
    <div>
      <div>isOpen: {open.toString()}</div>
      <div>selectedIndex: {selectedIndex}</div>

      <div
        ref={refs.setFloating}
        style={{ ...floatingStyles, display: open ? "block" : "none" }}
        className="z-50"
      >
        <Command
          role="listbox"
          ref={commandRef}
          className="w-72 overflow-hidden rounded-lg border bg-popover shadow-lg"
        >
          <ScrollArea className="max-h-[330px]">
            <CommandList>
              <CommandEmpty className="py-3 text-center text-sm text-muted-foreground">
                No results found
              </CommandEmpty>

              {filteredMenuItems.map((item, itemIndex) => {
                return (
                  <CommandItem
                    role="option"
                    key={`${item.title}-${itemIndex}`}
                    value={`${item.title}`}
                    onSelect={() => executeCommand(item.command)}
                    className={cn(
                      "gap-3",
                      itemIndex === selectedIndex ? "bg-accent/50" : ""
                    )}
                    aria-selected={itemIndex === selectedIndex}
                    ref={(el) => {
                      itemRefs.current[itemIndex] = el;
                    }}
                    tabIndex={itemIndex === selectedIndex ? 0 : -1}
                  >
                    <div className="flex h-9 w-9 items-center justify-center rounded-md border bg-background">
                      <item.icon className="h-4 w-4" />
                    </div>
                    <div className="flex flex-1 flex-col">
                      <span className="text-sm font-medium">{item.title}</span>
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
            </CommandList>
          </ScrollArea>
        </Command>
      </div>
    </div>
  );
};
