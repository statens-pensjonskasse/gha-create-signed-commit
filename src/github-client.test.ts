import * as assert from 'node:assert';
import { describe, it } from 'node:test';
import { parseRepository } from './github-client';

describe('parseRepository', () => {
    it('should parse valid repository format', () => {
        const result = parseRepository('owner/repo');
        assert.strictEqual(result.owner, 'owner');
        assert.strictEqual(result.repo, 'repo');
    });

    it('should throw error for invalid format without slash', () => {
        assert.throws(() => {
            parseRepository('invalidrepo');
        }, /Invalid repository format/);
    });

    it('should throw error for format with only slash', () => {
        assert.throws(() => {
            parseRepository('/');
        }, /Invalid repository format/);
    });

    it('should throw error for format with missing repo', () => {
        assert.throws(() => {
            parseRepository('owner/');
        }, /Invalid repository format/);
    });

    it('should throw error for format with missing owner', () => {
        assert.throws(() => {
            parseRepository('/repo');
        }, /Invalid repository format/);
    });
});
