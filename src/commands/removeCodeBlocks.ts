import { CommandModule } from "yargs";
import { promises as fs } from "fs";
import MagicString from "magic-string";
import { visit } from "../tree";
import restructured from "../restructured";
import { AnyNode } from "restructured";
import { CodeNode } from "../types/CodeNode";
import { CanonicalLanguageValues } from "../types/CanonicalLanguageValues";
import { LanguageFileExtensions } from "../types/LanguageFileExtensions";
import { LanguageValueMappings } from "../types/LanguageValueMappings";
import * as path from "path";
import { LanguageMapper } from "../types/LanguageMapper";
import { CodeBlockWithMetadata } from "../types/CodeBlockWithMetadata";

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
      const optionLines: string[] = [];
      if (codeNode.optionLines !== undefined) {
        for (const option of codeNode.optionLines) {
          const trimmedOption = option.trim();
          optionLines.push(trimmedOption);
        }
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
                // child.blanklines !== undefined &&
                // childCounter < numChildren
                child.blanklines !== undefined
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
            if (unknownLineNode.blanklines !== undefined) {
              thisCodeBlockText += unknownLineNode.blanklines;
            }
            if (childCounter < numChildren) {
              thisCodeBlockText += "\n";
              childCounter++;
            }
          }
        }
      }
      const codeBlockFilePath = makeCodeBlockFilePath(
        filepath,
        codeBlockInstance,
        langDetails.extension
      );
      // Initialize a code block type with text and metadata about the code block
      const codeBlockWithMetadata: CodeBlockWithMetadata = {
        language: langDetails.canonicalValue,
        filepath: codeBlockFilePath,
        content: thisCodeBlockText,
        optionLines: optionLines,
      };
      codeBlocks.push(codeBlockWithMetadata);

      // Construct literalinclude
      const literalInclude = makeLiteralInclude(
        codeBlockWithMetadata,
        codeBlockIndentWidth
      );

      // Replace original code block directive with literalinclude
      let start = node.position.start.offset;
      const end = node.position.end.offset;

      /* If there is an indent width, as when the code block is nested in a 'step' directive
         or a 'tab' directive, calculate an offset for the start location to account for the indent
      */
      if (codeBlockIndentWidth > 0) {
        // Subtract three from the indent width for the `.. ` at the beginning of the code-block directive
        start = start + codeBlockIndentWidth - 3;
      }
      document.overwrite(start, end, literalInclude);
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

/**
 * Create a literalinclude to replace the code-block directive
 * @param codeBlock - Use the filename, language, and optionLines metadata from the code block to construct the literalinclude
 * @param indentWidth - If there is an indent, as when the literalinclude is nested, use the indent width to pad the literalinclude appropriately
 */
export const makeLiteralInclude = (
  codeBlock: CodeBlockWithMetadata,
  indentWidth: number
): string => {
  let literalInclude = `.. literalinclude:: ${codeBlock.filepath}\n`;
  /* Some of the directive nodes have specific indents, such as when they're used in
     a 'step' directive or a 'tab' directive. If there is a specific indent, add
     that indent's worth of spaces to the front of the option lines to get them to line up.
     Otherwise, add three spaces to get the options to line up with the base directive.
   */
  let padding = "";
  if (indentWidth > 0) {
    padding = " ".repeat(indentWidth);
  } else {
    padding = " ".repeat(3);
  }
  // The 'language' option should always follow the literalinclude
  literalInclude += padding + `:language: ${codeBlock.language}\n`;

  // If the code-block has additional options, add them after the language
  const optionCount = codeBlock.optionLines.length;
  if (optionCount > 0) {
    for (const option of codeBlock.optionLines) {
      literalInclude += padding + option + `\n`;
    }
  }
  // Add another newline to the end of the literalinclude to get an empty line after the directive
  literalInclude += `\n`;
  return literalInclude;
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
  await fs.writeFile(filepath, document.toString(), "utf8");
};

/**
 * Attempts to normalize the code example language provided in the directive and determine an associated filepath
 *
 * @param directiveLang - the language that the writer supplied in the directive - i.e. `code-block:: shell`
 * @returns { LanguageMapper } struct that contains the directive language value, the normalized lang value, and file extension
 */
const getLangDetails = (directiveLang: string): LanguageMapper => {
  const languageMapping = LanguageValueMappings.find(
    (mapper) => mapper.directiveValue === directiveLang
  );
  // If no language is provided, or an invalid language is provided, set it as "undefined" and use the associated file extension (text, .txt)
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

/**
 * Make a file path for the code block that we'll write to file, and we'll use the file path in the literalinclude that
 * replaces the code block directive.
 *
 * @param filepath - The existing docs file filepath, which we use as a directory to store the code blocks we write to file
 * @param instanceNumber - Because we don't have filenames for the code blocks, use the instance number of the code block on the page as the filename
 * @param fileExtension - The file extension associated with the canonical programming language, so we can write the code block to an appropriate file type
 */
const makeCodeBlockFilePath = (
  filepath: string,
  instanceNumber: number,
  fileExtension: string
): string => {
  const codeBlockDirectoryStructure =
    makeCodeBlockDirectoryFromPageFilepath(filepath);
  // TODO: Replace this with a relpath from the passed-in start path
  const directoryAbsPath = path.join(
    "/Users/dachary.carey/workspace/docdoctor/test/removeCodeBlocks/source",
    codeBlockDirectoryStructure
  );
  const filename = instanceNumber.toString() + fileExtension;
  return directoryAbsPath + "/" + filename;
};

/**
 * Write the code blocks from the page to files of the appropriate type at the appropriate location in the `untested-files` directory
 *
 * @param filepath - The page file path, for creating a relevant directory so we can write files to it
 * @param codeBlocks - Array of code blocks from the page, with their associated metadata, for writing to file
 */
const writeCodeBlocksToFile = async (
  filepath: string,
  codeBlocks: CodeBlockWithMetadata[]
): Promise<void> => {
  const codeBlockDirectoryStructure =
    makeCodeBlockDirectoryFromPageFilepath(filepath);
  // TODO: Replace this with a relpath from the passed-in start path
  const directoryAbsPath = path.join(
    "/Users/dachary.carey/workspace/docdoctor/test/removeCodeBlocks/source",
    codeBlockDirectoryStructure
  );
  console.log(`Got ${codeBlocks.length} code blocks for page`);
  for (const codeBlock of codeBlocks) {
    // Ensure the directory structure exists
    try {
      await fs.mkdir(directoryAbsPath, { recursive: true });
      await fs.writeFile(codeBlock.filepath, codeBlock.content, "utf8");
      console.log(
        `Successfully wrote code block file at: ${codeBlock.filepath}`
      );
    } catch (err) {
      console.error(`Error writing code block file: ${err}`);
    }
  }
};

/**
 * Turn the filepath from the documentation page into a directory at the given directory structure. This dir will hold the code blocks from the page.
 *
 * @param filepath - The filepath of the documentation page whose code blocks we're replacing with literalincludes
 * @returns A directory structure that matches the docs page location in the repo, whose last element is the name of the documentation page
 * */
// TODO: Currently calling this twice - once from makeCodeBlockFilePath and once from writeCodeBlocksToFile. Store this as metadta on the page so we don't need to call it twice.
const makeCodeBlockDirectoryFromPageFilepath = (filepath: string): string => {
  const startDir = "source";
  const startIndex = filepath.indexOf(startDir);
  let relativePath = "";
  if (startIndex !== -1) {
    relativePath = filepath.slice(startIndex);
  } else {
    console.error(`The directory "${startDir}" was not found in the path.`);
  }
  // Split the path into segments
  const pathSegments = relativePath.split(path.sep);
  // Remove the first segment; note that the first segment is empty due to the initial '/'
  const removedFirstSegment =
    pathSegments.length > 1 ? pathSegments.slice(1) : [];
  // Join the remaining segments back into a path
  const pathMinusStartDir = `${path.sep}${removedFirstSegment.join(path.sep)}`;
  const baseName = path.basename(filepath);
  const extension = path.extname(filepath);
  const untestedDir = "untested-examples";
  const codeBlockPageDir = baseName.replace(extension, "");
  const relPathIncludingSubdirs = pathMinusStartDir.replace(
    baseName,
    codeBlockPageDir
  );
  return path.join(untestedDir, relPathIncludingSubdirs);
};

/**
 * Recursively walks through directories and applies an async callback to each file.
 *
 * @param dirPath - The directory path to start from.
 * @param callback - An async function to execute on each file, with the file path as an argument.
 */
async function walkDirectory(
  dirPath: string,
  callback: (filePath: string) => Promise<void>
): Promise<void> {
  const entries = await fs.readdir(dirPath);

  for (const entry of entries) {
    const entryPath = path.join(dirPath, entry);
    const stats = await fs.stat(entryPath);

    if (stats.isDirectory()) {
      // We don't want to process any files in the 'untested-examples' directory
      if (entryPath.includes("untested-examples")) {
        continue;
      }
      await walkDirectory(entryPath, callback); // Recurse into subdirectory
    } else if (stats.isFile()) {
      await callback(entryPath);
    }
  }
}

const commandModule: CommandModule<unknown, RemoveCodeBlocksArgs> = {
  command: "removeCodeBlocks <start dir...>",
  builder(args) {
    return args.positional("path", {
      type: "string",
      describe:
        "Start directory path where you want to removeCodeBlocks. Recursively checks/updates all files in all subdirectories.",
      demandOption: true,
    });
  },
  handler: async (args) => {
    try {
      console.log(
        `Remove code blocks command called with start directory: ${args.path}`
      );
      const { path } = args;
      //await removeCodeBlocksInFile(path.toString());
      walkDirectory(path.toString(), removeCodeBlocksInFile)
        .then(() => console.log("Directory processing complete"))
        .catch((err) =>
          console.error(`Error walking directory: ${err.message}`)
        );
    } catch (error) {
      console.error(error);
      process.exit(1);
    }
  },
  describe: "Replace code blocks with literalincludes in source",
};

export default commandModule;
