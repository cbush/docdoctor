import { promises as fs } from "fs";
import * as path from "path";
import { PageCodeReport, RepoCodeReport } from "./CodeExampleTypes";

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
  repoCodeReport: RepoCodeReport,
) => {
  const outputBaseDir = `output/code-example-reports/`;
  const outputPath = `output/code-example-reports/report-${repoCodeReport.repo}.txt`;
  try {
    const jsonString = JSON.stringify(repoCodeReport);
    await fs.mkdir(outputBaseDir, { recursive: true });
    await fs.writeFile(outputPath, jsonString, "utf-8");
  } catch (error) {
    console.log("Error writing report to file: %s", error);
    process.exit(1);
  }
};

export const writePageReportToFile = async (
  repoName: string,
  pageCodeReport: PageCodeReport[]
) => {
  const outputBaseDir = `output/code-example-reports/`;
  const outputPath = `output/code-example-reports/report-${repoName}-pages.txt`;
  try {
    await fs.mkdir(outputBaseDir, { recursive: true });
    const jsonString = JSON.stringify(pageCodeReport);
    await fs.writeFile(outputPath, jsonString, "utf-8");
  } catch (error) {
    console.log("Error writing report to file: %s", error);
    process.exit(1);
  }
};
