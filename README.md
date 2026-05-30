# ETETT1309 Portfolio

코스프레 동인, 컨셉촬영 중심 사진사 포트폴리오 정적 사이트입니다.

## 구성

- `index.html`: GitHub Pages에서 바로 열리는 메인 페이지
- `assets/gallery.js`: 갤러리에 표시할 사진 목록
- `assets/site.js`: 갤러리 렌더링 스크립트
- `assets/gallery/`: 포트폴리오 사진을 넣는 폴더

## 사진 올리는 법

1. 사진 파일을 `assets/gallery/` 폴더에 넣습니다.
   예: `assets/gallery/work-01.jpg`

2. `assets/gallery.js`에 항목을 추가합니다.

```js
window.PORTFOLIO_ITEMS = [
  {
    src: "assets/gallery/work-01.jpg",
    title: "NIKKE / Studio",
    meta: "Cosplay / Seoul / 2026",
    alt: "NIKKE 코스프레 스튜디오 촬영"
  }
];
```

3. GitHub 저장소 루트에 이 폴더의 파일들을 올립니다.

4. 저장소 `Settings > Pages`에서 배포 소스를 기본 브랜치의 root로 설정하면 됩니다.

## 참고

방문자가 사이트 화면에서 직접 사진을 업로드해 서버에 저장하는 기능은 정적 GitHub Pages만으로는 동작하지 않습니다. 이 사이트는 저장소에 사진을 추가하면 갤러리에 표시되는 방식입니다.
