import * as path from 'node:path';
import { ValidationError } from './errors';
import type { ActionInputs } from './types';

/**
 * Validate action inputs for security and correctness
 * @param inputs The action inputs to validate
 * @throws {ValidationError} If validation fails
 */
export function validateInputs(inputs: ActionInputs): void {
    // Validate commit message
    if (inputs.message.trim().length === 0) {
        throw new ValidationError('Commit message cannot be empty');
    }

    if (inputs.message.length > 65536) {
        throw new ValidationError(
            `Commit message exceeds GitHub limit of 65536 characters. Current length: ${inputs.message.length}`,
        );
    }

    // Validate paths don't escape working directory
    if (inputs.paths) {
        for (const p of inputs.paths) {
            const normalized = path.normalize(p);

            // Check for path traversal attempts
            if (normalized.startsWith('..') || path.isAbsolute(normalized)) {
                throw new ValidationError(
                    `Path "${p}" is invalid. Paths must be relative to the working directory ` +
                        'and cannot traverse outside it.',
                );
            }

            // Check for suspicious patterns
            if (p.includes('\0') || p.includes('\n')) {
                throw new ValidationError(`Path "${p}" contains invalid characters (null or newline)`);
            }
        }
    }

    // Validate working directory
    if (inputs.workingDirectory) {
        const normalized = path.normalize(inputs.workingDirectory);
        if (path.isAbsolute(normalized) && !normalized.startsWith(process.cwd())) {
            throw new ValidationError(
                `Working directory "${inputs.workingDirectory}" is outside the workspace. ` +
                    'Use relative paths or paths within the workspace.',
            );
        }
    }

    // Validate parent-commit SHA format if specified
    if (inputs.parentCommit) {
        const shaRegex = /^[0-9a-f]{40}$/i;
        if (!shaRegex.test(inputs.parentCommit)) {
            throw new ValidationError(
                `Invalid parent-commit SHA: "${inputs.parentCommit}". ` +
                    'Must be a valid 40-character Git SHA-1 hash.',
            );
        }
    }
}

/**
 * Validate file content and size
 * @param filePath Path of the file being validated
 * @param content File content
 * @param maxSizeMB Maximum allowed file size in MB
 * @returns Warning message if file is large, undefined otherwise
 */
export function validateFileSize(filePath: string, content: string, maxSizeMB = 50): string | undefined {
    const sizeInMB = Buffer.byteLength(content, 'utf-8') / (1024 * 1024);

    if (sizeInMB > maxSizeMB) {
        return (
            `File "${filePath}" is ${sizeInMB.toFixed(2)}MB, ` +
            `exceeding recommended limit of ${maxSizeMB}MB. ` +
            'Consider using Git LFS for large files or excluding this file from the commit.'
        );
    }

    return undefined;
}

/**
 * Calculate total size of files to be committed
 * @param files Array of file changes
 * @returns Total size in MB
 */
export function calculateTotalSize(files: Array<{ content: string }>): number {
    const totalBytes = files.reduce((sum, file) => {
        return sum + Buffer.byteLength(file.content, 'utf-8');
    }, 0);

    return totalBytes / (1024 * 1024);
}
