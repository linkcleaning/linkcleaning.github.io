# 픽컷 iOS 검사 결과
- 실행 번호: 1  /  커밋: 241bde4cf0b911d884ba01f77cd87fa4579c1fe6
- 시각(UTC): 2026-10-31 13:47
- Xcode: Xcode 26.3

| 단계 | 결과 |
|---|---|
| 1 설치 | failure |
| 2 타입 검사 | failure |
| 3 expo-doctor | failure |
| 4 JS 묶기 | failure |
| 5 prebuild | success |
| 6 시뮬레이터 빌드 | failure |

## 1 설치 — failure
```
npm warn Could not resolve dependency:
npm warn peer react@"^19.3.0" from react-native@0.88.1
npm warn node_modules/react-native
npm warn   react-native@"0.86.3" from the root project
npm warn   14 more (@expo/cli, @expo/devtools, @expo/dom-webview, ...)
npm warn ERESOLVE overriding peer dependency
npm warn While resolving: pickcut-ios@1.0.0
npm warn Found: react@19.3.1
npm warn node_modules/react
npm warn   react@"19.2.3" from the root project
npm warn   12 more (@expo/devtools, @expo/dom-webview, @expo/log-box, ...)
npm warn
npm warn Could not resolve dependency:
npm warn peer react@"^19.3.0" from react-native@0.88.1
npm warn node_modules/react-native
npm warn   react-native@"0.86.3" from the root project
npm warn   14 more (@expo/cli, @expo/devtools, @expo/dom-webview, ...)
npm warn ERESOLVE overriding peer dependency
npm warn While resolving: pickcut-ios@1.0.0
npm warn Found: react@19.3.1
npm warn node_modules/react
npm warn   react@"19.2.3" from the root project
npm warn   12 more (@expo/devtools, @expo/dom-webview, @expo/log-box, ...)
npm warn
npm warn Could not resolve dependency:
npm warn peer react@"^19.3.0" from react-native@0.88.1
npm warn node_modules/react-native
npm warn   react-native@"0.86.3" from the root project
npm warn   14 more (@expo/cli, @expo/devtools, @expo/dom-webview, ...)
npm warn ERESOLVE overriding peer dependency
npm warn While resolving: pickcut-ios@1.0.0
npm warn Found: react@19.3.1
npm warn node_modules/react
npm warn   react@"19.2.3" from the root project
npm warn   12 more (@expo/devtools, @expo/dom-webview, @expo/log-box, ...)
npm warn
npm warn Could not resolve dependency:
npm warn peer react@"^19.3.0" from react-native@0.88.1
npm warn node_modules/react-native
npm warn   react-native@"0.86.3" from the root project
npm warn   14 more (@expo/cli, @expo/devtools, @expo/dom-webview, ...)

added 27 packages, removed 52 packages, changed 9 packages, and audited 479 packages in 9s

47 packages are looking for funding
  run `npm fund` for details

14 vulnerabilities (2 low, 10 moderate, 2 high)

To address issues that do not require attention, run:
  npm audit fix

To address all issues (including breaking changes), run:
  npm audit fix --force

Run `npm audit` for details.
Error: Cannot find module './utils/autoAddConfigPlugins.js'
Require stack:
- /Users/runner/work/linkcleaning.github.io/linkcleaning.github.io/ios/pickcut-app/node_modules/@expo/cli/build/src/install/applyPlugins.js
- /Users/runner/work/linkcleaning.github.io/linkcleaning.github.io/ios/pickcut-app/node_modules/@expo/cli/build/src/install/installAsync.js
- /Users/runner/work/linkcleaning.github.io/linkcleaning.github.io/ios/pickcut-app/node_modules/@expo/cli/build/src/install/index.js
- /Users/runner/work/linkcleaning.github.io/linkcleaning.github.io/ios/pickcut-app/node_modules/@expo/cli/build/bin/cli
- /Users/runner/work/linkcleaning.github.io/linkcleaning.github.io/ios/pickcut-app/node_modules/expo/bin/cli
Error: Cannot find module './utils/autoAddConfigPlugins.js'
Require stack:
- /Users/runner/work/linkcleaning.github.io/linkcleaning.github.io/ios/pickcut-app/node_modules/@expo/cli/build/src/install/applyPlugins.js
- /Users/runner/work/linkcleaning.github.io/linkcleaning.github.io/ios/pickcut-app/node_modules/@expo/cli/build/src/install/installAsync.js
- /Users/runner/work/linkcleaning.github.io/linkcleaning.github.io/ios/pickcut-app/node_modules/@expo/cli/build/src/install/index.js
- /Users/runner/work/linkcleaning.github.io/linkcleaning.github.io/ios/pickcut-app/node_modules/@expo/cli/build/bin/cli
- /Users/runner/work/linkcleaning.github.io/linkcleaning.github.io/ios/pickcut-app/node_modules/expo/bin/cli
    at Function._resolveFilename (node:internal/modules/cjs/loader:1430:15)
    at defaultResolveImpl (node:internal/modules/cjs/loader:1040:19)
    at resolveForCJSWithHooks (node:internal/modules/cjs/loader:1045:22)
    at Function._load (node:internal/modules/cjs/loader:1216:25)
    at wrapModuleLoad (node:internal/modules/cjs/loader:254:19)
    at Module.require (node:internal/modules/cjs/loader:1527:12)
    at require (node:internal/modules/helpers:147:16)
    at /Users/runner/work/linkcleaning.github.io/linkcleaning.github.io/ios/pickcut-app/node_modules/@expo/cli/build/src/install/applyPlugins.js:62:116
    at process.processTicksAndRejections (node:internal/process/task_queues:103:5)
    at async applyPluginsAsync (/Users/runner/work/linkcleaning.github.io/linkcleaning.github.io/ios/pickcut-app/node_modules/@expo/cli/build/src/install/applyPlugins.js:62:43)
```

## 2 타입 검사 — failure
```
App.tsx(106,44): error TS1161: Unterminated regular expression literal.
App.tsx(107,24): error TS1161: Unterminated regular expression literal.
```

## 3 expo-doctor — failure
```
npm warn exec The following package was not found and will be installed: expo-doctor@1.21.5
Running 21 checks on your project...
19/21 checks passed. 2 checks failed. Possible issues detected:
Use the --verbose flag to see more details about passed checks.

✖ Check native tooling versions
Your Expo SDK version 57 is not compatible with Xcode 26.3.0. Required Xcode version: >=26.4.0.
Advice:
Use a compatible Xcode version for your SDK version. Learn more: https://expo.fyi/expo-sdk-xcode-compatibility

✖ Check that packages match versions required by installed Expo SDK

❗ Major version mismatches
package     expected  found  
typescript  ~6.0.3    5.9.3  



1 package out of date.
Advice:
Use 'npx expo install --check' to review and upgrade your dependencies.
To ignore specific packages, add them to "expo.install.exclude" in package.json. Learn more: https://expo.fyi/dependency-validation

2 checks failed, indicating possible issues with the project.
```

## 4 JS 묶기 — failure
```
Starting Metro Bundler

iOS Bundling failed 4173ms index.ts (579 modules)

SyntaxError: SyntaxError: /Users/runner/work/linkcleaning.github.io/linkcleaning.github.io/ios/pickcut-app/App.tsx: Unterminated regular expression. (106:44)

[0m [90m 104 |[39m [90m/** 답을 웹에 넣을 JS 코드로 (특수 줄바꿈 문자는 JS에서 오류가 나므로 바꿔 둠) */[39m
 [90m 105 |[39m [36mfunction[39m replyScript(msg[33m:[39m unknown) {
[31m[1m>[22m[39m[90m 106 |[39m   [36mconst[39m json [33m=[39m [33mJSON[39m[33m.[39mstringify(msg)[33m.[39mreplace([33m/[39m
 [90m     |[39m                                             [31m[1m^[22m[39m
 [90m 107 |[39m [33m/[39mg[33m,[39m [32m'\\u2028'[39m)[33m.[39mreplace([33m/[39m
 [90m 108 |[39m [33m/[39mg[33m,[39m [32m'\\u2029'[39m)[33m;[39m
 [90m 109 |[39m   [36mreturn[39m [32m`window.__pickcutNative && window.__pickcutNative(${json}); true;`[39m[33m;[39m[0m
```

## 5 prebuild — success
```
==================== DEPRECATION NOTICE =====================
Calling `pod install` directly is deprecated in React Native
because we are moving away from Cocoapods toward alternative
solutions to build the project.
* If you are using Expo, please run:
`npx expo run:ios`
* If you are using the Community CLI, please run:
`yarn ios`
=============================================================

Pod install took 39 [s] to run
Integrating client project

[!] Please close any current Xcode sessions and use `PickCutLinkclean.xcworkspace` for this project from now on.
[Expo] Installing the build script for target PickCutLinkclean
Pod installation complete! There are 92 dependencies from the Podfile and 91 total pods installed.
[Expo-precompiled] Precompiled modules:
[Expo-precompiled]   📦 ExpoFileSystem (57.0.7)
[Expo-precompiled]   📦 ExpoFont (57.0.4)
[Expo-precompiled]   📦 ExpoImageManipulator (57.0.21)
[Expo-precompiled]       ∟ SDWebImage.xcframework (5.21.1)
[Expo-precompiled]       ∟ SDWebImageWebPCoder.xcframework (0.14.6)
[Expo-precompiled]   📦 ExpoMediaLibrary (57.0.5)
[Expo-precompiled]   📦 ExpoModulesCore (57.0.24)
[Expo-precompiled]   📦 ExpoModulesWorklets (57.0.24)
[Expo] Disabling SWIFT_EMIT_MODULE_INTERFACE for pod targets (prebuilt React compatibility)
[Expo-precompiled] Looking for ExpoModulesCore.xcframework at: /Users/runner/work/linkcleaning.github.io/linkcleaning.github.io/ios/pickcut-app/ios/Pods/ExpoModulesCore/ExpoModulesCore.xcframework
[Expo-precompiled] Adding ExpoModulesJSI header search paths to all targets
[Expo] Adding '[Expo] Remove duplicate codegen output' build phase to ReactCodegen
✔ Installed CocoaPods
```

## 6 시뮬레이터 빌드 — failure
```
workspace=ios/PickCutLinkclean.xcworkspace scheme=PickCutLinkclean
** BUILD FAILED **
/Users/runner/work/linkcleaning.github.io/linkcleaning.github.io/ios/pickcut-app/App.tsx:106:44: error: SyntaxError: /Users/runner/work/linkcleaning.github.io/linkcleaning.github.io/ios/pickcut-app/App.tsx: Unterminated regular expression. (106:44)
----- Info.plist -----
  "CFBundleDisplayName" => "픽컷"
  "CFBundleIdentifier" => "$(PRODUCT_BUNDLE_IDENTIFIER)"
  "ITSAppUsesNonExemptEncryption" => 0
  "NSPhotoLibraryAddUsageDescription" => "로고를 넣거나 편집한 사진을 사진첩에 저장해요."
  "NSPhotoLibraryUsageDescription" => "베스트 컷을 고르고, 비슷한 사진·흔들린 사진을 정리하려면 사진첩에 접근해야 해요. 사진은 폰 밖으로 나가지 않아요."
```
