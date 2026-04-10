import * as assert from 'node:assert';
import { describe, it, mock } from 'node:test';
import esmock from 'esmock';
import type { FileChange } from './types.js';

// Import createBlobsInBatches with @actions/core mocked to suppress logging
const { createBlobsInBatches } = await esmock(
    './blob-creator.js',
    import.meta.url,
    {},
    {
        '@actions/core': {
            info: () => {},
            debug: () => {},
        },
    },
);

describe('createBlobsInBatches', () => {
    it('should create blobs for all files', async () => {
        const files: FileChange[] = [
            { path: 'file1.txt', content: 'content1', mode: '100644' },
            { path: 'file2.txt', content: 'content2', mode: '100755' },
        ];

        const mockOctokit = {
            rest: {
                git: {
                    createBlob: mock.fn(async () => ({
                        data: { sha: 'blob123' },
                    })),
                },
            },
        };

        // biome-ignore lint/suspicious/noExplicitAny: Mock object for testing
        const result = await createBlobsInBatches(files, mockOctokit as any, 'owner', 'repo');

        assert.strictEqual(result.length, 2);
        assert.strictEqual(mockOctokit.rest.git.createBlob.mock.calls.length, 2);
        assert.strictEqual(result[0].path, 'file1.txt');
        assert.strictEqual(result[0].mode, '100644');
        assert.strictEqual(result[1].path, 'file2.txt');
        assert.strictEqual(result[1].mode, '100755');
    });

    it('should process files in batches', async () => {
        const files: FileChange[] = Array.from({ length: 25 }, (_, i) => ({
            path: `file${i}.txt`,
            content: `content${i}`,
            mode: '100644' as const,
        }));

        const mockOctokit = {
            rest: {
                git: {
                    createBlob: mock.fn(async () => ({
                        data: { sha: 'blob123' },
                    })),
                },
            },
        };

        // biome-ignore lint/suspicious/noExplicitAny: Mock object for testing
        const result = await createBlobsInBatches(files, mockOctokit as any, 'owner', 'repo', 10);

        assert.strictEqual(result.length, 25);
        assert.strictEqual(mockOctokit.rest.git.createBlob.mock.calls.length, 25);
    });

    it('should handle single file', async () => {
        const files: FileChange[] = [{ path: 'single.txt', content: 'content', mode: '100644' }];

        const mockOctokit = {
            rest: {
                git: {
                    createBlob: mock.fn(async () => ({
                        data: { sha: 'singleblob' },
                    })),
                },
            },
        };

        // biome-ignore lint/suspicious/noExplicitAny: Mock object for testing
        const result = await createBlobsInBatches(files, mockOctokit as any, 'owner', 'repo');

        assert.strictEqual(result.length, 1);
        assert.strictEqual(result[0].sha, 'singleblob');
    });

    it('should handle empty file list', async () => {
        const files: FileChange[] = [];

        const mockOctokit = {
            rest: {
                git: {
                    createBlob: mock.fn(async () => ({
                        data: { sha: 'blob123' },
                    })),
                },
            },
        };

        // biome-ignore lint/suspicious/noExplicitAny: Mock object for testing
        const result = await createBlobsInBatches(files, mockOctokit as any, 'owner', 'repo');

        assert.strictEqual(result.length, 0);
        assert.strictEqual(mockOctokit.rest.git.createBlob.mock.calls.length, 0);
    });

    it('should preserve file modes correctly', async () => {
        const files: FileChange[] = [
            { path: 'regular.txt', content: 'content', mode: '100644' },
            { path: 'executable.sh', content: '#!/bin/bash', mode: '100755' },
        ];

        const mockOctokit = {
            rest: {
                git: {
                    createBlob: mock.fn(async () => ({
                        data: { sha: 'blob123' },
                    })),
                },
            },
        };

        // biome-ignore lint/suspicious/noExplicitAny: Mock object for testing
        const result = await createBlobsInBatches(files, mockOctokit as any, 'owner', 'repo');

        assert.strictEqual(result[0].mode, '100644');
        assert.strictEqual(result[1].mode, '100755');
    });

    it('should use custom batch size', async () => {
        const files: FileChange[] = Array.from({ length: 15 }, (_, i) => ({
            path: `file${i}.txt`,
            content: `content${i}`,
            mode: '100644' as const,
        }));

        const mockOctokit = {
            rest: {
                git: {
                    createBlob: mock.fn(async () => ({
                        data: { sha: 'blob123' },
                    })),
                },
            },
        };

        // With batch size of 5, should process in 3 batches
        // biome-ignore lint/suspicious/noExplicitAny: Mock object for testing
        const result = await createBlobsInBatches(files, mockOctokit as any, 'owner', 'repo', 5);

        assert.strictEqual(result.length, 15);
        assert.strictEqual(mockOctokit.rest.git.createBlob.mock.calls.length, 15);
    });

    it('should handle API errors gracefully', async () => {
        const files: FileChange[] = [{ path: 'error.txt', content: 'content', mode: '100644' }];

        const mockOctokit = {
            rest: {
                git: {
                    createBlob: mock.fn(async () => {
                        throw new Error('API rate limit exceeded');
                    }),
                },
            },
        };

        await assert.rejects(
            async () => {
                // biome-ignore lint/suspicious/noExplicitAny: Mock object for testing
                await createBlobsInBatches(files, mockOctokit as any, 'owner', 'repo');
            },
            {
                message: /API rate limit exceeded/,
            },
        );
    });

    it('should pass correct parameters to GitHub API', async () => {
        const files: FileChange[] = [{ path: 'test.txt', content: 'test content', mode: '100644' }];

        const mockOctokit = {
            rest: {
                git: {
                    // biome-ignore lint/suspicious/noExplicitAny: Mock params for testing
                    createBlob: mock.fn(async (params: any) => {
                        assert.strictEqual(params.owner, 'test-owner');
                        assert.strictEqual(params.repo, 'test-repo');
                        assert.strictEqual(params.content, 'test content');
                        assert.strictEqual(params.encoding, 'utf-8');
                        return { data: { sha: 'blob123' } };
                    }),
                },
            },
        };

        // biome-ignore lint/suspicious/noExplicitAny: Mock object for testing
        await createBlobsInBatches(files, mockOctokit as any, 'test-owner', 'test-repo');

        assert.strictEqual(mockOctokit.rest.git.createBlob.mock.calls.length, 1);
    });
});
