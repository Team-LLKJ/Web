import { useState, type MouseEvent, type ReactNode } from "react";
import { EditorToolIcon } from "./EditorToolIcon";

type Props = {
  fontFamily: string;
  fonts: string[];
  fontSize: string;
  paragraphStyle: string;
  lineSpacing: string;
  editorZoom: string;
  textColor: string;
  highlightColor: string;
  onPreserveSelection: (event: MouseEvent<HTMLButtonElement>) => void;
  onRememberSelection: () => void;
  onCommand: (command: string, value?: string) => void;
  onFont: (value: string) => void;
  onSize: (value: string) => void;
  onAdjustSize: (amount: number) => void;
  onStyle: (value: string) => void;
  onSpacing: (value: string) => void;
  onZoom: (value: string) => void;
  onTextColor: (value: string) => void;
  onHighlight: (value: string) => void;
  onFind: () => void;
  onLink: () => void;
  onClear: () => void;
  onTable: () => void;
  onRow: () => void;
  onColumn: () => void;
  onImage: () => void;
  imageBusy: boolean;
  onDivider: () => void;
  onSymbol: (symbol: string) => void;
};

function RibbonTool({
  label,
  children,
  onClick,
  onMouseDown,
  disabled = false,
}: {
  label: string;
  children: ReactNode;
  onClick: () => void;
  onMouseDown: Props["onPreserveSelection"];
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      className="ribbon-tool"
      title={label}
      aria-label={label}
      onMouseDown={onMouseDown}
      onClick={onClick}
      disabled={disabled}
    >
      <span className="ribbon-tool-symbol" aria-hidden="true">
        {children}
      </span>
      <span className="ribbon-tool-label">{label}</span>
    </button>
  );
}

export function AnswerRibbon(props: Props) {
  const [page, setPage] = useState(0);
  const [symbolsOpen, setSymbolsOpen] = useState(false);
  const pages = ["편집", "문단", "삽입"];
  const tool = (
    label: string,
    icon: ReactNode,
    onClick: () => void,
    disabled = false,
  ) => (
    <RibbonTool
      key={label}
      label={label}
      disabled={disabled}
      onClick={onClick}
      onMouseDown={props.onPreserveSelection}
    >
      {icon}
    </RibbonTool>
  );
  return (
    <div className="answer-ribbon">
      <div className="ribbon-menu" aria-label="서식 메뉴">
        <span className="ribbon-menu-title">서식</span>
        <div className="ribbon-menu-tabs">
          {pages.map((label, index) => (
            <button
              type="button"
              key={label}
              aria-pressed={page === index}
              onMouseDown={props.onPreserveSelection}
              onClick={() => setPage(index)}
            >
              {label}
            </button>
          ))}
        </div>
        <div className="ribbon-pagination">
          <span aria-live="polite">
            {page + 1} / {pages.length}
          </span>
          <button
            type="button"
            aria-label="이전 서식 도구"
            disabled={page === 0}
            onMouseDown={props.onPreserveSelection}
            onClick={() => setPage((p) => p - 1)}
          >
            <EditorToolIcon name="previous" />
          </button>
          <button
            type="button"
            aria-label="다음 서식 도구"
            disabled={page === pages.length - 1}
            onMouseDown={props.onPreserveSelection}
            onClick={() => setPage((p) => p + 1)}
          >
            <EditorToolIcon name="next" />
          </button>
        </div>
      </div>
      <div
        className="ribbon-tools"
        role="toolbar"
        aria-label={`${pages[page]} 도구`}
      >
        <div className="ribbon-page" hidden={page !== 0}>
          <div className="ribbon-group">
            <div className="ribbon-group-tools">
              {tool("찾기", <EditorToolIcon name="search" />, props.onFind)}
              {tool("실행 취소", <EditorToolIcon name="undo" />, () =>
                props.onCommand("undo"),
              )}
              {tool("다시 실행", <EditorToolIcon name="redo" />, () =>
                props.onCommand("redo"),
              )}
            </div>
            <span className="ribbon-group-caption">편집</span>
          </div>
          <div className="ribbon-group">
            <div className="ribbon-group-tools">
              {tool("굵게", <b>가</b>, () => props.onCommand("bold"))}
              {tool("기울임", <i>가</i>, () => props.onCommand("italic"))}
              {tool("밑줄", <u>가</u>, () => props.onCommand("underline"))}
            </div>
            <span className="ribbon-group-caption">글자 모양</span>
          </div>
          <div className="ribbon-group">
            <div className="ribbon-group-tools">
              <label className="ribbon-tool ribbon-color" title="글자 색상">
                <span className="ribbon-tool-symbol">
                  <span
                    className="ribbon-text-color"
                    style={{ borderBottomColor: props.textColor }}
                  >
                    가
                  </span>
                </span>
                <span className="ribbon-tool-label">글자 색</span>
                <input
                  aria-label="글자 색상"
                  type="color"
                  value={props.textColor}
                  onMouseDown={props.onRememberSelection}
                  onChange={(e) => props.onTextColor(e.target.value)}
                />
              </label>
              <label className="ribbon-tool ribbon-color" title="강조 색상">
                <span className="ribbon-tool-symbol">
                  <span
                    className="ribbon-highlight"
                    style={{ backgroundColor: props.highlightColor }}
                  >
                    가
                  </span>
                </span>
                <span className="ribbon-tool-label">형광펜</span>
                <input
                  aria-label="강조 색상"
                  type="color"
                  value={props.highlightColor}
                  onMouseDown={props.onRememberSelection}
                  onChange={(e) => props.onHighlight(e.target.value)}
                />
              </label>
            </div>
            <span className="ribbon-group-caption">색상</span>
          </div>
          <div className="ribbon-group">
            <div className="ribbon-group-tools">
              {tool(
                "서식 지우기",
                <EditorToolIcon name="clear" />,
                props.onClear,
              )}
            </div>
            <span className="ribbon-group-caption">서식</span>
          </div>
        </div>
        <div className="ribbon-page" hidden={page !== 1}>
          <div className="ribbon-group">
            <div className="ribbon-group-tools">
              {tool("왼쪽 정렬", <EditorToolIcon name="alignLeft" />, () =>
                props.onCommand("justifyLeft"),
              )}
              {tool("가운데 정렬", <EditorToolIcon name="alignCenter" />, () =>
                props.onCommand("justifyCenter"),
              )}
              {tool("오른쪽 정렬", <EditorToolIcon name="alignRight" />, () =>
                props.onCommand("justifyRight"),
              )}
              {tool("양쪽 정렬", <EditorToolIcon name="alignJustify" />, () =>
                props.onCommand("justifyFull"),
              )}
            </div>
            <span className="ribbon-group-caption">문단 정렬</span>
          </div>
          <div className="ribbon-group">
            <div className="ribbon-group-tools">
              {tool("글머리 기호", <EditorToolIcon name="list" />, () =>
                props.onCommand("insertUnorderedList"),
              )}
              {tool("번호 목록", <EditorToolIcon name="numberList" />, () =>
                props.onCommand("insertOrderedList"),
              )}
              {tool("내어쓰기", <EditorToolIcon name="outdent" />, () =>
                props.onCommand("outdent"),
              )}
              {tool("들여쓰기", <EditorToolIcon name="indent" />, () =>
                props.onCommand("indent"),
              )}
            </div>
            <span className="ribbon-group-caption">목록 및 들여쓰기</span>
          </div>
          <div className="ribbon-group">
            <div className="ribbon-group-tools ribbon-spacing">
              <EditorToolIcon name="lineSpacing" />
              <select
                aria-label="줄 간격"
                value={props.lineSpacing}
                onMouseDown={props.onRememberSelection}
                onChange={(e) => props.onSpacing(e.target.value)}
              >
                {["1", "1.15", "1.5", "2"].map((value) => (
                  <option key={value} value={value}>
                    {value}배
                  </option>
                ))}
              </select>
            </div>
            <span className="ribbon-group-caption">줄 간격</span>
          </div>
        </div>
        <div className="ribbon-page" hidden={page !== 2}>
          <div className="ribbon-group">
            <div className="ribbon-group-tools">
              {tool(
                props.imageBusy ? "이미지 처리 중" : "이미지 넣기",
                <EditorToolIcon name="image" />,
                props.onImage,
                props.imageBusy,
              )}
              {tool(
                "구분선",
                <EditorToolIcon name="divider" />,
                props.onDivider,
              )}
              {tool("특수문자", <EditorToolIcon name="symbol" />, () =>
                setSymbolsOpen((open) => !open),
              )}
            </div>
            <span className="ribbon-group-caption">이미지 및 기호</span>
          </div>
          <div className="ribbon-group">
            <div className="ribbon-group-tools">
              {tool("표 넣기", <EditorToolIcon name="table" />, props.onTable)}
              {tool("행 추가", <EditorToolIcon name="addRow" />, props.onRow)}
              {tool(
                "열 추가",
                <EditorToolIcon name="addColumn" />,
                props.onColumn,
              )}
            </div>
            <span className="ribbon-group-caption">표</span>
          </div>
          <div className="ribbon-group">
            <div className="ribbon-group-tools">
              {tool("링크 넣기", <EditorToolIcon name="link" />, props.onLink)}
              {tool("체크리스트", <EditorToolIcon name="checklist" />, () =>
                props.onCommand(
                  "insertHTML",
                  "<ul><li>☐ </li></ul><p><br></p>",
                ),
              )}
            </div>
            <span className="ribbon-group-caption">삽입</span>
          </div>
          {symbolsOpen && (
            <div
              className="ribbon-symbol-picker"
              role="group"
              aria-label="삽입할 특수문자"
            >
              {["★", "☆", "✓", "→", "⇒", "±", "×", "÷", "≤", "≥", "π", "∞"].map(
                (symbol) => (
                  <button
                    key={symbol}
                    type="button"
                    aria-label={`${symbol} 삽입`}
                    onMouseDown={props.onPreserveSelection}
                    onClick={() => {
                      props.onSymbol(symbol);
                      setSymbolsOpen(false);
                    }}
                  >
                    {symbol}
                  </button>
                ),
              )}
            </div>
          )}
        </div>
      </div>
      <div className="ribbon-quickbar" role="toolbar" aria-label="글꼴과 크기">
        <select
          className="ribbon-style-select"
          aria-label="문단 스타일"
          value={props.paragraphStyle}
          onMouseDown={props.onRememberSelection}
          onChange={(e) => props.onStyle(e.target.value)}
        >
          <option value="P">바탕글</option>
          <option value="H2">제목 1</option>
          <option value="H3">제목 2</option>
          <option value="H4">제목 3</option>
        </select>
        <select
          className="ribbon-font-select"
          aria-label="글꼴"
          value={props.fontFamily}
          onMouseDown={props.onRememberSelection}
          onChange={(e) => props.onFont(e.target.value)}
        >
          {props.fonts.map((font) => (
            <option key={font} value={font}>
              {font}
            </option>
          ))}
        </select>
        <div className="ribbon-font-size">
          <button
            type="button"
            aria-label="글자 크기 줄이기"
            disabled={Number(props.fontSize) <= 8}
            onMouseDown={props.onPreserveSelection}
            onClick={() => props.onAdjustSize(-1)}
          >
            <EditorToolIcon name="minus" />
          </button>
          <select
            aria-label="글자 크기"
            title="글자 크기 (px)"
            value={props.fontSize}
            onMouseDown={props.onRememberSelection}
            onChange={(e) => props.onSize(e.target.value)}
          >
            {[
              ...new Set([
                8,
                9,
                10,
                11,
                12,
                14,
                16,
                18,
                20,
                24,
                30,
                36,
                48,
                56,
                Number(props.fontSize),
              ]),
            ]
              .sort((a, b) => a - b)
              .map((size) => (
                <option key={size} value={size}>
                  {size}
                </option>
              ))}
          </select>
          <span className="ribbon-font-unit" aria-hidden="true">
            px
          </span>
          <button
            type="button"
            aria-label="글자 크기 늘리기"
            disabled={Number(props.fontSize) >= 56}
            onMouseDown={props.onPreserveSelection}
            onClick={() => props.onAdjustSize(1)}
          >
            <EditorToolIcon name="plus" />
          </button>
        </div>
        <label className="ribbon-zoom">
          <span>확대</span>
          <select
            aria-label="편집 영역 확대 비율"
            value={props.editorZoom}
            onMouseDown={props.onRememberSelection}
            onChange={(e) => props.onZoom(e.target.value)}
          >
            {[75, 90, 100, 125, 150].map((zoom) => (
              <option key={zoom} value={zoom}>
                {zoom}%
              </option>
            ))}
          </select>
        </label>
      </div>
    </div>
  );
}
