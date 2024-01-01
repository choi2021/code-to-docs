# CodeToDocs
codeToDocs는 TypeScript 프로젝트를 분석하고 사전 정의된 검색 기준에 따라 문서를 생성하는 커맨드라인 도구입니다. ts-morph를 사용하여 코드베이스를 스캔하고 특정 패턴이나 구조를 식별한 후, 이러한 발견 사항을 구조화된 마크다운 테이블로 정리합니다. 
## 현재 지원 범위
- CrashAnalyticService라는 코드를 기준으로 분석하고 있습니다. (기준 파일경로를 전달받을 수 있게 수정할 예정)

## 설치 방법
npm을 사용하여 패키지를 전역으로 설치합니다:

```bash
npm install -g code-to-docs
```
사용 방법
패키지를 실행하려면 TypeScript 프로젝트의 경로를 제공하고, 선택적으로 생성된 마크다운 파일의 출력 경로를 제공합니다:

```bash
ctd /path/to/project [/path/to/output.md]
```

출력 경로가 지정되지 않은 경우 기본값으로 analysisResults.md로 저장됩니다.
