// ═════════════════════════════════════════════════════════════
// 픽컷 아이폰 앱
//
// 화면은 웹 픽컷(https://linkcleaning.github.io/pickcut/)을 그대로 띄웁니다.
// → 화면·분석 기능을 고치면 앱을 새로 만들지 않아도 바로 반영됩니다.
//
// 웹이 못 하는 일만 이 파일(아이폰 쪽)이 대신 합니다.
//   permissions  사진 접근 권한 요청
//   listAssets   기간 안의 사진 목록
//   getImage     사진 1장을 분석용 크기 JPEG로 변환해서 넘겨주기
//   deleteAssets 사진첩에서 삭제 (아이폰이 "삭제할까요?" 확인 창을 띄움)
//   saveImages   편집·로고 넣은 사진을 사진첩에 저장
// ═════════════════════════════════════════════════════════════
import { useCallback, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { WebView, type WebViewMessageEvent } from 'react-native-webview';
import * as MediaLibrary from 'expo-media-library/legacy';
import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';
import * as FileSystem from 'expo-file-system/legacy';

const WEB_URL = 'https://linkcleaning.github.io/pickcut/';
const INK = '#121014';
const MARK = '#ff4d2e';

type Request = { id: number; type: string; payload?: any };

/* ───────────── 웹이 부탁한 일 처리 ───────────── */

async function handle(type: string, p: any): Promise<unknown> {
  switch (type) {
    case 'permissions': {
      // false = 읽기+쓰기(삭제·저장) 모두 요청
      const r = await MediaLibrary.requestPermissionsAsync(false);
      return { granted: r.granted, access: r.accessPrivileges ?? (r.granted ? 'all' : 'none') };
    }

    case 'listAssets': {
      // 기간 안의 사진을 오래된 순으로, limit 장까지
      const out: Array<Record<string, unknown>> = [];
      let after: string | undefined;
      while (out.length < p.limit) {
        const page = await MediaLibrary.getAssetsAsync({
          mediaType: MediaLibrary.MediaType.photo,
          createdAfter: p.fromTs,
          createdBefore: p.toTs,
          sortBy: [[MediaLibrary.SortBy.creationTime, true]],
          first: Math.min(200, p.limit - out.length),
          after,
        });
        for (const a of page.assets) {
          out.push({ id: a.id, filename: a.filename, creationTime: a.creationTime, width: a.width, height: a.height });
        }
        if (!page.hasNextPage) break;
        after = page.endCursor;
      }
      return out;
    }

    case 'getImage': {
      // iCloud에만 있는 사진도 내려받아서 사용
      const info = await MediaLibrary.getAssetInfoAsync(p.id, { shouldDownloadFromNetwork: true });
      const uri = info.localUri ?? info.uri;
      const max = p.maxSize ?? 2048;
      const ctx = ImageManipulator.manipulate(uri);
      if (Math.max(info.width, info.height) > max) {
        ctx.resize(info.width >= info.height ? { width: max } : { height: max });
      }
      const img = await ctx.renderAsync();
      const saved = await img.saveAsync({ format: SaveFormat.JPEG, compress: 0.88, base64: true });
      // 임시 파일은 바로 지움 (사진 수백 장이어도 폰 용량이 늘지 않게)
      FileSystem.deleteAsync(saved.uri, { idempotent: true }).catch(() => {});
      return { base64: saved.base64 };
    }

    case 'deleteAssets': {
      // 아이폰이 "픽컷이 사진 N장을 삭제하도록 허용하겠습니까?"를 띄움
      // 사용자가 '허용 안 함'을 누르면 오류가 나므로 false로 돌려줌
      try {
        const ok = await MediaLibrary.deleteAssetsAsync(p.ids);
        return { deleted: !!ok };
      } catch {
        return { deleted: false };
      }
    }

    case 'saveImages': {
      let saved = 0;
      for (const item of p.items as Array<{ name: string; base64: string }>) {
        const path = `${FileSystem.cacheDirectory}${Date.now()}-${item.name.replace(/[^\w.-]/g, '_')}`;
        await FileSystem.writeAsStringAsync(path, item.base64, { encoding: FileSystem.EncodingType.Base64 });
        await MediaLibrary.saveToLibraryAsync(path); // 사진 속 촬영 날짜로 사진첩에 들어감
        FileSystem.deleteAsync(path, { idempotent: true }).catch(() => {});
        saved += 1;
      }
      return { saved };
    }

    default:
      throw new Error(`모르는 요청: ${type}`);
  }
}

/** 답을 웹에 넣을 JS 코드로 (특수 줄바꿈 문자는 JS에서 오류가 나므로 바꿔 둠) */
function replyScript(msg: unknown) {
  const LS = String.fromCharCode(0x2028); // 줄 구분 문자
  const PS = String.fromCharCode(0x2029); // 문단 구분 문자
  const json = JSON.stringify(msg).split(LS).join('\\u2028').split(PS).join('\\u2029');
  return `window.__pickcutNative && window.__pickcutNative(${json}); true;`;
}

/* ───────────── 화면 ───────────── */

export default function App() {
  const webRef = useRef<WebView>(null);
  const [failed, setFailed] = useState(false);
  const [key, setKey] = useState(0); // 다시 시도할 때 WebView를 새로 만듦

  const onMessage = useCallback(async (e: WebViewMessageEvent) => {
    let req: Request;
    try {
      req = JSON.parse(e.nativeEvent.data);
    } catch {
      return;
    }
    try {
      const data = await handle(req.type, req.payload ?? {});
      webRef.current?.injectJavaScript(replyScript({ id: req.id, ok: true, data }));
    } catch (err) {
      const error = err instanceof Error ? err.message : String(err);
      webRef.current?.injectJavaScript(replyScript({ id: req.id, ok: false, error }));
    }
  }, []);

  return (
    <View style={styles.root}>
      <StatusBar style="light" />
      {failed ? (
        <View style={styles.center}>
          <Text style={styles.title}>픽컷을 열지 못했어요</Text>
          <Text style={styles.body}>인터넷 연결을 확인한 뒤 다시 시도해 주세요.</Text>
          <Pressable
            style={styles.button}
            onPress={() => {
              setFailed(false);
              setKey((k) => k + 1);
            }}
          >
            <Text style={styles.buttonText}>다시 시도</Text>
          </Pressable>
        </View>
      ) : (
        <WebView
          key={key}
          ref={webRef}
          source={{ uri: WEB_URL }}
          onMessage={onMessage}
          // 웹이 '아이폰 앱 안'임을 처음부터 알 수 있게 표시
          injectedJavaScriptBeforeContentLoaded="window.__PICKCUT_APP__ = true; true;"
          applicationNameForUserAgent="PickCutApp/1.0"
          style={styles.web}
          originWhitelist={['https://*']}
          javaScriptEnabled
          domStorageEnabled
          bounces={false}
          allowsBackForwardNavigationGestures
          contentInsetAdjustmentBehavior="never"
          automaticallyAdjustContentInsets={false}
          startInLoadingState
          renderLoading={() => (
            <View style={[StyleSheet.absoluteFill, styles.center]}>
              <ActivityIndicator color={MARK} size="large" />
            </View>
          )}
          onError={() => setFailed(true)}
          onHttpError={(e) => e.nativeEvent.statusCode >= 500 && setFailed(true)}
          onContentProcessDidTerminate={() => webRef.current?.reload()} // 메모리 부족으로 화면이 꺼지면 다시 열기
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: INK },
  web: { flex: 1, backgroundColor: INK },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24, backgroundColor: INK },
  title: { color: '#f3eee9', fontSize: 20, fontWeight: '700', marginBottom: 8 },
  body: { color: 'rgba(243,238,233,0.6)', fontSize: 15, textAlign: 'center', marginBottom: 24 },
  button: { backgroundColor: MARK, paddingHorizontal: 28, paddingVertical: 14, borderRadius: 999 },
  buttonText: { color: INK, fontSize: 16, fontWeight: '700' },
});
