import { CommandModule } from "yargs";
import { SnootyConfig, loadSnootyConfig } from "../loadSnootyConfig";
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

const findRstFilesInDirectory = async (
  path: string,
  options?: { ignore?: string | string[] }
) => glob(Path.join(path, "**/*+(.txt|.rst)"), options);

class File {
  virtualPath: string;
  realPath: string;
  rst: AnyNode;
  scanned = false;
  connectionsIn = 0;
  private connections: Set<File> = new Set();

  constructor({
    rst,
    virtualPath,
    realPath,
  }: {
    virtualPath: string;
    rst: AnyNode;
    realPath: string;
  }) {
    this.rst = rst;
    this.virtualPath = virtualPath;
    this.realPath = realPath;
  }

  connect = (file: File) => {
    const sizeBefore = this.connections.size;
    this.connections.add(file);
    if (this.connections.size !== sizeBefore) {
      ++file.connectionsIn;
    }
  };
}

type GraphOptions = { ignore?: string | string[] };

class Graph {
  pathToFile: Map<string, File> = new Map();
  labelsToFile: Map<string, File> = new Map();
  basePath: string;
  rootFile?: File;

  private scanQueue: string[] = [];

  constructor(basePath: string) {
    this.basePath = basePath;
  }

  scan = async (entrypointPath: string, options?: GraphOptions) => {
    await this.loadFiles(options);
    const virtualEntry = Path.join("/", entrypointPath).replace(/\.txt$/, "");
    this.scanQueue.push(virtualEntry);
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
    const files = await findRstFilesInDirectory(this.basePath, options);
    await Promise.all(
      files.map(async (path) => {
        const { rst } = await readRstFile(path);
        // Virtual path is the path from the root of the project with a leading
        // slash and .txt extension removed (if applicable).
        const virtualPath = Path.join(
          "/",
          Path.relative(this.basePath, path)
        ).replace(/\.txt$/, "");
        const file = new File({ virtualPath, rst, realPath: path });
        // Populate path-to-file lookup
        this.pathToFile.set(virtualPath, file);
        // Populate label-to-file lookup based on labels in the file
        (findAll(rst, (node) => node.type === "label") as LabelNode[]).forEach(
          ({ label }) => {
            this.labelsToFile.set(label, file);
          }
        );
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
      case "include":
      case "literalinclude":
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
        this.connect(file, matches[1]);
      });
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
    target: string,
    map: Map<string, File> = this.pathToFile
  ) {
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
    .filter((file) => file !== rootFile && file.connectionsIn === 0)
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
