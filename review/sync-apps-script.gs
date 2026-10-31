/**
 * 링크클린 후기부스터 — 직원 공유용 구글 시트 동기화
 *
 * [설치 3단계]
 * 1) 구글 시트 새로 만들기 → 메뉴 [확장 프로그램] → [Apps Script]
 * 2) 원래 있던 코드를 모두 지우고 이 파일 내용을 통째로 붙여넣기 → 저장
 * 3) 오른쪽 위 [배포] → [새 배포] → 유형 '웹 앱'
 *      - 다음 사용자 인증정보로 실행: 나
 *      - 액세스 권한: 모든 사용자
 *    → [배포] → 권한 허용 → 나오는 "웹 앱 URL"(https://script.google.com/macros/s/.../exec)을 복사
 *    → 후기부스터 앱 [설정] → [직원 공유] 칸에 붙여넣기 (모든 직원 폰에 같은 주소 + 같은 팀 암호)
 *
 * 팀 암호는 아래 TEAM_KEY 를 바꾸면 됩니다. (앱 설정의 '팀 암호'와 똑같이 맞춰주세요)
 */
const TEAM_KEY = 'linkclean';
const SHEET_NAME = 'data';

function sheet_() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sh = ss.getSheetByName(SHEET_NAME);
  if (!sh) {
    sh = ss.insertSheet(SHEET_NAME);
    sh.appendRow(['id', 'updatedAt', 'json', '고객', '전화', '서비스', '지점', '담당', '상태']);
    sh.setFrozenRows(1);
  }
  return sh;
}

function out_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}

function readAll_(sh) {
  const vals = sh.getDataRange().getValues();
  const rows = [];
  for (let i = 1; i < vals.length; i++) {
    try { rows.push(JSON.parse(vals[i][2])); } catch (e) {}
  }
  return rows;
}

const STATUS_KO = { done: '작업완료', asked: '후기요청', reviewed: '후기확인', rewarded: '선물완료' };

function doGet(e) {
  if ((e.parameter.key || '') !== TEAM_KEY) return out_({ ok: false, error: 'key' });
  return out_({ ok: true, records: readAll_(sheet_()) });
}

function doPost(e) {
  let body = {};
  try { body = JSON.parse(e.postData.contents); } catch (err) { return out_({ ok: false, error: 'json' }); }
  if ((body.key || '') !== TEAM_KEY) return out_({ ok: false, error: 'key' });

  const lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try {
    const sh = sheet_();
    const vals = sh.getDataRange().getValues();
    const index = {};
    for (let i = 1; i < vals.length; i++) index[vals[i][0]] = { row: i + 1, updatedAt: Number(vals[i][1]) || 0 };

    (body.records || []).forEach(function (r) {
      if (!r || !r.id) return;
      const line = [r.id, r.updatedAt || 0, JSON.stringify(r), r.name || '', r.phone || '', r.service || '', r.branchName || '', r.staff || '', STATUS_KO[r.status] || (r.deleted ? '삭제' : '')];
      if (r.deleted) line[8] = '삭제';
      const ex = index[r.id];
      if (!ex) { sh.appendRow(line); index[r.id] = { row: sh.getLastRow(), updatedAt: r.updatedAt || 0 }; }
      else if ((r.updatedAt || 0) > ex.updatedAt) { sh.getRange(ex.row, 1, 1, line.length).setValues([line]); ex.updatedAt = r.updatedAt; }
    });
    return out_({ ok: true, records: readAll_(sh) });
  } finally {
    lock.releaseLock();
  }
}
