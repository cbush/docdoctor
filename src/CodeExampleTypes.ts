import { ParentNode } from "restructured";
import { SnootyProject, SnootyProjectsInfo } from "./SnootyProjectsInfo";
import { DirectiveNode } from "./workWithDirectives";

export type CodeNode = ParentNode & {
  type: "code";
  position: {
    start: {
      line: number;
    };
  };
  lang?: string;
  copyable?: boolean;
  emphasizeLines?: number[];
  linenos?: boolean;
};

export type IoCodeBlock = ParentNode & {
  type: "directive";
  position: {
    start: {
      line: number;
    };
  };
  children: [Input, Output?];
  domain: string;
  name: "io-code-block";
  options: {
    copyable?: boolean;
    caption?: string;
  };
};

type Input = DirectiveNode & {
  type: "directive";
  name: "input";
  children: [CodeNode];
  options: {
    language?: string;
    lineos?: boolean;
  };
};

type Output = DirectiveNode & {
  type: "directive";
  name: "output";
  children: [CodeNode];
  options?: {
    language?: string;
    lineos?: boolean;
    visible?: boolean;
  };
};

export type FindCodeExamplesArgs = {
  snootyDataApiBaseUrl?: string;
  branch?: string;
  repo: string;
};

export type BuildRepoReportArgs = {
  snootyProjectsInfo: SnootyProjectsInfo & {
    _data: SnootyProject[];
  };
  repoName: string;
  projectName: string;
};

export type PageSubtypeCodeExampleResults = {
  nodeType: string;
  nodeCount: number;
  writeBlockCount: number;
  langMap: Map<string, number>;
};

function mapToObject(map: Map<string, number>): Record<string, number> {
  const obj: Record<string, number> = {};
  map.forEach((value, key) => {
    obj[key] = value;
  });
  return obj;
}

export type PageCodeReport = {
  page: string;
  codeNodesByDirective: number;
  codeNodesByLangSum: number;
  codeNodesByLang: Map<string, number>;
  literalIncludeCountByDirective: number;
  literalIncludeCountByLangSum: number;
  literalIncludesByLang: Map<string, number>;
  ioCodeBlockCountByDirective: number;
  ioCodeBlockCountByLangSum: number;
  ioCodeBlockByLang: Map<string, number>;
  warnings: string[];
};

export type SerializedPageCodeReport = {
  page: string;
  codeNodesByDirective: number;
  codeNodesByLangSum: number;
  codeNodesByLang: Record<string, number>;
  literalIncludeCountByDirective: number;
  literalIncludeCountByLangSum: number;
  literalIncludesByLang: Record<string, number>;
  ioCodeBlockCountByDirective: number;
  ioCodeBlockCountByLangSum: number;
  ioCodeBlockByLang: Record<string, number>;
  warnings: string[];
};

export function serializePageCodeReport(
  report: PageCodeReport
): SerializedPageCodeReport {
  return {
    page: report.page,
    codeNodesByDirective: report.codeNodesByDirective,
    codeNodesByLangSum: report.codeNodesByLangSum,
    codeNodesByLang: mapToObject(report.codeNodesByLang),
    literalIncludeCountByDirective: report.literalIncludeCountByDirective,
    literalIncludeCountByLangSum: report.literalIncludeCountByLangSum,
    literalIncludesByLang: mapToObject(report.literalIncludesByLang),
    ioCodeBlockCountByDirective: report.ioCodeBlockCountByDirective,
    ioCodeBlockCountByLangSum: report.ioCodeBlockCountByLangSum,
    ioCodeBlockByLang: mapToObject(report.ioCodeBlockByLang),
    warnings: report.warnings,
  };
}

export type RepoCodeReport = {
  repo: string;
  totalCodeNodesByDirective: number;
  totalCodeNodesByLangSum: number;
  codeNodesByLang: Map<string, number>;
  totalLiteralIncludesByDirective: number;
  totalLiteralIncludesByLangSum: number;
  literalIncludesByLang: Map<string, number>;
  ioCodeBlockCountByDirective: number;
  ioCodeBlockCountByLangSum: number;
  ioCodeBlockByLang: Map<string, number>;
  pagesWithIssues: string[];
};

export function serializeRepoCodeReport(report: RepoCodeReport) {
  return {
    repo: report.repo,
    totalCodeNodesByDirective: report.totalCodeNodesByDirective,
    totalCodeNodesByLangSum: report.totalCodeNodesByLangSum,
    codeNodesByLang: mapToObject(report.codeNodesByLang),
    totalLiteralIncludesByDirective: report.totalLiteralIncludesByDirective,
    totalLiteralIncludesByLangSum: report.totalLiteralIncludesByLangSum,
    literalIncludesByLang: mapToObject(report.literalIncludesByLang),
    ioCodeBlockCountByDirective: report.ioCodeBlockCountByDirective,
    ioCodeBlockCountByLangSum: report.ioCodeBlockCountByLangSum,
    ioCodeBlockByLang: mapToObject(report.ioCodeBlockByLang),
    pagesWithIssues: report.pagesWithIssues.entries(),
  };
}
