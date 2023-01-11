import { CommandModule } from "yargs";
import { SnootyConfig, loadSnootyConfig } from "../loadSnootyConfig";
import { promises as fs } from "fs";
import * as Path from "path";
import { glob } from "../glob";
import { strict as assert } from "assert";
import { readRstFile } from "../readRstFile";
import { visit, findAll } from "../tree";
import {
  AnyNode,
  DirectiveNode,
  LabelNode,
  ReferenceNode,
  InlineLinkNode,
  getInnerText,
} from "../restructured";

class File {
  virtualPath: string;
  realPath: string;
  rst?: AnyNode;
  scanned = false;

  // This .txt file is an index/TOC file for a directory. Count this as a
  // reference.
  private isDirectoryIndexFile = false;

  private connectionsIn = 0;
  private connections: Set<File> = new Set();

  constructor({
    rst,
    virtualPath,
    realPath,
    isDirectoryIndexFile,
  }: {
    virtualPath: string;
    realPath: string;
    rst?: AnyNode;
    isDirectoryIndexFile: boolean;
  }) {
    this.rst = rst;
    this.virtualPath = virtualPath;
    this.realPath = realPath;
    this.isDirectoryIndexFile = isDirectoryIndexFile;
  }

  connect = (file: File) => {
    const sizeBefore = this.connections.size;
    this.connections.add(file);
    if (this.connections.size !== sizeBefore) {
      ++file.connectionsIn;
    }
  };

  get referenceCount(): number {
    return this.connectionsIn + (this.isDirectoryIndexFile ? 1 : 0);
  }
}

type GraphOptions = { ignore?: string | string[] };

class Graph {
  pathToFile: Map<string, File> = new Map();
  labelsToFile: Map<string, File> = new Map();
  basePath: string;
  rootFile?: File;
  indexFiles: File[] = [];

  private scanQueue: string[] = [];

  constructor(basePath: string) {
    this.basePath = basePath;
  }

  scan = async (entrypointPath: string, options?: GraphOptions) => {
    await this.loadFiles(options);
    const virtualEntry = Path.join("/", entrypointPath).replace(/\.txt$/, "");
    this.scanQueue.push(
      virtualEntry,
      ...this.indexFiles.map(({ virtualPath }) => virtualPath)
    );
    for (
      let path = this.scanQueue.shift();
      path !== undefined;
      path = this.scanQueue.shift()
    ) {
      this.innerScan(path);
    }
    this.rootFile = this.pathToFile.get(virtualEntry);
  };

  private loadFiles = async (options?: GraphOptions): Promise<void> => {
    const files = await glob(Path.join(this.basePath, "**/**"), {
      ...options,
    });
    const directories: Set<string> = new Set();
    await Promise.all(
      files.map(async (path) => {
        // Virtual path is the path from the root of the project with a leading
        // slash and .txt extension removed (if applicable).
        const virtualPath = Path.join("/", Path.relative(this.basePath, path))
          .replace(/\.txt$/, "")
          .toLowerCase();

        const stat = await fs.stat(path);
        if (stat.isDirectory()) {
          // Keep track of directories, because we need to count them as
          // references to the corresponding index file (e.g. "sdk.txt" is the
          // index file/landing page for "sdk/")
          directories.add(virtualPath);
          return;
        }

        if (this.pathToFile.has(virtualPath)) {
          throw new Error(
            `Virtual path collision: ${virtualPath} (from '${path}' and '${
              this.pathToFile.get(virtualPath)?.realPath
            }')`
          );
        }

        const isDirectoryIndexFile =
          /\/index.txt$/.test(path) ||
          (/.txt$/.test(path) && directories.has(virtualPath));

        const file = new File({
          virtualPath,
          realPath: path,
          isDirectoryIndexFile,
        });

        if (isDirectoryIndexFile) {
          this.indexFiles.push(file);
        }

        // Populate path-to-file lookup
        this.pathToFile.set(virtualPath, file);

        // Process rst files
        if (/\.(txt|rst)$/.test(path)) {
          const { rst } = await readRstFile(path);
          // Populate label-to-file lookup based on labels in the file
          (
            findAll(rst, (node) => node.type === "label") as LabelNode[]
          ).forEach(({ label }) => {
            this.labelsToFile.set(label, file);
          });
          file.rst = rst;
        }
      })
    );
  };

  private innerScan = (path: string) => {
    const file = this.pathToFile.get(path);
    assert(file, `File not found: ${path}`);
    if (file.scanned) {
      return;
    }
    file.scanned = true;
    const { rst } = file;
    if (rst === undefined) {
      return;
    }
    visit(rst, (node) => {
      switch (node.type) {
        case "directive":
          return this.handleDirective(node as DirectiveNode, file);
        case "reference":
          return this.handleReference(node as ReferenceNode, file);
        case "interpreted_text":
          if (["ref", "doc"].includes(node.role as string)) {
            return this.handleInlineLink(node as InlineLinkNode, file);
          }
          return;
      }
    });
  };

  private handleDirective = (node: DirectiveNode, file: File) => {
    switch (node.directive) {
      case "toctree":
        return this.handleToctree(node, file);
      case "card":
        return this.handleCard(node, file);
      case "include":
      case "input":
      case "output":
      case "literalinclude":
      case "image":
      case "figure":
        return this.handleInclude(node, file);
    }
  };

  private handleToctree = (node: DirectiveNode, file: File) => {
    getInnerText(node)
      .split("\n")
      .filter((line) => line.trim() !== "")
      .forEach((line) => {
        const matches = /^.*<(.*)>\s*$/.exec(line);
        if (matches === null) {
          return;
        }
        // Toctree entries might have trailing .txt or /
        const target = matches[1].replace(/\/$/, "").replace(/\.txt$/, "");

        this.connect(file, target);
      });
  };

  private handleCard = (node: DirectiveNode, file: File) => {
    const icon = node.optionLines?.reduce((result, line) => {
      if (result !== undefined) {
        return result;
      }
      const matches = /:icon: (.*)$/.exec(line);
      return matches ? matches[1] : undefined;
    }, undefined as string | undefined);
    if (icon === undefined) {
      return;
    }
    this.connect(file, icon);
  };

  private handleInclude = (node: DirectiveNode, file: File) => {
    const target = node.args;
    if (target === undefined) {
      return;
    }

    this.connect(file, target);
  };

  private handleReference = (node: ReferenceNode, file: File) => {
    //
  };

  private handleInlineLink = (node: InlineLinkNode, file: File) => {
    const map = node.role === "ref" ? this.labelsToFile : this.pathToFile;
    this.connect(file, node.target, map);
  };

  private connect(
    file: File,
    targetIn: string,
    map: Map<string, File> = this.pathToFile
  ) {
    const target = targetIn.toLowerCase();
    const targetFile = map.get(target);
    if (!targetFile) {
      return;
    }

    file.connect(targetFile);
    this.scanQueue.push(targetFile.virtualPath);
  }
}

export const findUnused = async ({
  path,
  ignore,
}: {
  path: string;
  snootyConfig: SnootyConfig;
  ignore?: string | string[];
}): Promise<void> => {
  const graph = new Graph(path);
  const entryPointPath = "index.txt";
  await graph.scan(entryPointPath, { ignore });
  const rootFile = graph.rootFile;
  const unusedFilePaths = Array.from(graph.pathToFile.values())
    .filter((file) => file !== rootFile && file.referenceCount === 0)
    .map(({ realPath }) => realPath);
  unusedFilePaths.forEach((v) => console.log(v));
};

export type FindUnusedArgs = {
  path: string;
  snootyTomlPath?: string;
  ignore?: string | string[];
};

const commandModule: CommandModule<unknown, FindUnusedArgs> = {
  command: "findUnused <path>",
  builder(args) {
    return args
      .positional("path", { array: false, type: "string", demandOption: true })
      .option("snootyTomlPath", { type: "string" })
      .option("ignore", { type: "string" });
  },
  handler: async (args) => {
    try {
      const { path, snootyTomlPath, ignore } = args;
      const snootyConfig = await loadSnootyConfig(snootyTomlPath);
      await findUnused({ path, snootyConfig, ignore });
    } catch (error) {
      console.error(error);
      process.exit(1);
    }
  },
  describe: "Find unused files in source",
};

export default commandModule;
