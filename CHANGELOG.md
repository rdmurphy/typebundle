# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [0.5.1] - 2019-09-19

## Fixed

- Fixed output of TypeScript types with multi-entry inputs.

## [0.5.0] - 2019-08-19

### Added

- Added support for watch mode. Can be activated by passing the `--watch` in the command. When this mode is activated type declaration is _skipped_.

## [0.4.0] - 2019-08-19

### Added

- Added support for importing `.json` files with `rollup-plugin-json`.

## [0.3.0] - 2019-07-29

### Added

- Typescript declaration files (`.d.ts`) are now automatically generated as part of the bundle.

## [0.2.0] - 2019-07-27

### Fixed

- No longer required to provide a "main" field in your `package.json`. This is still messy but at least works well enough for a single entrypoint.

### Changed

- Loosened up `typescript` dependency to `^3`.
- Internally now tracks whether multiple entrypoints are passed to simplify some code.

## [0.1.0] - 2019-07-27

### Added

- Initial release
