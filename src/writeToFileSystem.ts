import { promises as fs } from "fs";
import {
  SerializedPageCodeReport,
  RepoCodeReport,
  serializeRepoCodeReport,
} from "./CodeExampleTypes";

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

export const writeRepoReportToFile = async (repoCodeReport: RepoCodeReport) => {
  const outputBaseDir = `output/code-example-reports/`;
  const outputPath = `output/code-example-reports/report-${repoCodeReport.repo}.json`;
  const serializedReport = serializeRepoCodeReport(repoCodeReport);
  try {
    const jsonString = JSON.stringify(serializedReport, null, 2);
    await fs.mkdir(outputBaseDir, { recursive: true });
    await fs.writeFile(outputPath, jsonString, "utf-8");
  } catch (error) {
    console.log("Error writing report to file: %s", error);
    process.exit(1);
  }
};

export const writePageReportToFile = async (
  repoName: string,
  pageCodeReport: SerializedPageCodeReport[]
) => {
  const outputBaseDir = `output/code-example-reports/`;
  const outputPath = `output/code-example-reports/report-${repoName}-pages.json`;
  try {
    await fs.mkdir(outputBaseDir, { recursive: true });
    const jsonString = JSON.stringify(pageCodeReport, null, 2);
    await fs.writeFile(outputPath, jsonString, "utf-8");
  } catch (error) {
    console.log("Error writing report to file: %s", error);
    process.exit(1);
  }
};
