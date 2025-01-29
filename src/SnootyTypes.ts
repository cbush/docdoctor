import { ParentNode } from "restructured";

// These types are what's in the snooty manifest jsonl file.
export type SnootyManifestEntry = {
  type: "page" | "timestamp" | "metadata" | "asset";
  data: unknown;
};
/**
 Represents a page entry in a Snooty manifest file.
 */
export type SnootyPageEntry = SnootyManifestEntry & {
  type: "page";
  data: SnootyPageData;
};

/**
 A page in the Snooty manifest.
 */
export type SnootyPageData = {
  page_id: string;
  ast: ParentNode;
  tags?: string[];
  deleted: boolean;
};