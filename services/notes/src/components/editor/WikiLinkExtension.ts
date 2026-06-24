import { Mark, mergeAttributes } from "@tiptap/core";
import { InputRule } from "@tiptap/core";

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    wikiLink: {
      setWikiLink: (title: string) => ReturnType;
    };
  }
}

export const WikiLinkExtension = Mark.create({
  name: "wikiLink",

  addAttributes() {
    return {
      title: { default: null },
    };
  },

  parseHTML() {
    return [{ tag: 'span[data-wiki-link]' }];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      "span",
      mergeAttributes(HTMLAttributes, {
        "data-wiki-link": HTMLAttributes.title,
        class: "wiki-link",
      }),
      0,
    ];
  },

  addCommands() {
    return {
      setWikiLink:
        (title: string) =>
        ({ commands }) => {
          return commands.setMark(this.name, { title });
        },
    };
  },

  addInputRules() {
    return [
      new InputRule({
        find: /\[\[([^\]]+)\]\]$/,
        handler: ({ state, range, match }) => {
          const { from, to } = range;
          const title = match[1];
          state.tr.replaceWith(
            from,
            to,
            state.schema.text(title, [
              state.schema.marks.wikiLink.create({ title }),
            ])
          );
        },
      }),
    ];
  },
});
