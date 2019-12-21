// native
import { basename, format, parse, resolve } from 'path';

// packages
import babelPresetEnv from '@babel/preset-env';
import babelPresetTypescript from '@babel/preset-typescript';
import builtinModules from 'builtin-modules';
import { outputFile, readFile } from 'fs-extra';
import { rollup, watch, OutputOptions, InputOptions } from 'rollup';
import babel from 'rollup-plugin-babel';
import commonjs from 'rollup-plugin-commonjs';
import dts from 'rollup-plugin-dts';
import json from 'rollup-plugin-json';
import nodeResolve from 'rollup-plugin-node-resolve';
import { terser } from 'rollup-plugin-terser';
import glob from 'tiny-glob';

const extensions = ['.ts', '.js', '.mjs'];
const hashbangRegex = /^#!(.*)/;

async function getConfig(cwd: string) {
  const pkg = await readFile(resolve(cwd, 'package.json'), 'utf8');

  return JSON.parse(pkg);
}

interface createRollupConfigOptions {
  compress?: boolean;
  externalDependencies?: string[];
  input: string;
  nodeTarget?: string;
  withMultipleInputs: boolean;
  outputDir: string;
  pkgMain: string;
}

async function createRollupConfig({
  compress = true,
  esm = false,
  externalDependencies = [],
  input,
  nodeTarget = 'current',
  withMultipleInputs,
  outputDir,
  pkgMain,
}: createRollupConfigOptions) {
  const external = externalDependencies.concat(builtinModules);

  let banner = '';

  const externalTest = new RegExp(`^(${external.join('|')})($|/)`);

  const inputOptions: InputOptions = {
    input,
    external: id => {
      // a special case for when we are importing a local index
      if (withMultipleInputs && id === '.') {
        return true;
      }

      // otherwise do what you'd normally expect for exclusion
      return externalTest.test(id);
    },
    plugins: [
      {
        name: 'hashbang-check',
        transform(code: string) {
          const match = code.match(hashbangRegex);

          if (match != null) {
            banner = match[0];
            code = code.replace(hashbangRegex, '');
          }

          return {
            code,
            map: null,
          };
        },
      },
      nodeResolve({ extensions }),
      commonjs(),
      json(),
      babel({
        babelrc: false,
        exclude: 'node_modules/**',
        extensions,
        presets: [
          [babelPresetEnv, { targets: { node: nodeTarget } }],
          babelPresetTypescript,
        ],
      }),
      compress &&
        terser({
          compress: {
            keep_infinity: true,
            pure_getters: true,
            passes: 10,
          },
          ecma: 8,
          output: { comments: false },
          toplevel: true,
          warnings: true,
        }),
    ].filter(Boolean),
  };

  const inputFileName = parse(input).name;
  const bannerFn = () => banner;

  const paths = {} as { [key: string]: string };

  if (pkgMain) {
    paths['.'] = `./${basename(pkgMain)}`;
  }

  const outputOptions: OutputOptions[] = [
    {
      banner: bannerFn,
      esModule: false,
      file: resolve(outputDir, `${inputFileName}.js`),
      format: 'cjs',
      paths,
      strict: false,
    },
    esm && {
      banner: bannerFn,
      esModule: false,
      file: resolve(outputDir, `${inputFileName}.mjs`),
      format: 'esm',
      paths,
      strict: false,
    },
  ].filter(Boolean);

  return { inputOptions, outputOptions };
}

function dtsOnWarn(warning: { code: string; message: string }) {
  if (warning.code === 'EMPTY_BUNDLE') return;

  console.error(warning.message);
}

async function createTypes({
  input,
  outputDir,
}: {
  input: string;
  outputDir: string;
}) {
  // build our Rollup input options for rollup-plugin-dts
  const inputOptions = {
    input,
    plugins: [dts()],
    onwarn: dtsOnWarn,
  };

  // generate our bundle
  const bundle = await rollup(inputOptions);

  // pull out the name of the input file
  const { name } = parse(input);

  // build our Rollup output options
  const outputOptions = {
    file: resolve(outputDir, format({ name, ext: '.d.ts' })),
    format: 'esm',
  };

  // generate our .d.ts file
  const results = await bundle.generate(outputOptions);

  // we have only a single output
  const output = results.output[0];

  // output file name
  const fileName = resolve(outputDir, output.fileName);

  // grab the raw code output
  const { code } = output;

  // if the code empty, we export an empty module, otherwise just save it out
  await outputFile(fileName, code.trim().length ? code : 'export {};\n');
}

interface BundlerOptions {
  compress: boolean;
  esm: boolean;
  input: string;
  nodeTarget: string;
  outputDir: string;
  typesDir?: string;
  watchBuild?: boolean;
}

export async function bundler({
  compress,
  esm,
  input,
  nodeTarget,
  outputDir,
  typesDir,
  watchBuild,
}: BundlerOptions) {
  // the current working directory
  const cwd = process.cwd();

  // if a custom typesDir was not passed, use outputDir
  typesDir = typesDir || outputDir;

  // get the contents of package.json
  const pkg = await getConfig(cwd);

  // pull out all of the dependencies to flag externals
  const pkgDependencies = Object.keys(pkg.dependencies || {});

  // find all the input TypeScript files
  const inputs = await glob(input);

  // if we have more than one input, flag this as a multi-input run
  const withMultipleInputs = inputs.length > 1;

  const runs = [];

  // loop through the inputs, creating a rollup configuration for each one
  for (let idx = 0; idx < inputs.length; idx++) {
    const entry = inputs[idx];

    const externalDependencies = pkgDependencies.concat(
      inputs.filter(e => e !== entry)
    );

    const options = await createRollupConfig({
      compress,
      esm,
      externalDependencies,
      input: entry,
      nodeTarget,
      withMultipleInputs,
      outputDir,
      pkgMain: pkg.main,
    });

    runs.push(options);
  }

  for (const { inputOptions, outputOptions } of runs) {
    if (watchBuild) {
      const watcher = watch(
        Object.assign(
          {
            output: outputOptions,
            watch: {
              exclude: 'node_modules/**',
            },
          },
          inputOptions
        )
      );

      watcher.on('event', ({ code, error }) => {
        switch (code) {
          case 'FATAL':
            throw new Error(error);
          case 'ERROR':
            console.error(error);
            break;
          case 'END':
            console.log(`Successful build. (${inputOptions.input})`);
            break;
        }
      });
    } else {
      const bundle = await rollup(inputOptions);

      for (let idx = 0; idx < outputOptions.length; idx++) {
        const output = outputOptions[idx];

        await bundle.write(output);
        await createTypes({
          input: inputOptions.input as string,
          outputDir: typesDir,
        });
      }
    }
  }
}
