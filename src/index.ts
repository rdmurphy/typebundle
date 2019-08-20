// native
import { spawn } from 'child_process';
import { basename, parse, resolve } from 'path';

// packages
import babelPresetEnv from '@babel/preset-env';
import babelPresetTypescript from '@babel/preset-typescript';
import builtinModules from 'builtin-modules';
import { rollup, watch, OutputOptions, InputOptions } from 'rollup';
import babel from 'rollup-plugin-babel';
import commonjs from 'rollup-plugin-commonjs';
import json from 'rollup-plugin-json';
import nodeResolve from 'rollup-plugin-node-resolve';
import { terser } from 'rollup-plugin-terser';
import glob from 'tiny-glob';

// local
import { hashbangRegex, readFile } from './utils';

const extensions = ['.ts', '.js', '.mjs'];

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
          output: { comments: false },
          compress: {
            keep_infinity: true,
            pure_getters: true,
            passes: 10,
          },
          toplevel: true,
          warnings: true,
        }),
    ].filter(Boolean),
  };

  const inputFileName = parse(input).name;
  const bannerFn = () => banner;

  const paths = {};

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
  ];

  return { inputOptions, outputOptions };
}

function createTypes({ input, output }: { input: string; output: string }) {
  return new Promise((fulfill, reject) => {
    const child = spawn('tsc', [
      '--declaration',
      '--emitDeclarationOnly',
      '--allowSyntheticDefaultImports',
      '--declarationDir',
      output,
      input,
    ]);

    child.on('error', reject);
    child.on('exit', fulfill);
  });
}

interface BundlerOptions {
  compress: boolean;
  input: string;
  nodeTarget: string;
  outputDir: string;
  typesDir?: string;
  watchBuild?: boolean;
}

export async function bundler({
  compress,
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

  // loop thorugh the inputs, creating a rollup configuraion for each one
  for (let idx = 0; idx < inputs.length; idx++) {
    const input = inputs[idx];

    const externalDependencies = pkgDependencies.concat(
      inputs.filter(e => e !== input)
    );

    const options = await createRollupConfig({
      compress,
      externalDependencies,
      input,
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
        await createTypes({ input, output: typesDir });
      }
    }
  }
}
