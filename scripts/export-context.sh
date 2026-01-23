#!/bin/bash
# export-context.sh - 작업 컨텍스트 내보내기
#
# 현재 작업 상태를 마크다운 파일로 내보내기
# Node.js 유틸리티를 사용하여 상세 컨텍스트 생성

set -e

# =============================================================================
# 설정
# =============================================================================

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PLUGIN_ROOT="$(dirname "$SCRIPT_DIR")"
PROJECT_DIR="${1:-$(pwd)}"

# =============================================================================
# Node.js 유틸리티 실행
# =============================================================================

export_context() {
    node -e "
const { saveContext } = require('${PLUGIN_ROOT}/src/utils/context.mjs');

const projectDir = process.argv[1] || process.cwd();

try {
    const contextFile = saveContext(projectDir);
    console.log('컨텍스트 저장됨: ' + contextFile);
} catch (e) {
    console.error('컨텍스트 저장 실패:', e.message);
    process.exit(1);
}
" "$PROJECT_DIR" 2>/dev/null || {
    # ESM 모듈인 경우
    node --experimental-specifier-resolution=node -e "
import { saveContext } from '${PLUGIN_ROOT}/src/utils/context.mjs';

const projectDir = process.argv[1] || process.cwd();

try {
    const contextFile = saveContext(projectDir);
    console.log('컨텍스트 저장됨: ' + contextFile);
} catch (e) {
    console.error('컨텍스트 저장 실패:', e.message);
    process.exit(1);
}
" "$PROJECT_DIR"
}
}

# =============================================================================
# 대체 구현 (Node.js 실패 시)
# =============================================================================

export_context_fallback() {
    local handoff_dir="${PROJECT_DIR}/.omc/handoff"
    mkdir -p "$handoff_dir"

    local context_file="${handoff_dir}/context.md"
    local timestamp=$(date -Iseconds 2>/dev/null || date +%Y-%m-%dT%H:%M:%S%z)

    # HUD 캐시에서 사용량 읽기
    local hud_cache="$HOME/.claude/plugins/oh-my-claudecode/.usage-cache.json"
    local usage="N/A"

    if [[ -f "$hud_cache" ]]; then
        local five_hour=$(grep -oP '"fiveHourPercent"\s*:\s*\K[0-9]+' "$hud_cache" 2>/dev/null || \
                         grep -o '"fiveHourPercent"[[:space:]]*:[[:space:]]*[0-9]*' "$hud_cache" | grep -o '[0-9]*$' 2>/dev/null || echo "")
        local weekly=$(grep -oP '"weeklyPercent"\s*:\s*\K[0-9]+' "$hud_cache" 2>/dev/null || \
                      grep -o '"weeklyPercent"[[:space:]]*:[[:space:]]*[0-9]*' "$hud_cache" | grep -o '[0-9]*$' 2>/dev/null || echo "")

        if [[ -n "$five_hour" && -n "$weekly" ]]; then
            usage="5시간: ${five_hour}%, 주간: ${weekly}%"
        fi
    fi

    # Git 정보
    local git_info=""
    if [[ -d "${PROJECT_DIR}/.git" ]]; then
        local diff_stat=$(cd "$PROJECT_DIR" && git diff --stat HEAD~3..HEAD 2>/dev/null | head -20 || echo "(최근 커밋 없음)")
        local status=$(cd "$PROJECT_DIR" && git status --short 2>/dev/null | head -10 || echo "")

        git_info="### 최근 커밋 변경 파일
\`\`\`
${diff_stat}
\`\`\`"

        if [[ -n "$status" ]]; then
            git_info="${git_info}

### 현재 변경 중인 파일
\`\`\`
${status}
\`\`\`"
        fi
    else
        git_info="(Git 저장소가 아님)"
    fi

    # TODO 파일 확인
    local todos="(TODO 항목 없음)"
    if [[ -f "${PROJECT_DIR}/TODO.md" ]]; then
        todos=$(head -50 "${PROJECT_DIR}/TODO.md")
    fi

    # 컨텍스트 파일 생성
    cat > "$context_file" << EOF
# 작업 핸드오프 컨텍스트

> Claude Code에서 OpenCode로 전환됨
> 생성 시간: ${timestamp}

---

## 세션 정보

| 항목 | 값 |
|------|-----|
| 프로젝트 경로 | \`${PROJECT_DIR}\` |
| 시간 | ${timestamp} |
| 사용량 | ${usage} |

---

## 현재 작업

(boulder.json에서 작업 정보를 불러올 수 없음)

---

## 미완료 TODO

${todos}

---

## 최근 수정 파일

${git_info}

---

## 다음 단계 지시

위의 컨텍스트를 바탕으로 작업을 이어서 진행해주세요.

1. 먼저 "미완료 TODO" 섹션의 항목들을 확인하세요
2. "최근 수정 파일"을 참고하여 작업 흐름을 파악하세요
3. 작업을 이어서 진행하세요
EOF

    echo "컨텍스트 저장됨: ${context_file}"

    # 핸드오프 기록 저장
    cat > "${handoff_dir}/last-handoff.json" << EOF
{
  "timestamp": "${timestamp}",
  "project": "${PROJECT_DIR}",
  "context_file": "${context_file}",
  "usage": "${usage}"
}
EOF
}

# =============================================================================
# 메인
# =============================================================================

main() {
    echo "컨텍스트 내보내기: ${PROJECT_DIR}"

    # Node.js 유틸리티 시도, 실패 시 bash 대체 구현 사용
    export_context 2>/dev/null || export_context_fallback
}

main "$@"
