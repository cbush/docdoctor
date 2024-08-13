import fetch from "node-fetch";

export interface Branch {
  /**
    Name of git branch
    @example "master"
   */
  gitBranchName: string;

  /**
    Whether or not the branch is active.
    @example true
   */
  active: boolean;

  /**
    Base URL of the site
    @example "https://mongodb.com/docs/kotlin/coroutine/upcoming"
   */
  fullUrl: string;

  /**
    Whether this is the 'current, active branch' (rather than a previous or
    upcoming version).
   */
  isStableBranch: boolean;
}

export interface SnootyProject {
  /**
    Snooty repo name
    @example "docs-kotlin"
   */
  repoName: string;
  /**
    Snooty project name
    @example "kotlin"
   */
  project: string;
  /**
    Branches of repo that correspond to a site
   */
  branches: Branch[];
}

/** Schema for API response from https://snooty-data-api.mongodb.com/prod/projects */
export type GetSnootyProjectsResponse = {
  data: SnootyProject[];
};

export type SnootyProjectsInfo = {
  getBaseUrl(args: {
    projectName: string;
    branchName: string;
  }): Promise<string>;

  getCurrentBranch(args: { projectName: string }): Promise<Branch>;

  getCurrentVersionName(args: {
    projectName: string;
  }): Promise<string | undefined>;

  getProjectName(args: { repoName: string }): Promise<string | undefined>;
};

/**
  Creates a SnootyProjectsInfo object from the Snooty Data API GET projects
  endpoint.
 */
export const makeSnootyProjectsInfo = async ({
  snootyDataApiBaseUrl,
}: {
  snootyDataApiBaseUrl: string;
}): Promise<SnootyProjectsInfo & { _data: typeof data }> => {
  const response = await fetch(new URL("projects", snootyDataApiBaseUrl));
  const { data }: GetSnootyProjectsResponse = await response.json();

  // Fix Snooty API data
  data.forEach((project) => {
    project.branches.forEach((branch) => {
      // Fix booleans that might be string "true" instead of boolean `true`. For more
      // context, see https://jira.mongodb.org/browse/DOP-3862
      branch.active =
        (branch.active as unknown) === "true" || branch.active === true;

      // Some urls are http instead of https
      branch.fullUrl = branch.fullUrl.replace("http://", "https://");
    });
  });

  return {
    _data: data,

    async getBaseUrl({ projectName, branchName }) {
      const metadata = data.find(({ project }) => project === projectName);
      const branchMetaData = metadata?.branches.find(
        (branch) => branch.active && branch.gitBranchName === branchName
      );
      // Make sure there is an active branch at the specified branch name
      if (branchMetaData === undefined) {
        throw new Error(
          `For project '${projectName}', no active branch found for '${branchName}'.`
        );
      }
      return branchMetaData.fullUrl.replace("http://", "https://");
    },

    async getCurrentBranch({ projectName }) {
      return await getCurrentBranch(data, projectName);
    },
    async getCurrentVersionName({ projectName }) {
      const currentBranch = await getCurrentBranch(data, projectName);
      if (currentBranch.gitBranchName !== "master") {
        return currentBranch.gitBranchName;
      } else return;
    },
    async getProjectName({ repoName }) {
      return data.find((d) => d.repoName === repoName)?.project ?? undefined;
    },
  };
};

/**
  Helper function used in methods of makeSnootyProjectsInfo()
 */
async function getCurrentBranch(data: SnootyProject[], projectName: string) {
  const metadata = data.find(({ project }) => project === projectName);
  const currentBranch = metadata?.branches.find(
    ({ active, isStableBranch }) => active && isStableBranch
  );
  if (currentBranch === undefined) {
    throw new Error(
      `For project '${projectName}', no active branch found with isStableBranch == true.`
    );
  }
  return currentBranch;
}
