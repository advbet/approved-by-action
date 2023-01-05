import * as core from "@actions/core";
import * as github from "@actions/github";
import { components } from "@octokit/openapi-types";
import { GitHub } from "@actions/github/lib/utils";

export type Octokit = InstanceType<typeof GitHub>;
export type Review = components["schemas"]["pull-request-review"];
export type Reviews = Review[];
export type Approval = {
  username: string;
  name: string;
};
export type Approvals = Approval[];

export function getApprovals(reviews: Reviews): Approvals {
  const approvals: Approvals = [];

  const latestReviews = reviews
    .reverse()
    .filter((review) => review.state.toLowerCase() !== "commented")
    .filter((review, index, array) => {
      // https://dev.to/kannndev/filter-an-array-for-unique-values-in-javascript-1ion
      return array.findIndex((x) => review.user?.id === x.user?.id) === index;
    });

  for (const review of latestReviews) {
    core.debug(`Latest ${review.user?.login} review '${review.state.toLowerCase()}'`);

    if (!review.user) {
      continue;
    }

    if (review.state.toLowerCase() === "approved") {
      approvals.push({ username: review.user.login } as Approval);
    }
  }

  return approvals;
}

export async function getApprovalsWithNames(
  octokit: Octokit,
  approvals: Approvals
): Promise<Approvals> {
  for (const approval of approvals) {
    const { data: user } = await octokit.rest.users.getByUsername({ username: approval.username });

    if (user && user.name) {
      approval.name = user.name;
    }
  }
  return approvals;
}

export function getBodyWithApprovedBy(pullBody: string | null, approvals: Approvals): string {
  pullBody = pullBody || "";
  const approveByIndex = pullBody.search(/Approved-by/);
  let approvedByBody = "";

  for (const approval of approvals) {
    approvedByBody += `\nApproved-by: ${approval.username}`;

    if (approval.name) {
      approvedByBody += ` (${approval.name})`;
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

  let approvals = getApprovals(reviews);
  approvals = await getApprovalsWithNames(octokit, approvals);
  const body = getBodyWithApprovedBy(pull.body || "", approvals);

  if (body !== pull.body) {
    await octokit.rest.pulls.update({
      ...context.repo,
      pull_number: context.payload.pull_request.number,
      body: body,
    });
  }
}
