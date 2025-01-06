import fs from 'node:fs';
import path from 'node:path';
import depcheck, { type Options } from 'depcheck';
import { sync as globSync } from 'glob';
import { Listr, type ListrTask } from 'listr2';
import yaml from 'yaml';

const ROOT_PATH = '.';
const rootDependencies: string[] = [];

const defaultDepcheckOptions: Options = {
  ignorePatterns: ['dist', 'node_modules'],
  detectors: [...Object.values(depcheck.detector)],
};

type Context = {
  exitCode: number;
};

type PackageJson = {
  name: string;
  path: string;
  isRoot: boolean;
  depcheck: Options;
};

function getWorkspacePackages(): string[] {
  const file = fs.readFileSync('pnpm-workspace.yaml', 'utf8');
  const data = yaml.parse(file);

  return data.packages;
}

function getPackages(): Promise<PackageJson>[] {
  const packages = getWorkspacePackages();
  const packagePaths = packages.flatMap((pkg) => globSync(pkg));

  return [ROOT_PATH, ...packagePaths].map(async (p) => {
    const absolutePath = path.resolve(p);
    const json = await import(path.join(absolutePath, 'package.json'));
    const isRoot = p === ROOT_PATH;

    if (isRoot) {
      rootDependencies.push(
        ...Object.keys(json.dependencies ?? {}),
        ...Object.keys(json.devDependencies ?? {}),
      );
    }

    return {
      name: json.name,
      path: absolutePath,
      isRoot,
      depcheck: {
        ...defaultDepcheckOptions,
        ...json.depcheck,
      },
    };
  });
}

function createCheckTask(
  title: string,
  dependencies: string[],
  isError?: (dependency: string) => boolean,
): ListrTask<Context> {
  return {
    title: `Checking ${title}`,
    task: (ctx, task) => {
      const errorDependencies = isError
        ? dependencies.filter(isError)
        : dependencies;

      if (errorDependencies.length) {
        task.title = `${title[0]?.toUpperCase()}${title.slice(1)} (${errorDependencies.length})`;
        ctx.exitCode = 1;

        throw new Error(errorDependencies.join('\n'));
      }

      task.title = `No ${title}`;
    },
  };
}

const ctx: Context = { exitCode: 0 };

const usedPackageDependencies = new Set<string>();
let packagesCheckedCount = 0;
let packagesCheckedResolve: () => void;
const packagesCheckedPromise = new Promise<void>((resolve) => {
  packagesCheckedResolve = resolve;
});

const listr = new Listr<Context>(
  [
    {
      title: 'Fetching packages',
      task: async (ctx, task) => {
        const packages = await Promise.all(getPackages());

        task.title = `Found ${packages.length} packages. Checking dependencies...`;

        return task.newListr<Context>(
          packages.map((packageJson) => ({
            title: packageJson.isRoot ? 'Root' : packageJson.name,
            task: async (ctx, task) => {
              // Slightly different task handling for root. We want to check
              // if sub-packages are using dependencies for any of the unused
              // root packages
              const { dependencies, devDependencies, missing, using } =
                await depcheck(packageJson.path, packageJson.depcheck);
              const missingDependencies = Object.keys(missing);

              if (packageJson.isRoot) {
                // For the root package, wait until all sub-packages have been
                // checked so that it can build up a list of used dependencies
                await packagesCheckedPromise;
              } else {
                for (const dep in using) {
                  usedPackageDependencies.add(dep);
                }

                packagesCheckedCount++;

                if (packagesCheckedCount >= packages.length - 1) {
                  packagesCheckedResolve();
                }
              }

              return task.newListr(
                [
                  createCheckTask(
                    'unused dependencies',
                    dependencies,
                    packageJson.isRoot
                      ? (dependency) => !usedPackageDependencies.has(dependency)
                      : undefined,
                  ),
                  createCheckTask(
                    'unused dev dependencies',
                    devDependencies,
                    packageJson.isRoot
                      ? (dependency) => !usedPackageDependencies.has(dependency)
                      : undefined,
                  ),
                  createCheckTask(
                    'missing dependencies',
                    missingDependencies,
                    !packageJson.isRoot
                      ? (dependency) => !rootDependencies.includes(dependency)
                      : undefined,
                  ),
                ],
                {
                  ctx,
                  concurrent: true,
                  exitOnError: true,
                  rendererOptions: {
                    collapseErrors: false,
                    showErrorMessage: true,
                  },
                },
              );
            },
          })),
          {
            ctx,
            concurrent: true,
            exitOnError: false,
            rendererOptions: {
              collapseErrors: false,
              showErrorMessage: true,
            },
          },
        );
      },
    },
  ],
  {
    ctx,
    rendererOptions: {
      collapseErrors: false,
      showErrorMessage: false,
    },
  },
);

try {
  const result = await listr.run();

  if (result.exitCode) {
    process.exit(result.exitCode);
  } else {
    console.log('No unused dependencies found.');
  }
} catch (error) {
  throw new Error('Failed to run dependency checks:', error as Error);
}
