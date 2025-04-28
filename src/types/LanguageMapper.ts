/**
 * Associates a normalized language value with a given directive value, as well as a file extension for the normalized lang
 */
export type LanguageMapper = {
  /** The language that the writer provides when constructing a code-block - i.e. `code-block:: shell` */
  directiveValue: string;
  /** The normalized language value after comparing it with our LanguageValueMappings */
  canonicalValue: string;
  /** A file extension associated with the canonical language value for writing the code block to file */
  extension: string;
};
