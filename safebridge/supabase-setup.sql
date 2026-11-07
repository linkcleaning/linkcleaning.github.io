-- 세이프브릿지 PWA 시험판 백엔드
-- Supabase 대시보드 → SQL Editor → New query → 이 파일 전체를 붙여넣고 Run
-- 테이블은 앱에서 직접 못 건드리고, 아래 함수(RPC)로만 읽고 씁니다.

create table if not exists public.sb_families (
  id            uuid primary key default gen_random_uuid(),
  family_key    text not null unique,   -- 보호자 앱이 쓰는 비밀 키 (가족 초대 링크에 들어감)
  companion_key text not null unique,   -- 어르신 폰 동행 모드용 키
  tag_token     text not null unique,   -- 목걸이 NFC·QR 주소에 들어가는 키
  guardian_name text,
  safe_number   text,
  nickname      text not null default '어르신',
  calming_tips  text,
  medical_note  text,
  show_medical  boolean not null default false,
  status        text not null default 'normal' check (status in ('normal','missing')),
  missing_since timestamptz,
  zone_name     text,
  zone_lat      double precision,
  zone_lng      double precision,
  zone_radius   integer,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create table if not exists public.sb_events (
  id         bigint generated always as identity primary key,
  family_id  uuid not null references public.sb_families(id) on delete cascade,
  kind       text not null check (kind in ('open','scan','ping','exit','enter')),
  lat        double precision,
  lng        double precision,
  accuracy   double precision,
  note       text,
  created_at timestamptz not null default now()
);
-- 예전 버전 SQL을 이미 실행했어도 'open'(목걸이 찍힘) 기록이 들어가도록
alter table public.sb_events drop constraint if exists sb_events_kind_check;
alter table public.sb_events add constraint sb_events_kind_check check (kind in ('open','scan','ping','exit','enter'));
create index if not exists sb_events_family_idx on public.sb_events (family_id, id desc);

alter table public.sb_families enable row level security;
alter table public.sb_events   enable row level security;
revoke all on public.sb_families, public.sb_events from anon, authenticated;

-- 추측 불가능한 22자 키
create or replace function public.sb_rand() returns text
language sql volatile set search_path = public, extensions as $$
  select translate(encode(gen_random_bytes(16), 'base64'), '+/=', '-_')
$$;

-- 가족(어르신 1명) 만들기
create or replace function public.sb_create_family(p jsonb) returns jsonb
language plpgsql security definer set search_path = public, extensions as $$
declare r public.sb_families;
begin
  insert into sb_families (family_key, companion_key, tag_token, guardian_name, safe_number,
                           nickname, calming_tips, medical_note, show_medical)
  values (sb_rand() || sb_rand(), sb_rand(), sb_rand(),
          left(p->>'guardian_name', 40), left(p->>'safe_number', 20),
          coalesce(nullif(left(p->>'nickname', 40), ''), '어르신'),
          left(p->>'calming_tips', 300), left(p->>'medical_note', 300),
          coalesce((p->>'show_medical')::boolean, false))
  returning * into r;
  return jsonb_build_object('family_key', r.family_key, 'companion_key', r.companion_key, 'tag_token', r.tag_token);
end $$;

-- 정보·안심존 수정
create or replace function public.sb_update_family(p_fkey text, p jsonb) returns jsonb
language plpgsql security definer set search_path = public as $$
begin
  update sb_families set
    guardian_name = case when p ? 'guardian_name' then left(p->>'guardian_name', 40) else guardian_name end,
    safe_number   = case when p ? 'safe_number'   then left(p->>'safe_number', 20)   else safe_number end,
    nickname      = case when p ? 'nickname'      then coalesce(nullif(left(p->>'nickname', 40), ''), '어르신') else nickname end,
    calming_tips  = case when p ? 'calming_tips'  then left(p->>'calming_tips', 300) else calming_tips end,
    medical_note  = case when p ? 'medical_note'  then left(p->>'medical_note', 300) else medical_note end,
    show_medical  = case when p ? 'show_medical'  then coalesce((p->>'show_medical')::boolean, false) else show_medical end,
    zone_name     = case when p ? 'zone_name'     then left(p->>'zone_name', 20) else zone_name end,
    zone_lat      = case when p ? 'zone_lat'      then (p->>'zone_lat')::double precision else zone_lat end,
    zone_lng      = case when p ? 'zone_lng'      then (p->>'zone_lng')::double precision else zone_lng end,
    zone_radius   = case when p ? 'zone_radius'   then (p->>'zone_radius')::integer else zone_radius end,
    updated_at    = now()
  where family_key = p_fkey;
  if not found then raise exception 'family not found'; end if;
  return jsonb_build_object('ok', true);
end $$;

-- 보호자 대시보드: 정보 + 최근 기록 200건
create or replace function public.sb_dashboard(p_fkey text) returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare f public.sb_families; ev jsonb;
begin
  select * into f from sb_families where family_key = p_fkey;
  if not found then raise exception 'family not found'; end if;
  select coalesce(jsonb_agg(to_jsonb(e) - 'family_id' order by e.id desc), '[]'::jsonb) into ev
    from (select * from sb_events where family_id = f.id order by id desc limit 200) e;
  return jsonb_build_object('family', to_jsonb(f) - 'id' - 'family_key', 'events', ev);
end $$;

-- 발견자 화면: 공개해도 되는 정보만
create or replace function public.sb_scan_info(p_token text) returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare f public.sb_families;
begin
  select * into f from sb_families where tag_token = p_token;
  if not found then return jsonb_build_object('ok', false); end if;
  return jsonb_build_object('ok', true, 'nickname', f.nickname, 'calming_tips', f.calming_tips,
    'medical', case when f.show_medical then f.medical_note end,
    'safe_number', f.safe_number, 'missing', f.status = 'missing');
end $$;

-- 목걸이를 찍어 발견자 화면이 열리는 순간 자동 기록 (위치 없음, 같은 표식 1분에 1회)
create or replace function public.sb_scan_open(p_token text) returns jsonb
language plpgsql security definer set search_path = public as $$
declare f public.sb_families;
begin
  select * into f from sb_families where tag_token = p_token;
  if not found then return jsonb_build_object('ok', false); end if;
  if not exists (select 1 from sb_events where family_id = f.id and kind = 'open'
                  and created_at > now() - interval '1 minute') then
    insert into sb_events (family_id, kind) values (f.id, 'open');
  end if;
  return jsonb_build_object('ok', true);
end $$;

-- 발견자 위치 전송 (같은 표식 1분에 5회까지)
create or replace function public.sb_report_scan(p_token text, p_lat double precision default null,
  p_lng double precision default null, p_acc double precision default null, p_note text default null) returns jsonb
language plpgsql security definer set search_path = public as $$
declare f public.sb_families; n int;
begin
  select * into f from sb_families where tag_token = p_token;
  if not found then return jsonb_build_object('ok', false); end if;
  select count(*) into n from sb_events
   where family_id = f.id and kind = 'scan' and created_at > now() - interval '1 minute';
  if n >= 5 then raise exception 'too many scans'; end if;
  insert into sb_events (family_id, kind, lat, lng, accuracy, note)
  values (f.id, 'scan', p_lat, p_lng, p_acc, left(p_note, 200));
  return jsonb_build_object('ok', true);
end $$;

-- 어르신 폰 동행 모드: 정보 조회('info') 또는 위치·이탈·복귀 기록
create or replace function public.sb_companion(p_ckey text, p_kind text default 'info',
  p_lat double precision default null, p_lng double precision default null,
  p_acc double precision default null) returns jsonb
language plpgsql security definer set search_path = public as $$
declare f public.sb_families; n int;
begin
  select * into f from sb_families where companion_key = p_ckey;
  if not found then return jsonb_build_object('ok', false); end if;
  if p_kind in ('ping', 'exit', 'enter') and p_lat is not null then
    select count(*) into n from sb_events
     where family_id = f.id and created_at > now() - interval '20 seconds';
    if n < 4 then
      insert into sb_events (family_id, kind, lat, lng, accuracy) values (f.id, p_kind, p_lat, p_lng, p_acc);
    end if;
    -- 동행 위치는 30일만 보관
    delete from sb_events where family_id = f.id and kind = 'ping' and created_at < now() - interval '30 days';
  end if;
  return jsonb_build_object('ok', true, 'nickname', f.nickname, 'missing', f.status = 'missing',
    'zone', case when f.zone_lat is not null then jsonb_build_object(
      'name', f.zone_name, 'lat', f.zone_lat, 'lng', f.zone_lng, 'radius', f.zone_radius) end);
end $$;

-- 실종 모드 켜기/끄기
create or replace function public.sb_set_missing(p_fkey text, p_on boolean) returns jsonb
language plpgsql security definer set search_path = public as $$
begin
  update sb_families set status = case when p_on then 'missing' else 'normal' end,
         missing_since = case when p_on then now() end, updated_at = now()
   where family_key = p_fkey;
  if not found then raise exception 'family not found'; end if;
  return jsonb_build_object('ok', true);
end $$;

-- 목걸이 분실 시 표식 주소 재발급 (예전 QR·NFC는 바로 무효)
create or replace function public.sb_rotate_tag(p_fkey text) returns jsonb
language plpgsql security definer set search_path = public, extensions as $$
declare t text;
begin
  update sb_families set tag_token = sb_rand(), updated_at = now()
   where family_key = p_fkey returning tag_token into t;
  if t is null then raise exception 'family not found'; end if;
  return jsonb_build_object('tag_token', t);
end $$;

grant execute on function public.sb_create_family(jsonb),
  public.sb_update_family(text, jsonb), public.sb_dashboard(text), public.sb_scan_info(text),
  public.sb_report_scan(text, double precision, double precision, double precision, text), public.sb_scan_open(text),
  public.sb_companion(text, text, double precision, double precision, double precision),
  public.sb_set_missing(text, boolean), public.sb_rotate_tag(text)
  to anon, authenticated;
