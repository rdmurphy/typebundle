// packages
import { Worker } from 'okie';

// types
import type { Plugin } from 'rollup';
import type { MinifyOptions, MinifyOutput } from 'terser';

export function terserPlugin(options: MinifyOptions = {}): Plugin {
  const worker = new Worker(
    (basedir: string, code: string, options: MinifyOptions) => {
      const terserPath = require.resolve('terser', {
        paths: [basedir],
      });

      return require(terserPath).minify(code, options) as MinifyOutput;
    }
  );

  return {
    name: 'typebundle:terser',

    async renderChunk(code, _chunk, outputOptions) {
      const res = await worker.run(__dirname, code, {
        safari10: true,
        ...options,
        sourceMap: !!outputOptions.sourcemap,
        module: outputOptions.format.startsWith('es'),
        toplevel: outputOptions.format === 'cjs',
      });

      return {
        code: res.code!,
        map: res.map as any,
      };
    },

    closeBundle() {
      worker.stop();
    },
  };
}
