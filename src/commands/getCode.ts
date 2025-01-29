import { CommandModule } from "yargs";
import { promises as fs } from "fs";
import restructured, { AnyNode, DirectiveNode } from "../restructured";
import MagicString from "magic-string";
import { findAll, visit } from "../tree";
import * as path from "path";

export const getCode = (args: { rst: AnyNode }): string[] => {
  const { rst } = args;
  const desiredText: string[] = [];
  visit(rst, (node) => {
    switch (node.type) {
      case "code": {
        // TODO: Clean up directive output. Check for tables, code blocks,
        // and other unwanted elements that will skew readability scores.
        const codeNodes = findAll(node, (n) => n.type === "code");
        const text = codeNodes.map((textNode) => textNode.value).join("");
        desiredText.push(text + "\n");
        break;
      }
    }
  });
  return desiredText;
};

const getCodeText = async (args: { inputPath: string }): Promise<void> => {
  const { inputPath } = args;
  const outputPath = path.join("output", inputPath);
  const outputDir = path.dirname(outputPath);
  const rawText = await fs.readFile(inputPath, "utf8");
  const document = new MagicString(rawText);
  console.log(document);
  const rst = restructured.parse(document.original, {
    blanklines: true,
    indent: true,
    position: true,
  });
  const scorableText = getCode({
    rst,
  });
  console.log(`Creating ${outputPath}`);
  console.log(`Output directory: ${outputDir}`);
  await fs.mkdir(outputDir, { recursive: true });
  await fs.writeFile(outputPath, scorableText.join("\r\n"), "utf8");
};

type ReadableArgs = { paths: string[]; snootyTomlPath?: string };

const commandModule: CommandModule<unknown, ReadableArgs> = {
  command: "getCode <paths..>",
  builder(args) {
    return args.positional("paths", {
      array: true,
      type: "string",
      demandOption: true,
    });
  },
  handler: async (args) => {
    try {
      const { paths } = args;
      const promises = paths.map((inputPath) => getCodeText({ inputPath }));
      await Promise.all(promises);
    } catch (error) {
      console.error(error);
      process.exit(1);
    }
  },
  describe: "Get code",
};

export default commandModule;
