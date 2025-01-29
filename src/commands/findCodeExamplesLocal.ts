import { promises as fs } from "fs";
import { CommandModule } from "yargs";
import { findAll } from "../tree";
import { AnyNode, ParentNode } from "restructured";
import restructured from "../restructured";
import MagicString from "magic-string";

export type PageContent = {
  filepath: string;
  ast: AnyNode;
};

type DirectiveNode = ParentNode & {
  type: "directive";
  name: string;
};

const findDirectives = (ast: ParentNode) => {
  return (
    findAll(ast, ({ type }) => type === "directive") as DirectiveNode[]
  ).filter((node) => node !== ast); // exclude self
};

const findDirectivesNamed = (ast: ParentNode, named: string | string[]) => {
  const names = Array.isArray(named) ? named : [named];
  return findDirectives(ast).filter(({ name }) => names.includes(name));
};

const countCodeDirectives = (ast: ParentNode, named: string | string[]) => {
  return findDirectivesNamed(ast, named).reduce(
    (acc, cur) => acc + findDirectivesNamed(cur, named).length,
    0
  );
};

enum CodeDirectiveNames {
  CODE_BLOCK = "code-block",
  CODE = "code",
  IO_CODE_BLOCK = "io-code-block",
  LITERAL_INCLUDE = "literalinclude",
}

enum CodeLanguageNames {
  SHELL = "shell",
  CSHARP = "csharp",
}

const loadPageContent = async (args: {
  filepath: string;
}): Promise<PageContent> => {
  const path =
    "/Users/dachary.carey/workspace/docdoctor/test/code/nested.rst";

  const rawText = await fs.readFile(path, "utf8");
  const document = new MagicString(rawText);
  const rst = restructured.parse(document.original, {
    blanklines: true,
    indent: true,
    position: true,
  });
  const data = { filepath: path, ast: rst };
  console.log(data);
  let codeBlockCounter = 0;
  let codeCounter = 0;
  let ioCodeBlockCounter = 0;
  let literalIncludeCounter = 0;
  let shellCounter = 0;
  let cSharpCounter = 0;
  let unknownLanguageCounter = 0;
  data.ast.children.forEach((node) => {
    node.children.forEach((childNode) => {
      switch (childNode.type) {
        case "directive":
          console.log("Found a directive node");
          console.log(childNode);
          switch (childNode.directive) {
            case CodeDirectiveNames.CODE_BLOCK:
              codeBlockCounter++;
              if (childNode.args) {
                switch (childNode.args) {
                  case CodeLanguageNames.SHELL:
                    shellCounter++;
                    break;
                  case CodeLanguageNames.CSHARP:
                    cSharpCounter++;
                    break;
                  default:
                    unknownLanguageCounter++;
                    break;
                }
              } else {
                unknownLanguageCounter++;
              }
              break;
            case CodeDirectiveNames.CODE:
              codeCounter++;
              break;
            case CodeDirectiveNames.IO_CODE_BLOCK:
              ioCodeBlockCounter++;
              break;
            case CodeDirectiveNames.LITERAL_INCLUDE:
              literalIncludeCounter++;
              break;
            default:
              break;
          }
          break;
        default:
          break;
      }
    });
  });
  console.log("Found %s code-blocks", codeBlockCounter);
  console.log("Found %s code", codeCounter);
  console.log("Found %s io-code-block", ioCodeBlockCounter);
  console.log("Found %s literalincludes", literalIncludeCounter);
  console.log("Found %s shell examples", shellCounter);
  console.log("Found %s C# examples", cSharpCounter);
  console.log("Found %s unknown language examples", unknownLanguageCounter);
  return data;
};

type CodeExampleArgs = { filepath: string };

const commandModule: CommandModule<unknown, CodeExampleArgs> = {
  command: "getCodeExamplesLocal <path..>",
  builder(args) {
    return args.positional("filepath", {
      array: false,
      type: "string",
      demandOption: true,
    });
  },
  handler: async (args) => {
    try {
      const { filepath } = args;
      await loadPageContent({ filepath });
    } catch (error) {
      console.error(error);
      process.exit(1);
    }
  },
  describe: "Get code examples from local files",
};

export default commandModule;
