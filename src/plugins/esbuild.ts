// native
import { extname } from 'path';

// packages
import { transform, TransformOptions } from 'esbuild';

// types
import type { Plugin } from 'rollup';

async function transformWithEsbuild(
  code: string,
  sourcefile: string,
  options?: TransformOptions
) {
  let loader = extname(sourcefile).slice(1);

  // account for new style Node-ness
  if (loader === 'cjs' || loader === 'mjs') {
    loader = 'js';
  }

  const transformOptions = {
    loader,
    sourcemap: true,
    sourcefile,
    ...options,
  } as TransformOptions;

  return transform(code, transformOptions);
}

export function esbuildPlugin(config: TransformOptions = {}): Plugin {
  return {
    name: 'typebundle:esbuild',
    async transform(code, id) {
      if (id.endsWith('.ts')) {
        const result = await transformWithEsbuild(code, id, config);

        return { code: result.code, map: result.map };
      }
    },
  };
}
