import globCb from "glob";
import util from "util";

export const glob = util.promisify(globCb);
