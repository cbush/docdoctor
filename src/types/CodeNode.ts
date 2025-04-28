import { AnyNode } from "restructured";

export type CodeNode = AnyNode & {
  position: {
    start: {
      offset: number;
      line: number;
      column: number;
    };
    end: {
      offset: number;
      line: number;
      column: number;
    };
  };
  //args: string; // This is the code example language
  optionLines: string[];
};
