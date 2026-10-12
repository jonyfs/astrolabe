# Changelog

All notable changes to this project are documented here. The format follows
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and this project releases from
tags `vX.Y.Z` equal to `plugin.json`'s `version`.

## [Unreleased]

## [0.121.0] - 2026-10-12

### Added

- Performance benchmark suite (`npm run benchmark`) with baseline comparison, a regression
  threshold and a PR comment with the per-metric table, run by CI on every pull request.
- README image generation (`npm run generate-images`) rendering the `docs/diagrams/`
  sources to `docs/images/` (PNG, SVG, WebP) with a manifest so only changed images rebuild;
  CI commits the results with `[skip ci]`.
- Desktop app captures (`npm run capture`): Playwright-driven screenshots and videos of the
  views declared in `config/capture-views.json`, uploaded weekly by the capture workflow.
- Generated privacy policy (`npm run generate-privacy`): `docs/privacy.md` is produced from
  `config/privacy.config.json` and validated against the declared jurisdictions.
- Marketplace plugin assets (`npm run build-assets`): the sources in `docs/assets/source/`
  are resized to every marketplace specification under `docs/assets/marketplace/`, with
  validation.
- Load test (`npm run load-test`): hundreds of synthetic Spec Kit features with a tunable
  simple/medium/complex distribution, per-feature timeout and memory limit, run weekly with
  the report kept for 90 days.
