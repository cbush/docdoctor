declare module "restructured" {
  export type Node = Record<string, unknown> & {
    position: { offset: number; line: number; column: number };
    blanklines: string[];
    indent?: { width: number; offset: number };
    children?: AnyNode[];
  };
  export type ValueNode = Node & {
    type: "text" | "unknown_line";
    value: string;
    children: never;
  };
  export type ParentNode = Node & {
    children: AnyNode[];
    // https://github.com/seikichi/restructured/blob/d08085c1abedf72f77307c15f14571ebcd1e56ba/src/Type.js
    type:
      | "document" // Document Structure
      | "section"
      | "title"
      | "transition"
      // Body Elements
      | "paragraph"
      | "bullet_list"
      | "list_item"
      | "enumerated_list"
      | "definition_list"
      | "definition_list_item"
      | "term"
      | "classifier"
      | "definition"
      | "field_list"
      | "field"
      | "field_name"
      | "field_body"
      | "docinfo"
      | "author"
      | "authors"
      | "organization"
      | "contact"
      | "version"
      | "status"
      | "date"
      | "copyright"
      | "field"
      | "topic"
      | "option_list"
      | "option_list_item"
      | "option_group"
      | "option"
      | "option_string"
      | "option_argument"
      | "description"
      | "literal_block"
      | "line_block"
      | "line"
      | "block_quote"
      | "attribution"
      | "doctest_block"
      | "table"
      | "tgroup"
      | "colspec"
      | "thead"
      | "tbody"
      | "row"
      | "entry"
      // Explicit Markup Blocks
      | "footnote"
      | "label"
      | "citation"
      | "target"
      | "substitution_definition"
      | "comment"
      // Inline Markups
      | "emphasis"
      | "strong"
      | "literal"
      | "reference"
      | "target"
      | "footnote_reference"
      | "citation_reference"
      | "substitution_reference"
      | "reference"
      // Error Handling
      | "system_message"
      | "problematic"
      | "unknown"
      // restructured Original Elements
      | "directive"
      | "interpreted_text";
  };
  export type AnyNode = ValueNode | ParentNode;
  export function parse(
    rst: string,
    options?: {
      position?: boolean;
      blanklines?: boolean;
      indent?: boolean;
    }
  ): AnyNode;
}
