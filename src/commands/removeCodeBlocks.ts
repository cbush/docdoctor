import { CommandModule } from "yargs";
import { promises as fs } from "fs";
import MagicString from "magic-string";
import { visit } from "../tree";
import restructured from "../restructured";
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

      // We use the code block instance number on the page as a name for the code block file
      codeBlockInstance++;

      // If a writer has provided a language for the code block, its value is the `args` field
      let language = "text";
      if (node.args !== undefined) {
        language = node.args as string;
      }
      // Normalize the language value, and get the corresponding file extension
      const langDetails = getLangDetails(language);

      // Capture any option lines that are present on the code block, such as ':emphasize-lines: 2'
      const optionLines: string[] = [];
      if (node["optionLines"] !== undefined) {
        const optionsFromDirective = node["optionLines"] as string[];
        for (const option of optionsFromDirective) {
          const trimmedOption = option.trim();
          optionLines.push(trimmedOption);
        }
      }

      /* The 'restructured' library that this project uses handles child nodes
       * suboptimally. It interprets the code block value as many different child
       * nodes, often of different directive types with different structures.
       * Instead of trying to derive the code block text as through reading the
       * values of many different child nodes, we capture the entirety of the
       * `code-block` directive as text, and manipulate it to get the code block
       * content, remove any nested indentation, and write it to file.
       */
      const directiveAndValueText = document.slice(
        node.position.start.offset,
        node.position.end.offset
      );

      /* Use this to trim any indentation from the code block text, as when the
       * code block is nested in a tab or other directive type.
       */
      const trimCodeBlockWidth = node.position.start.column;
      const formattedCodeBlockText = getFormattedCodeBlockTextFromDirective(
        directiveAndValueText,
        trimCodeBlockWidth
      );

      const codeBlockFilePath = makeCodeBlockFilePath(
        filepath,
        codeBlockInstance,
        langDetails.extension
      );
      // Initialize a code block type with text and metadata about the code block
      const codeBlockWithMetadata: CodeBlockWithMetadata = {
        language: langDetails.canonicalValue,
        filepath: codeBlockFilePath,
        content: formattedCodeBlockText,
        optionLines: optionLines,
      };
      codeBlocks.push(codeBlockWithMetadata);

      /* If there is an indent width, as when the code block is nested in a 'step' directive
         or a 'tab' directive, calculate an offset for the start location to account for the indent
      */
      let literalIncludeStartIndentWidth = 0;
      if (node["indent"] !== undefined) {
        const indentDetails = node["indent"];
        if (indentDetails?.width !== undefined) {
          literalIncludeStartIndentWidth = indentDetails?.width;
        }
      }

      // Construct literalinclude
      const literalInclude = makeLiteralInclude(
        codeBlockWithMetadata,
        literalIncludeStartIndentWidth
      );

      // Replace original code block directive with literalinclude
      let start = node.position.start.offset;
      const end = node.position.end.offset;

      if (literalIncludeStartIndentWidth > 0) {
        // Subtract three from the indent width for the `.. ` at the beginning of the code-block directive
        start = start + literalIncludeStartIndentWidth - 3;
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
 * Remove the code block directive and option lines, and get only the code text itself
 * @param inputString - The entirety of the code block directive, including the `.. code-block::` directive start and code content
 * @param indentWidth - The start column of the code block text, to properly adjust the offset to un-indent nested content
 */
const getFormattedCodeBlockTextFromDirective = (
  inputString: string,
  indentWidth: number
): string => {
  // Split the input string into lines
  const lines = inputString.split("\n");

  let index = 0;

  // Skip the initial `.. code-block::` line
  if (lines[index].trimStart().startsWith(".. code-block::")) {
    index++;
  }

  // Skip any `:option:` lines
  while (index < lines.length && lines[index].trimStart().startsWith(":")) {
    index++;
  }

  // Skip the blank line
  while (index < lines.length && lines[index].trim() === "") {
    index++;
  }

  // Collect the remaining lines starting from the first non-meta line
  const remainingLines = lines.slice(index);
  const trimmedLines: string[] = [];
  for (const line of remainingLines) {
    trimmedLines.push(trimLeadingNSpaces(line, indentWidth + 2));
  }

  // Return the remaining lines joined back into a string
  let codeBlockLines = trimmedLines.join("\n");

  // Trim any extra newlines from the end
  codeBlockLines = codeBlockLines.replace(/\n+$/, "");
  codeBlockLines += "\n";
  return codeBlockLines;
};

/**
 * Remove the first N spaces from a line. Used to un-indent nested content.
 *
 * @param input - The string to trim - in this case, code block text
 * @param N - The number of spaces to trim from the line, derived from the node.position.start.column
 */
const trimLeadingNSpaces = (input: string, N: number): string => {
  let index = 0;

  // Iterate through the string character by character, up to N characters
  while (index < input.length && index < N && input[index] === " ") {
    index++;
  }

  // Return the substring starting from the first character after the spaces
  return input.slice(index);
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
  command: "removeCodeBlocks <path...>",
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
