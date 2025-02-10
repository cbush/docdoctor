import fetch from "node-fetch";
import { CommandModule } from "yargs";
import { createInterface } from "readline";
import { findAll } from "../tree";
import { ParentNode } from "restructured";
import { makeSnootyProjectsInfo } from "../SnootyProjectsInfo";
import {
  SnootyManifestEntry,
  SnootyPageData,
  SnootyPageEntry,
} from "../SnootyTypes";
import * as path from "path";
import {
  writeCodeToFile,
  writeRepoReportToFile,
  writePageReportToFile,
} from "../writeToFileSystem";
import { findDirectives } from "../workWithDirectives";
import {
  getLanguageDetailsForCodeNode,
  getLanguageDetailsForLiteralInclude,
  getLanguageDetailsForIoCodeBlock,
  getNewDefaultLangCounterMap,
} from "../CodeExampleLanguageProcessing";
import {
  CodeNode,
  FindCodeExamplesArgs,
  BuildRepoReportArgs,
  IoCodeBlock,
  PageSubtypeCodeExampleResults,
  PageCodeReport,
  SerializedPageCodeReport,
  RepoCodeReport,
  serializePageCodeReport,
} from "../CodeExampleTypes";

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

const findCodeBlocks = (ast: ParentNode) => {
  return (findAll(ast, ({ type }) => type === "code") as CodeNode[]).filter(
    (node) => node !== ast
  ); // exclude self
};

const processCodeNodes = async (
  pageData: SnootyPageData
): Promise<PageSubtypeCodeExampleResults> => {
  let blockCounter = 0;
  const langCounters = getNewDefaultLangCounterMap();
  const baseOutputDir = `output/code-example-blocks/${pageData.page_id}`;
  const codeNodes = findCodeBlocks(pageData.ast);
  const count = codeNodes.length;
  for (const codeNode of codeNodes) {
    blockCounter += 1;
    const langDetails = getLanguageDetailsForCodeNode(codeNode);
    const currentLangValue = langCounters.get(langDetails.canonicalValue);
    if (!currentLangValue) {
      langCounters.set(langDetails.canonicalValue, 1);
    } else {
      langCounters.set(langDetails.canonicalValue, currentLangValue + 1);
    }
    const filePath = path.join(
      baseOutputDir,
      blockCounter.toString() + langDetails.extension
    );
    await writeCodeToFile(codeNode.value, baseOutputDir, filePath);
  }
  return {
    nodeType: "code",
    nodeCount: count,
    writeBlockCount: blockCounter,
    langMap: langCounters,
  };
};

const processLiteralIncludes = async (
  pageData: SnootyPageData
): Promise<PageSubtypeCodeExampleResults> => {
  const blockCounter = 0;
  const langCounters = getNewDefaultLangCounterMap();
  const literalIncludes = findDirectives(pageData.ast).filter(({ name }) =>
    name.includes("literalinclude")
  );
  //console.log("Found %s literalinclude nodes", literalIncludes.length);
  if (literalIncludes.length > 0) {
    for (const literalIncludeNode of literalIncludes) {
      //console.log(literalIncludeNode);
      const langDetails =
        getLanguageDetailsForLiteralInclude(literalIncludeNode);
      //console.log("Lang details for literalinclude node are: %s", langDetails);
      const currentLangValue = langCounters.get(langDetails.canonicalValue);
      if (!currentLangValue) {
        langCounters.set(langDetails.canonicalValue, 1);
      } else {
        langCounters.set(langDetails.canonicalValue, currentLangValue + 1);
      }
    }
  }
  return {
    nodeType: "literalinclude",
    nodeCount: literalIncludes.length,
    writeBlockCount: blockCounter,
    langMap: langCounters,
  };
};

const processIoCodeBlocks = async (
  pageData: SnootyPageData
): Promise<PageSubtypeCodeExampleResults> => {
  const blockCounter = 0;
  const langCounters = getNewDefaultLangCounterMap();
  const ioCodeBlocks = findDirectives(pageData.ast).filter(({ name }) =>
    name.includes("io-code-block")
  );
  if (ioCodeBlocks.length == 0) {
    return {
      nodeType: "io-code-block",
      nodeCount: 0,
      writeBlockCount: blockCounter,
      langMap: langCounters,
    };
  }
  for (const codeBlock of ioCodeBlocks) {
    const ioBlock = codeBlock as IoCodeBlock;
    // The first child of an io-code-block directive is the `input` directive
    const inputBlock = ioBlock.children[0];
    const inputLangDetails = getLanguageDetailsForIoCodeBlock(inputBlock);
    const langCounterCurrentInputValue = langCounters.get(
      inputLangDetails.canonicalValue
    );
    // If the lang exists in the map and currently has a value, increment it by one
    if (langCounterCurrentInputValue != undefined) {
      langCounters.set(
        inputLangDetails.canonicalValue,
        langCounterCurrentInputValue + 1
      );
    } else {
      // If the lang doesn't currently exist in the map and have a value, add it and set its value to one
      langCounters.set(inputLangDetails.canonicalValue, 1);
    }
  }
  return {
    nodeType: "io-code-block",
    nodeCount: ioCodeBlocks.length,
    writeBlockCount: blockCounter,
    langMap: langCounters,
  };
};

const aggregateCodeCounts = (inputCounts: Map<string, number>[]) => {
  const aggregateCounter = new Map<string, number>();
  for (const counter of inputCounts) {
    for (const [key, value] of counter.entries()) {
      if (aggregateCounter.has(key)) {
        const existingKeyValue = (aggregateCounter.get(key) as number) || 0;
        aggregateCounter.set(key, existingKeyValue + value);
      } else {
        aggregateCounter.set(key, value);
      }
    }
  }
  return aggregateCounter;
};

const processCodeExamples = async (
  pageData: SnootyPageData
): Promise<PageCodeReport> => {
  const issues: string[] = [];
  const codeInfo = await processCodeNodes(pageData);
  const codeLanguageMapAsArray = Array.from(codeInfo.langMap);
  const codeCountsSum = codeLanguageMapAsArray.reduce(
    (sum, [, value]) => sum + value,
    0
  );
  if (codeInfo.nodeCount != codeCountsSum) {
    issues.push(
      `WARNING: code count is ${codeInfo.nodeCount} but code lang map sum is ${codeCountsSum}`
    );
  }
  if (codeInfo.nodeCount != codeInfo.writeBlockCount) {
    issues.push(
      `WARNING: code node count is ${codeInfo.nodeCount} but wrote ${codeInfo.writeBlockCount} code blocks`
    );
  }
  const literalIncludeCounts = await processLiteralIncludes(pageData);
  const literalIncludeCountsAsArray = Array.from(
    literalIncludeCounts.langMap.entries()
  );
  const literalIncludeCountsSum = literalIncludeCountsAsArray.reduce(
    (sum, [, value]) => sum + value,
    0
  );
  if (literalIncludeCounts.nodeCount != literalIncludeCountsSum) {
    issues.push(
      `WARNING: literalinclude count by directive is ${literalIncludeCounts.nodeCount} but literalinclude count by lang map sum is ${literalIncludeCountsSum}`
    );
  }
  const ioCodeBlockCounts = await processIoCodeBlocks(pageData);
  const ioCodeBlockCountsAsArray = Array.from(
    ioCodeBlockCounts.langMap.entries()
  );
  const ioCodeBlockCountsSum = ioCodeBlockCountsAsArray.reduce(
    (sum, [, value]) => sum + value,
    0
  );
  if (ioCodeBlockCounts.nodeCount != ioCodeBlockCountsSum) {
    issues.push(
      `WARNING: io-code-block count by directive is ${ioCodeBlockCounts.nodeCount} but io-code-block count by lang map sum is ${ioCodeBlockCountsSum}`
    );
  }

  return {
    page: pageData.page_id.toString(),
    codeNodesByDirective: codeInfo.nodeCount,
    codeNodesByLangSum: codeCountsSum,
    codeNodesByLang: codeInfo.langMap,
    literalIncludeCountByDirective: literalIncludeCounts.nodeCount,
    literalIncludeCountByLangSum: literalIncludeCountsSum,
    literalIncludesByLang: literalIncludeCounts.langMap,
    ioCodeBlockCountByDirective: ioCodeBlockCounts.nodeCount,
    ioCodeBlockCountByLangSum: ioCodeBlockCountsSum,
    ioCodeBlockByLang: ioCodeBlockCounts.langMap,
    warnings: issues,
  };
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
  const snootyDataApiBaseUrl = defaultSnootyDataApiBaseUrl;
  const pageData = await fetchPageData({
    branchName,
    projectName,
    snootyDataApiBaseUrl,
  });
  const pagesWithIssues: string[] = [];

  let repoCodeNodeLangCounts = getNewDefaultLangCounterMap();
  let repoCodeNodeTotal = 0;

  let repoLiteralIncludeLangCounts = getNewDefaultLangCounterMap();
  let repoLiteralIncludeTotal = 0;

  let repoIoCodeBlockLangCounts = getNewDefaultLangCounterMap();
  let repoIoCodeBlockTotal = 0;

  const serializedPageReports: SerializedPageCodeReport[] = [];
  for (const thisPage of pageData) {
    const pageReport = await processCodeExamples(thisPage);
    repoCodeNodeLangCounts = aggregateCodeCounts([
      pageReport.codeNodesByLang,
      repoCodeNodeLangCounts,
    ]);
    repoLiteralIncludeLangCounts = aggregateCodeCounts([
      pageReport.literalIncludesByLang,
      repoLiteralIncludeLangCounts,
    ]);
    repoIoCodeBlockLangCounts = aggregateCodeCounts([
      pageReport.ioCodeBlockByLang,
      repoIoCodeBlockLangCounts,
    ]);
    repoCodeNodeTotal += pageReport.codeNodesByDirective;
    repoLiteralIncludeTotal += pageReport.literalIncludeCountByDirective;
    repoIoCodeBlockTotal += pageReport.ioCodeBlockCountByDirective;
    if (pageReport.warnings.length > 0) {
      pagesWithIssues.push(pageReport.page);
    }
    const serializedReport = serializePageCodeReport(pageReport);
    serializedPageReports.push(serializedReport);
  }

  console.log(`Finished processing code examples for ${repoName}`);

  await writePageReportToFile(repoName, serializedPageReports);

  const repoCodeNodeCountsAsArray = Array.from(
    repoCodeNodeLangCounts.entries()
  );
  const totalCodeExamplesSum = repoCodeNodeCountsAsArray.reduce(
    (sum, [, value]) => sum + value,
    0
  );
  //
  const repoLiteralIncludeCountsAsArray = Array.from(
    repoLiteralIncludeLangCounts.entries()
  );
  const repoTotalLiteralIncludesSum = repoLiteralIncludeCountsAsArray.reduce(
    (sum, [, value]) => sum + value,
    0
  );

  const repoIoCodeBlockCountsAsArray = Array.from(
    repoIoCodeBlockLangCounts.entries()
  );
  const repoIoCodeBlocksSum = repoIoCodeBlockCountsAsArray.reduce(
    (sum, [, value]) => sum + value,
    0
  );

  const repoReport: RepoCodeReport = {
    repo: repoName,
    totalCodeNodesByDirective: repoCodeNodeTotal,
    totalCodeNodesByLangSum: totalCodeExamplesSum,
    codeNodesByLang: repoCodeNodeLangCounts,
    totalLiteralIncludesByDirective: repoLiteralIncludeTotal,
    totalLiteralIncludesByLangSum: repoTotalLiteralIncludesSum,
    literalIncludesByLang: repoLiteralIncludeLangCounts,
    ioCodeBlockCountByDirective: repoIoCodeBlockTotal,
    ioCodeBlockCountByLangSum: repoIoCodeBlocksSum,
    ioCodeBlockByLang: repoIoCodeBlockLangCounts,
    pagesWithIssues: pagesWithIssues,
  };

  await writeRepoReportToFile(repoReport);
};

const commandModule: CommandModule<unknown, FindCodeExamplesArgs> = {
  command: "getCodeExamples",
  handler: async (args) => {
    try {
      const { snootyDataApiBaseUrl } = {
        snootyDataApiBaseUrl:
          args.snootyDataApiBaseUrl ?? defaultSnootyDataApiBaseUrl,
      };

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
          console.error(
            `Couldn't find project for repo '${project.repoName}'!`
          );
        } else if (ignoreList.includes(projectName)) {
          console.log(`Ignoring project ${projectName}`);
          continue;
        } else {
          await buildRepoReport({
            snootyProjectsInfo,
            repoName: project.repoName,
            projectName,
          });
        }

        // SIMPLIFIED TESTING TARGETING ONE REPO
        // if (projectName === "cloud-docs") {
        //   await buildRepoReport({
        //     snootyProjectsInfo,
        //     repoName: project.repoName,
        //     projectName,
        //   });
        // }
      }
    } catch (error) {
      console.error(error);
      process.exit(1);
    }
  },
  describe: "Find code examples in docs pages",
};

export default commandModule;
