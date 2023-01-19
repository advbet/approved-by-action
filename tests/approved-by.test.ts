import * as github from "@actions/github";
import { expect, test } from "@jest/globals";
import * as core from "@actions/core";
import { Moctokit } from "@kie/mock-github";
import {
  getApprovedReviews,
  getBodyWithApprovedBy,
  getReviewer,
  Reviewers,
  Reviews,
} from "../src/approved-by";

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
  const octokit = github.getOctokit("token");
  const moctokit = new Moctokit();

  test("get reviewer, no cache", async () => {
    const cache = {};
    moctokit.rest.users
      .getByUsername({ username: "test1" })
      .reply({ status: 200, data: { name: "Mocked Name" } });

    const result = await getReviewer(octokit, "test1", cache);
    expect(result).toEqual({ name: "Mocked Name", username: "test1" });
    expect(cache).toEqual({ test1: "Mocked Name" });
  });

  test("get reviewer, cache present", async () => {
    const cache = { test1: "Cached Name" };
    const result = await getReviewer(octokit, "test1", cache);

    expect(result).toEqual({ name: "Cached Name", username: "test1" });
  });

  test("get reviewer, cache and mock present", async () => {
    const cache = { test1: "Cached Name" };
    moctokit.rest.users
      .getByUsername({ username: "test1" })
      .reply({ status: 200, data: { name: "Mocked Name" } });

    const result = await getReviewer(octokit, "test1", cache);

    expect(result).toEqual({ name: "Cached Name", username: "test1" });
  });

  test("get reviewer, no cache, multiple calls", async () => {
    const cache = {};
    moctokit.rest.users
      .getByUsername({ username: "test1" })
      .reply({ status: 200, data: { name: "Mocked Name" } });

    let result = await getReviewer(octokit, "test1", cache);
    expect(result).toEqual({ name: "Mocked Name", username: "test1" });
    expect(cache).toEqual({ test1: "Mocked Name" });

    moctokit.rest.users
      .getByUsername({ username: "test1" })
      .reply({ status: 200, data: { name: "Mocked Name Second" } });

    result = await getReviewer(octokit, "test1", cache);
    expect(result).toEqual({ name: "Mocked Name", username: "test1" });
  });
});
