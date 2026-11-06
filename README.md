# Web

## 운영 자동 배포

GitHub Actions의 `Web CI and deploy`가 PR에서 Node 24 / `npm ci` / TypeScript 검사·Vite 빌드 및 Nginx 라우팅 테스트를 수행합니다. `develop`에 push되면 검증한 `dist` 아티팩트를 전용 `lit-web-production` 러너로 내려받아 EC2에 배포합니다. `main` push는 운영 배포를 실행하지 않습니다.

- 운영 주소: https://3.25.143.224
- 프런트는 같은 origin의 `/api`를 사용하므로 운영 빌드의 `VITE_API_BASE_URL`은 비웁니다. Vite 개발 프록시는 운영에서 사용하지 않습니다.
- Nginx는 `/api/` 및 `/actuator/`를 기존 백엔드로 전달하고 나머지 경로는 SPA로 제공합니다. 기존 HTTPS·인증서 갱신·요청 제한은 유지합니다. 없는 `/assets/` 파일은 404입니다.
- 릴리스는 `/var/www/lit-web/releases/{commit}`에 저장하며 `current` 심볼릭 링크를 원자적으로 전환합니다. HTML 캐시는 갱신하도록 설정하고 해시가 있는 정적 파일은 장기 캐시합니다.
- 배포 후 공개 HTTPS의 HTML·SPA 경로와 백엔드 readiness를 검증합니다. 실패하면 직전 프런트와 Nginx 설정으로 자동 복원합니다. 기존 데이터 볼륨과 백엔드 컨테이너는 변경하지 않습니다.
- 초기 러너 설치와 sudo 가능한 ubuntu 계정은 운영 서버에 필요합니다. 신규 서버에서는 기존 `/etc/nginx/sites-enabled/lit`의 백엔드 proxy 설정을 먼저 준비해야 합니다. 예상하지 못한 Nginx 구성은 자동 변경하지 않습니다.
- 현재 기존 develop 코드의 React lint 오류 4개와 경고 1개는 CI에 표시하되 배포를 막지 않습니다. TypeScript·빌드·라우팅 테스트는 필수입니다. 이 배포 변경에서는 해당 UI 코드를 수정하지 않았습니다.

로컬 검증: `npm ci`, `npm run build`, `python3 -m unittest discover -s tests -p 'test_*.py'`, `bash -n scripts/deploy-web.sh`.
