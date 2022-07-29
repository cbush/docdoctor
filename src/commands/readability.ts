import { CommandModule } from "yargs";
import { promises as fs } from "fs";
import restructured, { AnyNode } from "../restructured";
import MagicString from "magic-string";
import { findAll, visit } from "../tree";
import toml from "toml";
import * as path from "path";

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
const titleAdornmentCharacters = ["=", "-", "~", "^", "`", "_", "="];

const getText = (args: {
  inputPath: string;
  document: MagicString;
  rst: AnyNode;
  snootyConfig: SnootyConfig;
}) => {
  const { inputPath, rst, snootyConfig } = args;
  const desiredText: string[] = [];
  visit(rst, (node) => {
    switch (node.type) {
      case "title": {
        const textNodes = findAll(node, (n) => n.type === "text");
        let text = textNodes.map((textNode) => textNode.value).join("");
        // If the last character of the title is not a period, add one.
        // Missing periods will negatively impact readability.
        const lastTitleChar = text.charAt(text.length - 1);
        if (lastTitleChar != ".") {
          text = text + ".";
        }
        desiredText.push(text + "\n");
        break;
      }
      // TODO: Look into whether newlines in the paragraphs are inflating 
      // readability scores to be artificially high.
      // If so, remove newlines in paragraphs and directives nodes.
      case "paragraph": {
        const textNodes = findAll(node, (n) => n.type === "text");
        const text = textNodes.map((textNode) => textNode.value).join("");
        // Remove the <some-anchor-tag> markup that the rST parsing leaves 
        // in the plain text, as this skews readability.
        const unwantedText = new RegExp("<.*?>");
        desiredText.push(text.replace(unwantedText, ""));
        break;
      }
      // TODO: Clean up directive output. Check for tables, code blocks,
      // and other unwanted elements that will skew readability scores.
      case "directive": {
        const textNodes = findAll(node, (n) => n.type === "text");
        const text = textNodes.map((textNode) => textNode.value).join("");
        // Remove the <some-anchor-tag> markup that the rST parsing leaves 
        // in the plain text, as this skews readability.
        const unwantedText = new RegExp("<.*?>");
        desiredText.push(text.replace(unwantedText, ""));
        break;
      }
    }
  });
  return desiredText;
};

// TODO: Replace source constants in the files. If we're using them, they skew readability.
const replaceSourceConstants = (
  s: string,
  constants: Record<string, string>
): string => {
  return Object.keys(constants).reduce(
    (acc, cur) => acc.replace(`{+${cur}+}`, constants[cur]),
    s
  );
};

const getReadabilityText = async (args: {
  inputPath: string;
  snootyConfig: SnootyConfig;
}): Promise<void> => {
  const { inputPath, snootyConfig } = args;
  const outputPath = path.join("output", inputPath);
  const outputDir = path.dirname(outputPath);
  const rawText = await fs.readFile(inputPath, "utf8");
  const document = new MagicString(rawText);
  const rst = restructured.parse(document.original, {
    blanklines: true,
    indent: true,
    position: true,
  });
  const scorableText = getText({
    inputPath,
    document,
    rst,
    snootyConfig,
  });
  console.log(`Creating ${outputPath}`);
  console.log(`Output directory: ${outputDir}`);
  await fs.mkdir(outputDir, { recursive: true });
  await fs.writeFile(outputPath, scorableText.join("\r\n"), "utf8");
};

type ReadableArgs = { paths: string[]; snootyTomlPath?: string };

const commandModule: CommandModule<unknown, ReadableArgs> = {
  command: "getReadabilityText <paths..>",
  builder(args) {
    return args
      .positional("paths", { array: true, type: "string", demandOption: true })
      .string("snootyTomlPath");
  },
  handler: async (args) => {
    try {
      const { paths, snootyTomlPath } = args;
      const snootyConfig = await loadSnootyConfig(snootyTomlPath);
      const promises = paths.map((inputPath) =>
        getReadabilityText({ inputPath, snootyConfig })
      );
      await Promise.all(promises);
    } catch (error) {
      console.log(error);
      process.exit(1);
    }
  },
  describe: "Get text to score for readability",
};

export default commandModule;
