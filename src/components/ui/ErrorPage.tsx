import type { ReactNode } from "react";
import { LandingHeader } from "../landing/LandingHeader";
import "../landing/landing.css";
import "./error-page.css";

/** 404·오류 화면 공통 틀. 다른 페이지와 같은 헤더 아래 가운데에 안내와 버튼을 보여 줍니다. */
export function ErrorPage({
  code,
  title,
  description,
  actions,
  detail,
}: {
  code: string;
  title: string;
  description: ReactNode;
  actions: ReactNode;
  /** 개발 중에만 보여 줄 오류 내용. */
  detail?: string;
}) {
  return (
    <div className="error-page">
      {/* 설정·알림 같은 다른 페이지와 같은 헤더를 씁니다. */}
      <LandingHeader />
      <main className="error-page-main">
        <p className="error-page-code" aria-hidden="true">
          {code}
        </p>
        <h1>{title}</h1>
        <p className="error-page-desc">{description}</p>
        <div className="error-page-actions">{actions}</div>
        {detail && <pre className="error-page-detail">{detail}</pre>}
      </main>
    </div>
  );
}
