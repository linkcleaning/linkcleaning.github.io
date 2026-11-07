// 세이프브릿지 서버 설정
// Supabase 프로젝트를 만든 뒤 아래 두 값을 채우면 모든 폰이 같은 서버를 씁니다.
// (비워 두면 앱 설정 화면에서 입력한 값을 쓰고, 그것도 없으면 '이 폰에서만' 체험 모드로 동작합니다.)
// anon / publishable 키는 공개용 키라서 여기에 넣어도 됩니다. service_role 키는 절대 넣지 마세요.
window.SB_CONFIG = {
  url: '',   // 예: 'https://abcdefghijk.supabase.co'
  key: ''    // 예: 'sb_publishable_...' 또는 'eyJ...' (anon key)
};
