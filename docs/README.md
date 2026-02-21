# OMCM Documentation / OMCM 문서

## 한국어 문서 (Korean)
- [아키텍처](ko/ARCHITECTURE.md)
- [기능 가이드](ko/FEATURES.md)
- [설치 가이드](ko/INSTALLATION.md)
- [설정 가이드](ko/CONFIGURATION.md)
- [퓨전 가이드](ko/FUSION-GUIDE.md)
- [API 레퍼런스](ko/API-REFERENCE.md)
- [스킬 레퍼런스](ko/SKILLS-REFERENCE.md)
- [문제 해결](ko/TROUBLESHOOTING.md)

## English Documentation
- [Architecture](en/ARCHITECTURE.md)
- [Features Guide](en/FEATURES.md)
- [Installation Guide](en/INSTALLATION.md)
- [Configuration Guide](en/CONFIGURATION.md)
- [Fusion Guide](en/FUSION-GUIDE.md)
- [API Reference](en/API-REFERENCE.md)
- [Skills Reference](en/SKILLS-REFERENCE.md)
- [Troubleshooting](en/TROUBLESHOOTING.md)

## Quick Links
- [README](../README.md) - Project overview
- [CHANGELOG](../CHANGELOG.md) - Version history
- [LICENSE](../LICENSE) - MIT License

## OMC 4.2.15 Compatibility Quick Check

```bash
# 호환성 점검 (strict)
node scripts/check-omc-compat.mjs --source /tmp/omc_429_clone --strict

# 누락 항목 자동 동기화
node scripts/sync-omc-compat.mjs --source /tmp/omc_429_clone
```

- 검수 대상: agents / skills / commands / hooks
- 핵심 리네임 호환: `sciomc`, `omc-help`, `omc-doctor`
