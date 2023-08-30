import restructured, { AnyNode, ValueNode, ParentNode } from "restructured";
import { visit, findAll } from "./tree";
import { strict as assert } from "assert";
export type TextNode = ValueNode & {
  type: "text";
};

export type DirectiveNode = ParentNode & {
  type: "directive";
  directive: string;
  args?: string;
  optionLines?: string[];
};

export type InlineLinkNode = ParentNode & {
  type: "interpreted_text";
  role: "ref" | "doc";
  target: string;
};

export type ReferenceNode = ParentNode & {
  type: "reference";
  target: string;
};

export type LabelNode = ParentNode & {
  type: "label";
  label: string;
};

export const getInnerText = (node: AnyNode): string =>
  findAll(node, (node) => node.type === "text")
    .map((node) => node.value)
    .join("");

// Wrapper that handles directives. WARNING: Line, columns, and indent may not
// be 100% accurate.
export const parse = (
  rst: string,
  options?: {
    // "position" and "indent" options are automatically set, so whatever passed
    // in here is ignored
    position?: boolean;
    indent?: boolean;
    blanklines?: boolean;
    depth?: number;
  }
): AnyNode => {
  const depth = options?.depth ?? 0;
  const root = restructured.parse(rst, {
    ...options,
    position: true,
    indent: true,
  });

  // Parse directives
  visit(
    root,
    () => {
      // Do nothing on enter because we'll be actively modifying the tree during
      // this visit and don't want to visit the new nodes.
    },
    (node) => {
      if (node.type !== "directive") {
        return;
      }

      // See
      // https://docutils.sourceforge.io/docs/ref/rst/restructuredtext.html#directives
      // for details.
      const directiveNode: DirectiveNode = {
        ...node,
        type: "directive",
        directive: node.directive as string,
      };
      // IIFE to ensure we can exit the next block early and still assign
      // whatever result to the node object
      (() => {
        // Note: Restructured library does not provide accurate positions for
        // directive inner text nodes. It also doesn't provide access to blank lines
        // between the options list and the content body. So, separating the args,
        // options and content is all more complicated than it would otherwise be.

        // Extract args node if any
        while (
          node.children[0]?.position.start.line === node.position.start.line
        ) {
          const argsNode = node.children.shift() as TextNode;
          const argValue = argsNode.value.trim();
          assert(argsNode.type === "text");
          directiveNode.args =
            directiveNode.args === undefined
              ? argValue
              : `${directiveNode.args} ${argValue}`;
        }

        if (node.children.length === 0) {
          // No options or content (but might have argument)
          return;
        }

        const { bodyPosition, bodyLines } = getBody({ node, rst });

        // Track the length of the option section for position adjustment later
        let optionSectionLength = 0;
        const { indent } = node;
        assert(indent !== undefined);

        while (bodyLines.length > 0) {
          const topLine = bodyLines.shift() as string;
          optionSectionLength += (topLine + "\n").length;
          if (topLine.trim() === "") {
            // Blank line indicates end of options and start of content
            break;
          }
          if (directiveNode.optionLines === undefined) {
            directiveNode.optionLines = [];
          }
          // Add deindented line to option lines
          directiveNode.optionLines.push(topLine.substring(indent.width));
        }

        // Remaining body lines are content lines
        const parsedContent = parse(bodyLines.join("\n"), {
          ...options,
          depth: depth + 1,
        }).children;
        // Skip down from top-level "document" to fake "block quote" node
        // (because directive body is indented). Only the child nodes of
        // parsedContent will be kept.

        if (!parsedContent || parsedContent.length === 0) {
          // Maybe options and args but no content
          directiveNode.children = [];
          return;
        }

        // Adjust the inner parse job's positions relative to the parent rST document
        const children = parsedContent
          .map((parsedContent) => {
            visit(parsedContent, (node) => {
              if (node === parsedContent) {
                // Skip the top-level node, as it will be discarded anyway
                return;
              }
              const { start, end } = node.position;

              const newOffset =
                start.offset + bodyPosition.start.offset + optionSectionLength;

              node.position = {
                start: {
                  ...start,
                  offset: newOffset,
                  line: start.line + bodyPosition.start.line,
                  column: start.column + indent.offset,
                },
                end: {
                  ...end,
                  offset:
                    end.offset +
                    bodyPosition.start.offset +
                    optionSectionLength,
                  line: end.line + bodyPosition.start.line,
                  column: end.column + indent.offset,
                },
              };
            });
            return parsedContent.children;
          })
          .flat(1);

        directiveNode.children = children;
      })();

      Object.assign(node, directiveNode);
    }
  );

  // Assign 'target' to refroles and doclinks
  findAll(
    root,
    (node) =>
      node.type === "interpreted_text" &&
      ["doc", "ref"].includes(node.role as string)
  ).forEach((node) => {
    const text = getInnerText(node);
    const matches = /^.*<(.*)>\s*$/m.exec(text);
    // If no matches, then no title -- just ref label -- e.g. :ref:`some-label`
    (node as InlineLinkNode).target = (matches && matches[1]) ?? text;
  });

  // Find labels
  findAll(root, (node) => node.type === "comment").forEach((node) => {
    const text = getInnerText(node);
    const matches = /^_(.*):$/.exec(text);
    if (matches === null) {
      return;
    }
    node.type = "label";
    node.label = matches[1];
  });

  // Find references (links)
  findAll(root, (node) => node.type === "reference").forEach((node) => {
    const text = getInnerText(node);
    const matches = /^.*<(.*)>\s*$/m.exec(text);
    if (matches === null) {
      return;
    }
    (node as ReferenceNode).target = (matches && matches[1]) ?? text;
  });

  return root;
};

function getBody({ rst, node }: { rst: string; node: AnyNode }) {
  // Reconstruct the directive body (including options and content). Start at
  // directive start, then adjust by peeling off the first line (directive +
  // maybe arg).
  const bodyPosition = {
    end: {
      ...node.children[node.children.length - 1].position.end,
    },
    start: { ...node.position.start },
  };

  const rawText = rst.substring(
    bodyPosition.start.offset,
    bodyPosition.end.offset
  );

  const bodyLines = rawText.split("\n");
  bodyPosition.start.line += 1;
  bodyPosition.start.column = 1;
  bodyPosition.start.offset += bodyLines[0].length + 1;
  bodyLines.shift();
  return { bodyLines, bodyPosition };
}

export { AnyNode, Location, Node, ParentNode, ValueNode } from "restructured";
export default { parse };
