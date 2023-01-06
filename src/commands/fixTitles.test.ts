import { fixTitles } from "./fixup";
import MagicString from "magic-string";
import restructured from "../restructured";

describe("fixTitles", () => {
  it("handles backticks in titles", () => {
    const source = `
\`\`foo\`\`
===========

\`\`foo\`\`
-----------

\`\`foo\`\`
+++++++++++

\`\`foo\`\`
\`\`\`\`\`\`\`
`;
    const document = new MagicString(source);
    const rst = restructured.parse(document.original, {
      blanklines: true,
      indent: true,
      position: true,
    });
    fixTitles({
      path: "test",
      document,
      rst,
      snootyConfig: {
        constants: {},
      },
    });
    expect(document.hasChanged()).toBe(true);
    expect(document.toString()).toBe(`
=======
\`\`foo\`\`
=======

\`\`foo\`\`
-------

\`\`foo\`\`
~~~~~~~

\`\`foo\`\`
\`\`\`\`\`\`\`
`);
  });
});
