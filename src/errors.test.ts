import * as assert from 'node:assert';
import { describe, it } from 'node:test';
import {
    CommitCreationError,
    FileCollectionError,
    GitHubAPIError,
    RepositoryValidationError,
    ValidationError,
} from './errors';

describe('Custom Error Classes', () => {
    describe('RepositoryValidationError', () => {
        it('should create error with correct message and name', () => {
            const error = new RepositoryValidationError('invalid-repo');
            assert.strictEqual(error.name, 'RepositoryValidationError');
            assert.ok(error.message.includes('invalid-repo'));
            assert.ok(error.message.includes('owner/repo'));
        });

        it('should be instanceof Error', () => {
            const error = new RepositoryValidationError('test');
            assert.ok(error instanceof Error);
        });
    });

    describe('FileCollectionError', () => {
        it('should create error with message only', () => {
            const error = new FileCollectionError('Failed to collect files');
            assert.strictEqual(error.name, 'FileCollectionError');
            assert.strictEqual(error.message, 'Failed to collect files');
            assert.strictEqual(error.failedPaths, undefined);
        });

        it('should create error with failed paths', () => {
            const paths = ['file1.txt', 'file2.txt'];
            const error = new FileCollectionError('Failed to collect files', paths);
            assert.strictEqual(error.name, 'FileCollectionError');
            assert.deepStrictEqual(error.failedPaths, paths);
        });
    });

    describe('GitHubAPIError', () => {
        it('should create error with all properties', () => {
            const error = new GitHubAPIError('API failed', 403, '/repos/owner/repo/git/refs');
            assert.strictEqual(error.name, 'GitHubAPIError');
            assert.strictEqual(error.message, 'API failed');
            assert.strictEqual(error.statusCode, 403);
            assert.strictEqual(error.endpoint, '/repos/owner/repo/git/refs');
        });

        it('should create error with message only', () => {
            const error = new GitHubAPIError('API failed');
            assert.strictEqual(error.statusCode, undefined);
            assert.strictEqual(error.endpoint, undefined);
        });
    });

    describe('ValidationError', () => {
        it('should create error with correct name', () => {
            const error = new ValidationError('Invalid input');
            assert.strictEqual(error.name, 'ValidationError');
            assert.strictEqual(error.message, 'Invalid input');
        });
    });

    describe('CommitCreationError', () => {
        it('should create error with all properties', () => {
            const error = new CommitCreationError('Commit failed', 'abc123', 'tree456');
            assert.strictEqual(error.name, 'CommitCreationError');
            assert.strictEqual(error.message, 'Commit failed');
            assert.strictEqual(error.commitSha, 'abc123');
            assert.strictEqual(error.treeSha, 'tree456');
        });

        it('should create error with message only', () => {
            const error = new CommitCreationError('Commit failed');
            assert.strictEqual(error.commitSha, undefined);
            assert.strictEqual(error.treeSha, undefined);
        });
    });
});
