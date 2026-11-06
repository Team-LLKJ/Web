// 공유받은 수행평가 id를 기억해 두면, 새로고침 직후 스켈레톤에서도 삭제 버튼을 숨길 수 있습니다.
// (API를 부르지 않는 가벼운 모듈이라 로딩 화면 생성에도 그대로 쓸 수 있어요.)
export const SHARED_FOLDERS_KEY = "lit:shared-folder-ids";

function readSharedIds(): string[] {
  try {
    const parsed = JSON.parse(window.localStorage.getItem(SHARED_FOLDERS_KEY) ?? "[]");
    return Array.isArray(parsed) ? parsed.map(String) : [];
  } catch {
    return [];
  }
}

function writeSharedIds(ids: string[]) {
  try {
    window.localStorage.setItem(SHARED_FOLDERS_KEY, JSON.stringify(ids));
  } catch {
    /* 저장할 수 없어도 화면은 그대로 동작합니다. */
  }
}

export function isSharedFolderId(id: string) {
  return typeof window !== "undefined" && readSharedIds().includes(id);
}

export function rememberShared(folders: { id: string; owner?: string }[]) {
  const ids = new Set(readSharedIds());
  for (const item of folders) {
    if (item.owner) ids.add(item.id);
    else ids.delete(item.id);
  }
  writeSharedIds([...ids].slice(-200));
}
