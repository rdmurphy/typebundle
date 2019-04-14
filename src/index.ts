// native
import { parse, resolve } from 'path';

// packages
import babelPresetEnv from '@babel/preset-env';
import babelPresetTypescript from '@babel/preset-typescript';
import builtinModules from 'builtin-modules';
import { rollup, OutputOptions, InputOptions } from 'rollup';
import babel from 'rollup-plugin-babel';
import commonjs from 'rollup-plugin-commonjs';
import nodeResolve from 'rollup-plugin-node-resolve';
import { terser } from 'rollup-plugin-terser';
import glob from 'tiny-glob';

// local
import { hashbangRegex, readFile } from './utils';

const extensions = ['.ts', '.js', '.mjs'];

async function getConfig(cwd) {
  const pkg = await readFile(resolve(cwd, 'package.json'), 'utf8');

  return JSON.parse(pkg);
}

async function createRollupConfig({
  externalDependencies = [],
  input,
  outputDir,
}) {
  const external = externalDependencies.concat(builtinModules);

  let banner = '';

  const inputOptions: InputOptions = {
    input,
    external,
    plugins: [
      {
        name: 'hashbang-check',
        transform(code) {
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
      babel({
        babelrc: false,
        exclude: 'node_modules/**',
        extensions,
        presets: [
          [babelPresetEnv, { targets: { node: 8 } }],
          babelPresetTypescript,
        ],
      }),
      true &&
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

  const outputOptions: OutputOptions[] = [
    {
      banner: bannerFn,
      esModule: false,
      file: resolve(outputDir, `${inputFileName}.js`),
      format: 'commonjs',
      strict: false,
    },
    // {
    //   banner: bannerFn,
    //   esModule: false,
    //   file: resolve(outputDir, `${inputFileName}.mjs`),
    //   format: 'module',
    //   strict: false,
    // },
  ];

  return { inputOptions, outputOptions };
}

interface BundlerOptions {
  input: string;
  outputDir: string;
}

export async function bundler({ input, outputDir }: BundlerOptions) {
  const cwd = process.cwd();

  const pkg = await getConfig(cwd);

  const externalDependencies = Object.keys(pkg.dependencies || {});

  const inputs = await glob(input);

  for (let idx = 0; idx < inputs.length; idx++) {
    const input = inputs[idx];

    const { inputOptions, outputOptions } = await createRollupConfig({
      externalDependencies,
      input,
      outputDir,
    });

    const bundle = await rollup(inputOptions);

    for (let idx = 0; idx < outputOptions.length; idx++) {
      await bundle.write(outputOptions[idx]);
    }
  }
}
