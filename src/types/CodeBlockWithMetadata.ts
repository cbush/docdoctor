/**
 * Capture metadata associated with a code block (and the code block content itself)
 * for use when writing it to file, and for replacing the code block with a
 * literalinclude directive on the doc page
 */
export type CodeBlockWithMetadata = {
  /** The normalized language value after comparing the writer-provided directive value with our canonical values */
  language: string;
  /** The file path where the code block will be written. Used to write to file and also as literalinclude file path */
  filepath: string;
  /** The contents of the code block, for writing to file */
  content: string;
  /** Any options that the writer specified on the original code block. Copied to literalinclude. */
  optionLines: string[];
};
