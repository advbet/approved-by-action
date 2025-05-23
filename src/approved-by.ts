import * as core from "@actions/core";
import * as github from "@actions/github";
import * as fs from "fs";
import { components } from "@octokit/openapi-types";
import { GitHub } from "@actions/github/lib/utils";

export type Octokit = InstanceType<typeof GitHub>;
export type Review = components["schemas"]["pull-request-review"];
export type Reviews = Review[];
export type Reviewer = {
  username: string;
  name: string;
};
export type Reviewers = Reviewer[];
export type Cache = { [key: string]: string };

export function getApprovedReviews(reviews: Reviews): Reviews {
  const latestReviews = reviews
    .reverse()
    .filter((review) => review.state.toLowerCase() !== "commented")
    .filter((review, index, array) => {
      // https://dev.to/kannndev/filter-an-array-for-unique-values-in-javascript-1ion
      return array.findIndex((x) => review.user?.id === x.user?.id) === index;
    });

  return latestReviews.filter((review) => review.state.toLowerCase() === "approved");
}

export async function getReviewers(
  octokit: Octokit,
  reviews: Reviews,
  cache: Cache
): Promise<Reviewers> {
  const reviewers: Reviewers = [];

  for (const review of reviews) {
    if (!review.user) {
      continue;
    }
    reviewers.push(await getReviewer(octokit, review.user.login, cache));
  }

  return reviewers;
}

export async function getReviewer(
  octokit: Octokit,
  username: string,
  cache: Cache
): Promise<Reviewer> {
  const reviewer = { username } as Reviewer;

  if (username in cache) {
    reviewer.name = cache[username];
  } else {
    core.info(`API call to get ${username} name`);
    const { data: user } = await octokit.rest.users.getByUsername({ username: username });

    if (user) {
      reviewer.name = user.name || "";
      cache[username] = reviewer.name;
    }
  }

  return reviewer;
}

export function readCache(path = "./cache.json"): Cache {
  try {
    const data = fs.readFileSync(path, "utf8");
    return JSON.parse(data) as Cache;
  } catch (err) {
    console.log(`Error reading file: ${err}`);
  }

  return {} as Cache;
}

export function updateCache(cache: Cache, path = "./cache.json"): void {
  try {
    fs.writeFileSync(path, JSON.stringify(cache), "utf8");
  } catch (err) {
    console.log(`Error writing file: ${err}`);
  }
}

export function getBodyWithApprovedBy(pullBody: string | null, reviewers: Reviewers): string {
  pullBody = pullBody || "";
  const approveByIndex = pullBody.search(/Approved-by/);
  let approvedByBody = "";

  for (const reviewer of reviewers) {
    approvedByBody += `\nApproved-by: ${reviewer.username}`;

    if (reviewer.name) {
      approvedByBody += ` (${reviewer.name})`;
    }
  }

  // body with "Approved-by" already set
  if (approveByIndex > -1) {
    pullBody = pullBody.replace(/\nApproved-by:[\s\S]*/, approvedByBody);
  }

  // body without "Approved-by"
  if (approvedByBody.length > 0 && approveByIndex === -1) {
    pullBody += `\n${approvedByBody}`;
  }

  return pullBody;
}

export async function run(): Promise<void> {
  const token = core.getInput("GITHUB_TOKEN", { required: true });

  if (!token) {
    throw new Error("No GITHUB_TOKEN found in input");
  }

  const octokit = github.getOctokit(token);
  const context = github.context;

  if (!context.payload.pull_request) {
    throw new Error("No pull request found in payload");
  }

  const { data: pull } = await octokit.rest.pulls.get({
    ...context.repo,
    pull_number: context.payload.pull_request.number,
  });

  const { data: reviews } = await octokit.rest.pulls.listReviews({
    ...context.repo,
    pull_number: context.payload.pull_request.number,
    per_page: 100,
  });

  const approvedReviews = getApprovedReviews(reviews);

  const cache: Cache = readCache();
  const reviewers = await getReviewers(octokit, approvedReviews, cache);
  updateCache(cache);

  const body = getBodyWithApprovedBy(pull.body, reviewers);

  if (body !== pull.body) {
    await octokit.rest.pulls.update({
      ...context.repo,
      pull_number: context.payload.pull_request.number,
      body: body,
    });
  }
}
