import { describe, expect, it, spyOn, mock, beforeEach, afterEach } from "bun:test";
import * as core from "@actions/core";
import {
  getApprovedReviews,
  getBodyWithApprovedBy,
  getReviewer,
  type Reviewers,
  type Reviews,
} from "../src/approved-by";

type RecursivePartial<T> = {
  [P in keyof T]?: RecursivePartial<T[P]>;
};

spyOn(core, "info").mockImplementation(() => {
  return;
});
spyOn(core, "debug").mockImplementation(() => {
  return;
});

describe("getting approvals from reviews", () => {
  it("should get 2 approvals from different users", () => {
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
      ]),
    );
  });

  it("should get 1 approval, 1 dismiss from different users", () => {
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
      ]),
    );
  });

  it("should get 1 approval, 1 dismiss from same user, dismiss last", () => {
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

  it("should get 1 approval, 1 dismiss from same user, dismiss first", () => {
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
      ]),
    );
  });
});

describe("setting Approved-by", () => {
  it("should handle null body", () => {
    const body = null;
    const reviewers: RecursivePartial<Reviewers> = [{ username: "test1" }];
    expect(getBodyWithApprovedBy(body, reviewers as Reviewers)).toBe("\n\nApproved-by: test1");
  });

  it("should get existing body without Approved-by", () => {
    const body = "Test";
    const reviewers: RecursivePartial<Reviewers> = [{ username: "test1" }];
    expect(getBodyWithApprovedBy(body, reviewers as Reviewers)).toBe("Test\n\nApproved-by: test1");
  });

  it("should get existing body with Approved-by", () => {
    const body = "Test\n\nApproved-by: test2";
    const reviewers: RecursivePartial<Reviewers> = [{ username: "test1" }];
    expect(getBodyWithApprovedBy(body, reviewers as Reviewers)).toBe("Test\n\nApproved-by: test1");
  });

  it("should get username with name", () => {
    const body = "Test";
    const reviewers: RecursivePartial<Reviewers> = [{ username: "test1", name: "Test Tester" }];
    expect(getBodyWithApprovedBy(body, reviewers as Reviewers)).toBe(
      "Test\n\nApproved-by: test1 (Test Tester)",
    );
  });

  it("should handle empty name", () => {
    const body = "Test";
    const reviewers: RecursivePartial<Reviewers> = [{ username: "test1", name: "" }];
    expect(getBodyWithApprovedBy(body, reviewers as Reviewers)).toBe("Test\n\nApproved-by: test1");
  });
});

describe("getting reviewer", () => {
  let mockOctokit: any;

  beforeEach(() => {
    mockOctokit = {
      rest: {
        users: {
          getByUsername: mock(() => Promise.resolve({ data: { name: "Default Mock Name" } })),
        },
      },
    };
  });

  afterEach(() => {
    mock.restore();
  });

  it("should get user without cache", async () => {
    const cache = {};

    mockOctokit.rest.users.getByUsername.mockResolvedValue({
      data: { name: "Mocked Name 1" }
    });

    const result = await getReviewer(mockOctokit, "test1", cache);
    expect(result).toEqual({ name: "Mocked Name 1", username: "test1" });
    expect(cache).toEqual({ test1: "Mocked Name 1" });
    expect(mockOctokit.rest.users.getByUsername).toHaveBeenCalledWith({ username: "test1" });
  });

  it("should get user with cache present", async () => {
    const cache = { test2: "Cached Name 2" };
    const result = await getReviewer(mockOctokit, "test2", cache);

    expect(result).toEqual({ name: "Cached Name 2", username: "test2" });
    expect(mockOctokit.rest.users.getByUsername).not.toHaveBeenCalled();
  });

  it("should get user with cache and mock present", async () => {
    const cache = { test3: "Cached Name 3" };

    mockOctokit.rest.users.getByUsername.mockResolvedValue({
      data: { name: "Mocked Name 3" }
    });

    const result = await getReviewer(mockOctokit, "test3", cache);

    expect(result).toEqual({ name: "Cached Name 3", username: "test3" });
    expect(mockOctokit.rest.users.getByUsername).not.toHaveBeenCalled();
  });

  it("should get user without cache, multiple calls", async () => {
    const cache = {};

    mockOctokit.rest.users.getByUsername.mockResolvedValue({
      data: { name: "Mocked Name 4" }
    });

    let result = await getReviewer(mockOctokit, "test4", cache);
    expect(result).toEqual({ name: "Mocked Name 4", username: "test4" });
    expect(cache).toEqual({ test4: "Mocked Name 4" });

    // Second call should use cache
    result = await getReviewer(mockOctokit, "test4", cache);
    expect(result).toEqual({ name: "Mocked Name 4", username: "test4" });

    // API should only be called once
    expect(mockOctokit.rest.users.getByUsername).toHaveBeenCalledTimes(1);
  });

  it("should handle empty name, empty cache", async () => {
    const cache = {};

    mockOctokit.rest.users.getByUsername.mockResolvedValue({
      data: { name: "" }
    });

    const result = await getReviewer(mockOctokit, "test5", cache);
    expect(result).toEqual({ name: "", username: "test5" });
    expect(cache).toEqual({ test5: "" });
  });

  it("should handle null name, empty cache", async () => {
    const cache = {};

    mockOctokit.rest.users.getByUsername.mockResolvedValue({
      data: { name: null }
    });

    const result = await getReviewer(mockOctokit, "test6", cache);
    expect(result).toEqual({ name: "", username: "test6" });
    expect(cache).toEqual({ test6: "" });
  });
});
