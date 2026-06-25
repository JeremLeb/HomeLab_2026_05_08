import { Node, mergeAttributes } from "@tiptap/core";
import { ReactNodeViewRenderer, NodeViewWrapper } from "@tiptap/react";
import type { NodeViewProps } from "@tiptap/react";
import { useState, useRef, useEffect, useId } from "react";

// A Mermaid diagram block. Stores the diagram source in `code`; renders an SVG
// via the mermaid library (dynamically imported, browser-only). Click to edit.

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    mermaid: {
      setMermaid: (code: string) => ReturnType;
    };
  }
}

const DEFAULT = "graph TD\n  A[Start] --> B[End]";

function MermaidView({ node, updateAttributes, editor }: NodeViewProps) {
  const code = (node.attrs.code as string) || DEFAULT;
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(code);
  const [svg, setSvg] = useState("");
  const [error, setError] = useState("");
  const id = useId().replace(/[^a-zA-Z0-9]/g, "");
  const taRef = useRef<HTMLTextAreaElement | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const mermaid = (await import("mermaid")).default;
        mermaid.initialize({ startOnLoad: false, theme: "dark", securityLevel: "loose" });
        const { svg } = await mermaid.render(`mmd-${id}`, code);
        if (!cancelled) {
          setSvg(svg);
          setError("");
        }
      } catch (e) {
        if (!cancelled) setError(String(e instanceof Error ? e.message : e));
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [code, id]);

  useEffect(() => {
    if (editing) taRef.current?.focus();
  }, [editing]);

  const commit = () => {
    updateAttributes({ code: draft });
    setEditing(false);
  };

  return (
    <NodeViewWrapper className="mermaid-node">
      {editing ? (
        <div className="mermaid-edit">
          <textarea
            ref={taRef}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onBlur={commit}
            onKeyDown={(e) => {
              if (e.key === "Escape") {
                setDraft(code);
                setEditing(false);
              }
              if ((e.metaKey || e.ctrlKey) && e.key === "Enter") commit();
            }}
            className="mermaid-textarea"
            rows={Math.max(3, draft.split("\n").length)}
          />
          <div className="mermaid-hint">Cmd/Ctrl+Enter to render · Esc to cancel</div>
        </div>
      ) : (
        <div
          className="mermaid-render"
          onClick={() => {
            if (editor.isEditable) {
              setDraft(code);
              setEditing(true);
            }
          }}
        >
          {error ? (
            <pre className="mermaid-error">{error}</pre>
          ) : (
            <div dangerouslySetInnerHTML={{ __html: svg }} />
          )}
        </div>
      )}
    </NodeViewWrapper>
  );
}

export const MermaidExtension = Node.create({
  name: "mermaid",
  group: "block",
  atom: true,
  draggable: true,

  addAttributes() {
    return { code: { default: DEFAULT } };
  },
  parseHTML() {
    return [{ tag: "div[data-mermaid]" }];
  },
  renderHTML({ HTMLAttributes }) {
    return ["div", mergeAttributes(HTMLAttributes, { "data-mermaid": "", "data-code": HTMLAttributes.code })];
  },
  addNodeView() {
    return ReactNodeViewRenderer(MermaidView);
  },
  addCommands() {
    return {
      setMermaid:
        (code: string) =>
        ({ commands }) =>
          commands.insertContent({ type: this.name, attrs: { code: code || DEFAULT } }),
    };
  },
});
