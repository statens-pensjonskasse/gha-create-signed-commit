import * as assert from 'node:assert';
import { describe, it, mock } from 'node:test';
import * as core from '@actions/core';
import { fetchCommit, pushCommit } from './git-operations';
import * as githubClient from './github-client';

// Suppress debug logging in tests
mock.method(core, 'debug', () => {});

describe('fetchCommit', () => {
    it('should fetch commit details successfully', async () => {
        const mockOctokit = {
            rest: {
                git: {
                    getCommit: mock.fn(async () => ({
                        data: {
                            sha: 'commit123',
                            author: {
                                name: 'Test Author',
                            },
                            message: 'Test commit message',
                            tree: {
                                sha: 'tree123',
                            },
                            verification: {
                                verified: true,
                            },
                        },
                    })),
                },
            },
        };

        mock.method(githubClient, 'createGitHubClient', () => mockOctokit);
        mock.method(githubClient, 'parseRepository', () => ({ owner: 'test-owner', repo: 'test-repo' }));

        await fetchCommit('commit123', 'token', 'test-owner/test-repo');

        // Verify the API was called
        assert.strictEqual(mockOctokit.rest.git.getCommit.mock.calls.length, 1);
    });

    it('should throw error for invalid repository format', async () => {
        mock.method(githubClient, 'parseRepository', () => {
            throw new Error('Invalid repository format: invalid. Expected format: owner/repo');
        });

        await assert.rejects(
            async () => {
                await fetchCommit('commit123', 'token', 'invalid');
            },
            {
                message: 'Invalid repository format: invalid. Expected format: owner/repo',
            },
        );
    });

    it('should handle API errors', async () => {
        const mockOctokit = {
            rest: {
                git: {
                    getCommit: mock.fn(async () => {
                        throw new Error('API error');
                    }),
                },
            },
        };

        mock.method(githubClient, 'createGitHubClient', () => mockOctokit);
        mock.method(githubClient, 'parseRepository', () => ({ owner: 'test-owner', repo: 'test-repo' }));

        await assert.rejects(
            async () => {
                await fetchCommit('commit123', 'token', 'test-owner/test-repo');
            },
            {
                message: 'Failed to fetch commit commit123: API error',
            },
        );
    });

    it('should handle unknown errors', async () => {
        const mockOctokit = {
            rest: {
                git: {
                    getCommit: mock.fn(async () => {
                        throw 'Unknown error';
                    }),
                },
            },
        };

        mock.method(githubClient, 'createGitHubClient', () => mockOctokit);
        mock.method(githubClient, 'parseRepository', () => ({ owner: 'test-owner', repo: 'test-repo' }));

        await assert.rejects(
            async () => {
                await fetchCommit('commit123', 'token', 'test-owner/test-repo');
            },
            {
                message: 'Failed to fetch commit commit123: Unknown error',
            },
        );
    });
});

describe('pushCommit', () => {
    it('should push commit successfully', async () => {
        const mockOctokit = {
            rest: {
                git: {
                    updateRef: mock.fn(async () => ({
                        data: {},
                    })),
                },
            },
        };

        mock.method(githubClient, 'createGitHubClient', () => mockOctokit);
        mock.method(githubClient, 'parseRepository', () => ({ owner: 'test-owner', repo: 'test-repo' }));
        mock.method(core, 'info', () => {});

        await pushCommit('commit123', 'main', 'token', 'test-owner/test-repo');

        // Verify the API was called
        assert.strictEqual(mockOctokit.rest.git.updateRef.mock.calls.length, 1);
    });

    it('should throw error for invalid repository format', async () => {
        mock.method(githubClient, 'parseRepository', () => {
            throw new Error('Invalid repository format: invalid. Expected format: owner/repo');
        });

        await assert.rejects(
            async () => {
                await pushCommit('commit123', 'main', 'token', 'invalid');
            },
            {
                message: 'Invalid repository format: invalid. Expected format: owner/repo',
            },
        );
    });

    it('should handle API errors', async () => {
        const mockOctokit = {
            rest: {
                git: {
                    updateRef: mock.fn(async () => {
                        throw new Error('API error');
                    }),
                },
            },
        };

        mock.method(githubClient, 'createGitHubClient', () => mockOctokit);
        mock.method(githubClient, 'parseRepository', () => ({ owner: 'test-owner', repo: 'test-repo' }));

        await assert.rejects(
            async () => {
                await pushCommit('commit123', 'main', 'token', 'test-owner/test-repo');
            },
            {
                message: 'Failed to push commit commit123 to main: API error',
            },
        );
    });

    it('should handle unknown errors', async () => {
        const mockOctokit = {
            rest: {
                git: {
                    updateRef: mock.fn(async () => {
                        throw 'Unknown error';
                    }),
                },
            },
        };

        mock.method(githubClient, 'createGitHubClient', () => mockOctokit);
        mock.method(githubClient, 'parseRepository', () => ({ owner: 'test-owner', repo: 'test-repo' }));

        await assert.rejects(
            async () => {
                await pushCommit('commit123', 'main', 'token', 'test-owner/test-repo');
            },
            {
                message: 'Failed to push commit commit123 to main: Unknown error',
            },
        );
    });
});

