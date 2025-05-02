import { LanguageMapper } from "./LanguageMapper";
import { CanonicalLanguageValues } from "./CanonicalLanguageValues";
import { LanguageFileExtensions } from "./LanguageFileExtensions";

/**
 * Look up the directive value provided by the writer, and associate it with
 * a 'canonical' language value and file extension. Used to normalize the programming
 * languages used on code-block directives when we replace them with literalincludes.
 */
/*
 * We use this structure instead of a map because we don't *want* writers to add new languages.
 * If writeres add unsupported languages, we map them to "undefined" and make the
 * language text and the file extension .txt
 */
export const LanguageValueMappings: Record<string, LanguageMapper> = {
  "": {
    canonicalValue: CanonicalLanguageValues.UNDEFINED,
    extension: LanguageFileExtensions.UNDEFINED,
  },
  bash: {
    canonicalValue: CanonicalLanguageValues.BASH,
    extension: LanguageFileExtensions.BASH,
  },
  bat: {
    canonicalValue: CanonicalLanguageValues.BATCH,
    extension: LanguageFileExtensions.BATCH,
  },
  c: {
    canonicalValue: CanonicalLanguageValues.C,
    extension: LanguageFileExtensions.C,
  },
  cfg: {
    canonicalValue: CanonicalLanguageValues.CFG,
    extension: LanguageFileExtensions.CFG,
  },
  console: {
    canonicalValue: CanonicalLanguageValues.SHELL,
    extension: LanguageFileExtensions.SHELL,
  },
  cpp: {
    canonicalValue: CanonicalLanguageValues.CPP,
    extension: LanguageFileExtensions.CPP,
  },
  cs: {
    canonicalValue: CanonicalLanguageValues.CSHARP,
    extension: LanguageFileExtensions.CSHARP,
  },
  csharp: {
    canonicalValue: CanonicalLanguageValues.CSHARP,
    extension: LanguageFileExtensions.CSHARP,
  },
  go: {
    canonicalValue: CanonicalLanguageValues.GO,
    extension: LanguageFileExtensions.GO,
  },
  golang: {
    canonicalValue: CanonicalLanguageValues.GO,
    extension: LanguageFileExtensions.GO,
  },
  groovy: {
    canonicalValue: CanonicalLanguageValues.GROOVY,
    extension: LanguageFileExtensions.GROOVY,
  },
  http: {
    canonicalValue: CanonicalLanguageValues.HTTP,
    extension: LanguageFileExtensions.TEXT,
  },
  ini: {
    canonicalValue: CanonicalLanguageValues.INI,
    extension: LanguageFileExtensions.INI,
  },
  java: {
    canonicalValue: CanonicalLanguageValues.JAVA,
    extension: LanguageFileExtensions.JAVA,
  },
  javascript: {
    canonicalValue: CanonicalLanguageValues.JAVASCRIPT,
    extension: LanguageFileExtensions.JAVASCRIPT,
  },
  js: {
    canonicalValue: CanonicalLanguageValues.JAVASCRIPT,
    extension: LanguageFileExtensions.JAVASCRIPT,
  },
  json: {
    canonicalValue: CanonicalLanguageValues.JSON,
    extension: LanguageFileExtensions.JSON,
  },
  JSON: {
    canonicalValue: CanonicalLanguageValues.JSON,
    extension: LanguageFileExtensions.JSON,
  },
  kotlin: {
    canonicalValue: CanonicalLanguageValues.KOTLIN,
    extension: LanguageFileExtensions.KOTLIN,
  },
  none: {
    canonicalValue: CanonicalLanguageValues.NONE,
    extension: LanguageFileExtensions.NONE,
  },
  powershell: {
    canonicalValue: CanonicalLanguageValues.POWERSHELL,
    extension: LanguageFileExtensions.POWERSHELL,
  },
  php: {
    canonicalValue: CanonicalLanguageValues.PHP,
    extension: LanguageFileExtensions.PHP,
  },
  ps1: {
    canonicalValue: CanonicalLanguageValues.POWERSHELL,
    extension: LanguageFileExtensions.POWERSHELL,
  },
  python: {
    canonicalValue: CanonicalLanguageValues.PYTHON,
    extension: LanguageFileExtensions.PYTHON,
  },
  ruby: {
    canonicalValue: CanonicalLanguageValues.RUBY,
    extension: LanguageFileExtensions.RUBY,
  },
  rust: {
    canonicalValue: CanonicalLanguageValues.RUST,
    extension: LanguageFileExtensions.RUST,
  },
  scala: {
    canonicalValue: CanonicalLanguageValues.SCALA,
    extension: LanguageFileExtensions.SCALA,
  },
  sh: {
    canonicalValue: CanonicalLanguageValues.SHELL,
    extension: LanguageFileExtensions.SHELL,
  },
  shell: {
    canonicalValue: CanonicalLanguageValues.SHELL,
    extension: LanguageFileExtensions.SHELL,
  },
  sql: {
    canonicalValue: CanonicalLanguageValues.SQL,
    extension: LanguageFileExtensions.SQL,
  },
  swift: {
    canonicalValue: CanonicalLanguageValues.SWIFT,
    extension: LanguageFileExtensions.SWIFT,
  },
  text: {
    canonicalValue: CanonicalLanguageValues.TEXT,
    extension: LanguageFileExtensions.TEXT,
  },
  typescript: {
    canonicalValue: CanonicalLanguageValues.TYPESCRIPT,
    extension: LanguageFileExtensions.TYPESCRIPT,
  },
  undefined: {
    canonicalValue: CanonicalLanguageValues.UNDEFINED,
    extension: LanguageFileExtensions.UNDEFINED,
  },
  xml: {
    canonicalValue: CanonicalLanguageValues.XML,
    extension: LanguageFileExtensions.XML,
  },
  yaml: {
    canonicalValue: CanonicalLanguageValues.YAML,
    extension: LanguageFileExtensions.YAML,
  },
};
