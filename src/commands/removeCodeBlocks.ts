import { CommandModule } from "yargs";
import { promises as fs } from "fs";
import MagicString from "magic-string";
import { visit } from "../tree";
import restructured from "../restructured";
import { AnyNode } from "restructured";
import * as path from "path";

type CodeNode = AnyNode & {
  position: {
    start: {
      offset: number;
      line: number;
      column: number;
    };
    end: {
      offset: number;
      line: number;
      column: number;
    };
  };
  //args: string; // This is the code example language
  optionLines: string[];
};

export type LanguageMapper = {
  directiveValue: string;
  canonicalValue: string;
  extension: string;
};

export enum CanonicalLanguageValues {
  BASH = "bash",
  BATCH = "batch",
  C = "c",
  CFG = "cfg",
  CPP = "cpp",
  CSHARP = "csharp",
  GO = "go",
  GROOVY = "groovy",
  HTTP = "http",
  INI = "ini",
  JAVA = "java",
  JAVASCRIPT = "javascript",
  JSON = "json",
  KOTLIN = "kotlin",
  PHP = "php",
  POWERSHELL = "powershell",
  PYTHON = "python",
  NONE = "text",
  RUBY = "ruby",
  RUST = "rust",
  SCALA = "scala",
  SHELL = "shell",
  SQL = "sql",
  SWIFT = "swift",
  TEXT = "text",
  TYPESCRIPT = "typescript",
  UNDEFINED = "undefined",
  XML = "xml",
  YAML = "yaml",
}

export enum LanguageFileExtensions {
  BASH = ".sh",
  BATCH = ".bat",
  C = ".c",
  CFG = ".cfg",
  CPP = ".cpp",
  CSHARP = ".cs",
  GO = ".go",
  GROOVY = ".groovy",
  INI = ".ini",
  JAVA = ".java",
  JAVASCRIPT = ".js",
  JSON = ".json",
  KOTLIN = ".kt",
  NONE = ".txt",
  PHP = ".php",
  POWERSHELL = "powershell",
  PYTHON = ".py",
  RUBY = ".rb",
  RUST = ".rs",
  SCALA = ".scala",
  SHELL = ".sh",
  SQL = ".sql",
  SWIFT = ".swift",
  TEXT = ".txt",
  TYPESCRIPT = ".ts",
  UNDEFINED = ".txt",
  XML = ".xml",
  YAML = ".yaml",
}

const languageValueMappings: LanguageMapper[] = [
  {
    directiveValue: "",
    canonicalValue: CanonicalLanguageValues.UNDEFINED,
    extension: LanguageFileExtensions.UNDEFINED,
  },
  {
    directiveValue: "",
    canonicalValue: CanonicalLanguageValues.UNDEFINED,
    extension: LanguageFileExtensions.UNDEFINED,
  },
  {
    directiveValue: "bash",
    canonicalValue: CanonicalLanguageValues.BASH,
    extension: LanguageFileExtensions.BASH,
  },
  {
    directiveValue: "bat",
    canonicalValue: CanonicalLanguageValues.BATCH,
    extension: LanguageFileExtensions.BATCH,
  },
  {
    directiveValue: "c",
    canonicalValue: CanonicalLanguageValues.C,
    extension: LanguageFileExtensions.C,
  },
  {
    directiveValue: "cfg",
    canonicalValue: CanonicalLanguageValues.CFG,
    extension: LanguageFileExtensions.CFG,
  },
  {
    directiveValue: "console",
    canonicalValue: CanonicalLanguageValues.SHELL,
    extension: LanguageFileExtensions.SHELL,
  },
  {
    directiveValue: "cpp",
    canonicalValue: CanonicalLanguageValues.CPP,
    extension: LanguageFileExtensions.CPP,
  },
  {
    directiveValue: "cs",
    canonicalValue: CanonicalLanguageValues.CSHARP,
    extension: LanguageFileExtensions.CSHARP,
  },
  {
    directiveValue: "csharp",
    canonicalValue: CanonicalLanguageValues.CSHARP,
    extension: LanguageFileExtensions.CSHARP,
  },
  {
    directiveValue: "go",
    canonicalValue: CanonicalLanguageValues.GO,
    extension: LanguageFileExtensions.GO,
  },
  {
    directiveValue: "golang",
    canonicalValue: CanonicalLanguageValues.GO,
    extension: LanguageFileExtensions.GO,
  },
  {
    directiveValue: "groovy",
    canonicalValue: CanonicalLanguageValues.GROOVY,
    extension: LanguageFileExtensions.GROOVY,
  },
  {
    directiveValue: "http",
    canonicalValue: CanonicalLanguageValues.HTTP,
    extension: LanguageFileExtensions.TEXT,
  },
  {
    directiveValue: "ini",
    canonicalValue: CanonicalLanguageValues.INI,
    extension: LanguageFileExtensions.INI,
  },
  {
    directiveValue: "java",
    canonicalValue: CanonicalLanguageValues.JAVA,
    extension: LanguageFileExtensions.JAVA,
  },
  {
    directiveValue: "javascript",
    canonicalValue: CanonicalLanguageValues.JAVASCRIPT,
    extension: LanguageFileExtensions.JAVASCRIPT,
  },
  {
    directiveValue: "js",
    canonicalValue: CanonicalLanguageValues.JAVASCRIPT,
    extension: LanguageFileExtensions.JAVASCRIPT,
  },
  {
    directiveValue: "json",
    canonicalValue: CanonicalLanguageValues.JSON,
    extension: LanguageFileExtensions.JSON,
  },
  {
    directiveValue: "JSON",
    canonicalValue: CanonicalLanguageValues.JSON,
    extension: LanguageFileExtensions.JSON,
  },
  {
    directiveValue: "kotlin",
    canonicalValue: CanonicalLanguageValues.KOTLIN,
    extension: LanguageFileExtensions.KOTLIN,
  },
  {
    directiveValue: "none",
    canonicalValue: CanonicalLanguageValues.NONE,
    extension: LanguageFileExtensions.NONE,
  },
  {
    directiveValue: "powershell",
    canonicalValue: CanonicalLanguageValues.POWERSHELL,
    extension: LanguageFileExtensions.POWERSHELL,
  },
  {
    directiveValue: "php",
    canonicalValue: CanonicalLanguageValues.PHP,
    extension: LanguageFileExtensions.PHP,
  },
  {
    directiveValue: "ps1",
    canonicalValue: CanonicalLanguageValues.POWERSHELL,
    extension: LanguageFileExtensions.POWERSHELL,
  },
  {
    directiveValue: "python",
    canonicalValue: CanonicalLanguageValues.PYTHON,
    extension: LanguageFileExtensions.PYTHON,
  },
  {
    directiveValue: "ruby",
    canonicalValue: CanonicalLanguageValues.RUBY,
    extension: LanguageFileExtensions.RUBY,
  },
  {
    directiveValue: "rust",
    canonicalValue: CanonicalLanguageValues.RUST,
    extension: LanguageFileExtensions.RUST,
  },
  {
    directiveValue: "scala",
    canonicalValue: CanonicalLanguageValues.SCALA,
    extension: LanguageFileExtensions.SCALA,
  },
  {
    directiveValue: "sh",
    canonicalValue: CanonicalLanguageValues.SHELL,
    extension: LanguageFileExtensions.SHELL,
  },
  {
    directiveValue: "shell",
    canonicalValue: CanonicalLanguageValues.SHELL,
    extension: LanguageFileExtensions.SHELL,
  },
  {
    directiveValue: "sql",
    canonicalValue: CanonicalLanguageValues.SQL,
    extension: LanguageFileExtensions.SQL,
  },
  {
    directiveValue: "swift",
    canonicalValue: CanonicalLanguageValues.SWIFT,
    extension: LanguageFileExtensions.SWIFT,
  },
  {
    directiveValue: "text",
    canonicalValue: CanonicalLanguageValues.TEXT,
    extension: LanguageFileExtensions.TEXT,
  },
  {
    directiveValue: "typescript",
    canonicalValue: CanonicalLanguageValues.TYPESCRIPT,
    extension: LanguageFileExtensions.TYPESCRIPT,
  },
  {
    directiveValue: "undefined",
    canonicalValue: CanonicalLanguageValues.UNDEFINED,
    extension: LanguageFileExtensions.UNDEFINED,
  },
  {
    directiveValue: "xml",
    canonicalValue: CanonicalLanguageValues.XML,
    extension: LanguageFileExtensions.XML,
  },
  {
    directiveValue: "yaml",
    canonicalValue: CanonicalLanguageValues.YAML,
    extension: LanguageFileExtensions.YAML,
  },
];

type CodeBlockWithMetadata = {
  language: string;
  fileExtension: string;
  instanceNumber: number;
  content: string;
  optionLines: string[];
};

export const removeCodeBlocks = async (
  filepath: string,
  source: string
): Promise<MagicString> => {
  const document = new MagicString(source);
  const rst = restructured.parse(document.original, {
    blanklines: true,
    indent: true,
    position: true,
  });

  const codeBlocks: CodeBlockWithMetadata[] = [];
  let codeBlockInstance = 0;
  try {
    visit(rst, (node) => {
      if (node.children === undefined) {
        return;
      }
      if (node.type !== "directive") {
        return;
      }
      if (node["directive"] !== "code-block") {
        return;
      }
      codeBlockInstance++;
      let language = "text";
      if (node.args !== undefined) {
        language = node.args as string;
      }
      const langDetails = getLangDetails(language);
      const codeNode: CodeNode = node as CodeNode;
      console.log(codeNode);
      const optionLines: string[] = [];
      if (codeNode.optionLines !== undefined) {
        console.log(`Option lines: ${codeNode.optionLines}`);
        for (const option of codeNode.optionLines) {
          console.log(`In option line loop and option is ${option}`);
          optionLines.push(option);
        }
      }
      if (codeNode.args !== undefined) {
        console.log(`Args: ${codeNode.args}`);
      }

      /* Get the text of the code block
         For Reasons, the text may be contained in an array of children of multiple types
         Each type has a different structure and needs different handling
         Get all the text from all the child nodes of the code block to build the code block contents as a string
       */
      let thisCodeBlockText = "";
      const numChildren = codeNode.children.length;
      let childCounter = 1;
      let codeBlockIndentWidth = 0;
      if (codeNode.indent?.width !== undefined) {
        codeBlockIndentWidth += codeNode.indent.width;
      }
      for (const childIndex in codeNode.children) {
        const nodeType = codeNode.children[childIndex].type;
        if (nodeType === "paragraph" || nodeType === "unknown_line") {
          if (nodeType === "paragraph") {
            const paragraphNode: AnyNode = codeNode.children[childIndex];
            for (const child of paragraphNode.children) {
              if (child.type === "text") {
                thisCodeBlockText += child.value;
              }
              if (
                child.blanklines !== undefined &&
                childCounter < numChildren
              ) {
                thisCodeBlockText += child.blanklines;
              }
            }
            if (childCounter < numChildren) {
              thisCodeBlockText += "\n";
              childCounter++;
            }
          } else {
            const unknownLineNode: AnyNode = codeNode.children[childIndex];
            let valueMinusOffset = "";
            if (unknownLineNode.value.length > codeBlockIndentWidth) {
              valueMinusOffset =
                unknownLineNode.value.slice(codeBlockIndentWidth);
            }
            thisCodeBlockText += valueMinusOffset;
            if (childCounter < numChildren) {
              thisCodeBlockText += "\n";
              childCounter++;
            }
          }
        }
      }
      // Initialize a code block type with text and metadata about the code block
      const codeBlockWithMetadata: CodeBlockWithMetadata = {
        language: langDetails.canonicalValue,
        fileExtension: langDetails.extension,
        instanceNumber: codeBlockInstance,
        content: thisCodeBlockText,
        optionLines: optionLines,
      };
      codeBlocks.push(codeBlockWithMetadata);
    });
  } catch (error) {
    console.error(error);
    return new MagicString(source); // Return unedited document
  }
  if (codeBlocks.length > 0) {
    await writeCodeBlocksToFile(filepath, codeBlocks);
  }
  return document;
};

const removeCodeBlocksInFile = async (filepath: string): Promise<void> => {
  console.log(`Reading file at path ${filepath}`);
  const rawText = await fs.readFile(filepath, "utf8");
  console.log(`Visiting ${filepath}`);
  const document = await removeCodeBlocks(filepath, rawText);
  if (!document.hasChanged()) {
    console.log(`Visited ${filepath} -- no changes made`);
    return;
  }

  console.log(`Updating ${filepath}`);
};

const getLangDetails = (directiveLang: string): LanguageMapper => {
  const languageMapping = languageValueMappings.find(
    (mapper) => mapper.directiveValue === directiveLang
  );
  if (languageMapping === undefined) {
    return {
      directiveValue: "none",
      canonicalValue: CanonicalLanguageValues.UNDEFINED,
      extension: LanguageFileExtensions.UNDEFINED,
    };
  } else {
    return languageMapping;
  }
};

export type RemoveCodeBlocksArgs = {
  path: string;
};

const writeCodeBlocksToFile = async (
  filepath: string,
  codeBlocks: CodeBlockWithMetadata[]
): Promise<void> => {
  const codeBlockDirectoryStructure =
    makeCodeBlockDirectoryFromPageFilepath(filepath);
  const directoryAbsPath = path.join(
    "/Users/dachary.carey/workspace/docdoctor/test/removeCodeBlocks/source",
    codeBlockDirectoryStructure
  );
  console.log(`Filepath: ${codeBlockDirectoryStructure}`);
  const numberOfCodeBlocks = codeBlocks.length;
  console.log(`Got ${numberOfCodeBlocks} code blocks for page`);
  for (const codeBlock of codeBlocks) {
    const filename =
      codeBlock.instanceNumber.toString() + codeBlock.fileExtension;
    const pathWithFilename = directoryAbsPath + "/" + filename;

    // Ensure the directory structure exists
    try {
      await fs.mkdir(directoryAbsPath, { recursive: true });
      await fs.writeFile(pathWithFilename, codeBlock.content, "utf8");
      console.log(`Successfully wrote code block file at: ${pathWithFilename}`);
    } catch (err) {
      console.error(`Error writing code block file: ${err}`);
    }
  }
};

const makeCodeBlockDirectoryFromPageFilepath = (filepath: string): string => {
  const startDir = "source";
  const startIndex = filepath.indexOf(startDir);
  let relativePath = "";
  if (startIndex !== -1) {
    relativePath = filepath.slice(startIndex);
  } else {
    console.error(`The directory "${startDir}" was not found in the path.`);
  }
  console.log(`Relative path: ${relativePath}`);
  // Split the path into segments
  const pathSegments = relativePath.split(path.sep);
  // Remove the first segment; note that the first segment is empty due to the initial '/'
  const removedFirstSegment =
    pathSegments.length > 1 ? pathSegments.slice(1) : [];
  // Join the remaining segments back into a path
  const pathMinusStartDir = `${path.sep}${removedFirstSegment.join(path.sep)}`;
  console.log(`Path minus start directory: ${pathMinusStartDir}`);
  const baseName = path.basename(filepath);
  const extension = path.extname(filepath);
  const untestedDir = "untested-examples";
  const codeBlockPageDir = baseName.replace(extension, "");
  console.log(`Code block page dir: ${codeBlockPageDir}`);
  const relPathIncludingSubdirs = pathMinusStartDir.replace(
    baseName,
    codeBlockPageDir
  );
  console.log(`Rel path including subdirs: ${relPathIncludingSubdirs}`);
  const codeBlockDir = path.join(untestedDir, relPathIncludingSubdirs);
  console.log(`Code block dir: ${codeBlockDir}`);
  return codeBlockDir;
};

const commandModule: CommandModule<unknown, RemoveCodeBlocksArgs> = {
  command: "removeCodeBlocks <path...>",
  builder(args) {
    return args.positional("path", {
      type: "string",
      demandOption: true,
    });
  },
  handler: async (args) => {
    try {
      console.log(`Remove code blocks command called with path ${args.path}`);
      const { path } = args;
      await removeCodeBlocksInFile(path.toString());
    } catch (error) {
      console.error(error);
      process.exit(1);
    }
  },
  describe: "Replace code blocks with literalincludes in source",
};

export default commandModule;
