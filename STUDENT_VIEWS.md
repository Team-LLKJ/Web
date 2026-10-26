# 학생 화면

개발 서버 실행: `npm run dev -- --port 5174`

| 경로              | 화면                    |
| ----------------- | ----------------------- |
| /views            | 전체 화면 미리보기 링크 |
| /student/join     | 6자리 PIN 참가          |
| /student/nickname | 닉네임 입력             |
| /student/wait     | 평가 시작 대기          |
| /student/solve    | 학생 풀이               |
| /teacher/grading  | 기존 선생님 채점        |

학생 UI는 `src/components/student/`, 페이지 상태는 `src/pages/StudentFlow.tsx`에 있습니다. 버튼·입력창·모달·탭·아바타·대화 메시지는 기존 공통 컴포넌트를 사용합니다.

참가 상태·문항별 답안·질문·제출 상태는 현재 브라우저의 `lit:student-session` localStorage에 저장합니다. 다른 PIN으로 참가하면 이전 참가 데이터를 초기화합니다. PIN은 형식만 검사하며 실제 평가 세션을 조회하지 않습니다.

대기 화면은 실제 서버 시작 신호를 연결할 수 있도록 `lit:evaluation-started` 이벤트를 구독합니다. 서버 연결 전에는 `/views`에서 풀이 화면에 직접 접근할 수 있습니다. AI 질문은 로컬 메시지로 추가되며 AI 응답 서비스는 연결되어 있지 않습니다. 제출도 로컬 저장이며 서버 제출 API 연동이 필요합니다.

창 이동 경고는 풀이 중 `visibilitychange`로 다른 탭 이동을 감지하여 표시합니다. 실제 부정행위 판정이나 서버 기록은 하지 않습니다.
