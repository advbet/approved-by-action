# Approved by GitHub Action

This action will add `Approved-by: <username> (<name>)` to the bottom of PR description.
In combination with "Default commit message -> Default to pull request title and description" all your commits will have list of people who approved them.

## Usage

```yml
name: Approved by

on:
  pull_request_review:
    types: [submitted, dismissed]

jobs:
  approved-by:
    runs-on: ubuntu-latest

    steps:
      - uses: actions/cache/restore@v3
        id: cache
        with:
          path: cache.json
          key: usernames-${{ hashFiles('cache.json') }}
          restore-keys: usernames-

      - uses: advbet/approved-by-action@v1

      - uses: actions/cache/save@v3
        if: endsWith(steps.cache.outputs.cache-matched-key, hashFiles('cache.json')) == false
        with:
          path: cache.json
          key: usernames-${{ hashFiles('cache.json') }}
```
