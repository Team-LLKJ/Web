import { Extension } from "@tiptap/core";
import { Plugin } from "@tiptap/pm/state";
import StarterKit from "@tiptap/starter-kit";
import { TextStyleKit } from "@tiptap/extension-text-style";
import TextAlign from "@tiptap/extension-text-align";
import Highlight from "@tiptap/extension-highlight";
import Image from "@tiptap/extension-image";
import { TableKit } from "@tiptap/extension-table";
import TaskList from "@tiptap/extension-task-list";
import TaskItem from "@tiptap/extension-task-item";
import Superscript from "@tiptap/extension-superscript";
import Subscript from "@tiptap/extension-subscript";
import Placeholder from "@tiptap/extension-placeholder";
import CharacterCount from "@tiptap/extension-character-count";
import { MAX_ANSWER_LENGTH } from "./answerHtml";
import { AnswerSearch } from "./answerSearch";

const ParagraphSettings = Extension.create({
  name: "answerParagraphSettings",
  addGlobalAttributes() {
    return [
      {
        types: ["paragraph", "heading"],
        attributes: {
          indent: {
            default: 0,
            parseHTML: (el) => Number(el.dataset.indent) || 0,
            renderHTML: (attrs) =>
              attrs.indent
                ? {
                    "data-indent": attrs.indent,
                    style: `margin-left: ${Number(attrs.indent) * 24}px`,
                  }
                : {},
          },
          spacingBefore: {
            default: 0,
            parseHTML: (el) => parseInt(el.style.marginTop) || 0,
            renderHTML: (attrs) =>
              attrs.spacingBefore
                ? { style: `margin-top: ${attrs.spacingBefore}px` }
                : {},
          },
          spacingAfter: {
            default: 0,
            parseHTML: (el) => parseInt(el.style.marginBottom) || 0,
            renderHTML: (attrs) =>
              attrs.spacingAfter
                ? { style: `margin-bottom: ${attrs.spacingAfter}px` }
                : {},
          },
          paragraphLineHeight: {
            default: null,
            parseHTML: (el) => el.style.lineHeight || null,
            renderHTML: (attrs) =>
              attrs.paragraphLineHeight
                ? { style: `line-height: ${attrs.paragraphLineHeight}` }
                : {},
          },
        },
      },
    ];
  },
});
export function answerExtensions() {
  return [
    StarterKit.configure({
      heading: { levels: [1, 2, 3] },
      link: {
        openOnClick: false,
        autolink: true,
        defaultProtocol: "https",
        isAllowedUri: (url, context) =>
          context.defaultValidate(url) && /^(?:https?:|mailto:)/i.test(url),
      },
    }),
    TextStyleKit.configure({
      lineHeight: false,
      fontSize: { types: ["textStyle", "paragraph", "heading"] },
    }),
    ParagraphSettings,
    TextAlign.configure({ types: ["heading", "paragraph"] }),
    Highlight.configure({ multicolor: true }),
    Superscript,
    Subscript,
    Image.configure({
      allowBase64: true,
      resize: {
        enabled: true,
        directions: ["bottom-right", "bottom-left"],
        minWidth: 80,
        minHeight: 40,
        alwaysPreserveAspectRatio: true,
      },
    }),
    TableKit.configure({
      table: {
        resizable: true,
        cellMinWidth: 48,
        allowTableNodeSelection: true,
      },
    }),
    TaskList,
    TaskItem.configure({
      nested: true,
      a11y: {
        checkboxLabel: (node) => `완료 여부: ${node.textContent || "새 항목"}`,
      },
    }),
    Placeholder.configure({ placeholder: "답안을 작성하세요." }),
    CharacterCount.configure({ limit: MAX_ANSWER_LENGTH }),
    AnswerSearch,
    Extension.create({
      name: "answerReadOnlyGuard",
      addProseMirrorPlugins() {
        return [
          new Plugin({
            filterTransaction: (transaction) =>
              !transaction.docChanged || this.editor.isEditable,
          }),
        ];
      },
    }),
  ];
}
