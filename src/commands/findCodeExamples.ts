import fetch from "node-fetch";
import { promises as fs } from "fs";
import { CommandModule } from "yargs";
import { createInterface } from "readline";
import { findAll } from "../tree";
import { ParentNode } from "restructured";
import {
  makeSnootyProjectsInfo,
  SnootyProjectsInfo,
  SnootyProject,
} from "../SnootyProjectsInfo";
import {
  SnootyManifestEntry,
  SnootyPageData,
  SnootyPageEntry,
} from "./findNested";

const defaultSnootyDataApiBaseUrl = "https://snooty-data-api.mongodb.com/prod/";

const fetchPageData = async (args: {
  branchName: string;
  projectName: string;
  snootyDataApiBaseUrl: string;
}): Promise<SnootyPageData[]> => {
  const { snootyDataApiBaseUrl, projectName, branchName } = args;

  const getBranchDocumentsUrl = new URL(
    `projects/${projectName}/${branchName}/documents`,
    snootyDataApiBaseUrl ?? defaultSnootyDataApiBaseUrl
  );

  const { body } = await fetch(getBranchDocumentsUrl);
  if (body === null) {
    return [];
  }
  const stream = createInterface(body);
  const pages: SnootyPageData[] = [];

  await new Promise<void>((resolve, reject) => {
    stream.on("line", async (line) => {
      const entry = JSON.parse(line) as SnootyManifestEntry;

      switch (entry.type) {
        case "page": {
          const { data } = entry as SnootyPageEntry;
          if (data.deleted) {
            // Page marked deleted by Snooty API.
            return;
          }
          pages.push(data);
          return;
        }
        case "metadata":
        case "asset":
        case "timestamp":
          // Nothing to do with these
          return;
        default:
          return reject(
            new Error(
              `unexpected entry type from '${getBranchDocumentsUrl}': ${
                (entry as Record<string, unknown>).type as string
              }`
            )
          );
      }
    });
    stream.on("close", () => {
      resolve();
    });
  });

  return pages;
};

type DirectiveNode = ParentNode & {
  type: "directive";
  name: string;
};

const findDirectives = (ast: ParentNode) => {
  return (
    findAll(ast, ({ type }) => type === "directive") as DirectiveNode[]
  ).filter((node) => node !== ast); // exclude self
};

// Look for directives with a specific name. Works for `io-code-block` and
// `literalinclude` because they're mapped to the `name` attribute in the AST.
const findDirectivesNamed = (ast: ParentNode, named: string | string[]) => {
  const names = Array.isArray(named) ? named : [named];
  const directives = findDirectives(ast).filter(({ name }) =>
    names.includes(name)
  );

  return directives;
};

type CodeNode = ParentNode & {
  type: "code";
  position: {
    start: {
      line: number;
    };
  };
  lang: string;
  copyable: boolean;
  emphasizeLines: number[];
  linenos: boolean;
};

const findCodeBlocks = (ast: ParentNode) => {
  return (findAll(ast, ({ type }) => type === "code") as CodeNode[]).filter(
    (node) => node !== ast
  ); // exclude self
};

const findCodeBlockLanguages = (ast: ParentNode) => {
  return findCodeBlocks(ast).map(({ lang }) => lang);
};

type CodeExampleCounter = (ast: ParentNode) => number;

enum CodeExampleDirectiveNames {
  IO_CODE_BLOCK = "io-code-block",
  LITERALINCLUDE = "literalinclude",
}

const codeExamples: Record<string, CodeExampleCounter> = {
  codeBlocks: (ast) => findCodeBlocks(ast).length,
  ioCodeBlocks: (ast) =>
    findDirectivesNamed(ast, CodeExampleDirectiveNames.IO_CODE_BLOCK).length,
  literalIncludes: (ast) =>
    findDirectivesNamed(ast, CodeExampleDirectiveNames.LITERALINCLUDE).length,
};

const languageCounts = (ast: ParentNode) => {
  const languages = findCodeBlockLanguages(ast).reduce((acc, cur) => {
    acc[cur] = (acc[cur] || 0) + 1;

    return acc;
  }, {} as Record<string, number>);

  // Sort totalLanguageCounts from largest to smallest
  const sortedTotalLanguageCounts = Object.fromEntries(
    Object.entries(languages).sort(([, a], [, b]) => b - a)
  );

  // TODO: de-duplicate language names ("sh", "shell", "bash", "console",
  // and "powershell" are the same). maybe categorize them all as shell?

  // TODO: figure out how to evaluate literalincludes to get their language
  // if it's not specified. Would need to look at the file extension.
  return sortedTotalLanguageCounts;
};

type FindCodeExamplesResult = {
  pageId: string;
  counts: Record<string, number>;
  languageCounts: Record<string, number>;
};

const findCodeExamples = (pageData: SnootyPageData): FindCodeExamplesResult => {
  return {
    pageId: pageData.page_id,
    counts: Object.fromEntries(
      Object.entries(codeExamples).map(([name, codeExamples]) => [
        name,
        codeExamples(pageData.ast),
      ])
    ),
    languageCounts: languageCounts(pageData.ast),
  };
};

type FindCodeExamplesArgs = {
  snootyDataApiBaseUrl?: string;
  branch?: string;
  repo: string;
};

const makeGitHubBaseUrl = async ({
  repoName,
  branchName,
}: {
  repoName: string;
  branchName: string;
}) => {
  const makeUrl = (org: string) =>
    `https://github.com/${org}/${repoName}/blob/${branchName}/source/`;

  const mongoDbUrl = makeUrl("mongodb");
  const probe = await fetch(mongoDbUrl);
  if (probe.status === 404) {
    return makeUrl("10gen");
  }
  return mongoDbUrl;
};

type BuildRepoReportArgs = {
  snootyProjectsInfo: SnootyProjectsInfo & {
    _data: SnootyProject[];
  };
  repoName: string;
  projectName: string;
};

const buildRepoReport = async ({
  snootyProjectsInfo,
  repoName,
  projectName,
}: BuildRepoReportArgs) => {
  const branchName =
    (await snootyProjectsInfo.getCurrentVersionName({
      projectName,
    })) ?? "master";

  const baseUrl = await snootyProjectsInfo.getBaseUrl({
    projectName,
    branchName,
  });

  const snootyDataApiBaseUrl = defaultSnootyDataApiBaseUrl;
  const pageData = await fetchPageData({
    branchName,
    projectName,
    snootyDataApiBaseUrl,
  });

  const repoBaseUrl = await makeGitHubBaseUrl({ repoName, branchName });

  const results = pageData
    .map((page) => findCodeExamples(page))
    .filter(
      ({ counts }) =>
        Object.values(counts).reduce((acc, cur) => acc + cur, 0) > 0 // Only include results if any count > 0
    );

  const pageLevelData = results.map(({ counts, languageCounts, pageId }) => ({
    repoName,
    projectName,
    branchName,
    pageId: pageId.replace(
      `${projectName}/docsworker-xlarge/${branchName}/`,
      baseUrl.replace(/\/?$/, "/")
    ),
    pageSource: `${pageId.replace(
      `${projectName}/docsworker-xlarge/${branchName}/`,
      repoBaseUrl
    )}.txt`,
    ...counts,
    languageCounts: { ...languageCounts },
  }));

  const totalCounts = results.reduce((acc, { counts }) => {
    for (const [key, value] of Object.entries(counts)) {
      acc[key] = (acc[key] || 0) + value;
    }
    return acc;
  }, {} as Record<string, number>);

  // aggregate language counts
  const totalLanguageCounts = results.reduce((acc, { languageCounts }) => {
    for (const [key, value] of Object.entries(languageCounts)) {
      acc[key] = (acc[key] || 0) + value;
    }
    return acc;
  }, {} as Record<string, number>);

  // Sort totalLanguageCounts from largest to smallest
  const sortedTotalLanguageCounts = Object.fromEntries(
    Object.entries(totalLanguageCounts).sort(([, a], [, b]) => b - a)
  );

  // TODO: separate 1-line code examples from multi-line code examples
  // TODO: include URL to specific examples? We have line numbers, I think.

  // Page-level data
  const outputData = {
    numberOfPages: pageData.length,
    repoName,
    projectName,
    branchName,
    totalCounts,
    totalLanguageCounts: sortedTotalLanguageCounts,
    pageLevelData,
  };

  // Write output to individual output files
  const outputPath = `report-${repoName}.json`;
  try {
    await fs.writeFile(outputPath, JSON.stringify(outputData, null, 2));
  } catch (error) {
    process.exit(1);
  }

  return outputData;
};

const commandModule: CommandModule<unknown, FindCodeExamplesArgs> = {
  command: "findCodeExamples",
  handler: async (args) => {
    try {
      const { snootyDataApiBaseUrl } = {
        snootyDataApiBaseUrl:
          args.snootyDataApiBaseUrl ?? defaultSnootyDataApiBaseUrl,
      };

      const reports = [];

      const snootyProjectsInfo = await makeSnootyProjectsInfo({
        snootyDataApiBaseUrl,
      });

      const ignoreList = [
        "atlas-open-service-broker",
        "docs-realm",
        "docs-app-services",
        "datalake",
      ];

      // filter out projects that are in the ignore list
      const filteredProjects = snootyProjectsInfo._data.filter(
        (project) => !ignoreList.includes(project.repoName)
      );

      for (const project of filteredProjects) {
        const projectName = await snootyProjectsInfo.getProjectName({
          repoName: project.repoName,
        });

        console.log(`Processing project ${projectName}`);

        if (projectName === undefined) {
          throw new Error(
            `Couldn't find project for repo '${project.repoName}'!`
          );
        } else if (ignoreList.includes(projectName)) {
          console.log(`Ignoring project ${projectName}`);
          continue;
        }

        const repoReport = await buildRepoReport({
          snootyProjectsInfo,
          repoName: project.repoName,
          projectName,
        });

        reports.push(repoReport);

        // SIMPLIFIED TESTING TARGETING ONE REPO
        // if (projectName === "cloud-docs") {
        //   const repoReport = await buildRepoReport({
        //     snootyProjectsInfo,
        //     repoName: project.repoName,
        //     projectName,
        //   });

        //   reports.push(repoReport);
        // }
      }
      const totalLanguageCounts = reports.reduce(
        (acc, { totalLanguageCounts }) => {
          for (const [key, value] of Object.entries(totalLanguageCounts)) {
            acc[key] = (acc[key] || 0) + value;
          }
          return acc;
        },
        {} as Record<string, number>
      );

      // Sort totalLanguageCounts from largest to smallest
      const sortedTotalLanguageCounts = Object.fromEntries(
        Object.entries(totalLanguageCounts).sort(([, a], [, b]) => b - a)
      );

      // aggregate totals from all reports
      const totals = {
        totalCounts: reports.reduce((acc, { totalCounts }) => {
          for (const [key, value] of Object.entries(totalCounts)) {
            acc[key] = (acc[key] || 0) + value;
          }
          return acc;
        }, {} as Record<string, number>),
        totalLanguageCounts: sortedTotalLanguageCounts,
      };

      const outputPath = `report-all.json`;
      try {
        await fs.writeFile(outputPath, JSON.stringify(totals, null, 2));
        console.log(`Output written to ${outputPath}`);
      } catch (error) {
        console.error(`Error writing to ${outputPath}:`, error);
        process.exit(1);
      }
    } catch (error) {
      console.error(error);
      process.exit(1);
    }
  },
  describe: "Find code examples in docs pages",
};

export default commandModule;
