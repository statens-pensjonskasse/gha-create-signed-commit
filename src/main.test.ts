import * as assert from 'node:assert';
import { describe, it, mock } from 'node:test';
import * as core from '@actions/core';
import * as fileCollector from './file-collector';
import * as gitOperations from './git-operations';
import * as githubClient from './github-client';
import { run } from './main';
import * as validation from './validation';

// Suppress debug logging in tests (info and warning still show)
mock.method(core, 'debug', () => {});

describe('run', () => {
    it('should execute successfully and set outputs', async () => {
        const mockGetInput = mock.fn((name: string) => {
            const inputs: Record<string, string> = {
                token: 'ghp_test123',
                repository: 'owner/repo',
                branch: 'main',
                message: 'Test commit',
                paths: 'test.txt',
            };
            return inputs[name] || '';
        });
        const mockGetBooleanInput = mock.fn(() => false);

        const mockSetOutput = mock.fn(() => {});

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

        mock.method(core, 'getInput', mockGetInput);
        mock.method(core, 'getBooleanInput', mockGetBooleanInput);
        mock.method(core, 'setOutput', mockSetOutput);
        mock.method(githubClient, 'createGitHubClient', () => mockOctokit);
        mock.method(core, 'startGroup', () => {});
        mock.method(core, 'endGroup', () => {});
        mock.method(core, 'info', () => {});
        mock.method(core, 'warning', () => {});

        // Mock collectFiles to return test data
        const mockCollectFiles = mock.fn(async () => [{ path: 'test.txt', content: 'hello', mode: '100644' }]);
        mock.method(fileCollector, 'collectFiles', mockCollectFiles);

        // Mock fetchCommit
        const mockFetchCommit = mock.fn(async () => {});
        mock.method(gitOperations, 'fetchCommit', mockFetchCommit);

        await run();

        assert.strictEqual(mockSetOutput.mock.calls.length, 2);
        assert.deepStrictEqual(mockSetOutput.mock.calls[0].arguments, ['commit-sha', 'newcommit123']);
        assert.deepStrictEqual(mockSetOutput.mock.calls[1].arguments, ['tree-sha', 'newtree123']);
    });

    it('should set failed status on error', async () => {
        const mockGetInput = mock.fn((name: string) => {
            const inputs: Record<string, string> = {
                token: 'ghp_test123',
                repository: 'owner/repo',
                branch: 'main',
                message: 'Test commit',
                paths: 'nonexistent.txt',
            };
            return inputs[name] || '';
        });
        const mockGetBooleanInput = mock.fn(() => false);

        const mockSetFailed = mock.fn((_message: string | Error) => {});

        mock.method(core, 'getInput', mockGetInput);
        mock.method(core, 'getBooleanInput', mockGetBooleanInput);
        mock.method(core, 'setFailed', mockSetFailed);
        mock.method(core, 'startGroup', () => {});
        mock.method(core, 'endGroup', () => {});
        mock.method(core, 'info', () => {});
        mock.method(githubClient, 'createGitHubClient', () => ({}));

        // Mock collectFiles to throw error for non-existent file
        const mockCollectFiles = mock.fn(async () => {
            throw new Error('Path does not exist: nonexistent.txt');
        });
        mock.method(fileCollector, 'collectFiles', mockCollectFiles);

        await run();

        assert.strictEqual(mockSetFailed.mock.calls.length, 1);
        const firstCall = mockSetFailed.mock.calls[0];
        assert.ok(firstCall, 'Expected at least one call to setFailed');
        const errorMessage = String(firstCall.arguments[0]);
        assert.match(errorMessage, /Path does not exist/);
    });

    it('should fetch commit when fetch-commit is enabled', async () => {
        const mockGetInput = mock.fn((name: string) => {
            const inputs: Record<string, string> = {
                token: 'ghp_test123',
                repository: 'owner/repo',
                branch: 'main',
                message: 'Test commit',
                'working-directory': '/test/dir',
                paths: 'test.txt',
            };
            return inputs[name] || '';
        });
        const mockGetBooleanInput = mock.fn((name: string) => {
            return name === 'fetch-commit';
        });

        const mockSetOutput = mock.fn(() => {});

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

        mock.method(core, 'getInput', mockGetInput);
        mock.method(core, 'getBooleanInput', mockGetBooleanInput);
        mock.method(core, 'setOutput', mockSetOutput);
        mock.method(githubClient, 'createGitHubClient', () => mockOctokit);
        mock.method(core, 'startGroup', () => {});
        mock.method(core, 'endGroup', () => {});
        mock.method(core, 'info', () => {});
        mock.method(core, 'warning', () => {});
        mock.method(validation, 'validateInputs', () => {});

        const mockCollectFiles = mock.fn(async () => [{ path: 'test.txt', content: 'hello', mode: '100644' }]);
        mock.method(fileCollector, 'collectFiles', mockCollectFiles);

        const mockFetchCommit = mock.fn(async () => {});
        mock.method(gitOperations, 'fetchCommit', mockFetchCommit);

        await run();

        assert.strictEqual(mockFetchCommit.mock.calls.length, 1);
        assert.deepStrictEqual(mockFetchCommit.mock.calls[0].arguments, ['newcommit123', 'ghp_test123', 'owner/repo']);
    });

    it('should not fetch commit when fetch-commit is disabled', async () => {
        const mockGetInput = mock.fn((name: string) => {
            const inputs: Record<string, string> = {
                token: 'ghp_test123',
                repository: 'owner/repo',
                branch: 'main',
                message: 'Test commit',
                paths: 'test.txt',
            };
            return inputs[name] || '';
        });
        const mockGetBooleanInput = mock.fn(() => false);

        const mockSetOutput = mock.fn(() => {});

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

        mock.method(core, 'getInput', mockGetInput);
        mock.method(core, 'getBooleanInput', mockGetBooleanInput);
        mock.method(core, 'setOutput', mockSetOutput);
        mock.method(githubClient, 'createGitHubClient', () => mockOctokit);
        mock.method(core, 'startGroup', () => {});
        mock.method(core, 'endGroup', () => {});
        mock.method(core, 'info', () => {});
        mock.method(core, 'warning', () => {});

        const mockCollectFiles = mock.fn(async () => [{ path: 'test.txt', content: 'hello', mode: '100644' }]);
        mock.method(fileCollector, 'collectFiles', mockCollectFiles);

        const mockFetchCommit = mock.fn(async () => {});
        mock.method(gitOperations, 'fetchCommit', mockFetchCommit);

        await run();

        assert.strictEqual(mockFetchCommit.mock.calls.length, 0);
    });

    it('should push commit when push is enabled', async () => {
        const mockGetInput = mock.fn((name: string) => {
            const inputs: Record<string, string> = {
                token: 'ghp_test123',
                repository: 'owner/repo',
                branch: 'main',
                message: 'Test commit',
                paths: 'test.txt',
            };
            return inputs[name] || '';
        });
        const mockGetBooleanInput = mock.fn((name: string) => {
            return name === 'push';
        });

        const mockSetOutput = mock.fn(() => {});

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
                    updateRef: mock.fn(async () => ({
                        data: {},
                    })),
                },
            },
        };

        mock.method(core, 'getInput', mockGetInput);
        mock.method(core, 'getBooleanInput', mockGetBooleanInput);
        mock.method(core, 'setOutput', mockSetOutput);
        mock.method(githubClient, 'createGitHubClient', () => mockOctokit);
        mock.method(core, 'startGroup', () => {});
        mock.method(core, 'endGroup', () => {});
        mock.method(core, 'info', () => {});
        mock.method(core, 'warning', () => {});
        mock.method(validation, 'validateInputs', () => {});

        const mockCollectFiles = mock.fn(async () => [{ path: 'test.txt', content: 'hello', mode: '100644' }]);
        mock.method(fileCollector, 'collectFiles', mockCollectFiles);

        const mockFetchCommit = mock.fn(async () => {});
        mock.method(gitOperations, 'fetchCommit', mockFetchCommit);

        const mockPushCommit = mock.fn(async () => {});
        mock.method(gitOperations, 'pushCommit', mockPushCommit);

        await run();

        assert.strictEqual(mockPushCommit.mock.calls.length, 1);
        assert.deepStrictEqual(mockPushCommit.mock.calls[0].arguments, ['newcommit123', 'main', 'ghp_test123', 'owner/repo']);
    });

    it('should not push commit when push is disabled', async () => {
        const mockGetInput = mock.fn((name: string) => {
            const inputs: Record<string, string> = {
                token: 'ghp_test123',
                repository: 'owner/repo',
                branch: 'main',
                message: 'Test commit',
                paths: 'test.txt',
            };
            return inputs[name] || '';
        });
        const mockGetBooleanInput = mock.fn(() => false);

        const mockSetOutput = mock.fn(() => {});

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

        mock.method(core, 'getInput', mockGetInput);
        mock.method(core, 'getBooleanInput', mockGetBooleanInput);
        mock.method(core, 'setOutput', mockSetOutput);
        mock.method(githubClient, 'createGitHubClient', () => mockOctokit);
        mock.method(core, 'startGroup', () => {});
        mock.method(core, 'endGroup', () => {});
        mock.method(core, 'info', () => {});
        mock.method(core, 'warning', () => {});

        const mockCollectFiles = mock.fn(async () => [{ path: 'test.txt', content: 'hello', mode: '100644' }]);
        mock.method(fileCollector, 'collectFiles', mockCollectFiles);

        const mockFetchCommit = mock.fn(async () => {});
        mock.method(gitOperations, 'fetchCommit', mockFetchCommit);

        const mockPushCommit = mock.fn(async () => {});
        mock.method(gitOperations, 'pushCommit', mockPushCommit);

        await run();

        assert.strictEqual(mockPushCommit.mock.calls.length, 0);
    });
});
