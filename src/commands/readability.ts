import { CommandModule } from "yargs";
import { promises as fs } from "fs";
import restructured, { AnyNode, DirectiveNode } from "../restructured";
import MagicString from "magic-string";
import { findAll, visit } from "../tree";
import toml from "toml";
import * as path from "path";

export type SnootyConfig = {
  constants: Record<string, string>;
};

export const loadSnootyConfig = async (
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

export const getText = (args: {
  inputPath: string;
  document: MagicString;
  rst: AnyNode;
}): string[] => {
  const { inputPath, rst } = args;
  const desiredText: string[] = [];
  visit(rst, (node) => {
    switch (node.type) {
      case "title": {
        const textNodes = findAll(node, (n) => n.type === "text");
        let text = textNodes.map((textNode) => textNode.value).join("");
        // If the last character of the title is not a period, add one.
        // Missing periods negatively impact readability.
        const lastTitleChar = text.charAt(text.length - 1);
        if (lastTitleChar != ".") {
          text = text + ".";
        }
        desiredText.push(text + "\n");
        break;
      }
      case "paragraph": {
        const textNodes = findAll(node, (n) => n.type === "text");
        let text = textNodes.map((textNode) => textNode.value).join("");
        // Remove the <some-anchor-tag> markup that the rST parsing leaves
        // in the plain text, as this skews readability.
        const unwantedText = new RegExp("<.*?>");
        text = text.replace(unwantedText, "");
        // In the case of bullet items, we want a period to avoid skewing
        // readability. Add a period to the end of a paragraph if there
        // isn't one.
        // The character to check has to be at index -2 because index -1 is a newline
        const penultimateParagraphChar = text.charAt(text.length - 2);
        const lastCharacter = text.charAt(text.length - 1);
        const acceptibleLastChar = [".", "!", "?", ":"];
        if (!acceptibleLastChar.includes(penultimateParagraphChar)) {
          text = text.replace(lastCharacter, ".\n");
        }
        desiredText.push(text);
        break;
      }
      // TODO: Clean up directive output. Check for tables, code blocks,
      // and other unwanted elements that will skew readability scores.
      case "directive": {
        const directiveNode = node as DirectiveNode;
        // If the node in the directive is an option, remove it.
        directiveNode.children.slice(directiveNode.optionLines?.length ?? 0);
        if (directiveNode.directive === "contents") {
          console.log(JSON.stringify(directiveNode));
        }
        //console.log(directiveNode.optionLines?.length);
        // TODO: do things with directive nodes that aren't options.
        // Need to figure out how to get access to the contents of directiveNode
        // children that are not options. I want the text in directive nodes for
        // readability scoring.
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
      console.error(error);
      process.exit(1);
    }
  },
  describe: "Get text to score for readability",
};

export default commandModule;
