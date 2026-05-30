# Errors

## [ERR-20260529-001] explore_agent_model_provider

**Logged**: 2026-05-29T14:49:00Z
**Priority**: medium
**Status**: pending
**Area**: infra

### Summary
Explore subagent failed because its configured model provider was unavailable.

### Error
```
API Error: 502 unknown provider for model claude-haiku-4-5-20251001
```

### Context
- Operation attempted: delegated read-only repository route search with `subagent_type=Explore`.
- Task: locate pickup-related endpoints and sub2api implementation.
- Environment: Claude Code session in `/Users/luxoee/workspace/github/xy_daily`.

### Suggested Fix
Retry later or override to a currently available model; continue with direct read-only searches when the agent backend is unavailable.

### Metadata
- Reproducible: unknown
- Related Files: none

---

## [ERR-20260529-002] fish_path_variable_collision

**Logged**: 2026-05-29T14:49:00Z
**Priority**: low
**Status**: pending
**Area**: infra

### Summary
A fish shell loop used `path` as a variable name, which shadowed fish's PATH variable and made commands unavailable.

### Error
```
(eval):1: command not found: curl
(eval):1: command not found: python3
```

### Context
- Operation attempted: curated HTTP endpoint probe loop.
- Shell: `/usr/local/bin/fish`.
- Cause: `for path in ...` in fish collides with the special `$path` array backing PATH.

### Suggested Fix
Avoid `path` as a variable name in fish shell scripts; use names like `endpoint` instead.

### Metadata
- Reproducible: yes
- Related Files: none

---

## [ERR-20260530-001] wrangler_pages_dev_functions_flag

**Logged**: 2026-05-30T06:21:00Z
**Priority**: low
**Status**: resolved
**Area**: infra

### Summary
Current Wrangler rejected the older `wrangler pages dev --functions functions` option.

### Error
```
Unknown argument: functions
```

### Context
- Operation attempted: local Cloudflare Pages runtime smoke test.
- Command: `npx wrangler pages dev dist --functions functions --compatibility-date=2026-05-30 --port 8788`.
- Environment: Wrangler installed from `latest` in this project.

### Suggested Fix
Use `wrangler pages dev dist --compatibility-date=2026-05-30`; Wrangler auto-detects the project `functions/` directory from the current working directory.

### Metadata
- Reproducible: yes
- Related Files: package.json

### Resolution
- **Resolved**: 2026-05-30T06:22:00Z
- **Notes**: Updated `pages:dev` script and verified `/`, `/gen/`, `/api/time`, and `/generator.html` redirect locally.

---
