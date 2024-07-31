import { CommandModule } from "yargs";
import { createInterface } from "readline";
import { findAll } from "../tree";
import { ParentNode } from "restructured";
import fetch from "node-fetch";

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

const defaultDataApiBaseUrl = "https://snooty-data-api.mongodb.com/prod/";

const fetchPageData = async (
  args: FindNestedArgs
): Promise<SnootyPageData[]> => {
  const { dataApiBaseUrl, project, branch } = args;

  const getBranchDocumentsUrl = new URL(
    `projects/${project}/${branch}/documents`,
    dataApiBaseUrl ?? defaultDataApiBaseUrl
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
        case "asset":
        case "metadata":
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
  return findAll(ast, ({ type }) => type === "directive") as DirectiveNode[];
};

const findDirectivesNamed = (ast: ParentNode, named: string) =>
  findDirectives(ast).filter(({ name }) => name === named);

const countXNestedInY = (
  ast: ParentNode,
  xDirectiveName: string,
  yDirectiveName: string
) => {
  return findDirectivesNamed(ast, yDirectiveName).reduce(
    (acc, cur) => acc + findDirectivesNamed(cur, xDirectiveName).length,
    0
  );
};

const countNestedDirectives = (ast: ParentNode, directiveName: string) =>
  countXNestedInY(ast, directiveName, directiveName);

type OffenseCounter = (ast: ParentNode) => number;

const offenseCounters: Record<string, OffenseCounter> = {
  nestedTabs: (ast) => countNestedDirectives(ast, "tab"),
  tablesInTables: (ast) => countNestedDirectives(ast, "table"),
  admonitionsInAdmonitions: (ast) => countNestedDirectives(ast, "admonition"),
  proceduresInProcedures: (ast) => countNestedDirectives(ast, "procedure"),
  proceduresInTabs: (ast) => countXNestedInY(ast, "procedure", "tab"),
  admonitionsInTables: (ast) => countXNestedInY(ast, "admonition", "table"),
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
  dataApiBaseUrl?: string;
  project: string;
  branch: string;
};

const commandModule: CommandModule<unknown, FindNestedArgs> = {
  command: "findNested",
  builder(args) {
    return args
      .option("dataApiBaseUrl", {
        array: false,
        type: "string",
        demandOption: false,
      })
      .option("project", { type: "string", array: false, demandOption: true })
      .option("branch", { type: "string", array: false, demandOption: true });
  },
  handler: async (args) => {
    try {
      const { branch, project, dataApiBaseUrl } = args;
      const pageData = await fetchPageData({ branch, project, dataApiBaseUrl });
      pageData.forEach((page) => {
        const result = findNested(page);
        console.log(JSON.stringify(result));
      });
    } catch (error) {
      console.error(error);
      process.exit(1);
    }
  },
  describe: "Find nested components",
};

export default commandModule;
