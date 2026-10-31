# 디자인

## 원칙

- 표면은 단색이다. 패널을 구분하는 것은 1px 테두리와 그림자 하나뿐이다.
- 색은 `src/styles/tokens.css`의 토큰으로만 쓴다. 예외는 음소거 배지와 토글 손잡이의 흰색이다(테마와 무관하게 대비가 필요해서).
- 강조색은 현재 상태와 주요 동작에만 쓴다. 장식에 쓰지 않는다.

## 예외: TiMe 위젯

`TimeWidget.tsx`는 Rainmeter 스킨을 옮긴 것이라 패널 없이 배경 화면 위에 글자만 그린다. 글자 색, 그림자, Century Gothic, pt 단위 크기는 스킨 값이며 토큰과 테마를 따르지 않는다. 다른 위젯에 이 방식을 퍼뜨리지 않는다.

## 금지

유리 효과, `backdrop-filter`, 장식용 그라디언트, 글로우, 텍스트 그림자, 반사, 떠다니는 애니메이션, 파티클, 장식 배지, 태그라인.

슬라이더의 `linear-gradient`는 채움 폭을 그리는 용도라 예외다.

## 토큰

| 토큰 | 용도 |
|---|---|
| `--bg` | 설정 창 배경 |
| `--surface` | 패널 배경 |
| `--hover`, `--pressed` | 상호작용 상태 |
| `--border` | 테두리, 구분선 |
| `--text`, `--text-muted` | 본문, 보조 문구 |
| `--accent`, `--accent-contrast` | 강조색과 그 위의 글자. `applyTheme.ts`가 설정에서 씀 |
| `--danger`, `--success` | 상태 |
| `--shadow` | 패널 그림자 |
| `--radius-sm/md/lg` | 6, 8, 14px |
| `--fs-small/body/strong/title` | 12, 13, 14, 18px. 이 네 크기만 쓴다 |

시계와 기온 같은 큰 숫자 표시는 위젯 크기에 맞춰야 해서 글자 크기 예외다.

## 테마

`data-theme`이 `light`, `dark`, `system` 중 하나다. 값은 `appearance.theme`이며, 없어진 테마 이름은 `normalizeTheme`이 바꾼다(night는 dark, 나머지는 system).

## 공유 패널

`.surface`가 독, 메뉴, 플라이아웃, 토스트, 위젯의 공통 패널이다. 자기 영역 밖으로 나가는 툴팁이 있는 독만 `.surface-open`을 붙여 잘림을 끈다.

`global.css`는 `main.tsx`에서 가장 먼저 불러온다. 순서가 바뀌면 `.surface`가 기능별 CSS를 덮어써서 독 불투명도와 위젯 패널이 깨진다.

## 설정 창 레이아웃

- 왼쪽 사이드바, 오른쪽에 한 번에 한 섹션. 내용 폭은 최대 640px.
- 창 폭 840px 이상은 아이콘과 라벨, 그 미만은 아이콘만(Material 3 window size class 기준). 기본 창 폭은 900px, 최소 660px이라 더 좁은 레이아웃은 없다.
- 행 높이 최소 44px. 카드 안의 행은 구분선으로 나눈다.
- 상태 메시지는 내용 아래 한 줄에 나오고 6초 뒤 사라진다.
- 설명은 라벨 옆 `?`(`HelpTip`)에 넣는다. 호버, 포커스, 클릭에서 열린다. 화면에 펼쳐 두지 않는다. 지금 상태를 알려 주는 문구(예: 날씨 오프라인)만 펼쳐 둔다.

## 모션

호버 확대와 자동 숨김은 유지한다. 패널 등장은 scale 0.97과 6px 이동이며 튀지 않는다. 값은 `springs.ts` 한 곳에서 정한다. 움직임은 transform과 opacity만 쓴다.

## 건드릴 때 주의

- `windowsflyout.css`의 패딩과 간격은 `WindowsFlyout.tsx`의 폭 계산과 맞물린다. DWM 썸네일이 이 영역에 합성된다.
- `.dock-bar`의 패딩은 `DockBar.tsx`의 창 크기 계산과 맞물린다.
- 위젯 모서리 값은 `WIDGET_RADIUS`와 CSS를 같이 바꾼다. 클릭 영역이 이 값을 쓴다.
