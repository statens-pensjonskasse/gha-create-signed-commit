import * as assert from 'node:assert';
import { describe, it, mock } from 'node:test';
import esmock from 'esmock';

const coreMocks = {
    debug: () => {},
    info: () => {},
};

describe('fetchCommit', () => {
    it('should fetch commit details successfully', async () => {
        const mockOctokit = {
            rest: {
                git: {
                    getCommit: mock.fn(async () => ({
                        data: {
                            sha: 'commit123',
                            author: { name: 'Test Author' },
                            message: 'Test commit message',
                            tree: { sha: 'tree123' },
                            verification: { verified: true },
                        },
                    })),
                },
            },
        };

        const { fetchCommit } = await esmock(
            './git-operations.js',
            import.meta.url,
            {
                './github-client.js': {
                    createGitHubClient: () => mockOctokit,
                    parseRepository: () => ({ owner: 'test-owner', repo: 'test-repo' }),
                },
            },
            {
                '@actions/core': coreMocks,
            },
        );

        await fetchCommit('commit123', 'token', 'test-owner/test-repo');

        // Verify the API was called
        assert.strictEqual(mockOctokit.rest.git.getCommit.mock.calls.length, 1);
    });

    it('should throw error for invalid repository format', async () => {
        const { fetchCommit } = await esmock(
            './git-operations.js',
            import.meta.url,
            {
                './github-client.js': {
                    parseRepository: () => {
                        throw new Error('Invalid repository format: invalid. Expected format: owner/repo');
                    },
                    createGitHubClient: () => ({}),
                },
            },
            {
                '@actions/core': coreMocks,
            },
        );

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

        const { fetchCommit } = await esmock(
            './git-operations.js',
            import.meta.url,
            {
                './github-client.js': {
                    createGitHubClient: () => mockOctokit,
                    parseRepository: () => ({ owner: 'test-owner', repo: 'test-repo' }),
                },
            },
            {
                '@actions/core': coreMocks,
            },
        );

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

        const { fetchCommit } = await esmock(
            './git-operations.js',
            import.meta.url,
            {
                './github-client.js': {
                    createGitHubClient: () => mockOctokit,
                    parseRepository: () => ({ owner: 'test-owner', repo: 'test-repo' }),
                },
            },
            {
                '@actions/core': coreMocks,
            },
        );

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

        const { pushCommit } = await esmock(
            './git-operations.js',
            import.meta.url,
            {
                './github-client.js': {
                    createGitHubClient: () => mockOctokit,
                    parseRepository: () => ({ owner: 'test-owner', repo: 'test-repo' }),
                },
            },
            {
                '@actions/core': { ...coreMocks, info: () => {} },
            },
        );

        await pushCommit('commit123', 'main', 'token', 'test-owner/test-repo');

        // Verify the API was called
        assert.strictEqual(mockOctokit.rest.git.updateRef.mock.calls.length, 1);
    });

    it('should throw error for invalid repository format', async () => {
        const { pushCommit } = await esmock(
            './git-operations.js',
            import.meta.url,
            {
                './github-client.js': {
                    parseRepository: () => {
                        throw new Error('Invalid repository format: invalid. Expected format: owner/repo');
                    },
                    createGitHubClient: () => ({}),
                },
            },
            {
                '@actions/core': coreMocks,
            },
        );

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

        const { pushCommit } = await esmock(
            './git-operations.js',
            import.meta.url,
            {
                './github-client.js': {
                    createGitHubClient: () => mockOctokit,
                    parseRepository: () => ({ owner: 'test-owner', repo: 'test-repo' }),
                },
            },
            {
                '@actions/core': coreMocks,
            },
        );

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

        const { pushCommit } = await esmock(
            './git-operations.js',
            import.meta.url,
            {
                './github-client.js': {
                    createGitHubClient: () => mockOctokit,
                    parseRepository: () => ({ owner: 'test-owner', repo: 'test-repo' }),
                },
            },
            {
                '@actions/core': coreMocks,
            },
        );

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
