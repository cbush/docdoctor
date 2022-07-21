import restructured, { AnyNode, ValueNode, ParentNode } from "restructured";
import { visit } from "./tree";
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

// Wrapper that handles directives. WARNING: Line, columns, and indent may not
// be 100% accurate.
const parse = (
  rst: string,
  options?: {
    // "position" and "indent" options are automatically set, so whatever passed
    // in here is ignored
    position?: boolean;
    indent?: boolean;
    blanklines?: boolean;
  }
): AnyNode => {
  const root = restructured.parse(rst, {
    ...options,
    position: true,
    indent: true,
  });

  // Parse directives
  visit(
    root,
    () => {
      // Do nothing on enter
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

      // Note: Restructured library does not provide accurate positions for
      // directive inner text nodes. It also doesn't provide access to blank lines
      // between the options list and the content body. So, separating the args,
      // options and content is all more complicated than it would otherwise be

      // Extract args node if any
      if (node.children[0]?.position.start.line === node.position.start.line) {
        const argsNode = node.children.shift() as TextNode;
        assert(argsNode.type === "text");
        directiveNode.args = argsNode.value;
      }

      // Reconstruct the directive body (including options and content) and remove
      // the indentation to accurately distinguish between options and content
      const bodyPosition = node.children[0]?.position;
      if (bodyPosition === undefined) {
        console.warn(
          `Directive '${
            directiveNode.directive
          }' with no options or content at ${JSON.stringify(
            directiveNode.position
          )}`
        );
        return;
      }
      const bodyRawText = rst.substring(
        bodyPosition.start.offset,
        bodyPosition.end.offset
      );
      const { indent } = node;
      assert(indent !== undefined);
      const deindentedBodyLines = bodyRawText
        .split("\n")
        .map((line) => line.substring(indent?.offset ?? 0));

      // Create a string to prepend to the inner document to be parsed. This will
      // enable accurate reconstruction of positions on the inner document's nodes.
      let optionSectionBlankout = "";

      while (deindentedBodyLines.length > 0) {
        if (deindentedBodyLines[0].trim() === "") {
          // Blank line indicates end of options and start of content
          optionSectionBlankout +=
            (deindentedBodyLines.shift() as string) + "\n";
          break;
        }
        if (directiveNode.optionLines === undefined) {
          directiveNode.optionLines = [];
        }
        const optionLine = deindentedBodyLines.shift() as string;
        optionSectionBlankout += optionLine.replace(/./g, " ") + "\n";
        directiveNode.optionLines.push(optionLine);
      }

      // Remaining deindentedBodyLines are content lines
      const parsedContent = parse(
        optionSectionBlankout + deindentedBodyLines.join("\n"),
        options
      );

      // Adjust the inner parse job's positions relative to the parent rST document
      visit(parsedContent, (node) => {
        const { start, end } = node.position;
        const { offset, line } = bodyPosition.start;
        node.position = {
          start: {
            ...start,
            offset: start.offset + offset + indent.offset,
            line: start.line + line - 1,
            column: start.column + indent.offset,
          },
          end: {
            ...end,
            offset: end.offset + offset + indent.offset,
            line: end.line + line - 1,
            column: end.column + indent.offset,
          },
        };
        if (node.indent !== undefined) {
          node.indent.offset += indent.offset;
        }
      });

      directiveNode.children = parsedContent.children;

      Object.assign(node, directiveNode);
    }
  );

  return root;
};

export { AnyNode, Location, Node, ParentNode, ValueNode } from "restructured";
export default { parse };
