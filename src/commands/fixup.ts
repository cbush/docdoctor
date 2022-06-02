import { CommandModule } from "yargs";
import { promises as fs } from "fs";
import restructured, { AnyNode } from "restructured";
import MagicString from "magic-string";
import { findAll, visit } from "../tree";
import toml from "toml";

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
const titleAdornmentCharacters = ["=", "-", "=", "~", "`", "^", "_"];

const fixTitles = (args: {
  document: MagicString;
  rst: AnyNode;
  snootyConfig: SnootyConfig;
}) => {
  const { rst, document, snootyConfig } = args;
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
        const expandedText = replaceSourceConstants(
          text,
          snootyConfig.constants
        );
        const titleLine = titleAdornmentCharacters[sectionDepth - 1].repeat(
          expandedText.length
        );

        const modifiedTitle = `${
          sectionDepth === 1 ? `${titleLine}\n` : ""
        }${text}\n${titleLine}\n`;

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
    document,
    rst,
    snootyConfig,
  });
  process.stdout.write(document.toString());
};

type ExampleCommandArgs = { paths: string[]; snootyTomlPath?: string };

const commandModule: CommandModule<unknown, ExampleCommandArgs> = {
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
