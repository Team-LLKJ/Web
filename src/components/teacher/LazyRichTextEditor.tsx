import { lazy, Suspense, type ComponentProps } from "react";

const RichTextEditor = lazy(() =>
  import("./RichTextEditor").then((module) => ({ default: module.RichTextEditor })),
);

// 로딩 화면(스켈레톤)에서 편집기 코드를 첫 화면 번들에 넣지 않도록 필요할 때만 불러옵니다.
export function LazyRichTextEditor(props: ComponentProps<typeof RichTextEditor>) {
  return (
    <Suspense
      fallback={
        <div
          className="answer-rich-editor teacher-rich-editor"
          style={{ minHeight: 205, border: "1px solid var(--color-grey-20)", borderRadius: 10.5 }}
          aria-hidden="true"
        />
      }
    >
      <RichTextEditor {...props} />
    </Suspense>
  );
}
