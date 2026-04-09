import type { ActionInputs } from './types.js';
/**
 * Validate action inputs for security and correctness
 * @param inputs The action inputs to validate
 * @throws {ValidationError} If validation fails
 */
export declare function validateInputs(inputs: ActionInputs): void;
/**
 * Validate file content and size
 * @param filePath Path of the file being validated
 * @param content File content
 * @param maxSizeMB Maximum allowed file size in MB
 * @returns Warning message if file is large, undefined otherwise
 */
export declare function validateFileSize(filePath: string, content: string, maxSizeMB?: number): string | undefined;
/**
 * Calculate total size of files to be committed
 * @param files Array of file changes
 * @returns Total size in MB
 */
export declare function calculateTotalSize(files: Array<{
    content: string;
}>): number;
