#!/usr/bin/env node

// packages
import mri from 'mri';

// local
import { bundler } from '.';

const mriConfig = {
  boolean: ['compress', 'esm'],
  default: {
    compress: false,
    output: 'dist',
    watch: false,
  },
  string: ['external'],
};

async function main(argv_: string[]) {
  const args = mri(argv_.slice(2), mriConfig);

  const input = args._[0];

  const compress = args.compress;

  let external;

  if (args.external) {
    external = Array.isArray(args.external) ? args.external : [args.external];
  }

  const nodeTarget = args.target;
  const outputDir = args.output;
  const typesDir = args.types;
  const watchBuild = args.watch;

  await bundler({
    compress,
    external,
    input,
    nodeTarget,
    outputDir,
    typesDir,
    watchBuild,
  });
}

main(process.argv).catch(console.error);
