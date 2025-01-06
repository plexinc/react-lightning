const path = require('node:path');

const viteOptions = [
  {
    name: '--config [configFile]',
    description: 'Path to a vite config file',
  },
];

function getConfigFile(config, options) {
  return options.config
    ? path.resolve(config.root, options.config)
    : path.resolve(process.cwd(), './vite.config.mjs');
}

module.exports = {
  commands: [
    {
      name: 'run-lightning',
      description: 'Runs the app using vite',
      func: async (_argv, config, options) => {
        const { createServer } = await import('vite');

        const server = await createServer({
          root: config.root,
          configFile: getConfigFile(config, options),
        });

        await server.listen();

        server.printUrls();
        server.bindCLIShortcuts({ print: true });
      },
      options: viteOptions,
    },
    {
      name: 'build-lightning',
      description: 'Build the app using vite',
      func: async (_argv, config, options) => {
        const { build } = await import('vite');

        await build({
          root: config.root,
          configFile: getConfigFile(config, options),
        });
      },
      options: viteOptions,
    },
    {
      name: 'preview-lightning',
      description: 'Preview a built app package using vite',
      func: async (_argv, config, options) => {
        const { preview } = await import('vite');

        const server = await preview({
          root: config.root,
          configFile: getConfigFile(config, options),
        });

        server.printUrls();
        server.bindCLIShortcuts({ print: true });
      },
      options: viteOptions,
    },
  ],
  platforms: {
    lightning: {
      linkConfig: () => {
        return null;
      },
      projectConfig: () => {},
      dependencyConfig: () => {},
    },
  },
  project: {
    lightning: {},
  },
};
