import { expect, test } from "@jest/globals";
import * as core from "@actions/core";
// import * as rest from "@octokit/rest";
import { getApprovedReviews, getBodyWithApprovedBy, Reviewers, Reviews } from "../src/approved-by";

type RecursivePartial<T> = {
  [P in keyof T]?: RecursivePartial<T[P]>;
};

jest.spyOn(core, "info").mockImplementation(() => {
  return;
});
jest.spyOn(core, "debug").mockImplementation(() => {
  return;
});

describe("getting approvals from reviews", () => {
  test("2 approvals from different users", () => {
    const reviews: RecursivePartial<Reviews> = [
      {
        user: { id: 1, login: "test1" },
        state: "APPROVED",
      },
      {
        user: { id: 2, login: "test2" },
        state: "APPROVED",
      },
    ];
    expect(getApprovedReviews(reviews as Reviews)).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ user: expect.objectContaining({ login: "test2" }) }),
        expect.objectContaining({ user: expect.objectContaining({ login: "test1" }) }),
      ])
    );
  });

  test("1 approval, 1 dismiss from different users", () => {
    const reviews: RecursivePartial<Reviews> = [
      {
        user: { id: 1, login: "test1" },
        state: "APPROVED",
      },
      {
        user: { id: 2, login: "test2" },
        state: "DISMISSED",
      },
    ];
    expect(getApprovedReviews(reviews as Reviews)).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ user: expect.objectContaining({ login: "test1" }) }),
      ])
    );
  });

  test("1 approval, 1 dismiss from same user, dismiss last", () => {
    const reviews: RecursivePartial<Reviews> = [
      {
        user: { id: 1, login: "test1" },
        state: "APPROVED",
      },
      {
        user: { id: 1, login: "test1" },
        state: "DISMISSED",
      },
    ];
    expect(getApprovedReviews(reviews as Reviews)).toEqual([]);
  });

  test("1 approval, 1 dismiss from same user, dismiss first", () => {
    const reviews: RecursivePartial<Reviews> = [
      {
        user: { id: 1, login: "test1" },
        state: "DISMISSED",
      },
      {
        user: { id: 1, login: "test1" },
        state: "APPROVED",
      },
    ];
    expect(getApprovedReviews(reviews as Reviews)).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ user: expect.objectContaining({ login: "test1" }) }),
      ])
    );
  });
});

describe("setting Approved-by", () => {
  test("null body", () => {
    const body = null;
    const reviewers: RecursivePartial<Reviewers> = [{ username: "test1" }];
    expect(getBodyWithApprovedBy(body, reviewers as Reviewers)).toBe("\n\nApproved-by: test1");
  });

  test("existing body without Approved-by", () => {
    const body = "Test";
    const reviewers: RecursivePartial<Reviewers> = [{ username: "test1" }];
    expect(getBodyWithApprovedBy(body, reviewers as Reviewers)).toBe("Test\n\nApproved-by: test1");
  });

  test("existing body with Approved-by", () => {
    const body = "Test\n\nApproved-by: test2";
    const reviewers: RecursivePartial<Reviewers> = [{ username: "test1" }];
    expect(getBodyWithApprovedBy(body, reviewers as Reviewers)).toBe("Test\n\nApproved-by: test1");
  });
});

describe("getting reviewers", () => {
  // const octokit = github.getOctokit(token);

  // jest.mock('github')
  // const octokit = jest.fn();
  // octokit.mockImplementationOnceœ
  // jest.spyOn("github", "getOctokit").mockReturnValue(octokit);

  // const octokit = jest.mock<Octokit>;
  // octokit.rest.users.getByUsername({ username: review.user.login });

  // const mockedGitHub = jest.mocked(GitHub, {shallow: true});

  test("cached", () => {
    // octokit.rest.users.getByUsername().mockReturnValue({ user: "Test Testing" });
    // const octokit = new GitHub();

    // const o = new octokit();

    // const mockedGitHub = jest.mocked(GitHub);
    // jest.mock("@octokit/rest");
    // const mockedOctokit = jest.mocked(rest.Octokit);
    // mockedOctokit.


    // jest.mock('@octokit/rest');
    // const mockedOctokit = jest.mocked(Octokit);
    // const mockedOctokit = Octokit as jest.Mocked<typeof Octokit>;
    // const mockedGitHub = GitHub as jest.Mocked<typeof GitHub>
    // mockedOctokit.rest.users.get.mockReturnValue([{ user: 'Test Testing' }]);

    // const octokit = new GitHub
    // octokit.rest.users.getByUsername
    // Octokit.get.mockResolvedValue(resp);

    // const reviews: RecursivePartial<Reviews> = [
    //   {
    //     user: { id: 1, login: "test1" },
    //     state: "DISMISSED",
    //   },
    //   {
    //     user: { id: 1, login: "test1" },
    //     state: "APPROVED",
    //   },
    // ];
    // expect(getReviewer(octokit, "test1")).toBe([
    //   { username: "test1", name: "Test Testing" },
    // ]);
  });
});
