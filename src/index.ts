// native
import { basename, parse, resolve } from 'path';

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

async function getConfig(cwd: string) {
  const pkg = await readFile(resolve(cwd, 'package.json'), 'utf8');

  return JSON.parse(pkg);
}

interface createRollupConfigOptions {
  compress?: boolean;
  externalDependencies?: string[];
  input: string;
  nodeTarget?: string;
  outputDir: string;
  pkgMain: string;
}

async function createRollupConfig({
  compress = true,
  externalDependencies = [],
  input,
  nodeTarget = 'current',
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
      if (id === '.') {
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

  const paths = {
    '.': `./${basename(pkgMain)}`,
  };

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

interface BundlerOptions {
  compress: boolean;
  input: string;
  nodeTarget: string;
  outputDir: string;
}

export async function bundler({
  compress,
  input,
  nodeTarget,
  outputDir,
}: BundlerOptions) {
  const cwd = process.cwd();

  const pkg = await getConfig(cwd);

  const pkgDependencies = Object.keys(pkg.dependencies || {});

  const inputs = await glob(input, { absolute: true });

  for (let idx = 0; idx < inputs.length; idx++) {
    const input = inputs[idx];

    const externalDependencies = pkgDependencies.concat(
      inputs.filter(e => e !== input)
    );

    const { inputOptions, outputOptions } = await createRollupConfig({
      compress,
      externalDependencies,
      input,
      nodeTarget,
      outputDir,
      pkgMain: pkg.main,
    });

    const bundle = await rollup(inputOptions);

    for (let idx = 0; idx < outputOptions.length; idx++) {
      await bundle.write(outputOptions[idx]);
    }
  }
}
