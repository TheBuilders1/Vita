---
name: "Email Automator"
slug: "email-automator"
category: "Browser & Automation"
categorySlug: "browser-automation"
author: "comm-tools"
version: "2.1.0"
rating: 4.5
security: "verified"
license: "MIT"
install: "npx clawhub@latest install email-automator"
lastUpdated: "2026-02-15"
openclaw_spec: "1.0"
---

# Email Automator

> Send, receive, and process emails programmatically — templates, attachments, scheduling, and inbox monitoring.

**Security:** ✅ Verified by OpenClaw Security Team  
**Author:** comm-tools · **Version:** 2.1.0 · **Rating:** ⭐ 4.5/5  
**Last Updated:** 2026-02-15 · **License:** MIT

---

## Overview

Email Automator provides complete email automation. Send templated emails with dynamic content, schedule sends, process incoming emails with AI classification, extract attachments, and trigger workflows based on email content. Supports SMTP, Gmail API, Outlook API, and Resend.

---

## Quick Start

### 1. Install

```bash
npx clawhub@latest install email-automator
```

### 2. Verify Installation

```bash
openclaw skills list --installed | grep email-automator
openclaw skills info email-automator
```

### 3. Run

```bash
# Basic usage
openclaw run email-automator

# With custom config
openclaw run email-automator --config ./email-automator.config.json

# Piped input
echo "your input here" | openclaw run email-automator

# Verbose mode for debugging
openclaw run email-automator --verbose --log-level debug

# Dry run (validate without executing)
openclaw run email-automator --dry-run
```

---

## Configuration

Create `email-automator.config.json` in your project root:

```json
{
  "skill": "email-automator",
  "version": "2.1.0",
  "provider": "openai",
  "model": "gpt-4o",
  "temperature": 0.7,
  "max_tokens": 4096,
  "retry": {
    "attempts": 3,
    "backoff": "exponential"
  },
  "timeout": 30000,
  "logging": {
    "level": "info",
    "destination": "stdout"
  }
}
```

### Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `OPENCLAW_API_KEY` | Yes | Your OpenClaw API key |
| `OPENAI_API_KEY` | Conditional | Required if using OpenAI models |
| `ANTHROPIC_API_KEY` | Conditional | Required if using Claude models |
| `OPENCLAW_LOG_LEVEL` | No | Log level: debug, info, warn, error |

---

## Use Cases

### 1. Send automated follow-up emails

### 2. Process incoming emails and extract data

### 3. Build email-triggered workflow automations

### 4. Generate and send reports via email

---

## Compatibility

| Platform | Architecture | Status | Minimum Version |
|----------|-------------|--------|-----------------|
| macOS | arm64 / x86_64 | Full Support | 13.0+ |
| Linux | x86_64 / arm64 | Full Support | Ubuntu 22.04+ / Fedora 38+ |
| Windows (WSL 2) | x86_64 | Supported | WSL 2 + Ubuntu 22.04+ |

### Prerequisites

- **OpenClaw CLI** ≥ 1.0.0
- **Node.js** ≥ 18.0.0
- **npm** ≥ 9.0.0 or **bun** ≥ 1.0.0

---

## Tools & Permissions

This skill requests the following OpenClaw tool permissions during execution:

| Permission | Description | Risk Level |
|------------|-------------|------------|
| `system.run` | Execute shell commands in a sandboxed environment | medium |
| `file.read` | Read files from the agent workspace | low |
| `file.write` | Write or modify files in the agent workspace | medium |
| `web.search` | Search the web for real-time information | low |
| `web.fetch` | Fetch content from URLs | low |
| `llm.call` | Invoke LLM completions via configured providers | low |

You will be prompted to approve these permissions on first run. Use `--trust` to auto-approve for CI/CD.

---

## Changelog

### v2.1.0 — 2026-02-15

- Latest stable release
- Improved output formatting and reliability
- Enhanced error handling and retry logic
- Performance optimizations

---

## Troubleshooting

| Issue | Solution |
|-------|----------|
| `SKILL_NOT_FOUND` | Run `openclaw skills update` to refresh the registry |
| `PERMISSION_DENIED` | Ensure your API key has the required scopes |
| `TIMEOUT_ERROR` | Increase `timeout` in config or use `--timeout 60000` |
| `MODEL_UNAVAILABLE` | Check provider status or configure a fallback model |

---

## Uninstall

```bash
openclaw skills uninstall email-automator
```

---

## FAQ

**Q: Which email providers are supported?**

Gmail, Outlook/Office 365, Resend, SendGrid, Mailgun, and any SMTP server.

---

**Q: Can it process incoming emails?**

Yes — monitor inboxes, classify emails with AI, extract data, and trigger automated responses.

---

## Related Skills

- [`form-filler`](https://openclaw-skillshub.com/skills/browser-automation/form-filler/)
- [`pdf-generator`](https://openclaw-skillshub.com/skills/browser-automation/pdf-generator/)
- [`notification-hub`](https://openclaw-skillshub.com/skills/browser-automation/notification-hub/)

---

## Links

- **Registry:** https://openclaw-skillshub.com/skills/browser-automation/email-automator/
- **Issues:** https://github.com/openclaw-skills/email-automator/issues
- **OpenClaw Docs:** https://docs.openclaw.dev

---

*Generated by ClawSkills · openclaw_spec v1.0 · 2026-11-25*
