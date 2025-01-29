import { promises as fs } from "fs";
import * as path from "path";

// Get the code blocks on a given page
export const writeCodeToFile = async (
  value: string,
  baseDir: string,
  filePath: string
) => {
  try {
    await fs.mkdir(baseDir, { recursive: true });
    await fs.writeFile(filePath, value);
  } catch (error) {
    process.exit(1);
  }
};

export const writeRepoReportToFile = async (
  repoName: string,
  jsonString: string
) => {
  const outputPath = `output/code-example-reports/report-${repoName}.txt`;
  try {
    await fs.writeFile(outputPath, jsonString, "utf-8");
  } catch (error) {
    console.log("Error writing report to file: %s", error);
    process.exit(1);
  }
};

export const writePageReportToFile = async (
  pagePath: string,
  jsonString: string
) => {
  const outputBaseDir = `output/code-example-reports/`;
  const baseDir = `${outputBaseDir}/${pagePath}`;
  const filePath = `${baseDir}/report.txt`;
  try {
    await fs.mkdir(baseDir, { recursive: true });
    await fs.writeFile(filePath, jsonString, "utf-8");
  } catch (error) {
    console.log("Error writing report to file: %s", error);
    process.exit(1);
  }
};
