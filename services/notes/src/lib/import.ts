// Converters that turn imported files (Markdown, HTML, plain text) from other
// note apps (Obsidian, Notion, Bear, Apple Notes, Evernote HTML exports, …)
// into TipTap document JSON that this editor can open natively.
//
// Runs server-side with no DOM: HTML is normalised into Markdown first, then a
// single Markdown → TipTap converter does the structural work.

type Node = Record<string, unknown>;

// ── Inline parsing ──────────────────────────────────────────────────────────
// Handles **bold**, *italic* / _italic_, `code`, and [text](url) links.

export function decodeEntities(s: string): string {
  return s
    .replace(/&nbsp;/g, " ")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&#0*39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&mdash;/g, "—")
    .replace(/&ndash;/g, "–")
    .replace(/&hellip;/g, "…")
    // Numeric entities (hex and decimal), e.g. &#x27; (apostrophe), &#96; (`)
    .replace(/&#x([0-9a-fA-F]+);/g, (_m, h) => safeFromCodePoint(parseInt(h, 16)))
    .replace(/&#(\d+);/g, (_m, d) => safeFromCodePoint(parseInt(d, 10)))
    // &amp; last so we don't double-decode the entities above
    .replace(/&amp;/g, "&");
}

function safeFromCodePoint(cp: number): string {
  if (!Number.isFinite(cp) || cp < 0 || cp > 0x10ffff) return "";
  try {
    return String.fromCodePoint(cp);
  } catch {
    return "";
  }
}

// Extract the text of a <pre> block while PRESERVING line breaks (code must not
// be collapsed onto one line). Strips inner tags, converts <br>, decodes entities.
function preText(html: string): string {
  return decodeEntities(
    html
      .replace(/<\/?code[^>]*>/gi, "")
      .replace(/<br\s*\/?>/gi, "\n")
      .replace(/<[^>]+>/g, "")
  )
    .replace(/\n{3,}/g, "\n\n")
    .replace(/[ \t]+$/gm, "")
    .replace(/^\n+|\n+$/g, "");
}

function inlineToNodes(raw: string): Node[] {
  const text = decodeEntities(raw);
  const nodes: Node[] = [];
  // Token regex: [[wiki links]], markdown links, bold, italic (* or _), inline code.
  // [[...]] is matched first so it isn't mistaken for a markdown link.
  const re =
    /(\[\[([^\]]+)\]\])|(\[([^\]]+)\]\(([^)]+)\))|(\*\*([^*]+)\*\*)|(__([^_]+)__)|(\*([^*]+)\*)|(_([^_]+)_)|(`([^`]+)`)/g;
  let last = 0;
  let m: RegExpExecArray | null;
  const push = (t: string, marks?: Node[]) => {
    if (!t) return;
    nodes.push(marks ? { type: "text", text: t, marks } : { type: "text", text: t });
  };
  while ((m = re.exec(text)) !== null) {
    if (m.index > last) push(text.slice(last, m.index));
    if (m[1]) {
      // [[Wiki Link]] → wikiLink mark so it renders clickable in the editor
      const title = m[2].trim();
      push(title, [{ type: "wikiLink", attrs: { title } }]);
    } else if (m[3]) {
      push(m[4], [{ type: "link", attrs: { href: m[5] } }]);
    } else if (m[6] || m[8]) {
      push(m[7] || m[9], [{ type: "bold" }]);
    } else if (m[10] || m[12]) {
      push(m[11] || m[13], [{ type: "italic" }]);
    } else if (m[14]) {
      push(m[15], [{ type: "code" }]);
    }
    last = re.lastIndex;
  }
  if (last < text.length) push(text.slice(last));
  return nodes.length ? nodes : [];
}

function paragraph(text: string): Node {
  const content = inlineToNodes(text);
  return content.length ? { type: "paragraph", content } : { type: "paragraph" };
}

// ── Markdown → TipTap ────────────────────────────────────────────────────────

export function markdownToTiptap(md: string): Node {
  const lines = md.replace(/\r\n/g, "\n").split("\n");
  const content: Node[] = [];
  let i = 0;

  const flushList = (ordered: boolean, items: { text: string; checked: boolean | null }[]) => {
    const taskMode = items.every((it) => it.checked !== null);
    if (taskMode) {
      content.push({
        type: "taskList",
        content: items.map((it) => ({
          type: "taskItem",
          attrs: { checked: it.checked === true },
          content: [paragraph(it.text)],
        })),
      });
    } else {
      content.push({
        type: ordered ? "orderedList" : "bulletList",
        content: items.map((it) => ({ type: "listItem", content: [paragraph(it.text)] })),
      });
    }
  };

  while (i < lines.length) {
    const line = lines[i];

    // Code fence
    if (/^```/.test(line)) {
      const lang = line.replace(/^```/, "").trim();
      const buf: string[] = [];
      i++;
      while (i < lines.length && !/^```/.test(lines[i])) {
        buf.push(lines[i]);
        i++;
      }
      i++; // closing fence
      content.push({
        type: "codeBlock",
        attrs: lang ? { language: lang } : {},
        content: buf.length ? [{ type: "text", text: buf.join("\n") }] : undefined,
      });
      continue;
    }

    // Horizontal rule
    if (/^(\s*[-*_]){3,}\s*$/.test(line)) {
      content.push({ type: "horizontalRule" });
      i++;
      continue;
    }

    // Heading
    const hMatch = line.match(/^(#{1,6})\s+(.*)$/);
    if (hMatch) {
      const level = Math.min(hMatch[1].length, 3);
      content.push({ type: "heading", attrs: { level }, content: inlineToNodes(hMatch[2]) });
      i++;
      continue;
    }

    // Blockquote
    if (/^>\s?/.test(line)) {
      const buf: string[] = [];
      while (i < lines.length && /^>\s?/.test(lines[i])) {
        buf.push(lines[i].replace(/^>\s?/, ""));
        i++;
      }
      content.push({ type: "blockquote", content: [paragraph(buf.join(" "))] });
      continue;
    }

    // Lists (bullet, ordered, task)
    const listMatch = line.match(/^(\s*)([-*+]|\d+\.)\s+(.*)$/);
    if (listMatch) {
      const ordered = /\d+\./.test(listMatch[2]);
      const items: { text: string; checked: boolean | null }[] = [];
      while (i < lines.length) {
        const lm = lines[i].match(/^(\s*)([-*+]|\d+\.)\s+(.*)$/);
        if (!lm) break;
        if (/\d+\./.test(lm[2]) !== ordered) break;
        let txt = lm[3];
        let checked: boolean | null = null;
        const task = txt.match(/^\[([ xX])\]\s+(.*)$/);
        if (task) {
          checked = task[1].toLowerCase() === "x";
          txt = task[2];
        }
        items.push({ text: txt, checked });
        i++;
      }
      flushList(ordered, items);
      continue;
    }

    // Blank line
    if (line.trim() === "") {
      i++;
      continue;
    }

    // Paragraph (gather consecutive non-blank, non-structural lines)
    const buf: string[] = [line];
    i++;
    while (
      i < lines.length &&
      lines[i].trim() !== "" &&
      !/^(#{1,6}\s|>\s?|```|(\s*)([-*+]|\d+\.)\s|(\s*[-*_]){3,}\s*$)/.test(lines[i])
    ) {
      buf.push(lines[i]);
      i++;
    }
    content.push(paragraph(buf.join(" ")));
  }

  return { type: "doc", content: content.length ? content : [{ type: "paragraph" }] };
}

// ── HTML → Markdown (then reuse the Markdown converter) ──────────────────────

export function htmlToMarkdown(html: string): string {
  let s = html;
  // Drop comments, non-content elements, and void metadata tags entirely
  s = s.replace(/<!--[\s\S]*?-->/g, "");
  s = s.replace(/<(script|style|head|title|noscript|template|svg)[\s\S]*?<\/\1>/gi, "");
  // (keep <input> — list-item checkbox detection below relies on it)
  s = s.replace(/<(link|meta|base|img|source|track)[^>]*\/?>/gi, "");

  // Code blocks FIRST, before any whitespace-collapsing runs, so multi-line
  // code keeps its line breaks. Detect a language from <code class="language-x">.
  s = s.replace(/<pre[^>]*>([\s\S]*?)<\/pre>/gi, (_x, t) => {
    const langMatch = t.match(/<code[^>]*class=["'][^"']*language-([a-z0-9+#-]+)/i);
    const lang = langMatch ? langMatch[1] : "";
    return `\n\n\`\`\`${lang}\n${preText(t)}\n\`\`\`\n\n`;
  });

  // Block wrappers → line breaks; inline <span> is removed without one.
  s = s.replace(
    /<\/?(html|body|main|article|section|div|figure|figcaption|header|footer|nav|aside)[^>]*>/gi,
    "\n"
  );
  s = s.replace(/<\/?span[^>]*>/gi, "");

  // Headings
  for (let l = 1; l <= 6; l++) {
    s = s.replace(new RegExp(`<h${l}[^>]*>([\\s\\S]*?)</h${l}>`, "gi"), (_x, t) => `\n\n${"#".repeat(l)} ${strip(t)}\n\n`);
  }
  // Block elements
  s = s.replace(/<blockquote[^>]*>([\s\S]*?)<\/blockquote>/gi, (_x, t) => `\n\n> ${strip(t)}\n\n`);
  // List items: checkbox-aware
  s = s.replace(/<li[^>]*>([\s\S]*?)<\/li>/gi, (_x, t) => {
    const checkbox = /<input[^>]*type=["']?checkbox["']?[^>]*>/i.test(t);
    const checked = /checked/i.test(t);
    const body = strip(t);
    if (checkbox) return `\n- [${checked ? "x" : " "}] ${body}`;
    return `\n- ${body}`;
  });
  s = s.replace(/<\/(ul|ol)>/gi, "\n\n");
  s = s.replace(/<(ul|ol)[^>]*>/gi, "\n");
  s = s.replace(/<hr[^>]*\/?>/gi, "\n\n---\n\n");
  s = s.replace(/<p[^>]*>([\s\S]*?)<\/p>/gi, (_x, t) => `\n\n${strip(t)}\n\n`);
  s = s.replace(/<br\s*\/?>/gi, "\n");

  return s
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

// Convert inline formatting tags to Markdown, strip everything else.
function strip(html: string): string {
  return html
    .replace(/<\s*(strong|b)\s*>([\s\S]*?)<\/\s*(strong|b)\s*>/gi, "**$2**")
    .replace(/<\s*(em|i)\s*>([\s\S]*?)<\/\s*(em|i)\s*>/gi, "*$2*")
    .replace(/<code[^>]*>([\s\S]*?)<\/code>/gi, "`$1`")
    .replace(/<a[^>]*href=["']([^"']*)["'][^>]*>([\s\S]*?)<\/a>/gi, "[$2]($1)")
    .replace(/<input[^>]*>/gi, "")
    .replace(/<[^>]+>/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

// ── Top-level dispatch ───────────────────────────────────────────────────────

export type ImportFile = { name: string; content: string };

export function fileToNote(file: ImportFile): { title: string; content: string } {
  const ext = (file.name.split(".").pop() || "").toLowerCase();
  const base = file.name.replace(/\.[^.]+$/, "");

  let doc: Node;
  let title = base;

  if (ext === "html" || ext === "htm") {
    // Prefer an <h1> or <title> as the note title if present
    const h1 = file.content.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i);
    const t = file.content.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
    if (h1) title = strip(h1[1]) || base;
    else if (t) title = strip(t[1]) || base;
    doc = markdownToTiptap(htmlToMarkdown(file.content));
  } else if (ext === "md" || ext === "markdown" || ext === "txt" || ext === "text") {
    // A leading "# Title" becomes the note title
    const firstHeading = file.content.match(/^\s*#\s+(.+)$/m);
    if (firstHeading) title = firstHeading[1].trim();
    doc = markdownToTiptap(file.content);
  } else {
    doc = markdownToTiptap(file.content);
  }

  return { title: title || "Imported note", content: JSON.stringify(doc) };
}
