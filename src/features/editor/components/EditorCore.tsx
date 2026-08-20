import { useEffect, useRef, useState, forwardRef, useImperativeHandle } from 'react';
import { EditorState, Compartment } from '@codemirror/state';
import { EditorView, keymap } from '@codemirror/view';
import { defaultKeymap, history, historyKeymap, indentWithTab } from '@codemirror/commands';
import { markdown, markdownLanguage } from '@codemirror/lang-markdown';
import { codeFolding, foldGutter, foldKeymap } from '@codemirror/language';
import { GFM } from '@lezer/markdown';
import { EditorMode } from '../../../types/editor';
import { FileNode } from '../../../types/vault';
import { createLiveEditPlugin } from '../../../lib/editor/liveEditExtension';
import { createWikilinkDecorationsPlugin } from '../../../lib/editor/wikilinkPlugin';
import { WikilinkAutocompletePopup } from './WikilinkAutocompletePopup';
import { SlashCommandMenu, SlashCommand } from './SlashCommandMenu';
import { NoteTitle } from './NoteTitle';
import { AiContextMenu } from './AiContextMenu';
import { AiInlineInput } from './AiInlineInput';
import { replaceTextWithUndo } from '../lib/editorAiUtils';

interface EditorCoreProps {
  title: string;
  onTitleChange: (title: string) => void;
  initialContent: string;
  mode: EditorMode;
  nodes?: Record<string, FileNode>;
  onChange: (content: string) => void;
  onWikilinkClick?: (targetName: string) => void;
}

export interface EditorCoreRef {
  getScrollRatio: () => number;
  setScrollRatio: (ratio: number) => void;
  focus: () => void;
  scrollToHeading: (lineIndex: number, text: string) => void;
}

export const EditorCore = forwardRef<EditorCoreRef, EditorCoreProps>(({ title, onTitleChange, initialContent, mode, nodes = {}, onChange, onWikilinkClick }, ref) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const editorRef = useRef<HTMLDivElement>(null);
  const viewRef = useRef<EditorView | null>(null);
  const modeCompartmentRef = useRef(new Compartment());
  const onChangeRef = useRef(onChange);
  const nodesRef = useRef(nodes);
  const onWikilinkClickRef = useRef(onWikilinkClick);

  // Autocomplete Popup State
  const [popupState, setPopupState] = useState<{
    isOpen: boolean;
    query: string;
    startPos: number; // Position after [[
    endPos: number;   // Position before ]]
    position: { top: number; left: number };
  }>({
    isOpen: false,
    query: '',
    startPos: 0,
    endPos: 0,
    position: { top: 0, left: 0 },
  });

  // Slash Command Menu State
  const [slashMenuState, setSlashMenuState] = useState<{
    isOpen: boolean;
    query: string;
    slashPos: number;
    position: { top: number; left: number };
  }>({
    isOpen: false,
    query: '',
    slashPos: 0,
    position: { top: 0, left: 0 },
  });

  // AI Context Menu State (Highlight)
  const [aiMenuState, setAiMenuState] = useState<{
    isOpen: boolean;
    text: string;
    from: number;
    to: number;
    position: { top: number; left: number };
  }>({
    isOpen: false,
    text: '',
    from: 0,
    to: 0,
    position: { top: 0, left: 0 },
  });

  // AI Inline Input State (Slash Command)
  const [aiInputState, setAiInputState] = useState<{
    isOpen: boolean;
    slashPos: number;
    position: { top: number; left: number };
  }>({
    isOpen: false,
    slashPos: 0,
    position: { top: 0, left: 0 },
  });

  const modeRef = useRef(mode);
  
  // Refs for resolving React prop race conditions
  const isSyncingRef = useRef(false);
  const emittedTextsRef = useRef<Set<string>>(new Set());

  // Keep refs fresh
  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

  useEffect(() => {
    modeRef.current = mode;
  }, [mode]);

  useEffect(() => {
    nodesRef.current = nodes;
  }, [nodes]);

  useEffect(() => {
    onWikilinkClickRef.current = onWikilinkClick;
  }, [onWikilinkClick]);

  // Sync external changes (e.g. from Preview checkbox clicks or external file loads)
  useEffect(() => {
    if (viewRef.current) {
      const currentDoc = viewRef.current.state.doc.toString();
      if (initialContent !== currentDoc) {
        // If this initialContent is a state we just emitted, it's a stale React prop.
        // Ignore it to prevent cursor jumping and IME breakage on mobile.
        if (emittedTextsRef.current.has(initialContent)) {
          return;
        }

        // Genuine external change (e.g. checkbox click in Preview mode)
        isSyncingRef.current = true;
        viewRef.current.dispatch({
          changes: {
            from: 0,
            to: viewRef.current.state.doc.length,
            insert: initialContent
          }
        });
        isSyncingRef.current = false;
      }
    }
  }, [initialContent]);

  useImperativeHandle(ref, () => ({
    focus: () => {
      if (viewRef.current) {
        viewRef.current.focus();
      }
    },
    getScrollRatio: () => {
      const container = containerRef.current;
      if (container) {
        const { scrollTop, scrollHeight, clientHeight } = container;
        const maxScroll = scrollHeight - clientHeight;
        return maxScroll > 0 ? scrollTop / maxScroll : 0;
      }
      return 0;
    },
    setScrollRatio: (ratio: number) => {
      setTimeout(() => {
        const container = containerRef.current;
        if (container) {
          const { scrollHeight, clientHeight } = container;
          container.scrollTop = ratio * (scrollHeight - clientHeight);
        }
      }, 10);
    },
    scrollToHeading: (lineIndex: number) => {
      if (!viewRef.current) return;
      const view = viewRef.current;
      const lineCount = view.state.doc.lines;
      const targetLineNum = Math.min(Math.max(1, lineIndex + 1), lineCount);
      const line = view.state.doc.line(targetLineNum);

      view.dispatch({
        selection: { anchor: line.from },
        scrollIntoView: true,
      });
      view.focus();
    },
  }));

  // Setup Editor exactly once
  useEffect(() => {
    if (!editorRef.current || viewRef.current) return;

    const getModeExtensions = (isSource: boolean) => [
      createLiveEditPlugin(isSource),
      createWikilinkDecorationsPlugin(
        () => nodesRef.current,
        isSource,
        (targetName) => onWikilinkClickRef.current?.(targetName)
      )
    ];

    // Base extensions shared between SOURCE and LIVE_EDIT
    const baseExtensions = [
      history(),
      codeFolding(),
      foldGutter({
        openText: '▾',
        closedText: '▸',
      }),
      keymap.of([...defaultKeymap, ...historyKeymap, ...foldKeymap, indentWithTab]),
      markdown({
        base: markdownLanguage,
        extensions: [GFM]
      }),
      EditorView.updateListener.of((update) => {
        if (update.docChanged) {
          const newText = update.state.doc.toString();
          
          if (!isSyncingRef.current) {
            emittedTextsRef.current.add(newText);
            // Keep set size bounded to prevent memory leaks over long sessions
            if (emittedTextsRef.current.size > 100) {
              const iterator = emittedTextsRef.current.values();
              emittedTextsRef.current.delete(iterator.next().value);
            }
            onChangeRef.current(newText);
          }
        }

        // Auto-close [[ and trigger popup detection
        const view = update.view;
        const selection = view.state.selection.main;

        if (selection.empty && view.hasFocus) {
          const head = selection.head;
          const docText = view.state.doc.toString();

          // 1. Auto-close [[ when user types [ after another [ (excluding task checkboxes like [ ])
          if (update.docChanged) {
            update.changes.iterChanges((fromA, toA, fromB, toB, inserted) => {
              if (inserted.toString() === '[') {
                const prevChar = docText.slice(head - 2, head - 1);
                const nextTwoChars = docText.slice(head, head + 2);
                if (prevChar === '[' && !nextTwoChars.includes(']')) {
                  setTimeout(() => {
                    view.dispatch({
                      changes: { from: head, insert: ']]' },
                      selection: { anchor: head },
                    });
                  }, 0);
                }
              }
            });
          }

          // 2. Check if cursor is inside [[...]] range for popup autocomplete
          const line = view.state.doc.lineAt(head);
          const textBeforeCursor = line.text.slice(0, head - line.from);
          const lastOpenInLine = textBeforeCursor.lastIndexOf('[[');

          if (lastOpenInLine !== -1) {
            const startPosInDoc = line.from + lastOpenInLine + 2;
            const textAfterOpen = line.text.slice(lastOpenInLine + 2);
            const relativeClosePos = textAfterOpen.indexOf(']]');
            const endPosInDoc = relativeClosePos !== -1 ? line.from + lastOpenInLine + 2 + relativeClosePos : line.to;

            // Ensure cursor is between [[ and ]]
            if (head >= startPosInDoc && head <= endPosInDoc + 2) {
              const query = docText.slice(startPosInDoc, head);
              const coords = view.coordsAtPos(head);
              if (coords) {
                setPopupState({
                  isOpen: true,
                  query,
                  startPos: startPosInDoc,
                  endPos: endPosInDoc,
                  position: {
                    top: coords.bottom + 6,
                    left: coords.left,
                  },
                });
                setSlashMenuState((prev) => (prev.isOpen ? { ...prev, isOpen: false } : prev));
                return;
              }
            }
          }

          // 3. Check if cursor is after a `/` for Slash Command Menu
          // Matches '/' at start of line or after whitespace, followed only by valid query characters
          const slashMatch = /(?:^|\s)\/([a-zA-Z0-9_\-#]*)$/.exec(textBeforeCursor);

          if (slashMatch) {
            const slashQuery = slashMatch[1];
            const slashIndexInLine = textBeforeCursor.length - slashQuery.length - 1;
            const slashPosInDoc = line.from + slashIndexInLine;
            const coords = view.coordsAtPos(head);

            if (coords) {
              setSlashMenuState({
                isOpen: true,
                query: slashQuery,
                slashPos: slashPosInDoc,
                position: {
                  top: coords.bottom + 6,
                  left: coords.left,
                },
              });
              setPopupState((prev) => (prev.isOpen ? { ...prev, isOpen: false } : prev));
              return;
            }
          }
        }

        // Check for text selection for AI Context Menu
        if (!selection.empty && selection.to - selection.from > 0) {
          if (update.selectionSet || update.docChanged) {
            const text = view.state.sliceDoc(selection.from, selection.to);
            setAiMenuState({
              isOpen: true,
              text,
              from: selection.from,
              to: selection.to,
              position: { top: 0, left: 0 },
            });
          }
        } else {
          setAiMenuState((prev) => (prev.isOpen ? { ...prev, isOpen: false } : prev));
        }

        // Hide popups if condition not met
        setPopupState((prev) => (prev.isOpen ? { ...prev, isOpen: false } : prev));
        setSlashMenuState((prev) => (prev.isOpen ? { ...prev, isOpen: false } : prev));
      }),
      EditorView.theme({
        "&": {
          fontSize: "var(--text-body-size)",
          backgroundColor: "transparent",
        },
        ".cm-scroller": {
          fontFamily: "inherit",
          lineHeight: "var(--text-body-height)",
          overflow: "visible",
          padding: "0",
        },
        ".cm-gutters": {
          backgroundColor: "transparent",
          borderRight: "none",
        },
        ".cm-content": {
          maxWidth: "768px",
          margin: "0 auto",
          padding: "0 1rem",
          caretColor: "var(--text-primary)",
        },
        ".cm-line": {
          paddingLeft: "0",
          paddingRight: "0",
        },
        "&.cm-focused": {
          outline: "none"
        },
        ".cm-cursor, .cm-dropCursor": {
          borderLeftColor: "var(--text-primary)"
        }
      }),
      EditorView.lineWrapping,
      modeCompartmentRef.current.of(
        getModeExtensions(mode === 'SOURCE')
      )
    ];

    const state = EditorState.create({
      doc: initialContent,
      extensions: baseExtensions,
    });

    viewRef.current = new EditorView({
      state,
      parent: editorRef.current,
    });

    // Add custom event listener for toolbar insertions
    const handleInsert = (e: Event) => {
      const customEvent = e as CustomEvent;
      const { syntax, cursorOffset } = customEvent.detail;
      if (viewRef.current) {
        const view = viewRef.current;
        const selection = view.state.selection.main;
        
        view.dispatch({
          changes: {
            from: selection.from,
            to: selection.to,
            insert: syntax
          },
          selection: { anchor: selection.from + cursorOffset }
        });
        view.focus();
      }
    };

    window.addEventListener('editor:insert', handleInsert);

    return () => {
      window.removeEventListener('editor:insert', handleInsert);
      if (viewRef.current) {
        viewRef.current.destroy();
        viewRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Only run once on mount

  // Handle mode changes dynamically using Compartment
  useEffect(() => {
    if (viewRef.current) {
      const isSource = mode === 'SOURCE';
      viewRef.current.dispatch({
        effects: modeCompartmentRef.current.reconfigure([
          createLiveEditPlugin(isSource),
          createWikilinkDecorationsPlugin(
            () => nodesRef.current,
            isSource,
            (targetName) => onWikilinkClickRef.current?.(targetName)
          )
        ])
      });
    }
  }, [mode]);

  const handleAutocompleteSelect = (noteName: string) => {
    if (!viewRef.current) return;
    const view = viewRef.current;
    const { startPos, endPos } = popupState;
    const docText = view.state.doc.toString();
    const hasClosingBrackets = docText.slice(endPos, endPos + 2) === ']]';

    const insertText = hasClosingBrackets ? noteName : noteName + ']]';
    const newCursorPos = startPos + noteName.length + 2;

    view.dispatch({
      changes: {
        from: startPos,
        to: endPos,
        insert: insertText,
      },
      selection: { anchor: newCursorPos },
    });

    setPopupState((prev) => ({ ...prev, isOpen: false }));
    view.focus();
  };

  const handleSlashCommandSelect = (cmd: SlashCommand) => {
    if (!viewRef.current) return;
    const view = viewRef.current;
    const { slashPos, position } = slashMenuState;
    const currentHead = view.state.selection.main.head;
    
    // Evaluate the action to see if it's an AI Trigger
    const actionResult = cmd.action();
    const isAi = (actionResult as any).isAiTrigger;

    const replaceFrom = slashPos;
    const replaceTo = currentHead;

    if (isAi) {
      // Clear the slash command text (e.g. "/ai") first
      view.dispatch({
        changes: { from: replaceFrom, to: replaceTo, insert: '' },
      });
      // Open inline input instead of inserting text
      setAiInputState({
        isOpen: true,
        slashPos: replaceFrom,
        position,
      });
      setSlashMenuState((prev) => ({ ...prev, isOpen: false }));
      return;
    }

    const { text, cursorOffset } = actionResult;
    const insertText = text;
    const newCursor = replaceFrom + (cursorOffset !== undefined ? cursorOffset : insertText.length);

    view.dispatch({
      changes: {
        from: replaceFrom,
        to: replaceTo,
        insert: insertText,
      },
      selection: { anchor: newCursor },
    });

    setSlashMenuState((prev) => ({ ...prev, isOpen: false }));
    view.focus();
  };

  const handleAiContextComplete = (result: string) => {
    if (!viewRef.current) return;
    const { from, to } = aiMenuState;
    replaceTextWithUndo(viewRef.current, from, to, result);
    setAiMenuState((prev) => ({ ...prev, isOpen: false }));
  };

  const handleAiInlineComplete = (result: string) => {
    if (!viewRef.current) return;
    const { slashPos } = aiInputState;
    replaceTextWithUndo(viewRef.current, slashPos, slashPos, result);
    setAiInputState((prev) => ({ ...prev, isOpen: false }));
  };

  const handleTitleEnter = () => {
    if (viewRef.current) {
      viewRef.current.focus();
    }
  };

  return (
    <div 
      ref={containerRef} 
      className="w-full h-full overflow-y-auto bg-bg-primary text-text-primary flex flex-col relative"
    >
      {/* Integrated Title inside the unified scroll container */}
      <div className="flex-none">
        <NoteTitle
          title={title}
          onChange={onTitleChange}
          onEnterPress={handleTitleEnter}
        />
      </div>
      {/* Markdown CodeMirror Editor */}
      <div ref={editorRef} className="w-full flex-1 pb-24" />

      {/* Wikilink Autocomplete Popup */}
      {popupState.isOpen && (
        <WikilinkAutocompletePopup
          nodes={nodes}
          query={popupState.query}
          onSelect={handleAutocompleteSelect}
          onClose={() => setPopupState((prev) => ({ ...prev, isOpen: false }))}
          position={popupState.position}
        />
      )}

      {/* Slash Command Menu */}
      {slashMenuState.isOpen && (
        <SlashCommandMenu
          query={slashMenuState.query}
          onSelect={handleSlashCommandSelect}
          onClose={() => setSlashMenuState((prev) => ({ ...prev, isOpen: false }))}
          position={slashMenuState.position}
        />
      )}

      {/* AI Context Menu */}
      {aiMenuState.isOpen && (
        <AiContextMenu
          position={aiMenuState.position}
          selectedText={aiMenuState.text}
          onActionComplete={handleAiContextComplete}
          onClose={() => setAiMenuState((prev) => ({ ...prev, isOpen: false }))}
        />
      )}

      {/* AI Inline Input */}
      {aiInputState.isOpen && (
        <AiInlineInput
          position={aiInputState.position}
          onComplete={handleAiInlineComplete}
          onCancel={() => {
            setAiInputState((prev) => ({ ...prev, isOpen: false }));
            if (viewRef.current) viewRef.current.focus();
          }}
        />
      )}
    </div>
  );
});
