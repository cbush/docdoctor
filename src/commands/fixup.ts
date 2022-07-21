import { CommandModule } from "yargs";
import { promises as fs } from "fs";
import restructured, { AnyNode } from "../restructured";
import MagicString from "magic-string";
import { findAll, visit } from "../tree";
import toml from "toml";
import { strict as assert } from "assert";

type SnootyConfig = {
  constants: Record<string, string>;
};

const loadSnootyConfig = async (
  snootyTomlPath?: string
): Promise<SnootyConfig> => {
  const defaults: SnootyConfig = {
    constants: {},
  };
  if (snootyTomlPath === undefined) {
    return { ...defaults };
  }
  const text = await fs.readFile(snootyTomlPath, "utf8");
  const data = toml.parse(text);
  return { ...defaults, ...data } as SnootyConfig;
};

// https://docutils.sourceforge.io/docs/ref/rst/restructuredtext.html#sections
// Note: = reused, but uses top title for first section depth
// See also "Inline Markup" slide: https://docs.google.com/presentation/d/125-MvuDr66EIUgb3bVWCX3Uh2Jj2MkM8kM0iM_JoOuA/edit#slide=id.g62b8cdf916_1_101
const titleAdornmentCharacters = ["=", "-", "~", "`", "+", "_", "="];

const fixTitles = (args: {
  path: string;
  document: MagicString;
  rst: AnyNode;
  snootyConfig: SnootyConfig;
}) => {
  const { path, rst, document, snootyConfig } = args;
  let sectionDepth = 1;
  visit(rst, (node) => {
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
        const textNodes = findAll(node, (n) => n.type === "text");
        if (textNodes.length < 1) {
          throw new Error(
            `In ${path}, not at least 1 text node found in title. Not sure how to handle that!`
          );
        }
        const text = textNodes.map((textNode) => textNode.value).join("");
        if (/\n/.test(text)) {
          throw new Error(
            `In ${path}, found multiline title. Not sure how to handle that! Text: '${text}'`
          );
        }

        // Find the total length of the title by looking at the minimum start
        // and maximum end position of the inner text nodes. We'll then add the
        // length gained by source constant expansions.
        const minStartOffset = textNodes.reduce((minStartOffset, textNode) => {
          const { offset } = textNode.position.start;
          return Math.min(offset, minStartOffset);
        }, node.position.end.offset);
        const maxEndOffset = textNodes.reduce((maxEndOffset, textNode) => {
          const { offset } = textNode.position.end;
          return Math.max(offset, maxEndOffset);
        }, node.position.start.offset);
        assert(
          minStartOffset <= maxEndOffset,
          `Invalid min start and max end offsets in ${path}`
        );

        const expandedText = replaceSourceConstants(
          text,
          snootyConfig.constants
        );
        // This can be negative if the expansions are actually shorter than the
        // source constant. Either way, we'll add the difference to the total
        // length.
        const lengthDelta = expandedText.length - text.length;
        const actualTextLength = maxEndOffset - minStartOffset + lengthDelta;
        assert(
          actualTextLength >= 0,
          `Invalid actual text length after expansion in ${path}`
        );

        // Take the original contents of the title, with rST markup and source
        // constants
        const rawTextRst = document
          .snip(minStartOffset, maxEndOffset)
          .toString();

        // Build the appropriately-sized title line
        const titleLine =
          titleAdornmentCharacters[sectionDepth - 1].repeat(actualTextLength);

        // Build the new title node's raw text. If the heading level is 1 (page
        // title), adorn the title on both the top and the bottom.
        const modifiedTitle = `${
          sectionDepth === 1 ? `${titleLine}\n` : ""
        }${rawTextRst}\n${titleLine}\n`;

        // Replace the original title node raw text with the new title raw text.
        const { start, end } = node.position;
        document.overwrite(start.offset, end.offset, modifiedTitle);
      }
    }
  });
};

const replaceSourceConstants = (
  s: string,
  constants: Record<string, string>
): string => {
  return Object.keys(constants).reduce(
    (acc, cur) => acc.replace(`{+${cur}+}`, constants[cur]),
    s
  );
};

const fixup = async (args: {
  path: string;
  snootyConfig: SnootyConfig;
}): Promise<void> => {
  const { path, snootyConfig } = args;
  const rawText = await fs.readFile(path, "utf8");
  const document = new MagicString(rawText);
  const rst = restructured.parse(document.original, {
    blanklines: true,
    indent: true,
    position: true,
  });
  fixTitles({
    path,
    document,
    rst,
    snootyConfig,
  });

  if (!document.hasChanged()) {
    console.log(`Visited ${path} -- no changes made`);
    return;
  }

  console.log(`Updating ${path}`);
  await fs.writeFile(path, document.toString(), "utf8");
};

type FixupArgs = { paths: string[]; snootyTomlPath?: string };

const commandModule: CommandModule<unknown, FixupArgs> = {
  command: "fixup <paths..>",
  builder(args) {
    return args
      .positional("paths", { array: true, type: "string", demandOption: true })
      .string("snootyTomlPath");
  },
  handler: async (args) => {
    try {
      const { paths, snootyTomlPath } = args;
      const snootyConfig = await loadSnootyConfig(snootyTomlPath);
      const promises = paths.map((path) => fixup({ path, snootyConfig }));
      await Promise.all(promises);
    } catch (error) {
      console.log(error);
      process.exit(1);
    }
  },
  describe: "Fix up rST",
};

export default commandModule;
