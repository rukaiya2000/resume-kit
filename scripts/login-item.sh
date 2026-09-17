#!/usr/bin/env bash
# Run Resume Creator (`pnpm start`, http://127.0.0.1:8790) at login as a macOS LaunchAgent.
#   bash scripts/login-item.sh install | remove | status
#
# The project lives in ~/Documents, which macOS protects from background processes. Give the Node binary
# this prints Full Disk Access (System Settings → Privacy & Security → Full Disk Access); `install` opens that pane.
set -euo pipefail

LABEL="com.resume-creator.app"
PLIST="$HOME/Library/LaunchAgents/$LABEL.plist"
LOG="$HOME/Library/Logs/resume-creator.log"
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
DOMAIN="gui/$(id -u)"
realpath() { python3 -c 'import os,sys; print(os.path.realpath(sys.argv[1]))' "$1"; }

case "${1:-}" in
  install)
    command -v node >/dev/null && command -v pnpm >/dev/null || { echo "node and pnpm must be on PATH"; exit 1; }
    command -v uv >/dev/null || echo "warning: uv not found; Re-score in the app won't work"
    # Run the real binaries directly: Full Disk Access is granted to a file path, not to a symlink or shim.
    NODE="$(realpath "$(command -v node)")"
    PNPM_JS="$(realpath "$(command -v pnpm)")"
    mkdir -p "$(dirname "$PLIST")" "$(dirname "$LOG")"
    cat >"$PLIST" <<PLIST
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>Label</key><string>$LABEL</string>
  <key>WorkingDirectory</key><string>$ROOT</string>
  <key>ProgramArguments</key>
  <array><string>$NODE</string><string>$PNPM_JS</string><string>start</string></array>
  <key>EnvironmentVariables</key>
  <dict><key>PATH</key><string>$PATH</string></dict>
  <key>RunAtLoad</key><true/>
  <key>KeepAlive</key><dict><key>SuccessfulExit</key><false/></dict>
  <key>ThrottleInterval</key><integer>30</integer>
  <key>StandardOutPath</key><string>$LOG</string>
  <key>StandardErrorPath</key><string>$LOG</string>
</dict>
</plist>
PLIST
    launchctl bootout "$DOMAIN/$LABEL" 2>/dev/null || true
    : >"$LOG"
    launchctl bootstrap "$DOMAIN" "$PLIST"
    printf '%s' "$NODE" | pbcopy
    echo "Installed: http://127.0.0.1:8790 at login (log: $LOG)"
    echo
    echo "One-time step: give this Node binary Full Disk Access (path copied to the clipboard):"
    echo "  $NODE"
    echo "  System Settings → Privacy & Security → Full Disk Access → + → ⇧⌘G, paste, Open, switch it on."
    echo "It retries every 30 s, so it starts by itself once access is granted."
    echo "If you change Node versions later, run this install again and grant the new path."
    open "x-apple.systempreferences:com.apple.settings.PrivacySecurity.extension?Privacy_AllFiles" 2>/dev/null || true
    ;;
  remove)
    launchctl bootout "$DOMAIN/$LABEL" 2>/dev/null || true
    rm -f "$PLIST"
    echo "Removed the login item."
    ;;
  status)
    if ! launchctl print "$DOMAIN/$LABEL" >/dev/null 2>&1; then echo "Not installed."; exit 0; fi
    if curl -sf http://127.0.0.1:8790/api/info >/dev/null; then
      echo "Running: http://127.0.0.1:8790"
    elif grep -q "EPERM" "$LOG" 2>/dev/null; then
      echo "Blocked by macOS privacy: grant Full Disk Access to $(realpath "$(command -v node)") (see install output)."
    else
      echo "Installed, starting (or failing). Last log lines:"; tail -5 "$LOG" 2>/dev/null || true
    fi
    ;;
  *)
    echo "usage: bash scripts/login-item.sh install | remove | status"; exit 2
    ;;
esac
