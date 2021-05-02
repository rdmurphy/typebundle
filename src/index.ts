// native
import { promises as fs } from 'fs';
import { basename, dirname, format, parse, resolve } from 'path';

// packages
import builtinModules from 'builtin-modules';
import { rollup, watch } from 'rollup';
import commonjs from '@rollup/plugin-commonjs';
import dts from 'rollup-plugin-dts';
import json from '@rollup/plugin-json';
import nodeResolve from '@rollup/plugin-node-resolve';
import glob from 'tiny-glob';

// local
import { esbuildPlugin } from './plugins/esbuild';
import { terserPlugin } from './plugins/terser';

// types
import type { TransformOptions } from 'esbuild';
import type {
  OutputOptions,
  InputOptions,
  RollupWarning,
  RollupWatchOptions,
} from 'rollup';

const extensions = ['.ts', '.js', '.mjs', '.cjs'];
const hashbangRegex = /^#!(.*)/;

async function outputFile(filepath: string, data: any) {
  // determine the directory
  const dir = dirname(filepath);

  // make sure the directory exists
  await fs.mkdir(dir, { recursive: true });

  // write the file
  await fs.writeFile(filepath, data);
}

async function getConfig(cwd: string) {
  const pkg = await fs.readFile(resolve(cwd, 'package.json'), 'utf8');

  return JSON.parse(pkg);
}

interface createRollupConfigOptions {
  compress?: boolean;
  externalDependencies?: string[];
  input: string;
  target?: TransformOptions['target'];
  withMultipleInputs: boolean;
  outputDir: string;
  pkgMain: string;
}

async function createRollupConfig({
  compress = true,
  externalDependencies = [],
  input,
  target,
  withMultipleInputs,
  outputDir,
  pkgMain,
}: createRollupConfigOptions) {
  const external = externalDependencies.concat(builtinModules);

  let banner = '';

  const externalTest = new RegExp(`^(${external.join('|')})($|/)`);

  const inputOptions: InputOptions = {
    input,
    external: (id) => {
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
      esbuildPlugin({ target }),
      json(),
      commonjs(),
      compress ? terserPlugin() : undefined,
    ].filter(Boolean) as Plugin[],
    onwarn(warning, warningHandler) {
      if (warning.code === 'CIRCULAR_DEPENDENCY') {
        return;
      }

      warningHandler(warning);
    },
  };

  const inputFileName = parse(input).name;
  const bannerFn = () => banner;

  const paths = {} as Record<string, string>;

  if (pkgMain) {
    paths['.'] = `./${basename(pkgMain)}`;
  }

  const outputOptions: OutputOptions[] = [
    {
      banner: bannerFn,
      esModule: false,
      exports: 'auto',
      file: resolve(outputDir, `${inputFileName}.js`),
      format: 'cjs' as const,
      paths,
      strict: false,
    },
  ];

  return { inputOptions, outputOptions };
}

function dtsOnWarn(warning: RollupWarning) {
  if (warning.code === 'EMPTY_BUNDLE') return;

  console.error(warning.message);
}

async function createTypes({
  input,
  externalDependencies = [],
  outputDir,
}: {
  input: string;
  externalDependencies: string[];
  outputDir: string;
}) {
  // build our Rollup input options for rollup-plugin-dts
  const inputOptions: InputOptions = {
    input,
    external: externalDependencies.concat(builtinModules),
    plugins: [dts({ respectExternal: true })],
    onwarn: dtsOnWarn,
  };

  // generate our bundle
  const bundle = await rollup(inputOptions);

  // pull out the name of the input file
  const { name } = parse(input);

  // build our Rollup output options
  const outputOptions: OutputOptions = {
    file: resolve(outputDir, format({ name, ext: '.d.ts' })),
    format: 'esm',
  };

  // generate our .d.ts file
  const results = await bundle.generate(outputOptions);

  // close out our bundle
  await bundle.close();

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
  external?: string[];
  input: string;
  target?: TransformOptions['target'];
  outputDir: string;
  typesDir?: string;
  watchBuild?: boolean;
}

export async function bundler({
  compress,
  external = [],
  input,
  target,
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
  const pkgDependencies = [
    ...Object.keys(pkg.dependencies || {}),
    ...Object.keys(pkg.peerDependencies || {}),
  ];

  // find all the input TypeScript files
  const inputs = await glob(input);

  // if we have more than one input, flag this as a multi-input run
  const withMultipleInputs = inputs.length > 1;

  const runs = [];

  // loop through the inputs, creating a rollup configuration for each one
  for (let idx = 0; idx < inputs.length; idx++) {
    const entry = inputs[idx];

    const externalDependencies = pkgDependencies.concat(
      inputs.filter((e) => e !== entry),
      external
    );

    const options = await createRollupConfig({
      compress,
      externalDependencies,
      input: entry,
      target,
      withMultipleInputs,
      outputDir,
      pkgMain: pkg.main,
    });

    runs.push(options);
  }

  for (const { inputOptions, outputOptions } of runs) {
    if (watchBuild) {
      const watchOptions: RollupWatchOptions[] = [
        {
          output: outputOptions,
          watch: {
            exclude: 'node_modules/**',
          },
          ...inputOptions,
        },
      ];

      const watcher = watch(watchOptions);

      watcher.on('event', (event) => {
        switch (event.code) {
          case 'ERROR':
            throw event.error;
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
          externalDependencies: pkgDependencies,
          outputDir: typesDir,
        });
      }

      await bundle.close();
    }
  }
}
