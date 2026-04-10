import * as assert from 'node:assert';
import { describe, it, mock } from 'node:test';
import esmock from 'esmock';

const mockGetInput = mock.fn((_name: string) => '');
const mockGetBooleanInput = mock.fn((_name: string) => false);
const mockInfo = mock.fn(() => {});

// Import getActionInputs with @actions/core mocked
const { getActionInputs } = await esmock('./input-parser.js', import.meta.url, {
    '@actions/core': {
        debug: () => {},
        info: mockInfo,
        getInput: mockGetInput,
        getBooleanInput: mockGetBooleanInput,
    },
});

describe('getActionInputs', () => {
    it('should parse paths input correctly', () => {
        mockGetInput.mock.mockImplementation((name: string) => {
            const inputs: Record<string, string> = {
                token: 'ghp_test123',
                repository: 'owner/repo',
                branch: 'main',
                message: 'Test commit',
                'working-directory': '.',
                paths: 'file1.txt\nfolder/\nfile2.txt',
            };
            return inputs[name] || '';
        });
        mockGetBooleanInput.mock.mockImplementation(() => false);

        const inputs = getActionInputs();

        assert.strictEqual(inputs.token, 'ghp_test123');
        assert.strictEqual(inputs.repository, 'owner/repo');
        assert.strictEqual(inputs.branch, 'main');
        assert.strictEqual(inputs.message, 'Test commit');
        assert.strictEqual(inputs.workingDirectory, '.');
        assert.ok(inputs.paths);
        assert.strictEqual(inputs.paths.length, 3);
        assert.strictEqual(inputs.paths[0], 'file1.txt');
        assert.strictEqual(inputs.paths[1], 'folder/');
        assert.strictEqual(inputs.paths[2], 'file2.txt');
    });

    it('should handle empty lines in paths input', () => {
        mockGetInput.mock.mockImplementation((name: string) => {
            const inputs: Record<string, string> = {
                token: 'ghp_test123',
                repository: 'owner/repo',
                branch: 'main',
                message: 'Test commit',
                paths: 'file1.txt\n\n\nfile2.txt\n',
            };
            return inputs[name] || '';
        });
        mockGetBooleanInput.mock.mockImplementation(() => false);

        const inputs = getActionInputs();

        assert.ok(inputs.paths);
        assert.strictEqual(inputs.paths.length, 2);
        assert.strictEqual(inputs.paths[0], 'file1.txt');
        assert.strictEqual(inputs.paths[1], 'file2.txt');
    });

    it('should log info when no paths specified', () => {
        mockGetInput.mock.mockImplementation((name: string) => {
            const inputs: Record<string, string> = {
                token: 'ghp_test123',
                repository: 'owner/repo',
                branch: 'main',
                message: 'Test commit',
            };
            return inputs[name] || '';
        });
        mockGetBooleanInput.mock.mockImplementation(() => false);
        mockInfo.mock.resetCalls();

        const inputs = getActionInputs();

        assert.strictEqual(inputs.paths, undefined);
    });

    it('should use default values for optional inputs', () => {
        mockGetInput.mock.mockImplementation((name: string) => {
            const inputs: Record<string, string> = {
                token: 'ghp_test123',
                branch: 'main',
                message: 'Test commit',
            };
            return inputs[name] || '';
        });
        mockGetBooleanInput.mock.mockImplementation(() => true);

        const inputs = getActionInputs();

        assert.strictEqual(inputs.workingDirectory, '.');
        assert.strictEqual(inputs.failOnNoChanges, true);
        assert.strictEqual(inputs.fetchCommit, true);
        assert.strictEqual(inputs.push, true);
    });

    it('should parse fetch-commit as boolean', () => {
        mockGetInput.mock.mockImplementation((name: string) => {
            const inputs: Record<string, string> = {
                token: 'ghp_test123',
                repository: 'owner/repo',
                branch: 'main',
                message: 'Test commit',
            };
            return inputs[name] || '';
        });
        mockGetBooleanInput.mock.mockImplementation((name: string) => {
            return name !== 'fetch-commit';
        });

        const inputs = getActionInputs();

        assert.strictEqual(inputs.fetchCommit, false);
    });

    it('should parse push as boolean', () => {
        mockGetInput.mock.mockImplementation((name: string) => {
            const inputs: Record<string, string> = {
                token: 'ghp_test123',
                repository: 'owner/repo',
                branch: 'main',
                message: 'Test commit',
            };
            return inputs[name] || '';
        });
        mockGetBooleanInput.mock.mockImplementation((name: string) => {
            return name === 'push';
        });

        const inputs = getActionInputs();

        assert.strictEqual(inputs.push, true);
        assert.strictEqual(inputs.fetchCommit, false);
        assert.strictEqual(inputs.failOnNoChanges, false);
    });

    it('should parse parent-commit when provided', () => {
        mockGetInput.mock.mockImplementation((name: string) => {
            const inputs: Record<string, string> = {
                token: 'ghp_test123',
                repository: 'owner/repo',
                branch: 'main',
                message: 'Test commit',
                'parent-commit': 'abc123def456',
            };
            return inputs[name] || '';
        });
        mockGetBooleanInput.mock.mockImplementation(() => false);

        const inputs = getActionInputs();

        assert.strictEqual(inputs.parentCommit, 'abc123def456');
    });

    it('should set parent-commit to undefined when not provided', () => {
        mockGetInput.mock.mockImplementation((name: string) => {
            const inputs: Record<string, string> = {
                token: 'ghp_test123',
                repository: 'owner/repo',
                branch: 'main',
                message: 'Test commit',
            };
            return inputs[name] || '';
        });
        mockGetBooleanInput.mock.mockImplementation(() => false);

        const inputs = getActionInputs();

        assert.strictEqual(inputs.parentCommit, undefined);
    });
});
