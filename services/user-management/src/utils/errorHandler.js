
export const createErrorResponse = (code, message, details = {}) => ({
    error: {
        code,
        message,
        details
    }
});

export const createSuccessResponse = (message, data = {}) => ({
    success: true,
    message,
    data
});