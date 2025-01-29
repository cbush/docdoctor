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
  CanonicalLanguageValues,
  getLanguageDetailsForCodeNode,
  getLanguageDetailsForLiteralInclude,
  getLanguageDetailsForIoCodeBlock,
} from "../CodeExampleLanguageProcessing";
import {
  CodeNode,
  FindCodeExamplesArgs,
  BuildRepoReportArgs,
  IoCodeBlock,
  PageSubtypeCodeExampleResults, PageCodeExampleResults
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
  let blockCounter = 1;
  const langCounters = new Map<string, number>([
    [CanonicalLanguageValues.BASH, 0],
    [CanonicalLanguageValues.C, 0],
    [CanonicalLanguageValues.CPP, 0],
    [CanonicalLanguageValues.CSHARP, 0],
    [CanonicalLanguageValues.GO, 0],
    [CanonicalLanguageValues.JAVA, 0],
    [CanonicalLanguageValues.JAVASCRIPT, 0],
    [CanonicalLanguageValues.JSON, 0],
    [CanonicalLanguageValues.KOTLIN, 0],
    [CanonicalLanguageValues.PHP, 0],
    [CanonicalLanguageValues.PYTHON, 0],
    [CanonicalLanguageValues.RUBY, 0],
    [CanonicalLanguageValues.RUST, 0],
    [CanonicalLanguageValues.SCALA, 0],
    [CanonicalLanguageValues.SHELL, 0],
    [CanonicalLanguageValues.SWIFT, 0],
    [CanonicalLanguageValues.TEXT, 0],
    [CanonicalLanguageValues.TYPESCRIPT, 0],
    [CanonicalLanguageValues.UNDEFINED, 0],
    [CanonicalLanguageValues.XML, 0],
    [CanonicalLanguageValues.YAML, 0],
  ]);
  const baseOutputDir = `output/code-example-blocks/${pageData.page_id}`;
  const codeNodes = findCodeBlocks(pageData.ast);
  const count = codeNodes.length;
  for (const codeNode of codeNodes) {
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
    blockCounter += 1;
    //console.log(codeNode);
  }
  //console.log("Found %s code nodes on page", codeNodes.length);
  return { nodeType: "code", count: count, langMap: langCounters };
};

const processLiteralIncludes = async (
  pageData: SnootyPageData
): Promise<PageSubtypeCodeExampleResults> => {
  let blockCounter = 1;
  const langCounters = new Map<string, number>([
    [CanonicalLanguageValues.BASH, 0],
    [CanonicalLanguageValues.C, 0],
    [CanonicalLanguageValues.CPP, 0],
    [CanonicalLanguageValues.CSHARP, 0],
    [CanonicalLanguageValues.GO, 0],
    [CanonicalLanguageValues.JAVA, 0],
    [CanonicalLanguageValues.JAVASCRIPT, 0],
    [CanonicalLanguageValues.JSON, 0],
    [CanonicalLanguageValues.KOTLIN, 0],
    [CanonicalLanguageValues.PHP, 0],
    [CanonicalLanguageValues.PYTHON, 0],
    [CanonicalLanguageValues.RUBY, 0],
    [CanonicalLanguageValues.RUST, 0],
    [CanonicalLanguageValues.SCALA, 0],
    [CanonicalLanguageValues.SHELL, 0],
    [CanonicalLanguageValues.SWIFT, 0],
    [CanonicalLanguageValues.TEXT, 0],
    [CanonicalLanguageValues.TYPESCRIPT, 0],
    [CanonicalLanguageValues.UNDEFINED, 0],
    [CanonicalLanguageValues.XML, 0],
    [CanonicalLanguageValues.YAML, 0],
  ]);
  const baseOutputDir = `output/code-example-blocks/${pageData.page_id}`;
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
      const filePath = path.join(
        baseOutputDir,
        blockCounter.toString() + langDetails.extension
      );
      await writeCodeToFile(
        literalIncludeNode.children[0].value,
        baseOutputDir,
        filePath
      );
      blockCounter += 1;
    }
  }
  return {
    nodeType: "literalinclude",
    count: literalIncludes.length,
    langMap: langCounters,
  };
};

const processIoCodeBlocks = async (
  pageData: SnootyPageData
): Promise<PageSubtypeCodeExampleResults> => {
  let blockCounter = 1;
  const langCounters = new Map<string, number>([
    [CanonicalLanguageValues.BASH, 0],
    [CanonicalLanguageValues.C, 0],
    [CanonicalLanguageValues.CPP, 0],
    [CanonicalLanguageValues.CSHARP, 0],
    [CanonicalLanguageValues.GO, 0],
    [CanonicalLanguageValues.JAVA, 0],
    [CanonicalLanguageValues.JAVASCRIPT, 0],
    [CanonicalLanguageValues.JSON, 0],
    [CanonicalLanguageValues.KOTLIN, 0],
    [CanonicalLanguageValues.PHP, 0],
    [CanonicalLanguageValues.PYTHON, 0],
    [CanonicalLanguageValues.RUBY, 0],
    [CanonicalLanguageValues.RUST, 0],
    [CanonicalLanguageValues.SCALA, 0],
    [CanonicalLanguageValues.SHELL, 0],
    [CanonicalLanguageValues.SWIFT, 0],
    [CanonicalLanguageValues.TEXT, 0],
    [CanonicalLanguageValues.TYPESCRIPT, 0],
    [CanonicalLanguageValues.UNDEFINED, 0],
    [CanonicalLanguageValues.XML, 0],
    [CanonicalLanguageValues.YAML, 0],
  ]);
  const baseOutputDir = `output/code-example-blocks/${pageData.page_id}`;
  const ioCodeBlocks = findDirectives(pageData.ast).filter(({ name }) =>
    name.includes("io-code-block")
  );
  // console.log(
  //   "Found %s io-code-block directives for page",
  //   ioCodeBlocks.length
  // );
  if (ioCodeBlocks.length == 0) {
    return {
      nodeType: "io-code-block",
      count: 0,
      langMap: langCounters,
    };
  }
  for (const codeBlock of ioCodeBlocks) {
    const ioBlock = codeBlock as IoCodeBlock;
    //console.log(ioBlock);
    // The io-code-block directive always has at least one child, and it's an input block
    const inputBlock = ioBlock.children[0];
    //console.log(inputBlock);
    const inputLangDetails = getLanguageDetailsForIoCodeBlock(inputBlock);
    //console.log("Input lang details are: %s", inputLangDetails);
    // Output block is optional for io-code-block, so we can only assume it exists if the block has more than one child
    if (ioBlock.children.length > 0) {
      // If the output block does exist, it's the second child
      const maybeOutputBlock = ioBlock.children[1];
      if (maybeOutputBlock != undefined) {
        const outputLangDetails =
          getLanguageDetailsForIoCodeBlock(maybeOutputBlock);
        //console.log("Output lang details are: %s", outputLangDetails);
        if (
          inputLangDetails.canonicalValue !== outputLangDetails.canonicalValue
        ) {
          langCounters.set(inputLangDetails.canonicalValue, 1);
          langCounters.set(outputLangDetails.canonicalValue, 1);
        } else {
          langCounters.set(inputLangDetails.canonicalValue, 2);
        }
        const outputFilePath = path.join(
          baseOutputDir,
          blockCounter.toString() + outputLangDetails.extension
        );
        await writeCodeToFile(
          maybeOutputBlock.children[0].value,
          baseOutputDir,
          outputFilePath
        );
        blockCounter += 1;
        //console.log(maybeOutputBlock);
      } else {
        langCounters.set(inputLangDetails.canonicalValue, 1);
      }
      const inputFilePath = path.join(
        baseOutputDir,
        blockCounter.toString() + inputLangDetails.extension
      );
      await writeCodeToFile(
        inputBlock.children[0].value,
        baseOutputDir,
        inputFilePath
      );
      blockCounter += 1;
    }
  }
  return {
    nodeType: "io-code-block",
    count: ioCodeBlocks.length,
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
): Promise<PageCodeExampleResults> => {
  const issues: string[] = [];
  //console.log("Processing code nodes for page: %s", pageData.page_id);
  const codeInfo = await processCodeNodes(pageData);
  const codeLanguageMapAsArray = Array.from(codeInfo.langMap);
  const formattedCodeCounts = codeLanguageMapAsArray
    .map(([key, value]) => `${key}: ${value}`)
    .join("\n");
  const codeCountsSum = codeLanguageMapAsArray.reduce(
    (sum, [, value]) => sum + value,
    0
  );
  if (codeInfo.count != codeCountsSum) {
    issues.push(
      `WARNING: code count is ${codeInfo.count} but code lang map sum is ${codeCountsSum}`
    );
  }
  const literalIncludeCounts = await processLiteralIncludes(pageData);
  const literalIncludeCountsAsArray = Array.from(
    literalIncludeCounts.langMap.entries()
  );
  const formattedLiteralIncludeCounts = literalIncludeCountsAsArray
    .map(([key, value]) => `${key}: ${value}`)
    .join("\n");
  const literalIncludeCountsSum = literalIncludeCountsAsArray.reduce(
    (sum, [, value]) => sum + value,
    0
  );
  if (literalIncludeCounts.count != literalIncludeCountsSum) {
    issues.push(
      `WARNING: literalinclude count by directive is ${literalIncludeCounts.count} but literalinclude count by lang map sum is ${literalIncludeCountsSum}`
    );
  }
  const ioCodeBlockCounts = await processIoCodeBlocks(pageData);
  const ioCodeBlockCountsAsArray = Array.from(
    ioCodeBlockCounts.langMap.entries()
  );
  const formattedIoCodeBlockCounts = ioCodeBlockCountsAsArray
    .map(([key, value]) => `${key}: ${value}`)
    .join("\n");
  const ioCodeBlockCountsSum = ioCodeBlockCountsAsArray.reduce(
    (sum, [, value]) => sum + value,
    0
  );
  if (ioCodeBlockCounts.count != ioCodeBlockCountsSum) {
    issues.push(
      `WARNING: io-code-block count by directive is ${ioCodeBlockCounts.count} but io-code-block count by lang map sum is ${ioCodeBlockCountsSum}`
    );
  }
  const pageReportTemplate = `
Report for page: ${pageData.page_id}
Total code examples on page: ${codeInfo.count}
No warnings for this page

code counts for page by directive count: ${codeInfo.count}
code counts for page by language sum: ${codeCountsSum}
${formattedCodeCounts}

literalinclude counts for page by directive count: ${literalIncludeCounts.count}
literalinclude counts for page by language sum: ${literalIncludeCountsSum}
${formattedLiteralIncludeCounts}

io-code-block counts for page by directive count: ${ioCodeBlockCounts.count}
io-code-block counts for page by language sum: ${ioCodeBlockCountsSum}
${formattedIoCodeBlockCounts}
  `;
  const pageReportTemplateWithWarnings = `
Report for page: ${pageData.page_id}
Total code examples on page: ${codeInfo.count}
This page has the following warnings:
${issues.toString()}

code counts for page by directive count: ${codeInfo.count}
code counts for page by language sum: ${codeCountsSum}
${formattedCodeCounts}

literalinclude counts for page by directive count: ${literalIncludeCounts.count}
literalinclude counts for page by language sum: ${literalIncludeCountsSum}
${formattedLiteralIncludeCounts}

io-code-block counts for page by directive count: ${ioCodeBlockCounts.count}
io-code-block counts for page by language sum: ${ioCodeBlockCountsSum}
${formattedIoCodeBlockCounts}
  `;

  //console.log(pageReportTemplate);
  if (issues.length > 0) {
    await writePageReportToFile(
      pageData.page_id,
      pageReportTemplateWithWarnings
    );
    return {
      subtypeData: [codeInfo, literalIncludeCounts, ioCodeBlockCounts],
      hasIssues: true,
    };
  } else {
    await writePageReportToFile(pageData.page_id, pageReportTemplate);
    return {
      subtypeData: [codeInfo, literalIncludeCounts, ioCodeBlockCounts],
      hasIssues: false,
    };
  }
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

  let repoCodeNodeLangCounts = new Map<string, number>([
    [CanonicalLanguageValues.BASH, 0],
    [CanonicalLanguageValues.C, 0],
    [CanonicalLanguageValues.CPP, 0],
    [CanonicalLanguageValues.CSHARP, 0],
    [CanonicalLanguageValues.GO, 0],
    [CanonicalLanguageValues.JAVA, 0],
    [CanonicalLanguageValues.JAVASCRIPT, 0],
    [CanonicalLanguageValues.JSON, 0],
    [CanonicalLanguageValues.KOTLIN, 0],
    [CanonicalLanguageValues.PHP, 0],
    [CanonicalLanguageValues.PYTHON, 0],
    [CanonicalLanguageValues.RUBY, 0],
    [CanonicalLanguageValues.RUST, 0],
    [CanonicalLanguageValues.SCALA, 0],
    [CanonicalLanguageValues.SHELL, 0],
    [CanonicalLanguageValues.SWIFT, 0],
    [CanonicalLanguageValues.TEXT, 0],
    [CanonicalLanguageValues.TYPESCRIPT, 0],
    [CanonicalLanguageValues.UNDEFINED, 0],
    [CanonicalLanguageValues.XML, 0],
    [CanonicalLanguageValues.YAML, 0],
  ]);
  let repoCodeNodeTotal = 0;

  let repoLiteralIncludeLangCounts = new Map<string, number>([
    [CanonicalLanguageValues.BASH, 0],
    [CanonicalLanguageValues.C, 0],
    [CanonicalLanguageValues.CPP, 0],
    [CanonicalLanguageValues.CSHARP, 0],
    [CanonicalLanguageValues.GO, 0],
    [CanonicalLanguageValues.JAVA, 0],
    [CanonicalLanguageValues.JAVASCRIPT, 0],
    [CanonicalLanguageValues.JSON, 0],
    [CanonicalLanguageValues.KOTLIN, 0],
    [CanonicalLanguageValues.PHP, 0],
    [CanonicalLanguageValues.PYTHON, 0],
    [CanonicalLanguageValues.RUBY, 0],
    [CanonicalLanguageValues.RUST, 0],
    [CanonicalLanguageValues.SCALA, 0],
    [CanonicalLanguageValues.SHELL, 0],
    [CanonicalLanguageValues.SWIFT, 0],
    [CanonicalLanguageValues.TEXT, 0],
    [CanonicalLanguageValues.TYPESCRIPT, 0],
    [CanonicalLanguageValues.UNDEFINED, 0],
    [CanonicalLanguageValues.XML, 0],
    [CanonicalLanguageValues.YAML, 0],
  ]);
  let repoLiteralIncludeTotal = 0;

  let repoIoCodeBlockLangCounts = new Map<string, number>([
    [CanonicalLanguageValues.BASH, 0],
    [CanonicalLanguageValues.C, 0],
    [CanonicalLanguageValues.CPP, 0],
    [CanonicalLanguageValues.CSHARP, 0],
    [CanonicalLanguageValues.GO, 0],
    [CanonicalLanguageValues.JAVA, 0],
    [CanonicalLanguageValues.JAVASCRIPT, 0],
    [CanonicalLanguageValues.JSON, 0],
    [CanonicalLanguageValues.KOTLIN, 0],
    [CanonicalLanguageValues.PHP, 0],
    [CanonicalLanguageValues.PYTHON, 0],
    [CanonicalLanguageValues.RUBY, 0],
    [CanonicalLanguageValues.RUST, 0],
    [CanonicalLanguageValues.SCALA, 0],
    [CanonicalLanguageValues.SHELL, 0],
    [CanonicalLanguageValues.SWIFT, 0],
    [CanonicalLanguageValues.TEXT, 0],
    [CanonicalLanguageValues.TYPESCRIPT, 0],
    [CanonicalLanguageValues.UNDEFINED, 0],
    [CanonicalLanguageValues.XML, 0],
    [CanonicalLanguageValues.YAML, 0],
  ]);
  let repoIoCodeBlockTotal = 0;

  for (const thisPage of pageData) {
    const pageCounters = await processCodeExamples(thisPage);
    const pageCodeTotals = pageCounters.subtypeData[0];
    const pageliteralIncludeTotals = pageCounters.subtypeData[1];
    const pageioCodeBlockTotals = pageCounters.subtypeData[2];
    repoCodeNodeLangCounts = aggregateCodeCounts([
      pageCodeTotals.langMap,
      repoCodeNodeLangCounts,
    ]);
    repoLiteralIncludeLangCounts = aggregateCodeCounts([
      pageliteralIncludeTotals.langMap,
      repoLiteralIncludeLangCounts,
    ]);
    repoIoCodeBlockLangCounts = aggregateCodeCounts([
      pageioCodeBlockTotals.langMap,
      repoIoCodeBlockLangCounts,
    ]);
    repoCodeNodeTotal += pageCodeTotals.count;
    repoLiteralIncludeTotal += pageliteralIncludeTotals.count;
    repoIoCodeBlockTotal += pageioCodeBlockTotals.count;
    if (pageCounters.hasIssues) {
      pagesWithIssues.push(thisPage.page_id.toString());
    }
    //break;
  }

  console.log(`Finished processing code examples for ${repoName}`);

  // Write output to individual output files
  const repoCodeNodeCountsAsArray = Array.from(
    repoCodeNodeLangCounts.entries()
  );
  const formattedRepoCounts = repoCodeNodeCountsAsArray
    .map(([key, value]) => `${key}: ${value}`)
    .join("\n");
  const totalCodeExamplesSum = repoCodeNodeCountsAsArray.reduce(
    (sum, [, value]) => sum + value,
    0
  );

  const repoLiteralIncludeCountsAsArray = Array.from(
    repoLiteralIncludeLangCounts.entries()
  );
  const formattedRepoLiteralIncludeCounts = repoLiteralIncludeCountsAsArray
    .map(([key, value]) => `${key}: ${value}`)
    .join("\n");
  const repoTotalLiteralIncludesSum = repoLiteralIncludeCountsAsArray.reduce(
    (sum, [, value]) => sum + value,
    0
  );

  const repoIoCodeBlockCountsAsArray = Array.from(
    repoIoCodeBlockLangCounts.entries()
  );
  const formattedRepoIoCodeBlockCounts = repoIoCodeBlockCountsAsArray
    .map(([key, value]) => `${key}: ${value}`)
    .join("\n");
  const repoTotalIoCodeBlocksSum = repoIoCodeBlockCountsAsArray.reduce(
    (sum, [, value]) => sum + value,
    0
  );

  const repoReportTemplate = `
Report for repository: ${repoName}
Total code blocks by directive count: ${repoCodeNodeTotal}
Total code blocks by lang sum: ${totalCodeExamplesSum}
Code blocks by language:
${formattedRepoCounts}

Total literalincludes by directive count: ${repoLiteralIncludeTotal}
Total literalincludes by lang sum: ${repoTotalLiteralIncludesSum}
literalincludes by language:
${formattedRepoLiteralIncludeCounts}

Total io-code-blocks by directive count: ${repoIoCodeBlockTotal}
Total io-code-blocks by lang sum: ${repoTotalIoCodeBlocksSum}
io-code-blocks by language:
${formattedRepoIoCodeBlockCounts}

There have been issues parsing code examples on the following pages - please consult the page report for details:
${pagesWithIssues.toString().split(",").join("\n")}
  `;
  await writeRepoReportToFile(repoName, repoReportTemplate);
};

const commandModule: CommandModule<unknown, FindCodeExamplesArgs> = {
  command: "codeStuff",
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
        }

        // SIMPLIFIED TESTING TARGETING ONE REPO
        if (projectName === "cloud-docs") {
          await buildRepoReport({
            snootyProjectsInfo,
            repoName: project.repoName,
            projectName,
          });
        }
      }
    } catch (error) {
      console.error(error);
      process.exit(1);
    }
  },
  describe: "Find code examples in docs pages",
};

export default commandModule;
