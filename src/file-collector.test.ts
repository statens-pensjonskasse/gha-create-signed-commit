import * as assert from 'node:assert';
import { execSync } from 'node:child_process';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { describe, it } from 'node:test';
import esmock from 'esmock';

// Import collectFiles with @actions/core mocked to suppress logging
const { collectFiles } = await esmock(
    './file-collector.js',
    import.meta.url,
    {},
    {
        '@actions/core': {
            debug: () => {},
            warning: () => {},
        },
    },
);

/**
 * Helper to initialize a git repo in a directory
 */
function initGitRepo(testDir: string): void {
    execSync('git init', { cwd: testDir, stdio: 'ignore' });
    execSync('git config user.email "test@test.com"', { cwd: testDir, stdio: 'ignore' });
    execSync('git config user.name "Test User"', { cwd: testDir, stdio: 'ignore' });
    execSync('git config commit.gpgsign false', { cwd: testDir, stdio: 'ignore' });
}

describe('collectFiles', () => {
    describe('pathspec patterns', () => {
        it('should collect files matching directory glob pattern', async () => {
            const testDir = path.join(process.cwd(), 'test-glob-temp');
            const action1Dir = path.join(testDir, 'actions', 'action1', 'dist');
            const action2Dir = path.join(testDir, 'actions', 'action2', 'dist');

            try {
                fs.mkdirSync(action1Dir, { recursive: true });
                fs.mkdirSync(action2Dir, { recursive: true });
                fs.writeFileSync(path.join(action1Dir, 'file1.js'), 'content1');
                fs.writeFileSync(path.join(action2Dir, 'file2.js'), 'content2');

                initGitRepo(testDir);

                // Use proper git pathspec pattern to match all files in dist directories
                const result = await collectFiles(['actions/*/dist/*'], testDir);

                assert.strictEqual(result.length, 2);
                assert.ok(result.some((f: { path: string }) => f.path.includes('action1/dist/file1.js')));
                assert.ok(result.some((f: { path: string }) => f.path.includes('action2/dist/file2.js')));

                const file1 = result.find((f: { path: string }) => f.path.includes('file1.js'));
                const file2 = result.find((f: { path: string }) => f.path.includes('file2.js'));
                assert.strictEqual(file1?.content, 'content1');
                assert.strictEqual(file2?.content, 'content2');
            } finally {
                if (fs.existsSync(testDir)) {
                    fs.rmSync(testDir, { recursive: true, force: true });
                }
            }
        });

        it('should return empty array when pattern matches no files', async () => {
            const testDir = path.join(process.cwd(), 'test-no-match-temp');

            try {
                fs.mkdirSync(testDir, { recursive: true });
                initGitRepo(testDir);

                // Pattern that matches nothing
                const result = await collectFiles(['nonexistent/*.txt'], testDir);

                assert.strictEqual(result.length, 0);
            } finally {
                if (fs.existsSync(testDir)) {
                    fs.rmSync(testDir, { recursive: true, force: true });
                }
            }
        });

        it('should handle multiple pathspec patterns', async () => {
            const testDir = path.join(process.cwd(), 'test-multi-pattern-temp');
            const srcDir = path.join(testDir, 'src');
            const testSubDir = path.join(testDir, 'test');

            try {
                fs.mkdirSync(srcDir, { recursive: true });
                fs.mkdirSync(testSubDir, { recursive: true });
                fs.writeFileSync(path.join(srcDir, 'file.ts'), 'src content');
                fs.writeFileSync(path.join(testSubDir, 'file.ts'), 'test content');

                initGitRepo(testDir);

                const result = await collectFiles(['src/*.ts', 'test/*.ts'], testDir);

                assert.strictEqual(result.length, 2);
                assert.ok(result.some((f: { path: string }) => f.path === 'src/file.ts'));
                assert.ok(result.some((f: { path: string }) => f.path === 'test/file.ts'));
            } finally {
                if (fs.existsSync(testDir)) {
                    fs.rmSync(testDir, { recursive: true, force: true });
                }
            }
        });

        it('should deduplicate files from overlapping patterns', async () => {
            const testDir = path.join(process.cwd(), 'test-dedup-temp');
            const distDir = path.join(testDir, 'actions', 'test-action', 'dist');

            try {
                fs.mkdirSync(distDir, { recursive: true });
                fs.writeFileSync(path.join(distDir, 'file.js'), 'content');

                initGitRepo(testDir);

                // Both patterns match the same file - git naturally deduplicates
                const result = await collectFiles(['actions/*/dist/*', 'actions/test-action/dist/*'], testDir);

                assert.strictEqual(result.length, 1);
                assert.strictEqual(result[0].path, 'actions/test-action/dist/file.js');
                assert.strictEqual(result[0].content, 'content');
            } finally {
                if (fs.existsSync(testDir)) {
                    fs.rmSync(testDir, { recursive: true, force: true });
                }
            }
        });

        it('should mix patterns with exact file paths', async () => {
            const testDir = path.join(process.cwd(), 'test-mixed-temp');
            const distDir = path.join(testDir, 'actions', 'action1', 'dist');

            try {
                fs.mkdirSync(distDir, { recursive: true });
                fs.writeFileSync(path.join(testDir, 'README.md'), 'readme');
                fs.writeFileSync(path.join(distDir, 'file.js'), 'dist file');

                initGitRepo(testDir);

                const result = await collectFiles(['README.md', 'actions/*/dist/*'], testDir);

                assert.strictEqual(result.length, 2);
                assert.ok(result.some((f: { path: string }) => f.path === 'README.md'));
                assert.ok(result.some((f: { path: string }) => f.path === 'actions/action1/dist/file.js'));
            } finally {
                if (fs.existsSync(testDir)) {
                    fs.rmSync(testDir, { recursive: true, force: true });
                }
            }
        });

        it('should preserve file modes correctly', async () => {
            const testDir = path.join(process.cwd(), 'test-mode-temp');
            const scriptDir = path.join(testDir, 'scripts');

            try {
                fs.mkdirSync(scriptDir, { recursive: true });

                // Create executable file
                const executablePath = path.join(scriptDir, 'executable.sh');
                fs.writeFileSync(executablePath, '#!/bin/bash\necho test');
                fs.chmodSync(executablePath, 0o755);

                // Create regular file
                const regularPath = path.join(scriptDir, 'regular.txt');
                fs.writeFileSync(regularPath, 'regular');

                initGitRepo(testDir);

                const result = await collectFiles(['scripts/*'], testDir);

                assert.strictEqual(result.length, 2);

                const executable = result.find((f: { path: string }) => f.path.includes('executable.sh'));
                const regular = result.find((f: { path: string }) => f.path.includes('regular.txt'));

                assert.strictEqual(executable?.mode, '100755');
                assert.strictEqual(regular?.mode, '100644');
            } finally {
                if (fs.existsSync(testDir)) {
                    fs.rmSync(testDir, { recursive: true, force: true });
                }
            }
        });
    });

    describe('no paths specified', () => {
        it('should not collect changed files using git add .', async () => {
            const testDir = path.join(process.cwd(), 'test-all-changes-temp');

            try {
                fs.mkdirSync(testDir, { recursive: true });
                initGitRepo(testDir);

                // Create and commit initial file
                fs.writeFileSync(path.join(testDir, 'existing.txt'), 'original');
                execSync('git add existing.txt', { cwd: testDir, stdio: 'ignore' });
                execSync('git commit -m "initial"', { cwd: testDir, stdio: 'ignore' });

                // Modify existing file and create new file
                fs.writeFileSync(path.join(testDir, 'existing.txt'), 'modified');
                fs.writeFileSync(path.join(testDir, 'new.txt'), 'new content');

                // Call without paths - should not add all changes
                const result = await collectFiles(undefined, testDir);

                assert.strictEqual(result.length, 0);
            } finally {
                if (fs.existsSync(testDir)) {
                    fs.rmSync(testDir, { recursive: true, force: true });
                }
            }
        });

        it('should return empty array when no files changed', async () => {
            const testDir = path.join(process.cwd(), 'test-no-changes-temp');

            try {
                fs.mkdirSync(testDir, { recursive: true });
                initGitRepo(testDir);

                // Create initial commit
                fs.writeFileSync(path.join(testDir, 'file.txt'), 'content');
                execSync('git add file.txt', { cwd: testDir, stdio: 'ignore' });
                execSync('git commit -m "initial"', { cwd: testDir, stdio: 'ignore' });

                // No changes
                const result = await collectFiles(undefined, testDir);

                assert.strictEqual(result.length, 0);
            } finally {
                if (fs.existsSync(testDir)) {
                    fs.rmSync(testDir, { recursive: true, force: true });
                }
            }
        });
    });

    describe('specific paths', () => {
        it('should handle exact file paths', async () => {
            const testDir = path.join(process.cwd(), 'test-exact-temp');

            try {
                fs.mkdirSync(testDir, { recursive: true });
                fs.writeFileSync(path.join(testDir, 'file.txt'), 'content');

                initGitRepo(testDir);

                const result = await collectFiles(['file.txt'], testDir);

                assert.strictEqual(result.length, 1);
                assert.strictEqual(result[0].path, 'file.txt');
                assert.strictEqual(result[0].content, 'content');
            } finally {
                if (fs.existsSync(testDir)) {
                    fs.rmSync(testDir, { recursive: true, force: true });
                }
            }
        });

        it('should handle directory paths recursively', async () => {
            const testDir = path.join(process.cwd(), 'test-folder-temp');
            const subDir = path.join(testDir, 'folder', 'subfolder');

            try {
                fs.mkdirSync(subDir, { recursive: true });
                fs.writeFileSync(path.join(testDir, 'folder', 'file1.txt'), 'content1');
                fs.writeFileSync(path.join(subDir, 'file2.txt'), 'content2');

                initGitRepo(testDir);

                const result = await collectFiles(['folder'], testDir);

                assert.strictEqual(result.length, 2);
                assert.ok(result.some((f: { path: string }) => f.path === 'folder/file1.txt'));
                assert.ok(result.some((f: { path: string }) => f.path === 'folder/subfolder/file2.txt'));
            } finally {
                if (fs.existsSync(testDir)) {
                    fs.rmSync(testDir, { recursive: true, force: true });
                }
            }
        });

        it('should handle multiple specific paths', async () => {
            const testDir = path.join(process.cwd(), 'test-multi-paths-temp');

            try {
                fs.mkdirSync(path.join(testDir, 'src'), { recursive: true });
                fs.mkdirSync(path.join(testDir, 'docs'), { recursive: true });
                fs.writeFileSync(path.join(testDir, 'README.md'), 'readme');
                fs.writeFileSync(path.join(testDir, 'src', 'index.ts'), 'code');
                fs.writeFileSync(path.join(testDir, 'docs', 'guide.md'), 'docs');

                initGitRepo(testDir);

                const result = await collectFiles(['README.md', 'src', 'docs/guide.md'], testDir);

                assert.strictEqual(result.length, 3);
                assert.ok(result.some((f: { path: string }) => f.path === 'README.md'));
                assert.ok(result.some((f: { path: string }) => f.path === 'src/index.ts'));
                assert.ok(result.some((f: { path: string }) => f.path === 'docs/guide.md'));
            } finally {
                if (fs.existsSync(testDir)) {
                    fs.rmSync(testDir, { recursive: true, force: true });
                }
            }
        });

        it('should return empty array for non-existent path', async () => {
            const testDir = path.join(process.cwd(), 'test-nonexistent-temp');

            try {
                fs.mkdirSync(testDir, { recursive: true });
                initGitRepo(testDir);

                // Non-existent paths result in empty array with warning (not error)
                const result = await collectFiles(['nonexistent.txt'], testDir);

                assert.strictEqual(result.length, 0);
            } finally {
                if (fs.existsSync(testDir)) {
                    fs.rmSync(testDir, { recursive: true, force: true });
                }
            }
        });
    });
});
