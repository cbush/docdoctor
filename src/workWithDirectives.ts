import { ParentNode } from "restructured";
import { findAll } from "./tree";

export type DirectiveNode = ParentNode & {
  type: "directive";
  name: string;
  options?: {
    language?: string;
  };
};

export const findDirectives = (ast: ParentNode): DirectiveNode[] => {
  return (
    findAll(ast, ({ type }) => type === "directive") as DirectiveNode[]
  ).filter((node) => node !== ast); // exclude self
};

// Look for directives with a specific name. Works for `io-code-block` and
// `literalinclude` because they're mapped to the `name` attribute in the AST.
export const findDirectivesNamed = (
  ast: ParentNode,
  named: string | string[]
): DirectiveNode[] => {
  const names = Array.isArray(named) ? named : [named];
  return findDirectives(ast).filter(({ name }) => names.includes(name));
};
