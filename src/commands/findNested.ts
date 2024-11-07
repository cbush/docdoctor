import fetch from "node-fetch";
import { CommandModule } from "yargs";
import { createInterface } from "readline";
import { findAll } from "../tree";
import { ParentNode } from "restructured";
import { stringify } from "csv-stringify/sync";
import { makeSnootyProjectsInfo } from "../SnootyProjectsInfo";

// These types are what's in the snooty manifest jsonl file.
export type SnootyManifestEntry = {
  type: "page" | "timestamp" | "metadata" | "asset";
  data: unknown;
};
/**
  Represents a page entry in a Snooty manifest file.
 */
export type SnootyPageEntry = SnootyManifestEntry & {
  type: "page";
  data: SnootyPageData;
};

/**
  A page in the Snooty manifest.
 */
export type SnootyPageData = {
  page_id: string;
  ast: ParentNode;
  tags?: string[];
  deleted: boolean;
};

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
  return findDirectives(ast).filter(({ name }) => names.includes(name));
};

const countXNestedInY = (
  ast: ParentNode,
  xDirectiveName: string | string[],
  yDirectiveName: string | string[]
) => {
  return findDirectivesNamed(ast, yDirectiveName).reduce(
    (acc, cur) => acc + findDirectivesNamed(cur, xDirectiveName).length,
    0
  );
};

const countNestedDirectives = (
  ast: ParentNode,
  directiveName: string | string[]
) => countXNestedInY(ast, directiveName, directiveName);

type OffenseCounter = (ast: ParentNode) => number;

enum DirectiveNames {
  TABS_SELECTOR = "tabs-selector",
  TABS = "tabs",
  TABLE = "list-table",
  PROCEDURE = "procedure",
  EXAMPLE = "example", // Example is a directive but they want it tracked separately
}

const ADMONITION_TYPE_DIRECTIVE_NAMES = [
  "admonition",
  "note",
  "warning",
  "important",
  "danger",
  "caution",
  "tip",
  "see",
  "seealso",
];

const offenseCounters: Record<string, OffenseCounter> = {
  tabsSelectors: (ast) =>
    findDirectivesNamed(ast, DirectiveNames.TABS_SELECTOR).length,
  nestedTabsBeyondTabsSelectors: (ast) => {
    // If the page has the "tabs-selector" directive, then the tabs directives
    // for the specified tabset become selectable by the page-level language
    // selector. This has supposedly less SEO impact than "real" tabs within
    // tabs, so they can potentially be left alone.

    // Find tabsets specified by tabs-selector
    const selectorNames = findDirectivesNamed(
      ast,
      DirectiveNames.TABS_SELECTOR
    ).map(
      (directive) =>
        (directive as unknown as { argument: [{ value: string }] }).argument[0]
          .value
    );
    // Find tabs directives and selectively ignore tabsets specified in the
    // tabs-selector directive
    return findDirectivesNamed(ast, DirectiveNames.TABS)
      .map((tabs) => {
        const tabsetName = (
          tabs as unknown as { options?: { tabset?: string } }
        ).options?.tabset;
        return tabsetName && selectorNames.includes(tabsetName)
          ? countNestedDirectives(tabs, DirectiveNames.TABS)
          : findDirectivesNamed(tabs, DirectiveNames.TABS).length;
      })
      .reduce((acc, cur) => acc + cur, 0);
  },
  nestedTabs: (ast) => countNestedDirectives(ast, DirectiveNames.TABS),
  tablesInTables: (ast) => countNestedDirectives(ast, DirectiveNames.TABLE),
  admonitionsInAdmonitions: (ast) =>
    countNestedDirectives(ast, ADMONITION_TYPE_DIRECTIVE_NAMES),
  admonitionsInTables: (ast) =>
    countXNestedInY(ast, ADMONITION_TYPE_DIRECTIVE_NAMES, DirectiveNames.TABLE),
  proceduresInProcedures: (ast) =>
    countNestedDirectives(ast, DirectiveNames.PROCEDURE),
  proceduresInNestedTabs: (ast) =>
    findDirectivesNamed(ast, DirectiveNames.TABS).reduce(
      (acc, cur) =>
        acc +
        countXNestedInY(cur, DirectiveNames.PROCEDURE, DirectiveNames.TABS),
      0
    ),
  examplesInTables: (ast) =>
    countXNestedInY(ast, DirectiveNames.EXAMPLE, DirectiveNames.TABLE),
  examplesInAdmonitions: (ast) =>
    countXNestedInY(
      ast,
      DirectiveNames.EXAMPLE,
      ADMONITION_TYPE_DIRECTIVE_NAMES
    ),
};

type FindNestedResult = {
  pageId: string;
  counts: Record<string, number>;
};

const findNested = (pageData: SnootyPageData): FindNestedResult => {
  return {
    pageId: pageData.page_id,
    counts: Object.fromEntries(
      Object.entries(offenseCounters).map(([name, countOffenses]) => [
        name,
        countOffenses(pageData.ast),
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
  command: "findNested",
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

      const results = pageData
        .map((page) => findNested(page))
        .filter(
          ({ counts }) =>
            Object.values(counts).reduce((acc, cur) => acc + cur, 0) > 0 // Only include results if any count > 0
        );

      console.log(
        stringify(
          results.map(({ counts, pageId }) => ({
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
          })),
          {
            header: true,
          }
        )
      );
    } catch (error) {
      console.error(error);
      process.exit(1);
    }
  },
  describe: "Find nested components",
};

export default commandModule;
