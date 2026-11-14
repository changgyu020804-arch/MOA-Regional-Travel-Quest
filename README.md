# 모아로드 서울

서울 25개 구의 퀘스트를 체험하며 탐험 지도를 채우고 캐릭터 모아의 의상을 해금하는 Pleos Connect 데모입니다.

## APK로 실행

1. [모아로드 서울 데모 APK](apk/시립대토끼_모아로드서울_release.apk)를 준비합니다.
2. Pleos Connect 에뮬레이터 v2.1.0을 실행하고 기어를 P로, 속도를 0으로 설정합니다.
3. 에뮬레이터 창에 APK를 끌어다 놓은 뒤 앱 목록에서 **모아로드 서울**을 엽니다.

APK는 로컬 테스트 키로 서명한 공모전 시연용 release 빌드입니다.

## 시연 순서

1. **퀘스트**에서 기본 퀘스트를 골라 **미션 살펴보기 → 이 퀘스트 시작**을 누릅니다.
2. **가상 이동 시작**을 누릅니다. 약 6초 동안 이동 화면이 표시됩니다.
3. 도착하면 **가상 합법 주차 지점 확인**을 체크한 뒤 **자동 판정**을 누릅니다. 속도 0, 기어 P, 주차브레이크, 거리 100m 이내, 정확도 30m 이내 조건으로 가상 체류 5분을 약 7초에 시연합니다.
4. 안전 확인과 미션 항목 세 가지를 체크하고 **데모 완료 · 보상 받기**를 누릅니다.
5. **모아의 차고**에서 완료한 테마의 의상을 해금하고 착용합니다. 처음부터 시연하려면 **탐험 기록 → 데모 기록 초기화**를 사용합니다.

## 테스트 환경

| 항목 | 설정 |
| --- | --- |
| 에뮬레이터 | Pleos Connect v2.1.0, Android 14 (API 34) |
| 화면 규격 | 2560 × 1440 px, 160 dpi |
| Android 빌드 | Java 11, Gradle 9.6.0, AGP 9.5.1, Gradle JVM 25 |
| SDK | minSdk 28, targetSdk 34, compileSdk 37 |
| 필요한 설정 | 차량 정차 후 기어 P. 인터넷, 위치 권한, API 키 없이 실행 |

Pleos의 `CarUxRestrictions` 상태를 읽어 주행 제한 시 화면 조작과 가상 이동을 중단합니다. 퀘스트의 이동·위치·주차 조건은 가상 데이터입니다. 기록과 꾸미기 상태는 앱에 저장됩니다.

## 소스와 빌드

Android Studio에서 `DriveQuest` 프로젝트를 열고 Pleos 에뮬레이터를 대상으로 **Run app**을 실행합니다. 서명된 다른 release APK가 필요하면 **Build → Generate Signed App Bundle or APK → APK → release**를 선택해 서명합니다.

화면·데이터·시뮬레이션은 [앱 리소스](app/src/main/assets/moa/)에 있습니다. Android의 WebView가 오프라인 리소스를 읽고 Java Activity가 주행 제한을 처리합니다. 지도·캐릭터 출처는 [외부 자료 고지](app/src/main/assets/moa/NOTICE.md), 지도 라이선스는 [Apache 2.0 전문](app/src/main/assets/moa/licenses/MAP-LICENSE.txt)을 참조하세요.

- [공모전 개발 환경](https://appdevchallenge.auto-hmg.io/guide/development)
- [Pleos Connect 주행 규제 개발 가이드](https://document.pleos.ai/docs/pleos-only/vehicle-app-developer-guide/driving-restriction-development-guide)
