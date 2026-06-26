// Convert a TipTap document (stored as JSON) into Markdown or standalone HTML.
// Mirrors the import pipeline in import.ts.

type Node = {
  type?: string;
  text?: string;
  attrs?: Record<string, unknown>;
  content?: Node[];
  marks?: { type: string; attrs?: Record<string, unknown> }[];
};

// ── Inline (text + marks) ─────────────────────────────────────────────────────

function inlineToMarkdown(nodes: Node[] = []): string {
  return nodes
    .map((n) => {
      if (n.type === "hardBreak") return "\n";
      if (n.type === "inlineMath") return `$${n.attrs?.latex ?? ""}$`;
      if (n.type !== "text") return "";
      let t = n.text ?? "";
      for (const m of n.marks ?? []) {
        if (m.type === "bold") t = `**${t}**`;
        else if (m.type === "italic") t = `*${t}*`;
        else if (m.type === "code") t = `\`${t}\``;
        else if (m.type === "strike") t = `~~${t}~~`;
        else if (m.type === "link") t = `[${t}](${m.attrs?.href ?? ""})`;
        else if (m.type === "wikiLink") t = `[[${m.attrs?.title ?? t}]]`;
      }
      return t;
    })
    .join("");
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function inlineToHtml(nodes: Node[] = []): string {
  return nodes
    .map((n) => {
      if (n.type === "hardBreak") return "<br>";
      if (n.type === "inlineMath") return escapeHtml(`$${n.attrs?.latex ?? ""}$`);
      if (n.type !== "text") return "";
      let t = escapeHtml(n.text ?? "");
      for (const m of n.marks ?? []) {
        if (m.type === "bold") t = `<strong>${t}</strong>`;
        else if (m.type === "italic") t = `<em>${t}</em>`;
        else if (m.type === "code") t = `<code>${t}</code>`;
        else if (m.type === "strike") t = `<del>${t}</del>`;
        else if (m.type === "link") t = `<a href="${m.attrs?.href ?? ""}">${t}</a>`;
        else if (m.type === "wikiLink") t = `<a class="wiki-link">${t}</a>`;
      }
      return t;
    })
    .join("");
}

// ── Block → Markdown ──────────────────────────────────────────────────────────

function blockToMarkdown(node: Node, depth = 0): string {
  const indent = "  ".repeat(depth);
  switch (node.type) {
    case "heading": {
      const level = Math.min(Number(node.attrs?.level ?? 1), 6);
      return `${"#".repeat(level)} ${inlineToMarkdown(node.content)}\n`;
    }
    case "paragraph":
      return `${inlineToMarkdown(node.content)}\n`;
    case "blockquote":
      return (node.content ?? [])
        .map((c) => `> ${inlineToMarkdown(c.content)}`)
        .join("\n") + "\n";
    case "bulletList":
      return (node.content ?? [])
        .map((li) => `${indent}- ${inlineToMarkdown(li.content?.[0]?.content)}`)
        .join("\n") + "\n";
    case "orderedList":
      return (node.content ?? [])
        .map((li, i) => `${indent}${i + 1}. ${inlineToMarkdown(li.content?.[0]?.content)}`)
        .join("\n") + "\n";
    case "taskList":
      return (node.content ?? [])
        .map((li) => `${indent}- [${li.attrs?.checked ? "x" : " "}] ${inlineToMarkdown(li.content?.[0]?.content)}`)
        .join("\n") + "\n";
    case "codeBlock":
      return `\`\`\`${node.attrs?.language ?? ""}\n${node.content?.map((c) => c.text).join("") ?? ""}\n\`\`\`\n`;
    case "blockMath":
      return `$$${node.attrs?.latex ?? ""}$$\n`;
    case "mermaid":
      return `\`\`\`mermaid\n${node.attrs?.code ?? ""}\n\`\`\`\n`;
    case "horizontalRule":
      return `---\n`;
    case "image":
      return `![${node.attrs?.alt ?? ""}](${node.attrs?.src ?? ""})\n`;
    case "fileAttachment":
      return `[${node.attrs?.name ?? "file"}](${node.attrs?.href ?? ""})\n`;
    default:
      return node.content ? inlineToMarkdown(node.content) + "\n" : "";
  }
}

export function tiptapToMarkdown(json: string, title: string): string {
  let doc: Node;
  try {
    doc = JSON.parse(json);
  } catch {
    doc = { type: "doc", content: [] };
  }
  const body = (doc.content ?? []).map((n) => blockToMarkdown(n)).join("\n");
  return `# ${title}\n\n${body}`.trim() + "\n";
}

// ── Block → HTML ──────────────────────────────────────────────────────────────

function blockToHtml(node: Node): string {
  switch (node.type) {
    case "heading": {
      const level = Math.min(Number(node.attrs?.level ?? 1), 6);
      return `<h${level}>${inlineToHtml(node.content)}</h${level}>`;
    }
    case "paragraph":
      return `<p>${inlineToHtml(node.content)}</p>`;
    case "blockquote":
      return `<blockquote>${(node.content ?? []).map(blockToHtml).join("")}</blockquote>`;
    case "bulletList":
      return `<ul>${(node.content ?? []).map((li) => `<li>${inlineToHtml(li.content?.[0]?.content)}</li>`).join("")}</ul>`;
    case "orderedList":
      return `<ol>${(node.content ?? []).map((li) => `<li>${inlineToHtml(li.content?.[0]?.content)}</li>`).join("")}</ol>`;
    case "taskList":
      return `<ul class="task-list">${(node.content ?? [])
        .map((li) => `<li><input type="checkbox" ${li.attrs?.checked ? "checked" : ""} disabled> ${inlineToHtml(li.content?.[0]?.content)}</li>`)
        .join("")}</ul>`;
    case "codeBlock":
      return `<pre><code>${escapeHtml(node.content?.map((c) => c.text).join("") ?? "")}</code></pre>`;
    case "blockMath":
      return `<p>$$${escapeHtml(String(node.attrs?.latex ?? ""))}$$</p>`;
    case "mermaid":
      return `<pre class="mermaid">${escapeHtml(String(node.attrs?.code ?? ""))}</pre>`;
    case "horizontalRule":
      return `<hr>`;
    case "image":
      return `<img src="${node.attrs?.src ?? ""}" alt="${node.attrs?.alt ?? ""}">`;
    case "fileAttachment":
      return `<a href="${node.attrs?.href ?? ""}" download>${node.attrs?.name ?? "file"}</a>`;
    default:
      return node.content ? `<p>${inlineToHtml(node.content)}</p>` : "";
  }
}

export function tiptapToHtml(json: string, title: string): string {
  let doc: Node;
  try {
    doc = JSON.parse(json);
  } catch {
    doc = { type: "doc", content: [] };
  }
  const body = (doc.content ?? []).map(blockToHtml).join("\n");
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<title>${escapeHtml(title)}</title>
<style>
  body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; max-width: 720px; margin: 2rem auto; padding: 0 1rem; line-height: 1.7; }
  pre { background: #f4f4f5; padding: 1rem; border-radius: 6px; overflow-x: auto; }
  code { font-family: ui-monospace, monospace; }
  blockquote { border-left: 4px solid #ddd; margin: 0; padding-left: 1rem; color: #555; }
  img { max-width: 100%; height: auto; }
  table { border-collapse: collapse; } td, th { border: 1px solid #ddd; padding: 0.4rem 0.6rem; }
</style>
</head>
<body>
<h1>${escapeHtml(title)}</h1>
${body}
</body>
</html>`;
}
