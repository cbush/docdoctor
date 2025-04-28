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
export const LanguageValueMappings: LanguageMapper[] = [
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