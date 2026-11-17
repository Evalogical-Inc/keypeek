#!/usr/bin/env bash
# Builds a throwaway home folder with FAKE keys for the README demo. Never touches your real home.
# Usage: scripts/demo-home.sh /tmp/keypeek-demo-home
set -euo pipefail
H="${1:?usage: demo-home.sh <dir>}"
rm -rf "$H" && mkdir -p "$H/.claude/projects/shop-api" "$H/work/shop-api" "$H/work/blog"

# Fake keys are assembled at runtime so no secret-looking literal is committed.
body="aB3dE5fG7hJ9kL1mN3pQ5rS7tU9vW1xY"
printf 'OPENAI_API_KEY=%s\nSTRIPE_SECRET_KEY=%s\nDATABASE_URL=postgres://localhost/shop\n' "sk-${body}Zz" "sk_live_${body}" > "$H/work/shop-api/.env"
printf 'JWT_SECRET=Xk9mQ2vLp7RtZ4wBn8s3\n' > "$H/work/blog/.env"
line="{\"role\":\"user\",\"text\":\"here is my key sk-ant-${body}\"}"
printf '%s\n%s\n%s\n' "$line" "$line" "$line" > "$H/.claude/projects/shop-api/session.jsonl"
printf ': 1700000000:0;export AWS_ACCESS_KEY_ID=AKIA%s\n' "ABCDEFGHIJKLMNOP" > "$H/.zsh_history"
echo "demo home ready: $H"
