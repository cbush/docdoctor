import { strict as assert } from "assert";
import { CommandModule } from "yargs";
import { promises as fs } from "fs";
import restructured from "restructured";
import MagicString from "magic-string";
import { findAll, visit } from "../tree";

// https://docutils.sourceforge.io/docs/ref/rst/restructuredtext.html#sections
// Note: = reused, but uses top title for first section depth
const titleAdornmentCharacters = ["=", "-", "=", "~", "`", "^", "_"];

const fixup = async (path: string): Promise<void> => {
  const rawText = await fs.readFile(path, "utf8");
  const document = new MagicString(rawText);
  const parsed = restructured.parse(document.original, {
    blanklines: true,
    indent: true,
    position: true,
  });

  let sectionDepth = 1;
  visit(parsed, (node) => {
    switch (node.type) {
      case "section":
        sectionDepth = node.depth as number;
        if (
          !(1 <= sectionDepth && sectionDepth < titleAdornmentCharacters.length)
        ) {
          throw new Error(`Invalid section depth: ${sectionDepth}`);
        }
        break;
      case "title": {
        const texts = findAll(node, (n) => n.type === "text");
        if (texts.length !== 1) {
          throw new Error(
            `Not exactly 1 text node found in title. Not sure how to handle that! Text: ${texts
              .map((text) => text.value)
              .join(" ")}`
          );
        }
        const text = texts[0].value;
        const titleNode = node;
        const { start, end } = titleNode.position;
        const titleLine = titleAdornmentCharacters[sectionDepth - 1].repeat(
          text.length
        );

        const modifiedTitle = `${
          sectionDepth === 1 ? `${titleLine}\n` : ""
        }${text}\n${titleLine}\n`;

        document.overwrite(start.offset, end.offset, modifiedTitle);
      }
    }
  });

  console.log(document.toString());
};

type ExampleCommandArgs = { paths: string[] };

const commandModule: CommandModule<unknown, ExampleCommandArgs> = {
  command: "fixup <paths..>",
  handler: async (args) => {
    try {
      const { paths } = args;
      const promises = paths.map(fixup);
      await Promise.all(promises);
    } catch (error) {
      console.log(error);
      process.exit(1);
    }
  },
  describe: "Fix up rST",
};

export default commandModule;
