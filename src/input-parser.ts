import * as core from '@actions/core';
import type { ActionInputs } from './types';

/**
 * Get and validate all action inputs
 * @returns An object containing all the inputs for the action
 */
export function getActionInputs(): ActionInputs {
    const token = core.getInput('token', { required: true });
    const repository = core.getInput('repository');
    const branch = core.getInput('branch');
    const message = core.getInput('message', { required: true });
    const workingDirectory = core.getInput('working-directory') || '.';
    const failOnNoChanges = core.getBooleanInput('fail-on-no-changes');
    const fetchCommit = core.getBooleanInput('fetch-commit');
    const push = core.getBooleanInput('push');

    const pathsInput = core.getInput('paths');

    // Parse paths input if provided
    let paths: string[] | undefined;
    if (pathsInput) {
        paths = pathsInput
            .split('\n')
            .map((line) => line.trim())
            .filter((line) => line.length > 0);
        core.debug(`Paths specified: ${paths.join(', ')}`);
    } else {
        core.debug('No paths specified, will commit all changed files');
    }

    return {
        token,
        repository,
        branch,
        message,
        workingDirectory,
        failOnNoChanges,
        paths,
        fetchCommit,
        push,
    };
}
