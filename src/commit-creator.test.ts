import * as assert from 'node:assert';
import { describe, it, mock } from 'node:test';
import * as core from '@actions/core';
import { createSignedCommit } from './commit-creator';
import * as fileCollector from './file-collector';
import * as githubClient from './github-client';
import type { ActionInputs } from './types';

describe('createSignedCommit', () => {
    it('should create a signed commit successfully', async () => {
        const mockOctokit = {
            rest: {
                git: {
                    getRef: mock.fn(async () => ({
                        data: {
                            object: {
                                sha: 'abc123',
                            },
                        },
                    })),
                    getCommit: mock.fn(async () => ({
                        data: {
                            tree: {
                                sha: 'tree123',
                            },
                        },
                    })),
                    createBlob: mock.fn(async () => ({
                        data: {
                            sha: 'blob123',
                        },
                    })),
                    createTree: mock.fn(async () => ({
                        data: {
                            sha: 'newtree123',
                        },
                    })),
                    createCommit: mock.fn(async () => ({
                        data: {
                            sha: 'newcommit123',
                            verification: {
                                verified: true,
                            },
                        },
                    })),
                },
            },
        };

        mock.method(githubClient, 'createGitHubClient', () => mockOctokit);
        mock.method(core, 'startGroup', () => {});
        mock.method(core, 'endGroup', () => {});
        mock.method(core, 'info', () => {});
        mock.method(core, 'warning', () => {});

        const inputs: ActionInputs = {
            token: 'ghp_test123',
            repository: 'owner/repo',
            branch: 'main',
            message: 'Test commit',
            workingDirectory: '.',
            failOnNoChanges: true,
            paths: ['test.txt'],
            fetchCommit: false,
            push: false,
        };

        // Mock collectFiles to return test data
        const mockCollectFiles = mock.fn(async () => [{ path: 'test.txt', content: 'hello', mode: '100644' }]);
        mock.method(fileCollector, 'collectFiles', mockCollectFiles);

        const result = await createSignedCommit(inputs);

        assert.strictEqual(result.commitSha, 'newcommit123');
        assert.strictEqual(result.treeSha, 'newtree123');
        assert.strictEqual(mockOctokit.rest.git.getRef.mock.calls.length, 1);
        assert.strictEqual(mockOctokit.rest.git.createBlob.mock.calls.length, 1);
    });

    it('should throw error for invalid repository format', async () => {
        const inputs: ActionInputs = {
            token: 'ghp_test123',
            repository: 'invalid-format',
            branch: 'main',
            message: 'Test commit',
            workingDirectory: '.',
            failOnNoChanges: true,
            paths: ['test.txt'],
            fetchCommit: false,
            push: false,
        };

        mock.method(githubClient, 'createGitHubClient', () => ({}));
        mock.method(core, 'startGroup', () => {});
        mock.method(core, 'endGroup', () => {});
        mock.method(core, 'info', () => {});
        mock.method(core, 'warning', () => {});

        await assert.rejects(async () => await createSignedCommit(inputs), {
            message: /Invalid repository format/,
        });
    });

    it('should handle no changes with fail-on-no-changes=false', async () => {
        const inputs: ActionInputs = {
            token: 'ghp_test123',
            repository: 'owner/repo',
            branch: 'main',
            message: 'Test commit',
            workingDirectory: '.',
            failOnNoChanges: false,
            fetchCommit: false,
            push: false,
        };

        mock.method(githubClient, 'createGitHubClient', () => ({}));
        mock.method(core, 'startGroup', () => {});
        mock.method(core, 'endGroup', () => {});
        mock.method(core, 'info', () => {});
        mock.method(core, 'warning', () => {});

        // Mock collectFiles to return empty array
        const mockCollectFiles = mock.fn(async () => []);
        mock.method(fileCollector, 'collectFiles', mockCollectFiles);

        const result = await createSignedCommit(inputs);

        assert.strictEqual(result.commitSha, '');
        assert.strictEqual(result.treeSha, '');
    });

    it('should throw error when no changes and fail-on-no-changes=true', async () => {
        const inputs: ActionInputs = {
            token: 'ghp_test123',
            repository: 'owner/repo',
            branch: 'main',
            message: 'Test commit',
            workingDirectory: '.',
            failOnNoChanges: true,
            fetchCommit: false,
            push: false,
        };

        mock.method(githubClient, 'createGitHubClient', () => ({}));
        mock.method(core, 'startGroup', () => {});
        mock.method(core, 'endGroup', () => {});
        mock.method(core, 'info', () => {});
        mock.method(core, 'warning', () => {});

        // Mock collectFiles to return empty array
        const mockCollectFiles = mock.fn(async () => []);
        mock.method(fileCollector, 'collectFiles', mockCollectFiles);

        await assert.rejects(async () => await createSignedCommit(inputs), {
            message: /No files to commit and fail-on-no-changes is true/,
        });
    });

    it('should create blobs for multiple files', async () => {
        const mockOctokit = {
            rest: {
                git: {
                    getRef: mock.fn(async () => ({
                        data: { object: { sha: 'abc123' } },
                    })),
                    getCommit: mock.fn(async () => ({
                        data: { tree: { sha: 'tree123' } },
                    })),
                    createBlob: mock.fn(async () => ({
                        data: { sha: 'blob123' },
                    })),
                    createTree: mock.fn(async () => ({
                        data: { sha: 'newtree123' },
                    })),
                    createCommit: mock.fn(async () => ({
                        data: {
                            sha: 'newcommit123',
                            verification: { verified: true },
                        },
                    })),
                },
            },
        };

        mock.method(githubClient, 'createGitHubClient', () => mockOctokit);
        mock.method(core, 'startGroup', () => {});
        mock.method(core, 'endGroup', () => {});
        mock.method(core, 'info', () => {});
        mock.method(core, 'warning', () => {});

        const inputs: ActionInputs = {
            token: 'ghp_test123',
            repository: 'owner/repo',
            branch: 'main',
            message: 'Test commit',
            workingDirectory: '.',
            failOnNoChanges: true,
            fetchCommit: false,
            push: false,
        };

        // Mock collectFiles to return multiple files
        const mockCollectFiles = mock.fn(async () => [
            { path: 'file1.txt', content: 'content1', mode: '100644' },
            { path: 'file2.txt', content: 'content2', mode: '100644' },
            { path: 'file3.txt', content: 'content3', mode: '100755' },
        ]);
        mock.method(fileCollector, 'collectFiles', mockCollectFiles);

        const result = await createSignedCommit(inputs);

        assert.strictEqual(result.commitSha, 'newcommit123');
        assert.strictEqual(mockOctokit.rest.git.createBlob.mock.calls.length, 3);
    });

    it('should pass correct file modes to GitHub API', async () => {
        interface TreeItem {
            path: string;
            mode: string;
            type: string;
            sha: string;
        }
        let capturedTreeItems: TreeItem[] = [];

        const mockCreateTree = mock.fn(async (params: { tree: TreeItem[] }) => {
            capturedTreeItems = params.tree;
            return { data: { sha: 'newtree123' } };
        });

        const mockOctokit = {
            rest: {
                git: {
                    getRef: mock.fn(async () => ({
                        data: { object: { sha: 'abc123' } },
                    })),
                    getCommit: mock.fn(async () => ({
                        data: { tree: { sha: 'tree123' } },
                    })),
                    createBlob: mock.fn(async () => ({
                        data: { sha: 'blob123' },
                    })),
                    createTree: mockCreateTree,
                    createCommit: mock.fn(async () => ({
                        data: {
                            sha: 'newcommit123',
                            verification: { verified: true },
                        },
                    })),
                },
            },
        };

        mock.method(githubClient, 'createGitHubClient', () => mockOctokit);
        mock.method(core, 'startGroup', () => {});
        mock.method(core, 'endGroup', () => {});
        mock.method(core, 'info', () => {});
        mock.method(core, 'warning', () => {});

        const inputs: ActionInputs = {
            token: 'ghp_test123',
            repository: 'owner/repo',
            branch: 'main',
            message: 'Test commit',
            workingDirectory: '.',
            failOnNoChanges: true,
            fetchCommit: false,
            push: false,
        };

        // Mock with executable and regular files
        const mockCollectFiles = mock.fn(async () => [
            { path: 'script.sh', content: '#!/bin/bash', mode: '100755' },
            { path: 'readme.txt', content: 'readme', mode: '100644' },
        ]);
        mock.method(fileCollector, 'collectFiles', mockCollectFiles);

        await createSignedCommit(inputs);

        // Check that createTree was called with correct modes
        assert.ok(capturedTreeItems.length > 0, 'Expected tree items to be captured');

        const scriptItem = capturedTreeItems.find((item) => item.path === 'script.sh');
        const readmeItem = capturedTreeItems.find((item) => item.path === 'readme.txt');

        assert.ok(scriptItem, 'Expected to find script.sh in tree items');
        assert.ok(readmeItem, 'Expected to find readme.txt in tree items');
        assert.strictEqual(scriptItem.mode, '100755', 'Executable file should have mode 100755');
        assert.strictEqual(readmeItem.mode, '100644', 'Regular file should have mode 100644');
    });

    it('should handle GitHub API errors gracefully', async () => {
        const mockOctokit = {
            rest: {
                git: {
                    getRef: mock.fn(async () => {
                        throw new Error('API rate limit exceeded');
                    }),
                },
            },
        };

        mock.method(githubClient, 'createGitHubClient', () => mockOctokit);
        mock.method(core, 'startGroup', () => {});
        mock.method(core, 'endGroup', () => {});
        mock.method(core, 'info', () => {});

        const inputs: ActionInputs = {
            token: 'ghp_test123',
            repository: 'owner/repo',
            branch: 'main',
            message: 'Test commit',
            workingDirectory: '.',
            failOnNoChanges: true,
            fetchCommit: false,
            push: false,
        };

        const mockCollectFiles = mock.fn(async () => [{ path: 'file.txt', content: 'content', mode: '100644' }]);
        mock.method(fileCollector, 'collectFiles', mockCollectFiles);

        await assert.rejects(async () => await createSignedCommit(inputs), {
            message: /API rate limit exceeded/,
        });
    });
});
