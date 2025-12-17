import * as assert from 'node:assert';
import { describe, it, mock } from 'node:test';
import * as core from '@actions/core';
import { getActionInputs } from './input-parser';

// Suppress debug logging in tests (info and warning still show)
mock.method(core, 'debug', () => {});

describe('getActionInputs', () => {
    it('should parse paths input correctly', () => {
        const mockGetInput = mock.fn((name: string) => {
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
        const mockGetBooleanInput = mock.fn(() => false);

        mock.method(core, 'getInput', mockGetInput);
        mock.method(core, 'getBooleanInput', mockGetBooleanInput);

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
        const mockGetInput = mock.fn((name: string) => {
            const inputs: Record<string, string> = {
                token: 'ghp_test123',
                repository: 'owner/repo',
                branch: 'main',
                message: 'Test commit',
                paths: 'file1.txt\n\n\nfile2.txt\n',
            };
            return inputs[name] || '';
        });
        const mockGetBooleanInput = mock.fn(() => false);

        mock.method(core, 'getInput', mockGetInput);
        mock.method(core, 'getBooleanInput', mockGetBooleanInput);

        const inputs = getActionInputs();

        assert.ok(inputs.paths);
        assert.strictEqual(inputs.paths.length, 2);
        assert.strictEqual(inputs.paths[0], 'file1.txt');
        assert.strictEqual(inputs.paths[1], 'file2.txt');
    });

    it('should log info when no paths specified', () => {
        const mockGetInput = mock.fn((name: string) => {
            const inputs: Record<string, string> = {
                token: 'ghp_test123',
                repository: 'owner/repo',
                branch: 'main',
                message: 'Test commit',
            };
            return inputs[name] || '';
        });
        const mockGetBooleanInput = mock.fn(() => false);
        const mockInfo = mock.fn(() => {});

        mock.method(core, 'getInput', mockGetInput);
        mock.method(core, 'getBooleanInput', mockGetBooleanInput);
        mock.method(core, 'info', mockInfo);

        const inputs = getActionInputs();

        assert.strictEqual(inputs.paths, undefined);
    });

    it('should use default values for optional inputs', () => {
        const mockGetInput = mock.fn((name: string) => {
            const inputs: Record<string, string> = {
                token: 'ghp_test123',
                branch: 'main',
                message: 'Test commit',
            };
            return inputs[name] || '';
        });
        const mockGetBooleanInput = mock.fn(() => true);

        mock.method(core, 'getInput', mockGetInput);
        mock.method(core, 'getBooleanInput', mockGetBooleanInput);

        const inputs = getActionInputs();

        assert.strictEqual(inputs.workingDirectory, '.');
        assert.strictEqual(inputs.failOnNoChanges, true);
        assert.strictEqual(inputs.fetchCommit, true);
        assert.strictEqual(inputs.push, true);
    });

    it('should parse fetch-commit as boolean', () => {
        const mockGetInput = mock.fn((name: string) => {
            const inputs: Record<string, string> = {
                token: 'ghp_test123',
                repository: 'owner/repo',
                branch: 'main',
                message: 'Test commit',
            };
            return inputs[name] || '';
        });
        const mockGetBooleanInput = mock.fn((name: string) => {
            return name !== 'fetch-commit';
        });

        mock.method(core, 'getInput', mockGetInput);
        mock.method(core, 'getBooleanInput', mockGetBooleanInput);

        const inputs = getActionInputs();

        assert.strictEqual(inputs.fetchCommit, false);
    });

    it('should parse push as boolean', () => {
        const mockGetInput = mock.fn((name: string) => {
            const inputs: Record<string, string> = {
                token: 'ghp_test123',
                repository: 'owner/repo',
                branch: 'main',
                message: 'Test commit',
            };
            return inputs[name] || '';
        });
        const mockGetBooleanInput = mock.fn((name: string) => {
            return name === 'push';
        });

        mock.method(core, 'getInput', mockGetInput);
        mock.method(core, 'getBooleanInput', mockGetBooleanInput);

        const inputs = getActionInputs();

        assert.strictEqual(inputs.push, true);
        assert.strictEqual(inputs.fetchCommit, false);
        assert.strictEqual(inputs.failOnNoChanges, false);
    });
});
