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
      - uses: actions/cache@v3
        with:
          path: cache.json    
      - uses: advbet/approved-by-action@v1
      - uses: actions/cache/save@v3
        with:
          path: cache.json
```
