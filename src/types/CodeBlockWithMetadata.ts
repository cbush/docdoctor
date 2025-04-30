/**
 * Capture metadata associated with a code block (and the code block content itself)
 * for use when writing it to file, and for replacing the code block with a
 * literalinclude directive on the doc page
 */
export type CodeBlockWithMetadata = {
  /** The normalized language value after comparing the writer-provided directive value with our canonical values */
  language: string;
  /** The file path where the code block will be written. Uses absolute dir to write file. */
  writeFilepath: string;
  /** The file path to use in the literalinclude. Uses relative path relative to `source` directory. */
  literalincludeFilepath: string;
  /** The directory where we should write the code block, derived from the docs page filepath and page name. Used to
   * make the directory before performing the write operation. */
  codeBlockDirectory: string;
  /** The contents of the code block, for writing to file */
  content: string;
  /** Any options that the writer specified on the original code block. Copied to literalinclude. */
  optionLines: string[];
};
