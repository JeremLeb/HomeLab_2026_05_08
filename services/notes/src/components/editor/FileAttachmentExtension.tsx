import { Node, mergeAttributes } from "@tiptap/core";

// A non-image file attachment, rendered as a download chip.
declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    fileAttachment: {
      setFileAttachment: (attrs: { href: string; name: string; size?: number }) => ReturnType;
    };
  }
}

function humanSize(bytes: number): string {
  if (!bytes) return "";
  const units = ["B", "KB", "MB", "GB"];
  let i = 0;
  let n = bytes;
  while (n >= 1024 && i < units.length - 1) {
    n /= 1024;
    i++;
  }
  return `${n.toFixed(n < 10 && i > 0 ? 1 : 0)} ${units[i]}`;
}

export const FileAttachmentExtension = Node.create({
  name: "fileAttachment",
  group: "block",
  atom: true,
  draggable: true,

  addAttributes() {
    return {
      href: { default: null },
      name: { default: "file" },
      size: { default: 0 },
    };
  },

  parseHTML() {
    return [{ tag: "a[data-file-attachment]" }];
  },

  renderHTML({ HTMLAttributes }) {
    const size = Number(HTMLAttributes.size) || 0;
    return [
      "a",
      mergeAttributes(
        {
          "data-file-attachment": "",
          href: HTMLAttributes.href,
          download: HTMLAttributes.name,
          target: "_blank",
          rel: "noopener",
          class: "file-attachment",
        }
      ),
      ["span", { class: "file-attachment-icon" }, "📎"],
      ["span", { class: "file-attachment-name" }, HTMLAttributes.name as string],
      ["span", { class: "file-attachment-size" }, humanSize(size)],
    ];
  },

  addCommands() {
    return {
      setFileAttachment:
        (attrs) =>
        ({ commands }) =>
          commands.insertContent({ type: this.name, attrs }),
    };
  },
});
