#!/usr/bin/env node

import { bundler } from './';

async function main(argv_) {
  const input = argv_[2];
  const outputDir = argv_[3] || 'dist';

  await bundler({ input, outputDir });
}

main(process.argv).catch(console.error);
