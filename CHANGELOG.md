# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## Fixed

- No longer required to provide a "main" field in your `package.json`. This is still messy but at least works well enough for a single entrypoint.

### Changed

- Loosened up `typescript` dependency to `^3`.
- Internally now tracks whether multiple entrypoints are passed to simplify some code.

## [0.1.0] - 2019-07-27

### Added

- Initial release
