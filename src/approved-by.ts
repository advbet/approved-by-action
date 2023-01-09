import * as core from "@actions/core";
import * as github from "@actions/github";
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

export async function getReviewers(octokit: Octokit, reviews: Reviews): Promise<Reviewers> {
  const reviewers: Reviewers = [];

  for (const review of reviews) {
    if (!review.user) {
      continue;
    }
    const reviewer = { username: review.user.login } as Reviewer;
    const { data: user } = await octokit.rest.users.getByUsername({ username: review.user.login });

    if (user && user.name) {
      reviewer.name = user.name;
    }
    reviewers.push(reviewer);
  }
  return reviewers;
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
    pullBody = pullBody.replace(/\nApproved-by:.*/s, approvedByBody);
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
  const reviewers = await getReviewers(octokit, approvedReviews);
  const body = getBodyWithApprovedBy(pull.body, reviewers);

  if (body !== pull.body) {
    await octokit.rest.pulls.update({
      ...context.repo,
      pull_number: context.payload.pull_request.number,
      body: body,
    });
  }
}
