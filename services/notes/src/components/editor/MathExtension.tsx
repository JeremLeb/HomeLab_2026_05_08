import { Node, mergeAttributes, InputRule } from "@tiptap/core";
import { ReactNodeViewRenderer, NodeViewWrapper } from "@tiptap/react";
import type { NodeViewProps } from "@tiptap/react";
import { useState, useRef, useEffect } from "react";
import katex from "katex";

// Inline + block math rendered with KaTeX.
// Type `$x^2$` for inline, `$$...$$` on its own line for a block.

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    math: {
      setInlineMath: (latex: string) => ReturnType;
      setBlockMath: (latex: string) => ReturnType;
    };
  }
}

function MathView({ node, updateAttributes, editor }: NodeViewProps) {
  const isBlock = node.type.name === "blockMath";
  const latex = (node.attrs.latex as string) || "";
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(latex);
  const inputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (editing) inputRef.current?.focus();
  }, [editing]);

  let html = "";
  let error = false;
  try {
    html = katex.renderToString(latex || "\\,", {
      displayMode: isBlock,
      throwOnError: false,
    });
  } catch {
    error = true;
  }

  const commit = () => {
    updateAttributes({ latex: draft });
    setEditing(false);
  };

  if (editing) {
    return (
      <NodeViewWrapper as={isBlock ? "div" : "span"} className="math-edit">
        <input
          ref={inputRef}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={commit}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              commit();
            } else if (e.key === "Escape") {
              setDraft(latex);
              setEditing(false);
            }
          }}
          className="math-input"
          placeholder="LaTeX…"
        />
      </NodeViewWrapper>
    );
  }

  return (
    <NodeViewWrapper
      as={isBlock ? "div" : "span"}
      className={`math-node ${isBlock ? "math-block" : "math-inline"} ${error ? "math-error" : ""}`}
      onClick={() => {
        if (editor.isEditable) {
          setDraft(latex);
          setEditing(true);
        }
      }}
      dangerouslySetInnerHTML={{ __html: html || "∅" }}
    />
  );
}

export const InlineMath = Node.create({
  name: "inlineMath",
  group: "inline",
  inline: true,
  atom: true,
  selectable: true,

  addAttributes() {
    return { latex: { default: "" } };
  },
  parseHTML() {
    return [{ tag: "span[data-inline-math]" }];
  },
  renderHTML({ HTMLAttributes }) {
    return ["span", mergeAttributes(HTMLAttributes, { "data-inline-math": "", "data-latex": HTMLAttributes.latex })];
  },
  addNodeView() {
    return ReactNodeViewRenderer(MathView);
  },
  addCommands() {
    return {
      setInlineMath:
        (latex: string) =>
        ({ commands }) =>
          commands.insertContent({ type: this.name, attrs: { latex } }),
      setBlockMath:
        (latex: string) =>
        ({ commands }) =>
          commands.insertContent({ type: "blockMath", attrs: { latex } }),
    };
  },
  addInputRules() {
    return [
      new InputRule({
        find: /\$([^$]+)\$$/,
        handler: ({ state, range, match }) => {
          state.tr.replaceWith(
            range.from,
            range.to,
            this.type.create({ latex: match[1] })
          );
        },
      }),
    ];
  },
});

export const BlockMath = Node.create({
  name: "blockMath",
  group: "block",
  atom: true,
  selectable: true,

  addAttributes() {
    return { latex: { default: "" } };
  },
  parseHTML() {
    return [{ tag: "div[data-block-math]" }];
  },
  renderHTML({ HTMLAttributes }) {
    return ["div", mergeAttributes(HTMLAttributes, { "data-block-math": "", "data-latex": HTMLAttributes.latex })];
  },
  addNodeView() {
    return ReactNodeViewRenderer(MathView);
  },
  addInputRules() {
    return [
      new InputRule({
        find: /\$\$([^$]+)\$\$$/,
        handler: ({ state, range, match }) => {
          state.tr.replaceWith(
            range.from,
            range.to,
            this.type.create({ latex: match[1] })
          );
        },
      }),
    ];
  },
});
