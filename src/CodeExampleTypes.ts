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
  count: number;
  langMap: Map<string, number>;
};

export type PageCodeExampleResults = {
  subtypeData: PageSubtypeCodeExampleResults[];
  hasIssues: boolean;
};
