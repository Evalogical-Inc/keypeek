# Security policy

keypeek handles sensitive data by design, so the bar is strict.

## What counts as a security bug
- Any path where a full secret is printed, logged, written or sent anywhere.
- Any write, move or delete of user files (keypeek is read-only).
- Any network access.
- Path handling that lets a scan escape its roots (e.g. following symlinks).

## Reporting
Use GitHub's private "Report a vulnerability" (Security tab). Do not open a public issue and **do not include real secrets** in a report; the rule name, surface and a fake sample are enough.

Expect an acknowledgement within a few days. Fixes ship as a patch release with a note in the changelog.

## Not a security bug
Missed secrets and false positives are detection-quality issues: open a normal issue with the rule name and a fake example.
