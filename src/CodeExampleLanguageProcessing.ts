import { CodeNode } from "./CodeExampleTypes";
import { DirectiveNode } from "./workWithDirectives";

export type LanguageMapper = {
  directiveValue: string;
  canonicalValue: string;
  extension: string;
};

export enum CanonicalLanguageValues {
  BASH = "bash",
  C = "c",
  CPP = "cpp",
  CSHARP = "csharp",
  GO = "go",
  JAVA = "java",
  JAVASCRIPT = "javascript",
  JSON = "json",
  KOTLIN = "kotlin",
  PHP = "php",
  PYTHON = "python",
  RUBY = "ruby",
  RUST = "rust",
  SCALA = "scala",
  SHELL = "shell",
  SWIFT = "swift",
  TEXT = "text",
  TYPESCRIPT = "typescript",
  UNDEFINED = "undefined",
  XML = "xml",
  YAML = "yaml",
}

export enum LanguageFileExtensions {
  BASH = ".sh",
  C = ".c",
  CPP = ".cpp",
  CSHARP = ".cs",
  GO = ".go",
  JAVA = ".java",
  JAVASCRIPT = ".js",
  JSON = ".json",
  KOTLIN = ".kt",
  PHP = ".php",
  PYTHON = ".py",
  RUBY = ".rb",
  RUST = ".rs",
  SCALA = ".scala",
  SHELL = ".sh",
  SWIFT = ".swift",
  TEXT = ".txt",
  TYPESCRIPT = ".ts",
  UNDEFINED = ".txt",
  XML = ".xml",
  YAML = ".yaml",
}

export const languageValueMappings: LanguageMapper[] = [
  {
    directiveValue: "",
    canonicalValue: CanonicalLanguageValues.UNDEFINED,
    extension: LanguageFileExtensions.UNDEFINED,
  },
  {
    directiveValue: '',
    canonicalValue: CanonicalLanguageValues.UNDEFINED,
    extension: LanguageFileExtensions.UNDEFINED,
  },
  {
    directiveValue: "bash",
    canonicalValue: CanonicalLanguageValues.BASH,
    extension: LanguageFileExtensions.BASH,
  },
  {
    directiveValue: "c",
    canonicalValue: CanonicalLanguageValues.C,
    extension: LanguageFileExtensions.C,
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
    directiveValue: "http",
    canonicalValue: CanonicalLanguageValues.TEXT,
    extension: LanguageFileExtensions.TEXT,
  },
  {
    directiveValue: "ini",
    canonicalValue: CanonicalLanguageValues.TEXT,
    extension: LanguageFileExtensions.TEXT,
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
    canonicalValue: CanonicalLanguageValues.UNDEFINED,
    extension: LanguageFileExtensions.UNDEFINED,
  },
  {
    directiveValue: "php",
    canonicalValue: CanonicalLanguageValues.PHP,
    extension: LanguageFileExtensions.PHP,
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
  {
    directiveValue: "json\\n :copyable: false",
    canonicalValue: CanonicalLanguageValues.JSON,
    extension: ".json",
  },
  {
    directiveValue: "json\\n:copyable: true",
    canonicalValue: CanonicalLanguageValues.JSON,
    extension: ".json",
  },
];

export type LanguageCount = {
  language: string;
  count: number;
};

export const getLanguageDetailsForCodeNode = (
  node: CodeNode
): LanguageMapper => {
  if (node.lang != null) {
    const mapping = languageValueMappings.find(
      (mapper) => mapper.directiveValue === node.lang
    );
    if (mapping != undefined) {
      return mapping;
    } else {
      return {
        directiveValue: "none",
        canonicalValue: CanonicalLanguageValues.UNDEFINED,
        extension: LanguageFileExtensions.UNDEFINED,
      };
    }
  } else {
    return {
      directiveValue: "none",
      canonicalValue: CanonicalLanguageValues.UNDEFINED,
      extension: LanguageFileExtensions.UNDEFINED,
    };
  }
};

export const getLanguageDetailsForLiteralInclude = (
  node: DirectiveNode
): LanguageMapper => {
  const maybeChildNode = node.children[0] as CodeNode;
  const maybeNodeChildLang = maybeChildNode.lang;
  if (maybeNodeChildLang != null) {
    const language: string = maybeNodeChildLang as string;
    const mapping = languageValueMappings.find(
      (mapper) => mapper.directiveValue === language
    );
    if (mapping != undefined) {
      return mapping;
    } else {
      return {
        directiveValue: "none",
        canonicalValue: CanonicalLanguageValues.UNDEFINED,
        extension: LanguageFileExtensions.UNDEFINED,
      };
    }
  } else {
    const maybeNodeLang = node.options?.language;
    if (maybeNodeLang != undefined) {
      const language = maybeNodeLang;
      const mapping = languageValueMappings.find(
        (mapper) => mapper.directiveValue === language
      );
      if (mapping != undefined) {
        return mapping;
      } else {
        /* TODO: Maybe want to look at node.argument[0].value and try to parse the filepath/extension for language mapping
         * Would need to add to the DirectiveNode an array of 'argument' with the following properties:
         * type: string, position: object, value: string
         * The 'value' field would contain the filepath with extension, similar to:
         * value: '/includes/avs-examples/index-management/create-index/basic-example-coroutine.kt'
         */
        return {
          directiveValue: "none",
          canonicalValue: CanonicalLanguageValues.UNDEFINED,
          extension: LanguageFileExtensions.UNDEFINED,
        };
      }
    } else {
      return {
        directiveValue: "none",
        canonicalValue: CanonicalLanguageValues.UNDEFINED,
        extension: LanguageFileExtensions.UNDEFINED,
      };
    }
  }
};

export const getLanguageDetailsForIoCodeBlock = (
  node: DirectiveNode
): LanguageMapper => {
  const maybeNodeLanguage = node.options?.language;
  const maybeChildNode = node.children[0];
  if (maybeNodeLanguage != undefined) {
    const mapping = languageValueMappings.find(
      (mapper) => mapper.directiveValue == (maybeNodeLanguage as string)
    );
    if (mapping != undefined) {
      return mapping;
    } else {
      return {
        directiveValue: "none",
        canonicalValue: CanonicalLanguageValues.UNDEFINED,
        extension: LanguageFileExtensions.UNDEFINED,
      };
    }
  } else if (maybeChildNode != undefined && (maybeChildNode as CodeNode)) {
    const mapping = languageValueMappings.find(
      (mapper) => mapper.directiveValue === maybeChildNode.lang
    );
    if (mapping !== undefined) {
      return mapping;
    } else {
      return {
        directiveValue: "none",
        canonicalValue: CanonicalLanguageValues.UNDEFINED,
        extension: LanguageFileExtensions.UNDEFINED,
      };
    }
  } else {
    return {
      directiveValue: "none",
      canonicalValue: CanonicalLanguageValues.UNDEFINED,
      extension: LanguageFileExtensions.UNDEFINED,
    };
  }
};

export const getNewDefaultLangCounterMap = (): Map<string, number> => {
  return new Map<string, number>([
    [CanonicalLanguageValues.BASH, 0],
    [CanonicalLanguageValues.C, 0],
    [CanonicalLanguageValues.CPP, 0],
    [CanonicalLanguageValues.CSHARP, 0],
    [CanonicalLanguageValues.GO, 0],
    [CanonicalLanguageValues.JAVA, 0],
    [CanonicalLanguageValues.JAVASCRIPT, 0],
    [CanonicalLanguageValues.JSON, 0],
    [CanonicalLanguageValues.KOTLIN, 0],
    [CanonicalLanguageValues.PHP, 0],
    [CanonicalLanguageValues.PYTHON, 0],
    [CanonicalLanguageValues.RUBY, 0],
    [CanonicalLanguageValues.RUST, 0],
    [CanonicalLanguageValues.SCALA, 0],
    [CanonicalLanguageValues.SHELL, 0],
    [CanonicalLanguageValues.SWIFT, 0],
    [CanonicalLanguageValues.TEXT, 0],
    [CanonicalLanguageValues.TYPESCRIPT, 0],
    [CanonicalLanguageValues.UNDEFINED, 0],
    [CanonicalLanguageValues.XML, 0],
    [CanonicalLanguageValues.YAML, 0],
  ]);
};
