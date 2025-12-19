# Create Signed Commit Action

Creates a signed commit using the GitHub API without pushing it, allowing batch commit operations.

<!-- START doctoc generated TOC please keep comment here to allow auto update -->
<!-- DON'T EDIT THIS SECTION, INSTEAD RE-RUN doctoc TO UPDATE -->
## Table of Contents

- [Quick Start](#quick-start)
- [Inputs](#inputs)
- [Outputs](#outputs)
- [Multiple Commits Example](#multiple-commits-example)
- [Notes](#notes)

<!-- END doctoc generated TOC please keep comment here to allow auto update -->

## Quick Start

```yaml
# Commit all changed files on current branch
- uses: statens-pensjonskasse/github-actions-library/actions/versioning/create-signed-commit@COMMIT_SHA # vX.X.X
  with:
    token: ${{ secrets.GITHUB_TOKEN }}
    message: 'Update files'

# Commit specific paths (files, folders, wildcards)
- uses: statens-pensjonskasse/github-actions-library/actions/versioning/create-signed-commit@COMMIT_SHA # vX.X.X
  with:
    token: ${{ secrets.GITHUB_TOKEN }}
    message: 'Update config'
    paths: |
      config/
      README.md
      actions/*/dist

# Commit and push immediately
- uses: statens-pensjonskasse/github-actions-library/actions/versioning/create-signed-commit@COMMIT_SHA # vX.X.X
  with:
    token: ${{ secrets.GITHUB_TOKEN }}
    message: 'Update and push'
    push: true

# Create commit from specific parent
- uses: statens-pensjonskasse/github-actions-library/actions/versioning/create-signed-commit@COMMIT_SHA # vX.X.X
  with:
    token: ${{ secrets.GITHUB_TOKEN }}
    message: 'Cherry-pick changes'
    parent-commit: 'abc123def456'
```

## Inputs

| Name | Required | Default | Description |
| ------ | ---------- | ------- | ------------- |
| `token` | Yes | | GitHub token with write permissions |
| `message` | Yes | | Commit message |
| `branch` | No | Current branch | Branch to commit to |
| `paths` | No | All changes | Paths to commit (files, folders, wildcards; newline-separated) |
| `repository` | No | Current repo | Repository in `owner/repo` format |
| `working-directory` | No | `.` | Working directory |
| `fail-on-no-changes` | No | `true` | Fail if no changes detected |
| `fetch-commit` | No | `true` | Fetch the created commit locally |
| `push` | No | `false` | Push the commit to the remote branch after creation |
| `parent-commit` | No | Current branch HEAD | SHA of the parent commit (must be a valid 40-character Git SHA-1 hash) |

## Outputs

- `commit-sha` - SHA of the created commit
- `tree-sha` - SHA of the created tree

## Multiple Commits Example

Create multiple commits and push them together:

```yaml
- name: Create release commit
  id: release_commit
  uses: statens-pensjonskasse/github-actions-library/actions/versioning/create-signed-commit@COMMIT_SHA # vX.X.X
  with:
    token: ${{ secrets.GITHUB_TOKEN }}
    branch: main
    message: 'chore: release version 1.0.0'
    paths: pom.xml

- name: Create snapshot commit
  id: snapshot_commit
  uses: statens-pensjonskasse/github-actions-library/actions/versioning/create-signed-commit@COMMIT_SHA # vX.X.X
  with:
    token: ${{ secrets.GITHUB_TOKEN }}
    branch: main
    message: 'chore: update to snapshot version'
    paths: pom.xml

- name: Push both commits
  uses: actions/github-script@v7 # 60a0d83039c74a4aee543508d2ffcb1c3799cdea
  with:
    script: |
      // Pushing the last commit SHA pushes all commits in the chain
      await github.rest.git.updateRef({
        owner: context.repo.owner,
        repo: context.repo.repo,
        ref: 'heads/main',
        sha: '${{ steps.snapshot_commit.outputs.commit-sha }}',
        force: false
      });
```

## Notes

- Commits are automatically signed by GitHub
- Commits are chained - pushing the last commit SHA pushes all parent commits
- Use `force: false` to prevent accidental overwrites
- Token needs `contents: write` permission
- Branch protection rules apply
