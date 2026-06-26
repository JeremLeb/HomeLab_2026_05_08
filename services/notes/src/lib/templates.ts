// Built-in note templates. User-defined templates live in the DB (is_template=1);
// these built-ins are always available without seeding.

type Doc = Record<string, unknown>;

const h = (level: number, text: string): Doc => ({
  type: "heading",
  attrs: { level },
  content: [{ type: "text", text }],
});
const p = (text = ""): Doc =>
  text ? { type: "paragraph", content: [{ type: "text", text }] } : { type: "paragraph" };
const tasks = (items: string[]): Doc => ({
  type: "taskList",
  content: items.map((t) => ({
    type: "taskItem",
    attrs: { checked: false },
    content: [{ type: "paragraph", content: [{ type: "text", text: t }] }],
  })),
});
const bullets = (items: string[]): Doc => ({
  type: "bulletList",
  content: items.map((t) => ({
    type: "listItem",
    content: [{ type: "paragraph", content: [{ type: "text", text: t }] }],
  })),
});

export type BuiltinTemplate = { id: string; name: string; title: string; content: Doc };

export const BUILTIN_TEMPLATES: BuiltinTemplate[] = [
  {
    id: "builtin:meeting",
    name: "Meeting notes",
    title: "Meeting — ",
    content: {
      type: "doc",
      content: [
        h(2, "Meeting notes"),
        p("Date: "),
        p("Attendees: "),
        h(3, "Agenda"),
        bullets(["", ""]),
        h(3, "Discussion"),
        p(),
        h(3, "Action items"),
        tasks(["", ""]),
      ],
    },
  },
  {
    id: "builtin:daily",
    name: "Daily journal",
    title: "Daily — ",
    content: {
      type: "doc",
      content: [
        h(2, "Daily journal"),
        h(3, "Top priorities"),
        tasks(["", "", ""]),
        h(3, "Notes"),
        p(),
        h(3, "Gratitude / reflection"),
        p(),
      ],
    },
  },
  {
    id: "builtin:project",
    name: "Project plan",
    title: "Project — ",
    content: {
      type: "doc",
      content: [
        h(2, "Project plan"),
        h(3, "Goal"),
        p(),
        h(3, "Milestones"),
        tasks(["", ""]),
        h(3, "Resources"),
        bullets([""]),
        h(3, "Risks"),
        bullets([""]),
      ],
    },
  },
];

export function getBuiltinTemplate(id: string): BuiltinTemplate | undefined {
  return BUILTIN_TEMPLATES.find((t) => t.id === id);
}
