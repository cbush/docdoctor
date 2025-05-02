import { ParentNode } from "restructured";

export interface CodeNode extends ParentNode {
  optionLines?: string[];
}
