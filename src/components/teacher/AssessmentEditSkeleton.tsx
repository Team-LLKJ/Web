import { Skeleton } from "../ui/Skeleton";
import { Button } from "../ui/Button";
import { Tabs } from "../ui/Tabs";
import { LazyRichTextEditor as RichTextEditor } from "./LazyRichTextEditor";
import "./assessment-edit-skeleton.css";

export function AssessmentEditSkeleton() {
  return (
    <>
      <span className="folder-back">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="m15 18-6-6 6-6" />
        </svg>
        수행평가로
      </span>
      <h1 className="screen-loading-title">수행평가 수정</h1>
      <div
        className="teacher-create-card assessment-edit-skeleton"
        inert
        aria-hidden="true"
      >
        <div className="teacher-edit-tabs">
          <Tabs
            label="수행평가 수정 단계"
            variant="segment"
            value="details"
            items={[
              { value: "details", label: "평가 정보" },
              { value: "settings", label: "평가 설정" },
              { value: "questions", label: "문항 작성" },
            ]}
            onChange={() => {}}
          />
        </div>
        <section className="teacher-card teacher-create-section">
          <header className="teacher-create-section-head">
            <h2>
              <span className="teacher-section-num">1</span>기본 정보
            </h2>
          </header>
          <div className="teacher-form-grid">
            <div className="text-input-field">
              <label>수행평가 제목</label>
              <span className="text-input text-input--box">
                <Skeleton style={{ width: "65%", height: 22 }} />
              </span>
            </div>
            <fieldset className="teacher-expiry-field" disabled>
              <legend>풀이 시간</legend>
              <div className="teacher-expiry-inputs">
                <div className="duration-picker">
                  <span className="duration-picker-field">
                    <Skeleton style={{ width: "5em", height: "1lh" }} />
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
                      <circle cx="12" cy="12" r="9" />
                      <path d="M12 7v5l3 2" />
                    </svg>
                  </span>
                </div>
              </div>
            </fieldset>
          </div>
        </section>
        <section className="teacher-card teacher-create-section">
          <header className="teacher-create-section-head">
            <h2>
              <span className="teacher-section-num">2</span>평가 내용
            </h2>
          </header>
          <div className="assessment-edit-editor">
            <RichTextEditor label="평가 내용" value="" onChange={() => {}} />
            <div className="assessment-edit-lines">
              <Skeleton />
              <Skeleton />
              <Skeleton style={{ width: "65%" }} />
            </div>
          </div>
          <p className="teacher-section-hint">
            학생 화면에는 텍스트로 공유돼요. 서식은 줄바꿈 위주로 저장되며 최대
            10,000자까지 입력할 수 있어요.
          </p>
        </section>
        <div className="teacher-form-actions teacher-form-actions--bar teacher-edit-save">
          <div>
            <Button variant="secondary" disabled>
              취소
            </Button>
            <Button disabled>저장</Button>
          </div>
        </div>
      </div>
    </>
  );
}

export function EvaluationEditSkeleton() {
  return (
    <>
      <div className="teacher-list-title-row">
        <div>
          <h1>수행평가 수정</h1>
          <p>
            <Skeleton style={{ width: "12em", height: "1lh" }} />
          </p>
        </div>
        <Button variant="white-danger" disabled>
          평가 삭제
        </Button>
      </div>
      <div
        className="teacher-card teacher-config-card evaluation-edit-skeleton"
        inert
        aria-hidden="true"
      >
        <div className="tq-list">
          <fieldset className="tq-card" disabled>
            <legend className="sr-only">문항을 불러오는 중</legend>
            <div className="tq-head">
              <h3 className="tq-title">
                문항 <Skeleton className="evaluation-edit-question-number" />
              </h3>
              <span className="tq-handle">⠿</span>
            </div>
            <div className="evaluation-edit-question-content">
              <Skeleton />
              <Skeleton style={{ width: "70%" }} />
            </div>
            <div className="tq-foot">
              <label className="teacher-limit-toggle">
                <input type="checkbox" disabled />
                <span>글자 수 제한</span>
              </label>
              <button
                type="button"
                className="tq-remove"
                disabled
                aria-label="문항 삭제"
              >
                ×
              </button>
            </div>
          </fieldset>
        </div>
        <button className="tq-add" disabled>
          문항 추가
        </button>
        <div className="teacher-form-actions teacher-form-actions--end">
          <Button variant="secondary" disabled>
            취소
          </Button>
          <Button disabled>저장하기</Button>
        </div>
      </div>
    </>
  );
}
