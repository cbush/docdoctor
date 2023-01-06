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
} from "../restructured";

const findRstFilesInDirectory = async (
  path: string,
  options?: { ignore?: string | string[] }
) => glob(Path.join(path, "**/*+(.txt|.rst)"), options);

class File {
  path: string;
  rst: AnyNode;
  scanned = false;
  connectionsIn = 0;
  private connections: Set<File> = new Set();

  constructor(path: string, rst: AnyNode) {
    this.path = path;
    this.rst = rst;
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

  private scanQueue: string[] = [];

  constructor(basePath: string) {
    this.basePath = basePath;
  }

  scan = async (entrypointPath: string, options?: GraphOptions) => {
    await this.loadFiles(options);
    this.scanQueue.push(entrypointPath);
    for (
      let path = this.scanQueue.shift();
      path !== undefined;
      path = this.scanQueue.shift()
    ) {
      this.innerScan(path);
    }
  };

  private loadFiles = async (options?: GraphOptions): Promise<void> => {
    const files = await findRstFilesInDirectory(this.basePath, options);
    await Promise.all(
      files.map(async (path) => {
        const { rst } = await readRstFile(path);
        const virtualPath = Path.relative(this.basePath, path);
        const file = new File(virtualPath, rst);
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
    assert(file);
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
    //
  };
  private handleReference = (node: ReferenceNode, file: File) => {
    //
  };
  private handleInlineLink = (node: InlineLinkNode, file: File) => {
    const map = node.role === "ref" ? this.labelsToFile : this.pathToFile;
    const targetFile = map.get(node.target);
    if (!targetFile) {
      return;
    }
    file.connect(targetFile);
    this.scanQueue.push(targetFile.path);
  };
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
  const rootFile = graph.pathToFile.get(entryPointPath);
  const unusedFilePaths = Array.from(graph.pathToFile.values())
    .filter((file) => file !== rootFile && file.connectionsIn === 0)
    .map(({ path }) => path);
  console.log(unusedFilePaths);
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
