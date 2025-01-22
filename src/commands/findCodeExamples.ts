import fetch from "node-fetch";
import { promises as fs } from "fs";
import { CommandModule } from "yargs";
import { createInterface } from "readline";
import { findAll } from "../tree";
import { ParentNode } from "restructured";
import { makeSnootyProjectsInfo } from "../SnootyProjectsInfo";
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

const findDirectivesNamed = (ast: ParentNode, named: string | string[]) => {
  const names = Array.isArray(named) ? named : [named];
  const directives = findDirectives(ast).filter(({ name }) =>
    names.includes(name)
  );

  return directives;
};

type CodeExampleCounter = (ast: ParentNode) => number;

enum CodeExampleDirectiveNames {
  CODE = "code",
  CODE_BLOCK = "code-block",
  IO_CODE_BLOCK = "io-code-block",
  LITERALINCLUDE = "literalinclude",
}

const codeExamples: Record<string, CodeExampleCounter> = {
  // "code-block" is mapped to two directives: "code-block" and "code"
  codeBlocks: (ast) => {
    const codeBlockDirectives = findDirectivesNamed(
      ast,
      CodeExampleDirectiveNames.CODE_BLOCK
    ).length;
    const codeDirectives = findDirectivesNamed(
      ast,
      CodeExampleDirectiveNames.CODE
    ).length;

    return codeBlockDirectives + codeDirectives;
  },
  ioCodeBlocks: (ast) =>
    findDirectivesNamed(ast, CodeExampleDirectiveNames.IO_CODE_BLOCK).length,
  literalIncludes: (ast) =>
    findDirectivesNamed(ast, CodeExampleDirectiveNames.LITERALINCLUDE).length,
};

type FindNestedResult = {
  pageId: string;
  counts: Record<string, number>;
};

const findCodeExamples = (pageData: SnootyPageData): FindNestedResult => {
  return {
    pageId: pageData.page_id,
    counts: Object.fromEntries(
      Object.entries(codeExamples).map(([name, codeExamples]) => [
        name,
        codeExamples(pageData.ast),
      ])
    ),
  };
};

type FindNestedArgs = {
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

const commandModule: CommandModule<unknown, FindNestedArgs> = {
  command: "findCodeExamples",
  builder(args) {
    return args
      .option("snootyDataApiBaseUrl", {
        array: false,
        type: "string",
        demandOption: false,
      })
      .option("repo", {
        type: "string",
        array: false,
        demandOption: true,
      })
      .option("branch", { type: "string", array: false, demandOption: false });
  },
  handler: async (args) => {
    try {
      const {
        branch,
        repo: repoName,
        snootyDataApiBaseUrl,
      } = {
        ...args,
        snootyDataApiBaseUrl:
          args.snootyDataApiBaseUrl ?? defaultSnootyDataApiBaseUrl,
      };

      const snootyProjectsInfo = await makeSnootyProjectsInfo({
        snootyDataApiBaseUrl,
      });

      const projectName = await snootyProjectsInfo.getProjectName({ repoName });

      if (projectName === undefined) {
        throw new Error(`Couldn't find project for repo '${repoName}'!`);
      }

      const branchName =
        branch ??
        (await snootyProjectsInfo.getCurrentVersionName({
          projectName,
        })) ??
        "master";

      const baseUrl = await snootyProjectsInfo.getBaseUrl({
        projectName,
        branchName,
      });

      const pageData = await fetchPageData({
        branchName,
        projectName,
        snootyDataApiBaseUrl,
      });

      const repoBaseUrl = await makeGitHubBaseUrl({ repoName, branchName });

      // todo: check if page data includes code-block directives
      const results = pageData
        .map((page) => findCodeExamples(page))
        .filter(
          ({ counts }) =>
            Object.values(counts).reduce((acc, cur) => acc + cur, 0) > 0 // Only include results if any count > 0
        );

      const pageLevelData = results.map(({ counts, pageId }) => ({
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
      }));

      const totalCounts = results.reduce((acc, { counts }) => {
        for (const [key, value] of Object.entries(counts)) {
          acc[key] = (acc[key] || 0) + value;
        }
        return acc;
      }, {} as Record<string, number>);

      const outputData = {
        repoName,
        projectName,
        branchName,
        totalCounts,
        pageLevelData,
      };

      // If no `generated` directory exists, create it
      try {
        await fs.access("generated");
      } catch (error) {
        if ((error as NodeJS.ErrnoException).code === "ENOENT") {
          await fs.mkdir("generated");
        } else {
          throw error;
        }
      }

      // Write output to generated/output.json
      try {
        await fs.writeFile(
          "generated/output.json",
          JSON.stringify(outputData, null, 2)
        );
        console.log("Output written to output.json");
      } catch (error) {
        console.error("Error writing to output.json:", error);
        process.exit(1);
      }
    } catch (error) {
      console.error(error);
      process.exit(1);
    }
  },
  describe: "Find nested components",
};

export default commandModule;
