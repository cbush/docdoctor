import * as tv from "tree-visit";
import { AnyNode } from "restructured";

const getChildren = (node: AnyNode) => node.children ?? [];

export const find = (
  node: AnyNode,
  predicate: (node: AnyNode, indexPath: tv.IndexPath) => boolean
): AnyNode | undefined => {
  return tv.find(node, {
    getChildren,
    predicate,
  });
};

export const visit = (
  node: AnyNode,
  onEnter: (node: AnyNode, indexPath: tv.IndexPath) => tv.EnterReturnValue,
  onLeave?: (node: AnyNode, indexPath: tv.IndexPath) => tv.LeaveReturnValue
): void => {
  tv.visit(node, {
    getChildren,
    onEnter,
    onLeave:
      onLeave ??
      (() => {
        // do nothing
      }),
  });
};
