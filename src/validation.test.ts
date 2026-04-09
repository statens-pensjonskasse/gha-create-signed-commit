import * as assert from 'node:assert';
import { describe, it } from 'node:test';
import type { ActionInputs } from './types.js';
import { calculateTotalSize, validateFileSize, validateInputs } from './validation.js';

describe('validateInputs', () => {
    const validInputs: ActionInputs = {
        token: 'ghp_test123',
        repository: 'owner/repo',
        branch: 'main',
        message: 'Test commit',
        workingDirectory: '.',
        failOnNoChanges: true,
        fetchCommit: false,
        push: false,
    };

    it('should pass with valid inputs', () => {
        assert.doesNotThrow(() => {
            validateInputs(validInputs);
        });
    });

    it('should throw error for empty commit message', () => {
        const inputs = { ...validInputs, message: '   ' };
        assert.throws(
            () => {
                validateInputs(inputs);
            },
            {
                name: 'ValidationError',
                message: /Commit message cannot be empty/,
            },
        );
    });

    it('should throw error for commit message exceeding GitHub limit', () => {
        const inputs = { ...validInputs, message: 'a'.repeat(65537) };
        assert.throws(
            () => {
                validateInputs(inputs);
            },
            {
                name: 'ValidationError',
                message: /exceeds GitHub limit/,
            },
        );
    });

    it('should throw error for path traversal attempts', () => {
        const inputs = { ...validInputs, paths: ['../../../etc/passwd'] };
        assert.throws(
            () => {
                validateInputs(inputs);
            },
            {
                name: 'ValidationError',
                message: /invalid.*relative/i,
            },
        );
    });

    it('should throw error for absolute paths', () => {
        const inputs = { ...validInputs, paths: ['/etc/passwd'] };
        assert.throws(
            () => {
                validateInputs(inputs);
            },
            {
                name: 'ValidationError',
                message: /invalid.*relative/i,
            },
        );
    });

    it('should throw error for paths with null bytes', () => {
        const inputs = { ...validInputs, paths: ['file\0name.txt'] };
        assert.throws(
            () => {
                validateInputs(inputs);
            },
            {
                name: 'ValidationError',
                message: /invalid characters/,
            },
        );
    });

    it('should accept valid relative paths', () => {
        const inputs = { ...validInputs, paths: ['src/file.ts', 'docs/README.md', './config.json'] };
        assert.doesNotThrow(() => {
            validateInputs(inputs);
        });
    });

    it('should accept paths with wildcards', () => {
        const inputs = { ...validInputs, paths: ['src/**/*.ts', '*.md'] };
        assert.doesNotThrow(() => {
            validateInputs(inputs);
        });
    });

    it('should accept valid parent-commit SHA', () => {
        const inputs = { ...validInputs, parentCommit: 'a1b2c3d4e5f6789012345678901234567890abcd' };
        assert.doesNotThrow(() => {
            validateInputs(inputs);
        });
    });

    it('should throw error for invalid parent-commit SHA - too short', () => {
        const inputs = { ...validInputs, parentCommit: 'abc123' };
        assert.throws(
            () => {
                validateInputs(inputs);
            },
            {
                name: 'ValidationError',
                message: /Invalid parent-commit SHA.*40-character/,
            },
        );
    });

    it('should throw error for invalid parent-commit SHA - too long', () => {
        const inputs = { ...validInputs, parentCommit: 'a'.repeat(41) };
        assert.throws(
            () => {
                validateInputs(inputs);
            },
            {
                name: 'ValidationError',
                message: /Invalid parent-commit SHA.*40-character/,
            },
        );
    });

    it('should throw error for invalid parent-commit SHA - invalid characters', () => {
        const inputs = { ...validInputs, parentCommit: 'ghijklmnopqrstuvwxyz01234567890123456789' };
        assert.throws(
            () => {
                validateInputs(inputs);
            },
            {
                name: 'ValidationError',
                message: /Invalid parent-commit SHA.*40-character/,
            },
        );
    });

    it('should accept uppercase hexadecimal in parent-commit SHA', () => {
        const inputs = { ...validInputs, parentCommit: 'A1B2C3D4E5F6789012345678901234567890ABCD' };
        assert.doesNotThrow(() => {
            validateInputs(inputs);
        });
    });

    it('should accept undefined parent-commit', () => {
        const inputs = { ...validInputs, parentCommit: undefined };
        assert.doesNotThrow(() => {
            validateInputs(inputs);
        });
    });
});

describe('validateFileSize', () => {
    it('should return undefined for small files', () => {
        const content = 'a'.repeat(1024); // 1KB
        const result = validateFileSize('test.txt', content);
        assert.strictEqual(result, undefined);
    });

    it('should return warning for large files', () => {
        const content = 'a'.repeat(51 * 1024 * 1024); // 51MB
        const result = validateFileSize('large.txt', content);
        assert.ok(result);
        assert.ok(result.includes('51'));
        assert.ok(result.includes('Git LFS'));
    });

    it('should use custom max size', () => {
        const content = 'a'.repeat(6 * 1024 * 1024); // 6MB
        const result = validateFileSize('file.txt', content, 5);
        assert.ok(result);
        assert.ok(result.includes('6.00MB'));
    });

    it('should not warn when file is exactly at limit', () => {
        const content = 'a'.repeat(50 * 1024 * 1024); // 50MB
        const result = validateFileSize('file.txt', content, 50);
        assert.strictEqual(result, undefined);
    });
});

describe('calculateTotalSize', () => {
    it('should calculate total size correctly', () => {
        const files = [
            { content: 'a'.repeat(1024 * 1024) }, // 1MB
            { content: 'b'.repeat(2 * 1024 * 1024) }, // 2MB
            { content: 'c'.repeat(512 * 1024) }, // 0.5MB
        ];

        const totalMB = calculateTotalSize(files);
        assert.ok(totalMB >= 3.5 && totalMB < 3.6);
    });

    it('should return 0 for empty array', () => {
        const totalMB = calculateTotalSize([]);
        assert.strictEqual(totalMB, 0);
    });

    it('should handle empty content', () => {
        const files = [{ content: '' }, { content: '' }];
        const totalMB = calculateTotalSize(files);
        assert.strictEqual(totalMB, 0);
    });
});
