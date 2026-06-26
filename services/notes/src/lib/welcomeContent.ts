// Full tutorial shown as the content of the first-run "Welcome to Notes" note.
// Built as a TipTap document (the same JSON shape the editor saves) so it renders
// as real, editable blocks — headings, lists, task lists, code, quotes, wiki-links.

type Node = Record<string, unknown>;

const text = (value: string, marks?: Node[]): Node =>
  marks ? { type: "text", text: value, marks } : { type: "text", text: value };

const bold = (value: string): Node => text(value, [{ type: "bold" }]);
const italic = (value: string): Node => text(value, [{ type: "italic" }]);
const code = (value: string): Node => text(value, [{ type: "code" }]);
const wiki = (value: string): Node =>
  text(value, [{ type: "wikiLink", attrs: { title: value } }]);

const p = (...content: Node[]): Node => ({
  type: "paragraph",
  content: content.length ? content : undefined,
});

const h = (level: number, value: string): Node => ({
  type: "heading",
  attrs: { level },
  content: [text(value)],
});

const li = (...content: Node[]): Node => ({
  type: "listItem",
  content,
});

const bullets = (...items: Node[][]): Node => ({
  type: "bulletList",
  content: items.map((c) => li(p(...c))),
});

const tasks = (...items: { checked: boolean; content: Node[] }[]): Node => ({
  type: "taskList",
  content: items.map((t) => ({
    type: "taskItem",
    attrs: { checked: t.checked },
    content: [p(...t.content)],
  })),
});

const quote = (...content: Node[]): Node => ({
  type: "blockquote",
  content: [p(...content)],
});

const hr = (): Node => ({ type: "horizontalRule" });

const doc: Node = {
  type: "doc",
  content: [
    h(1, "👋 Welcome to your notes"),
    p(
      text(
        "This is your own self-hosted notebook — a mix of Notion's block editor and Obsidian's linked, local-first notes, with optional AI built in. Everything you write is stored on your own machine. This page is a working note: edit it, delete it, or keep it as a reference."
      )
    ),
    quote(
      italic(
        "Tip: every block below is real and editable. Click into anything and start typing to try it out."
      )
    ),

    hr(),
    h(2, "1. The basics"),
    p(
      text("Use the "),
      bold("sidebar on the left"),
      text(" to manage your notes:")
    ),
    bullets(
      [bold("New note"), text(" — click the + button at the top of the sidebar.")],
      [
        bold("Nested pages"),
        text(" — hover a note and use its + to create a child page. Notes can nest as deep as you like, just like Notion."),
      ],
      [bold("Rename"), text(" — click the big title at the top of any note and type.")],
      [bold("Search"), text(" — the search box does full-text search across every note (powered by SQLite FTS).")],
      [bold("Delete"), text(" — use the note's menu in the sidebar.")]
    ),
    p(
      text("Everything "),
      bold("autosaves"),
      text(" as you type — there is no save button.")
    ),

    hr(),
    h(2, "2. Writing — three ways to format"),
    h(3, "Markdown shortcuts"),
    p(text("Type these at the start of a line and they transform instantly:")),
    bullets(
      [code("# "), text("  →  Heading 1   ("), code("## "), text(" and "), code("### "), text(" for H2 / H3)")],
      [code("- "), text("  or  "), code("* "), text("  →  bullet list")],
      [code("1. "), text("  →  numbered list")],
      [code("[] "), text("  →  task checkbox")],
      [code("> "), text("  →  quote")],
      [code("```"), text("  →  code block")],
      [text("Wrap words in "), code("**bold**"), text(", "), code("_italic_"), text(", or "), code("`code`"), text(".")]
    ),
    h(3, "The “/” slash menu"),
    p(
      text("Type "),
      code("/"),
      text(" anywhere on an empty line to open the block menu. You can insert headings, lists, task lists, code blocks, quotes, "),
      bold("tables"),
      text(", and dividers. Keep typing to filter (e.g. "),
      code("/table"),
      text("), then press Enter.")
    ),
    h(3, "The selection toolbar"),
    p(
      text("Select any text and a floating toolbar appears with "),
      bold("bold"),
      text(", "),
      italic("italic"),
      text(", inline code, headings, quote, and the "),
      text("✦", [{ type: "bold" }]),
      text(" AI button.")
    ),

    hr(),
    h(2, "3. Linking notes (the Obsidian part)"),
    p(
      text("Type "),
      code("[[ "),
      text("followed by a note title and close with "),
      code("]]"),
      text(" to create a wiki-link. For example, a link to this page looks like "),
      wiki("Welcome to your notes"),
      text(".")
    ),
    p(
      text("Wherever a note is linked, the target note shows a "),
      bold("Connections"),
      text(" panel at the bottom listing every note that points to it (its "),
      italic("backlinks"),
      text("). This is how a web of knowledge grows over time without folders.")
    ),

    hr(),
    h(2, "4. AI features (optional)"),
    p(
      text("AI is entirely optional and "),
      bold("off until you configure it"),
      text(". Open "),
      bold("Settings"),
      text(" (the gear icon at the bottom of the sidebar) and pick one provider:")
    ),
    bullets(
      [bold("Ollama"), text(" — point it at a local Ollama server URL (e.g. "), code("http://localhost:11434"), text(") for fully local, private AI.")],
      [bold("OpenAI"), text(" — paste an API key.")],
      [bold("Anthropic"), text(" — paste an API key.")]
    ),
    quote(
      text(
        "Your API keys are stored server-side only and are never sent back to the browser — the settings screen only shows whether a key is set, not its value."
      )
    ),
    p(text("Once configured you get:")),
    bullets(
      [bold("AI chat"), text(" — click the ✦ in the selection toolbar to open a side panel and chat about the current note. Responses stream in live.")],
      [
        bold("Automatic note-linking"),
        text(" — as you write, the AI quietly extracts key concepts from each note and discovers related notes for you. These show up under "),
        bold("Connections → AI discovered"),
        text(", with a strength score. No clicking required."),
      ]
    ),

    hr(),
    h(2, "5. The graph view"),
    p(
      text("Click the "),
      bold("network icon"),
      text(" (bottom of the sidebar, or top-right of any note) to open an interactive, force-directed graph of all your notes. "),
      text("Grey edges are manual "),
      code("[[wiki-links]]"),
      text("; violet edges are AI-discovered connections. Click any node to jump to that note, scroll to zoom, and drag to rearrange.")
    ),

    hr(),
    h(2, "6. A 60-second starter checklist"),
    tasks(
      { checked: false, content: [text("Create your first note with the + button")] },
      { checked: false, content: [text("Type "), code("/"), text(" and insert a heading or table")] },
      { checked: false, content: [text("Link two notes with "), code("[[ ]]"), text(" and check the Connections panel")] },
      { checked: false, content: [text("Open Settings and (optionally) connect an AI provider")] },
      { checked: false, content: [text("Open the graph view to see your notes connect")] },
      { checked: false, content: [text("Delete this welcome note when you're ready 🚀")] }
    ),

    hr(),
    h(2, "7. Your data & hosting"),
    p(
      text("All notes live in a single SQLite file at "),
      code("data/notes.db"),
      text(" inside the app folder. Back it up by copying that file. The app is self-hosted and private by default — there is no cloud, no account, and nothing leaves your machine except calls to whichever AI provider you choose to enable.")
    ),
    p(italic("Happy note-taking!")),
  ],
};

export const WELCOME_NOTE_TITLE = "Welcome to your notes";
export const welcomeNoteContent = JSON.stringify(doc);
