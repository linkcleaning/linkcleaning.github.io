# 픽컷 iOS 검사 결과
- 실행 번호: 2  /  커밋: 04393bf1be9730ad8da292def6f91d3d92406cf5
- 시각(UTC): 2026-10-31 13:54
- Xcode: Xcode 26.6  (설치된 것: /Applications/Xcode_26.0.1.app /Applications/Xcode_26.0.app /Applications/Xcode_26.1.1.app /Applications/Xcode_26.1.app /Applications/Xcode_26.2.0.app /Applications/Xcode_26.2.app /Applications/Xcode_26.3.0.app /Applications/Xcode_26.3.app /Applications/Xcode_26.4.1.app /Applications/Xcode_26.4.app /Applications/Xcode_26.5.0.app /Applications/Xcode_26.5.app /Applications/Xcode_26.6.0.app /Applications/Xcode_26.6.app /Applications/Xcode.app )

| 단계 | 결과 |
|---|---|
| 1 설치 | success |
| 2 타입 검사 | success |
| 3 expo-doctor | success |
| 4 JS 묶기 | success |
| 5 prebuild | success |
| 6 시뮬레이터 빌드 | success |

## 1 설치 — success
```

added 478 packages in 11s
----- SDK 버전과 맞는지 확인 -----
Dependencies are up to date
```

## 2 타입 검사 — success
```
```

## 3 expo-doctor — success
```
npm warn exec The following package was not found and will be installed: expo-doctor@1.21.5
Running 21 checks on your project...
21/21 checks passed. No issues detected!
```

## 4 JS 묶기 — success
```
Starting Metro Bundler

iOS Bundled 8755ms index.ts (602 modules)

› ios bundles (1):
_expo/static/js/ios/index-e214e9b6c5cb7d2d99e89cde47b01f89.hbc (1.5MB)

› Files (1):
metadata.json (142B)

Exported: /Users/runner/work/_temp/dist
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

Pod install took 56 [s] to run
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

## 6 시뮬레이터 빌드 — success
```
workspace=ios/PickCutLinkclean.xcworkspace scheme=PickCutLinkclean
** BUILD SUCCEEDED **
----- Info.plist -----
  "CFBundleDisplayName" => "픽컷"
  "CFBundleIdentifier" => "$(PRODUCT_BUNDLE_IDENTIFIER)"
  "ITSAppUsesNonExemptEncryption" => false
  "NSPhotoLibraryAddUsageDescription" => "로고를 넣거나 편집한 사진을 사진첩에 저장해요."
  "NSPhotoLibraryUsageDescription" => "베스트 컷을 고르고, 비슷한 사진·흔들린 사진을 정리하려면 사진첩에 접근해야 해요. 사진은 폰 밖으로 나가지 않아요."
```
