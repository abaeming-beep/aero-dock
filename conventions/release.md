# 릴리스

태그 `v*`를 푸시하면 `.github/workflows/release.yml`이 설치 파일을 빌드하고 서명해서 GitHub Releases에 올린다. 설치된 앱은 `releases/latest/download/latest.json`을 읽어 새 버전을 찾는다.

## 순서

```
scripts/bump-version.ps1 1.4.1
git add -A; git commit -m "release: AB Dock v1.4.1"
git tag v1.4.1
git push origin main --tags
```

태그와 앱 버전이 다르면 워크플로가 실패한다.

## 서명 키

- 비밀키: `%USERPROFILE%\.tauri\ab-dock.key`, 비밀번호: 같은 폴더의 `ab-dock.key.password`. 저장소에 넣지 않는다.
- GitHub Secret: `TAURI_SIGNING_PRIVATE_KEY`에 비밀키 파일 내용을, `TAURI_SIGNING_PRIVATE_KEY_PASSWORD`에 비밀번호 파일 내용을 넣는다.
- 비밀번호 없는 키를 쓰지 않는다. PowerShell에서 빈 환경 변수는 지워지고, 그러면 서명 단계가 입력을 기다리며 멈춘다.
- 공개키: `tauri.conf.json`의 `plugins.updater.pubkey`.

비밀키를 잃어버리면 설치된 앱은 새 릴리스를 받지 못한다. 새 키로 바꾼 버전을 직접 설치해야 한다. 저장소 밖에 백업한다.

## 로컬 빌드

`pnpm tauri build`는 키 없이 된다. 서명 파일은 `tauri.release.conf.json`을 줄 때만 만든다.

## 동작

- 앱이 시작할 때 한 번 확인한다. 실패하면 조용히 넘어간다.
- 설정의 정보 화면에서 직접 확인할 수 있다. 찾으면 버튼이 "지금 업데이트"로 바뀐다.
- 포터블 판은 확인하지 않는다. 릴리스에는 설치 파일만 있다.
