import { Fragment, useEffect, useState } from "react";
import type {
  LegalArticle,
  LegalBlock,
  LegalDocumentData,
} from "./legalContent";

/** [[ ]]로 감싼 자리표시 문구를 눈에 띄는 표시로 바꿉니다. */
export function LegalText({ text }: { text: string }) {
  const parts = text.split(/\[\[(.+?)\]\]/);
  return (
    <>
      {parts.map((part, index) =>
        index % 2 === 1 ? (
          <mark key={index} className="legal-placeholder">
            {part}
          </mark>
        ) : (
          <Fragment key={index}>{part}</Fragment>
        ),
      )}
    </>
  );
}

function Block({ block }: { block: LegalBlock }) {
  if (typeof block === "string") {
    return (
      <p>
        <LegalText text={block} />
      </p>
    );
  }
  if ("list" in block) {
    return (
      <ol className="legal-list">
        {block.list.map((item) => (
          <li key={item}>
            <LegalText text={item} />
          </li>
        ))}
      </ol>
    );
  }
  return (
    <div className="legal-table-scroll">
      <table className="legal-table">
        <thead>
          <tr>
            {block.table.head.map((cell) => (
              <th key={cell} scope="col">
                {cell}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {block.table.rows.map((row) => (
            <tr key={row.join("|")}>
              {row.map((cell, index) =>
                index === 0 ? (
                  <th key={index} scope="row">
                    <LegalText text={cell} />
                  </th>
                ) : (
                  <td key={index}>
                    <LegalText text={cell} />
                  </td>
                ),
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

type LegalGroup = { title?: string; articles: LegalArticle[] };

/** sections 기준으로 조항을 단원별로 묶습니다. 단원이 없으면 한 묶음입니다. */
function groupArticles(doc: LegalDocumentData): LegalGroup[] {
  if (!doc.sections?.length) return [{ articles: doc.articles }];
  const groups: LegalGroup[] = [];
  for (const article of doc.articles) {
    const section = doc.sections.find((item) => item.from === article.id);
    if (section || groups.length === 0)
      groups.push({ title: section?.title, articles: [] });
    groups[groups.length - 1].articles.push(article);
  }
  return groups;
}

function Article({
  article,
  idPrefix,
}: {
  article: LegalArticle;
  idPrefix: string;
}) {
  return (
    <section
      id={`${idPrefix}-${article.id}`}
      className="legal-article"
      aria-labelledby={`${idPrefix}-${article.id}-title`}
    >
      <h3 id={`${idPrefix}-${article.id}-title`}>{article.title}</h3>
      {article.blocks.map((block, index) => (
        <Block key={index} block={block} />
      ))}
    </section>
  );
}

function Addendum({ lines }: { lines: string[] }) {
  return (
    <section className="legal-article legal-addendum">
      <h3>부칙</h3>
      {lines.map((line) => (
        <p key={line}>
          <LegalText text={line} />
        </p>
      ))}
    </section>
  );
}

/** 약관 본문. 단원마다 카드 하나로 나눕니다. 가입 화면 팝업에서도 씁니다. */
export function LegalArticles({
  doc,
  idPrefix,
}: {
  doc: LegalDocumentData;
  idPrefix: string;
}) {
  const groups = groupArticles(doc);
  return (
    <div className="legal-articles">
      {groups.map((group, index) => (
        <section
          key={group.title ?? index}
          id={`${idPrefix}-section-${index}`}
          className="legal-section"
          aria-label={group.title}
        >
          {group.title && (
            <h2 className="legal-section-title">
              <span>{String(index + 1).padStart(2, "0")}</span>
              {group.title}
            </h2>
          )}
          <div className="legal-section-card">
            {group.articles.map((article) => (
              <Article key={article.id} article={article} idPrefix={idPrefix} />
            ))}
            {index === groups.length - 1 && doc.addendum.length > 0 && (
              <Addendum lines={doc.addendum} />
            )}
          </div>
        </section>
      ))}
    </div>
  );
}

/** 스크롤을 내리면 화면 오른쪽(스크롤바 옆)에 나타나는 목차. */
function FloatingToc({
  doc,
  idPrefix,
}: {
  doc: LegalDocumentData;
  idPrefix: string;
}) {
  const groups = groupArticles(doc);
  const [visible, setVisible] = useState(false);
  const [active, setActive] = useState(doc.articles[0]?.id);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    let frame = 0;
    const update = () => {
      frame = 0;
      setVisible(window.scrollY > 240);
      let current = doc.articles[0]?.id;
      for (const article of doc.articles) {
        const element = document.getElementById(`${idPrefix}-${article.id}`);
        if (element && element.getBoundingClientRect().top <= 140)
          current = article.id;
      }
      setActive(current);
    };
    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(update);
    };
    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, [doc, idPrefix]);

  return (
    <nav
      className={`legal-float-toc${visible ? " is-visible" : ""}${open ? " is-open" : ""}`}
      aria-label={`${doc.title} 목차`}
      onMouseLeave={() => setOpen(false)}
    >
      <button
        type="button"
        className="legal-float-rail"
        aria-expanded={open}
        aria-label="목차 열기"
        onClick={() => setOpen((value) => !value)}
        onMouseEnter={() => setOpen(true)}
      >
        {groups.map((group, index) => (
          <span key={group.title ?? index} className="legal-float-group">
            {group.articles.map((article) => (
              <span
                key={article.id}
                className={article.id === active ? "is-active" : undefined}
              />
            ))}
          </span>
        ))}
      </button>
      <div className="legal-float-panel">
        {groups.map((group, index) => (
          <div key={group.title ?? index}>
            {group.title && <p>{group.title}</p>}
            <ol>
              {group.articles.map((article) => (
                <li key={article.id}>
                  <a
                    href={`#${idPrefix}-${article.id}`}
                    aria-current={article.id === active ? "true" : undefined}
                    onClick={() => setOpen(false)}
                  >
                    {article.title}
                  </a>
                </li>
              ))}
            </ol>
          </div>
        ))}
      </div>
    </nav>
  );
}

export function LegalDocument({
  doc,
  idPrefix,
}: {
  doc: LegalDocumentData;
  idPrefix: string;
}) {
  return (
    <div className="legal-doc">
      <header className="legal-hero">
        <p className="legal-eyebrow">LIT 정책</p>
        <h1>{doc.title}</h1>
        <p className="legal-summary">{doc.summary}</p>
        <dl className="legal-meta">
          <div>
            <dt>시행일</dt>
            <dd>
              <LegalText text={doc.effectiveDate} />
            </dd>
          </div>
          <div>
            <dt>버전</dt>
            <dd>{doc.version}</dd>
          </div>
        </dl>
      </header>
      {doc.highlights && (
        <ul className="legal-highlights" aria-label="한눈에 보기">
          {doc.highlights.map((item) => (
            <li key={item.label}>
              <strong>{item.label}</strong>
              <span>{item.text}</span>
            </li>
          ))}
        </ul>
      )}
      <LegalArticles doc={doc} idPrefix={idPrefix} />
      <FloatingToc doc={doc} idPrefix={idPrefix} />
    </div>
  );
}
