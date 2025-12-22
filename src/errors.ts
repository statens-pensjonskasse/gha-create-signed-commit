/**
 * Custom error classes for better error handling and user feedback
 */

/**
 * Error thrown when repository format is invalid
 */
export class RepositoryValidationError extends Error {
    constructor(repository: string) {
        super(`Invalid repository format: ${repository}. Expected format: owner/repo`);
        this.name = 'RepositoryValidationError';
    }
}

/**
 * Error thrown when file collection fails
 */
export class FileCollectionError extends Error {
    constructor(
        message: string,
        public readonly failedPaths?: string[],
    ) {
        super(message);
        this.name = 'FileCollectionError';
    }
}

/**
 * Error thrown when GitHub API operations fail
 */
export class GitHubAPIError extends Error {
    constructor(
        message: string,
        public readonly statusCode?: number,
        public readonly endpoint?: string,
    ) {
        super(message);
        this.name = 'GitHubAPIError';
    }
}

/**
 * Error thrown when input validation fails
 */
export class ValidationError extends Error {
    constructor(message: string) {
        super(message);
        this.name = 'ValidationError';
    }
}

/**
 * Error thrown when commit creation fails
 */
export class CommitCreationError extends Error {
    constructor(
        message: string,
        public readonly commitSha?: string,
        public readonly treeSha?: string,
    ) {
        super(message);
        this.name = 'CommitCreationError';
    }
}
