# Typebundle

Zero-config Node.js library bundler with support for Babel-transpiled TypeScript. A work in progress! Outputs both compiled JavaScript and valid TypeScript `d.ts` files.

## Installation

```sh
npm i -D typebundle
```

## Usage

```sh
typebundle <input> [--options]
```

Typebundle's primary interface is on the command line. The only required positional argument is `<input>`, which tells `typebundle` which files to consider entry points. Any glob that's compatible with `tiny-glob` is valid and switches `typebundle` into multi-entry mode if it finds multiple files.

#### A single source file

```sh
typebundle src/index.ts --output dist --target 10
```

#### Multiple source files

```sh
typebundle "src/{cli,index}.ts" --output dist --target 10
```

#### Run in watch mode

```sh
typebundle src/index.ts --output dist --target 10 --watch
```

## Options

```
--output      The output directory, defaults to "dist"

--compress    If passed, "terser" will be used to minify the output

--target      The optional minimum version of Node.js to target for
              transpiling, this is passed directly to "@babel/preset-env" at
              "targets.node". To target the current version of Node, pass
              "current". If not provided no code will run through
              "@babel/preset-env" and only types will be stripped.

--types       The directory where "d.ts" files are output, defaults to where
              --output is set

--watch       Watches source files for changes and re-builds, does not output
              "d.ts" files for speed
```

## License

MIT
