# Approved by GitHub Action

This action will add `Approved-by: <username> (<name>)` to the buttom of PR description. In combination with "Default commit message -> Default to pull request title and description" all your commits will have list of people who approved it.

```yml
name: Approved by

on:
  pull_request_review:
    types: [submitted, dismissed]

jobs:
  approved-by:
    runs-on: ubuntu-latest

    steps:
      - uses: advbet/approved-by-action@v1
```
