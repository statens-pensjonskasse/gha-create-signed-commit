import * as assert from 'node:assert';
import { describe, it, mock } from 'node:test';
import esmock from 'esmock';

const coreMocks = {
    debug: () => {},
    info: () => {},
    warning: () => {},
    startGroup: () => {},
    endGroup: () => {},
};

describe('run', () => {
    it('should execute successfully and set outputs', async () => {
        const mockSetOutput = mock.fn(() => {});

        const { run } = await esmock(
            './main.js',
            import.meta.url,
            {
                './commit-creator.js': {
                    createSignedCommit: mock.fn(async () => ({
                        commitSha: 'newcommit123',
                        treeSha: 'newtree123',
                    })),
                },
                './git-operations.js': {
                    fetchCommit: mock.fn(async () => {}),
                    pushCommit: mock.fn(async () => {}),
                },
                './validation.js': {
                    validateInputs: () => {},
                },
            },
            {
                '@actions/core': {
                    ...coreMocks,
                    getInput: mock.fn((name: string) => {
                        const inputs: Record<string, string> = {
                            token: 'ghp_test123',
                            repository: 'owner/repo',
                            branch: 'main',
                            message: 'Test commit',
                            paths: 'test.txt',
                        };
                        return inputs[name] || '';
                    }),
                    getBooleanInput: mock.fn(() => false),
                    setOutput: mockSetOutput,
                    setFailed: mock.fn(() => {}),
                },
            },
        );

        await run();

        assert.strictEqual(mockSetOutput.mock.calls.length, 2);
        assert.deepStrictEqual(mockSetOutput.mock.calls[0].arguments, ['commit-sha', 'newcommit123']);
        assert.deepStrictEqual(mockSetOutput.mock.calls[1].arguments, ['tree-sha', 'newtree123']);
    });

    it('should set failed status on error', async () => {
        const mockSetFailed = mock.fn((_message: string | Error) => {});

        const { run } = await esmock(
            './main.js',
            import.meta.url,
            {
                './commit-creator.js': {
                    createSignedCommit: mock.fn(async () => {
                        throw new Error('Path does not exist: nonexistent.txt');
                    }),
                },
                './git-operations.js': {
                    fetchCommit: mock.fn(async () => {}),
                    pushCommit: mock.fn(async () => {}),
                },
                './validation.js': {
                    validateInputs: () => {},
                },
            },
            {
                '@actions/core': {
                    ...coreMocks,
                    getInput: mock.fn((name: string) => {
                        const inputs: Record<string, string> = {
                            token: 'ghp_test123',
                            repository: 'owner/repo',
                            branch: 'main',
                            message: 'Test commit',
                            paths: 'nonexistent.txt',
                        };
                        return inputs[name] || '';
                    }),
                    getBooleanInput: mock.fn(() => false),
                    setOutput: mock.fn(() => {}),
                    setFailed: mockSetFailed,
                },
            },
        );

        await run();

        assert.strictEqual(mockSetFailed.mock.calls.length, 1);
        const firstCall = mockSetFailed.mock.calls[0];
        assert.ok(firstCall, 'Expected at least one call to setFailed');
        const errorMessage = String(firstCall.arguments[0]);
        assert.match(errorMessage, /Path does not exist/);
    });

    it('should fetch commit when fetch-commit is enabled', async () => {
        const mockFetchCommit = mock.fn(async () => {});

        const { run } = await esmock(
            './main.js',
            import.meta.url,
            {
                './commit-creator.js': {
                    createSignedCommit: mock.fn(async () => ({
                        commitSha: 'newcommit123',
                        treeSha: 'newtree123',
                    })),
                },
                './git-operations.js': {
                    fetchCommit: mockFetchCommit,
                    pushCommit: mock.fn(async () => {}),
                },
                './validation.js': {
                    validateInputs: () => {},
                },
            },
            {
                '@actions/core': {
                    ...coreMocks,
                    getInput: mock.fn((name: string) => {
                        const inputs: Record<string, string> = {
                            token: 'ghp_test123',
                            repository: 'owner/repo',
                            branch: 'main',
                            message: 'Test commit',
                            'working-directory': '/test/dir',
                            paths: 'test.txt',
                        };
                        return inputs[name] || '';
                    }),
                    getBooleanInput: mock.fn((name: string) => {
                        return name === 'fetch-commit';
                    }),
                    setOutput: mock.fn(() => {}),
                    setFailed: mock.fn(() => {}),
                },
            },
        );

        await run();

        assert.strictEqual(mockFetchCommit.mock.calls.length, 1);
        assert.deepStrictEqual(mockFetchCommit.mock.calls[0].arguments, ['newcommit123', 'ghp_test123', 'owner/repo']);
    });

    it('should not fetch commit when fetch-commit is disabled', async () => {
        const mockFetchCommit = mock.fn(async () => {});

        const { run } = await esmock(
            './main.js',
            import.meta.url,
            {
                './commit-creator.js': {
                    createSignedCommit: mock.fn(async () => ({
                        commitSha: 'newcommit123',
                        treeSha: 'newtree123',
                    })),
                },
                './git-operations.js': {
                    fetchCommit: mockFetchCommit,
                    pushCommit: mock.fn(async () => {}),
                },
                './validation.js': {
                    validateInputs: () => {},
                },
            },
            {
                '@actions/core': {
                    ...coreMocks,
                    getInput: mock.fn((name: string) => {
                        const inputs: Record<string, string> = {
                            token: 'ghp_test123',
                            repository: 'owner/repo',
                            branch: 'main',
                            message: 'Test commit',
                            paths: 'test.txt',
                        };
                        return inputs[name] || '';
                    }),
                    getBooleanInput: mock.fn(() => false),
                    setOutput: mock.fn(() => {}),
                    setFailed: mock.fn(() => {}),
                },
            },
        );

        await run();

        assert.strictEqual(mockFetchCommit.mock.calls.length, 0);
    });

    it('should push commit when push is enabled', async () => {
        const mockPushCommit = mock.fn(async () => {});

        const { run } = await esmock(
            './main.js',
            import.meta.url,
            {
                './commit-creator.js': {
                    createSignedCommit: mock.fn(async () => ({
                        commitSha: 'newcommit123',
                        treeSha: 'newtree123',
                    })),
                },
                './git-operations.js': {
                    fetchCommit: mock.fn(async () => {}),
                    pushCommit: mockPushCommit,
                },
                './validation.js': {
                    validateInputs: () => {},
                },
            },
            {
                '@actions/core': {
                    ...coreMocks,
                    getInput: mock.fn((name: string) => {
                        const inputs: Record<string, string> = {
                            token: 'ghp_test123',
                            repository: 'owner/repo',
                            branch: 'main',
                            message: 'Test commit',
                            paths: 'test.txt',
                        };
                        return inputs[name] || '';
                    }),
                    getBooleanInput: mock.fn((name: string) => {
                        return name === 'push';
                    }),
                    setOutput: mock.fn(() => {}),
                    setFailed: mock.fn(() => {}),
                },
            },
        );

        await run();

        assert.strictEqual(mockPushCommit.mock.calls.length, 1);
        assert.deepStrictEqual(mockPushCommit.mock.calls[0].arguments, [
            'newcommit123',
            'main',
            'ghp_test123',
            'owner/repo',
        ]);
    });

    it('should not push commit when push is disabled', async () => {
        const mockPushCommit = mock.fn(async () => {});

        const { run } = await esmock(
            './main.js',
            import.meta.url,
            {
                './commit-creator.js': {
                    createSignedCommit: mock.fn(async () => ({
                        commitSha: 'newcommit123',
                        treeSha: 'newtree123',
                    })),
                },
                './git-operations.js': {
                    fetchCommit: mock.fn(async () => {}),
                    pushCommit: mockPushCommit,
                },
                './validation.js': {
                    validateInputs: () => {},
                },
            },
            {
                '@actions/core': {
                    ...coreMocks,
                    getInput: mock.fn((name: string) => {
                        const inputs: Record<string, string> = {
                            token: 'ghp_test123',
                            repository: 'owner/repo',
                            branch: 'main',
                            message: 'Test commit',
                            paths: 'test.txt',
                        };
                        return inputs[name] || '';
                    }),
                    getBooleanInput: mock.fn(() => false),
                    setOutput: mock.fn(() => {}),
                    setFailed: mock.fn(() => {}),
                },
            },
        );

        await run();

        assert.strictEqual(mockPushCommit.mock.calls.length, 0);
    });
});
