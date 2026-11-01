import { Extension } from "@tiptap/core";
import type { Node } from "@tiptap/pm/model";
import { Plugin, PluginKey, type EditorState } from "@tiptap/pm/state";
import { Decoration, DecorationSet } from "@tiptap/pm/view";

export type SearchMatch = { from: number; to: number };
export type SearchState = {
  query: string;
  matchCase: boolean;
  index: number;
  matches: SearchMatch[];
  decorations: DecorationSet;
};
export const answerSearchKey = new PluginKey<SearchState>("answerSearch");
export function findAnswerMatches(
  doc: Node,
  query: string,
  matchCase: boolean,
): SearchMatch[] {
  if (!query) return [];
  const needle = new RegExp(
    query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"),
    matchCase ? "gu" : "giu",
  );
  const matches: SearchMatch[] = [];
  doc.descendants((node, pos) => {
    if (!node.isTextblock) return;
    const raw = node.textBetween(0, node.content.size, "\n", "\ufffc");
    for (const match of raw.matchAll(needle)) {
      if (matches.length >= 1000) break;
      matches.push({
        from: pos + 1 + match.index,
        to: pos + 1 + match.index + match[0].length,
      });
    }
    return false;
  });
  return matches;
}
export function getAnswerSearch(state: EditorState) {
  return answerSearchKey.getState(state);
}
export const AnswerSearch = Extension.create({
  name: "answerSearch",
  addProseMirrorPlugins() {
    return [
      new Plugin<SearchState>({
        key: answerSearchKey,
        state: {
          init: () => ({
            query: "",
            matchCase: false,
            index: 0,
            matches: [],
            decorations: DecorationSet.empty,
          }),
          apply(tr, previous) {
            const update = tr.getMeta(answerSearchKey) as
              | Partial<SearchState>
              | undefined;
            if (!tr.docChanged && !update) return previous;
            const next = { ...previous, ...update };
            const matches = findAnswerMatches(
              tr.doc,
              next.query,
              next.matchCase,
            );
            const index = matches.length
              ? ((next.index % matches.length) + matches.length) %
                matches.length
              : 0;
            return {
              ...next,
              matches,
              index,
              decorations: DecorationSet.create(
                tr.doc,
                matches.map((match, i) =>
                  Decoration.inline(match.from, match.to, {
                    class:
                      i === index
                        ? "answer-search-match is-current"
                        : "answer-search-match",
                  }),
                ),
              ),
            };
          },
        },
        props: {
          decorations: (state) => answerSearchKey.getState(state)?.decorations,
        },
      }),
    ];
  },
});
