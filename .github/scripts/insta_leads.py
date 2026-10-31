"""링크클린 인스타 영업 비서 - 제주 신규 타겟 자동 수집기

매일 GitHub Actions에서 실행되어 insta/leads.json 을 갱신합니다.
- 행정안전부 인허가: 휴게음식점(카페), 일반음식점(식당), 농어촌민박업
- 국토교통부 건축HUB 건축인허가: 최근 사용승인(준공) / 최근 착공 건물
"""
import json, os, re, sys, time, urllib.parse, urllib.request
from datetime import datetime, timedelta, timezone

KST = timezone(timedelta(hours=9))
TODAY = datetime.now(KST).date()
KEY = os.environ.get("DATA_GO_KR_KEY", "").strip()
ROOT = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(ROOT, "..", "..", "insta", "leads.json")

LICENSE_DAYS = 45   # 최근 N일 신규 인허가 (카페·식당·민박)
BUILD_DAYS = 60     # 최근 N일 준공/착공
KEEP_DAYS = 90      # 목록 보관 기간

debug = {"errors": [], "calls": 0, "notes": []}


def get(url, params, tries=3):
    q = urllib.parse.urlencode(params, safe="[]:")
    full = f"{url}?{q}"
    for i in range(tries):
        try:
            debug["calls"] += 1
            req = urllib.request.Request(full, headers={"Accept": "application/json", "User-Agent": "linkclean-leads/1.0"})
            with urllib.request.urlopen(req, timeout=30) as r:
                return r.read().decode("utf-8", "replace")
        except Exception as e:  # noqa
            if i == tries - 1:
                raise
            time.sleep(2 * (i + 1))


def parse_items(text):
    """data.go.kr JSON/XML 응답에서 item 리스트와 totalCount 추출"""
    t = text.strip()
    if t.startswith("{"):
        j = json.loads(t)
        resp = j.get("response", j)
        head = resp.get("header", {})
        code = str(head.get("resultCode", "00"))
        if code not in ("00", "000", "0"):
            raise RuntimeError(f"resultCode={code} {head.get('resultMsg')}")
        body = resp.get("body", {}) or {}
        items = body.get("items") or []
        if isinstance(items, dict):
            items = items.get("item") or []
        if isinstance(items, dict):
            items = [items]
        return items, int(body.get("totalCount") or 0)
    # XML (에러 포함)
    m = re.search(r"<(returnAuthMsg|errMsg|resultMsg)>(.*?)</", t)
    code = re.search(r"<(resultCode|returnReasonCode)>(.*?)</", t)
    if code and code.group(2) not in ("00", "000", "0"):
        raise RuntimeError(f"XML error {code.group(2)} {m.group(2) if m else ''}")
    import xml.etree.ElementTree as ET
    root = ET.fromstring(t)
    items = [{c.tag: (c.text or "") for c in it} for it in root.iter("item")]
    tc = root.find(".//totalCount")
    return items, int(tc.text) if tc is not None and tc.text else len(items)


FRANCHISE = re.compile(
    r"스타벅스|메가(엠지씨|MGC)?커피|컴포즈|이디야|빽다방|투썸|할리스|파스쿠찌|엔제리너스|탐앤탐스|커피빈|폴바셋|"
    r"더벤티|매머드|공차|배스킨|던킨|파리바게|뚜레쥬르|맥도날드|롯데리아|버거킹|맘스터치|KFC|서브웨이|"
    r"GS25|씨유|CU|세븐일레븐|이마트24|미니스톱|교촌|BBQ|bhc|굽네|푸라닭|노브랜드|홈플러스|이마트|하나로마트", re.I)
SKIP_TYPE = re.compile(r"편의점|백화점|기타 휴게음식점\(편의")


# ───────── 1. 인허가 (카페·식당·민박) ─────────
def service_path_from_portal(page_id, fallback):
    try:
        html = urllib.request.urlopen(
            urllib.request.Request(f"https://www.data.go.kr/data/{page_id}/openapi.do", headers={"User-Agent": "Mozilla/5.0"}),
            timeout=30).read().decode("utf-8", "replace")
        m = re.search(r"apis\.data\.go\.kr/1741000/([A-Za-z0-9_]+)", html)
        if m:
            return m.group(1)
    except Exception as e:  # noqa
        debug["notes"].append(f"portal {page_id} fetch fail: {e}")
    return fallback


def collect_license(kind, path):
    base = f"https://apis.data.go.kr/1741000/{path}/info"
    since = (TODAY - timedelta(days=LICENSE_DAYS)).strftime("%Y-%m-%d")
    out, seen = [], set()
    strategies = [
        {"cond[OPN_ATMY_GRP_CD::EQ]": "6510000"},
        {"cond[OPN_ATMY_GRP_CD::EQ]": "6520000"},
        {"cond[OPN_ATMY_GRP_CD::EQ]": "6500000"},
    ]
    for st in strategies:
        for page in range(1, 11):
            params = {"serviceKey": KEY, "pageNo": page, "numOfRows": 100, "returnType": "json", "type": "json",
                      "cond[LCPMT_YMD::GTE]": since, **st}
            try:
                items, total = parse_items(get(base, params))
            except Exception as e:  # noqa
                debug["errors"].append(f"{kind} {st} p{page}: {str(e)[:160]}")
                break
            if page == 1:
                debug["notes"].append(f"{kind} {list(st.values())[0]} total={total}")
            for it in items:
                addr = it.get("ROAD_NM_ADDR") or it.get("LOTNO_ADDR") or ""
                if "제주" not in addr:
                    continue
                d = (it.get("LCPMT_YMD") or "")[:10]
                if d and d < since:
                    continue
                if str(it.get("SALS_STTS_CD", "01")) not in ("01", "1", ""):
                    continue
                typ = it.get("SNTTN_BZSTAT_NM") or it.get("BZSTAT_SE_NM") or ""
                name = (it.get("BPLC_NM") or "").strip()
                if SKIP_TYPE.search(typ) or not name:
                    continue
                mid = it.get("MNG_NO") or f"{name}|{addr}"
                if mid in seen:
                    continue
                seen.add(mid)
                out.append({
                    "id": f"{kind}:{mid}", "src": kind, "name": name, "type": typ, "addr": addr,
                    "date": d, "area": it.get("LCTN_AREA") or it.get("FCLT_TOTAL_SCL") or "",
                    "tel": it.get("TELNO") or "", "franchise": bool(FRANCHISE.search(name)),
                })
            if len(items) < 100:
                break
            time.sleep(0.3)
    return out


# ───────── 2. 건축HUB (준공·착공) ─────────
SKIP_PURPOSE = re.compile(r"축사|창고|공장|위험물|분뇨|묘지|발전|동물|식물|자원순환|교정|군사|방송통신|농업용")


def ymd(s):
    s = (s or "").strip().replace("-", "")
    if len(s) == 8 and s.isdigit():
        return f"{s[:4]}-{s[4:6]}-{s[6:]}"
    return ""


def collect_buildings():
    base = "https://apis.data.go.kr/1613000/ArchPmsHubService/getApBasisOulnInfo"
    codes = json.load(open(os.path.join(ROOT, "jeju_bdong.json"), encoding="utf-8"))
    since = TODAY - timedelta(days=BUILD_DAYS)
    since_s = since.strftime("%Y-%m-%d")
    out = []
    fails = 0
    for sg, bj, dname in codes:
        for page in range(1, 31):
            params = {"serviceKey": KEY, "sigunguCd": sg, "bjdongCd": bj, "numOfRows": 100, "pageNo": page, "_type": "json",
                      "startDate": since.strftime("%Y%m%d"), "endDate": TODAY.strftime("%Y%m%d")}
            try:
                items, total = parse_items(get(base, params))
            except Exception as e:  # noqa
                fails += 1
                if fails <= 5:
                    debug["errors"].append(f"build {dname} p{page}: {str(e)[:160]}")
                if fails >= 25:
                    debug["errors"].append("build: too many failures, stopped")
                    return out
                break
            if page == 1 and total:
                debug["notes"].append(f"build {dname} total={total}")
            for it in items:
                use = ymd(it.get("useAprDay"))
                start = ymd(it.get("realStcnsDay"))
                purpose = it.get("mainPurpsCdNm") or ""
                if SKIP_PURPOSE.search(purpose):
                    continue
                kind, d = None, ""
                if use and use >= since_s:
                    kind, d = "build_done", use
                elif start and start >= since_s and not use:
                    kind, d = "build_start", start
                if not kind:
                    continue
                addr = (it.get("platPlc") or "").strip() or dname
                name = (it.get("bldNm") or "").strip()
                out.append({
                    "id": f"{kind}:{it.get('mgmPmsrgstPk') or addr}", "src": kind,
                    "name": name or f"{purpose or '건물'} ({dname.split(' ')[-1]})",
                    "type": purpose, "addr": addr, "date": d,
                    "area": it.get("totArea") or "", "hhld": it.get("hhldCnt") or it.get("hoCnt") or "",
                    "permitDate": ymd(it.get("archPmsDay")), "franchise": False,
                })
            if len(items) < 100:
                break
            time.sleep(0.2)
    return out


def main():
    if not KEY:
        print("DATA_GO_KR_KEY 비밀값이 아직 없어요. GitHub Settings > Secrets 에 추가하면 다음 실행부터 수집합니다.")
        return
    prev = {}
    try:
        old = json.load(open(OUT, encoding="utf-8"))
        prev = {x["id"]: x for x in old.get("items", [])}
    except Exception:  # noqa
        pass

    items = []
    for kind, page_id, fallback in [("cafe", "15154921", "rest_cafes"), ("restaurant", "15154916", "general_restaurants"),
                                    ("minbak", "15155113", "rural_lodgings")]:
        path = fallback if kind != "minbak" else service_path_from_portal(page_id, fallback)
        debug["notes"].append(f"{kind} path={path}")
        try:
            got = collect_license(kind, path)
            debug["notes"].append(f"{kind} collected={len(got)}")
            items += got
        except Exception as e:  # noqa
            debug["errors"].append(f"{kind}: {e}")
    try:
        got = collect_buildings()
        debug["notes"].append(f"buildings collected={len(got)}")
        items += got
    except Exception as e:  # noqa
        debug["errors"].append(f"buildings: {e}")

    now = datetime.now(KST).strftime("%Y-%m-%d %H:%M")
    merged = {}
    for x in items:
        x["firstSeen"] = prev.get(x["id"], {}).get("firstSeen", now)
        merged[x["id"]] = x
    # 이전 목록 중 보관기간 이내인 건 유지 (API 일시 장애 대비)
    cutoff = (TODAY - timedelta(days=KEEP_DAYS)).strftime("%Y-%m-%d")
    for k, x in prev.items():
        if k not in merged and (x.get("date") or "") >= cutoff:
            merged[k] = x
    lst = sorted(merged.values(), key=lambda x: (x.get("date") or "", x.get("firstSeen") or ""), reverse=True)
    stats = {}
    for x in lst:
        stats[x["src"]] = stats.get(x["src"], 0) + 1
    os.makedirs(os.path.dirname(OUT), exist_ok=True)
    json.dump({"updated": now, "stats": stats, "items": lst, "debug": debug}, open(OUT, "w", encoding="utf-8"),
              ensure_ascii=False, indent=0)
    print(json.dumps({"updated": now, "stats": stats, "debug": debug}, ensure_ascii=False, indent=1))


if __name__ == "__main__":
    main()
