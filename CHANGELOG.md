# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [0.7.0] - 2019-01-26

### Added

- Terser is now told to compress and output with `ES2017` in mind. This seems like a safe level to be at because Node v10 supports nearly all features up to `ES2017`.

### Fixed

- Thanks to an update to `rollup-plugin-dts`, type generation in scenarios where there are local declaration files works again.

### Changed

- The new monorepo versions of the Rollup plugins have been swapped in.
- `typebundle` is now building itself with a `nodeTarget` of `10`.

## [0.6.0] - 2019-10-04

### Changed

- Type declarations are now generated using `rollup` and `rollup-plugin-dts`, meaning our generated types also get tree-shaking and are converted into a single file.

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
