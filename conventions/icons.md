# 아이콘

Lucide만 쓴다. 패키지 `lucide-react` 1.64.0, ISC 라이선스, https://lucide.dev/

- 이모지를 아이콘으로 쓰지 않는다. SVG path를 직접 그리지 않는다.
- 이름은 설치된 패키지 기준으로 확인한다. 없는 이름은 타입체크에서 걸린다.
- 색은 `currentColor`를 따른다. 기본 16px, 사이드바 18px.

앱 아이콘은 Windows에서 추출한 것이라 이 규칙과 무관하다.

## 용도

| 위치 | 아이콘 |
|---|---|
| 설정 사이드바 | SlidersHorizontal, PanelBottom, Palette, Layers, Volume2, LayoutGrid, Info |
| 독 설정 버튼 | Settings |
| 독 휴지통 | Trash2 |
| 독 배터리 | BatteryCharging, BatteryLow, BatteryMedium, BatteryFull |
| 앱 볼륨 표시 | Volume2, VolumeX |
| 도움말 | CircleHelp |
| 오디오 출력 선택 표시 | Check |
| 창 미리보기 닫기 | X |
| 폴더, 스택 대체 아이콘 | Folder, File, AppWindow |
| 위젯 크기 조절 | GripHorizontal |
| 날씨 | Sun, Moon, CloudSun, CloudMoon, Cloud, CloudRain, CloudSnow, CloudLightning |
| 음악 | SkipBack, Play, Pause, SkipForward |
| 모드 타일 선택지 | `ModeIconPicker.tsx`의 `PRESETS` |

## 모드 타일

선택한 아이콘은 모드의 glyph 필드에 `i:<id>`로 저장한다. 빈 값은 이름의 첫 글자다. 그 외 값은 글자 그대로 표시하므로 이전 버전에서 저장한 이모지는 계속 보인다.
