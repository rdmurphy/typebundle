# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Changed

- Updated dependencies, including bumping TypeScript to `^4.0.0`.
- The default value of `--target` is now unset (previously `current`), meaning when this option is not passed `@babel/preset-env` is not used _at all_. It is now **optional** for the code to be transpiled (**except** for class properties for TypeScript compatibility). Users should only opt-in (by passing `--target`) when they know for certain code they are writing is not compatible with versions of Node they are targeting and would like `@babel/preset-env` to handle it. Otherwise Babel is primarily being used to strip types.
- `rollup-plugin-terser`'s options have been updated to match the new types, and the default `ecma` option is now `2019`.

## [0.11.0] - 2020-05-08

### Fixed

- `rollup-plugin-dts` needs to be told to ignore built-in modules so it doesn't throw a warning when it comes across one. I don't think this was actually breaking anything, but no noise is the best noise.

## [0.10.0] - 2020-05-08

### Changed

- `rollup-plugin-babel` has been migrated to its new namespaced version `@rollup/plugin-babel` to squash a warning.
- Other dependency updates.

## [0.9.0] - 2020-03-28

### Added

- Added Babel support for the class properties proposal with `@babel/plugin-proposal-class-properties` in `loose` mode.
- Added the `--external` parameter to the CLI, which makes it possible to pass additional external dependencies to not bundle. This will get passed to a precompiled regular expression so partial matches are permitted. Typically not needed, but a helpful escape hatch if you have nested dependencies causing circular dependencies or errors (which Typebundle **itself** was suffering from).

### Changed

- Updated to features available in TypeScript 3.8. Your mileage may vary with lesser versions.

### Fixed

- The addition of class properties means Typebundle no longer crashes when class properties (without TypeScript 3.8's `declare`) are used.

## [0.8.0] - 2020-03-27

### Changed

- Updated Babel, Rollup and TypeScript dependencies to take advantaged of latest features.

### Removed

- The `fs-extra` library has been removed and replaced by native functions.

## [0.7.0] - 2020-01-26

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

- TypeScript declaration files (`.d.ts`) are now automatically generated as part of the bundle.

## [0.2.0] - 2019-07-27

### Fixed

- No longer required to provide a "main" field in your `package.json`. This is still messy but at least works well enough for a single entrypoint.

### Changed

- Loosened up `typescript` dependency to `^3`.
- Internally now tracks whether multiple entrypoints are passed to simplify some code.

## [0.1.0] - 2019-07-27

### Added

- Initial release
