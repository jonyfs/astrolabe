# Contract: scripts/check-release-version.sh

```text
scripts/check-release-version.sh v0.6.0   # exit 0: "release v0.6.0 matches plugin.json"
scripts/check-release-version.sh v0.6.1   # exit 1: "tag v0.6.1 does not match plugin.json version 0.6.0"
scripts/check-release-version.sh 0.6.0    # exit 1: "tag 0.6.0 is not vX.Y.Z"
```
