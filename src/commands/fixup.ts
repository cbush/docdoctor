import { CommandModule } from "yargs";
import { promises as fs } from "fs";
import restructured from "restructured";
import { find, visit } from "../tree";

const fixup = async (path: string): Promise<void> => {
  const rst = await fs.readFile(path, "utf8");
  const parsed = restructured.parse(rst, {
    blanklines: true,
    indent: true,
    position: true,
  });

  let sectionDepth = 0;
  visit(parsed, (node) => {
    switch (node.type) {
      case "section":
        sectionDepth = node.depth as number;
        break;
      case "title": {
        const text = find(node, (n) => n.type === "text");
        console.log(`${sectionDepth} - ${text?.value}`);
        break;
      }
    }
  });
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
