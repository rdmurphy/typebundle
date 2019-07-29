#!/usr/bin/env node

// packages
import mri from 'mri';

// local
import { bundler } from '.';

const mriConfig = {
  boolean: ['compress'],
  default: {
    compress: false,
    output: 'dist',
  },
};

async function main(argv_: string[]) {
  const args = mri(argv_.slice(2), mriConfig);

  const input = args._[0];
  const outputDir = args.output;
  const compress = args.compress;
  const nodeTarget = args.target;
  const typesDir = args.types;

  await bundler({ compress, input, nodeTarget, outputDir, typesDir });
}

main(process.argv).catch(console.error);
