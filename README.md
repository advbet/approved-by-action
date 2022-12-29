# Approved by GitHub Action

```yml
name: Approved by

on:
  pull_request_review:
    types: [submitted, dismissed]

jobs:
  approved-by:
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v3
        with:
          repository: advbet/approved-by-action
          token: ${{ secrets.ADVBET_GH_PAT }}
          path: ./.github/actions/approved-by-action

      - uses: ./.github/actions/approved-by-action
        with:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
```
