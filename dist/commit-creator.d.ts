import type { ActionInputs, CommitResult } from './types.js';
/**
 * Create a signed commit using the GitHub API
 * @param inputs The action inputs
 * @returns The commit and tree SHA
 */
export declare function createSignedCommit(inputs: ActionInputs): Promise<CommitResult>;
