/**
 * Custom error classes for better error handling and user feedback
 */
/**
 * Error thrown when repository format is invalid
 */
export declare class RepositoryValidationError extends Error {
    constructor(repository: string);
}
/**
 * Error thrown when file collection fails
 */
export declare class FileCollectionError extends Error {
    readonly failedPaths?: string[] | undefined;
    constructor(message: string, failedPaths?: string[] | undefined);
}
/**
 * Error thrown when GitHub API operations fail
 */
export declare class GitHubAPIError extends Error {
    readonly statusCode?: number | undefined;
    readonly endpoint?: string | undefined;
    constructor(message: string, statusCode?: number | undefined, endpoint?: string | undefined);
}
/**
 * Error thrown when input validation fails
 */
export declare class ValidationError extends Error {
    constructor(message: string);
}
/**
 * Error thrown when commit creation fails
 */
export declare class CommitCreationError extends Error {
    readonly commitSha?: string | undefined;
    readonly treeSha?: string | undefined;
    constructor(message: string, commitSha?: string | undefined, treeSha?: string | undefined);
}
