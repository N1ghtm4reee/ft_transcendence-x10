export const schemaErrorMessages = {
  signup: {
    name: {
      required: "Name is required",
      minLength: "Name must be at least 2 characters long",
      maxLength: "Name cannot exceed 50 characters",
      type: "Name must be a string",
      pattern:
        "Name can only contain letters, numbers, spaces, hyphens, underscores, and dots",
    },
    password: {
      required: "Password is required",
      minLength: "Password must be at least 8 characters long",
      maxLength: "Password cannot exceed 128 characters",
      type: "Password must be a string",
    },
    email: {
      required: "Email is required",
      format: "Please provide a valid email address",
      maxLength: "Email cannot exceed 255 characters",
      type: "Email must be a string",
    },
  },
  login: {
    email: {
      required: "Email is required",
      format: "Please provide a valid email address",
      type: "Email must be a string",
    },
    password: {
      required: "Password is required",
      type: "Password must be a string",
    },
    twoFactorToken: {
      pattern: "2FA token must be exactly 6 digits",
      type: "2FA token must be a string",
    },
  },
};

/**
 * Generate a human-readable error message from validation error
 * @param {Object} error - The validation error object
 * @param {string} schemaType - The type of schema (signup, login, etc.)
 * @returns {string} - Custom error message
 */
export function getCustomErrorMessage(error, schemaType = "unknown") {
  const { instancePath, keyword, params, data } = error;

  // Extract field name from instancePath (e.g., "/name" -> "name")
  const fieldName = instancePath?.replace("/", "") || params?.missingProperty;

  // Get custom messages for this schema type
  const schemaMessages = schemaErrorMessages[schemaType];

  if (schemaMessages && fieldName && schemaMessages[fieldName]) {
    const fieldMessages = schemaMessages[fieldName];

    // Return specific message based on validation keyword
    if (fieldMessages[keyword]) {
      return fieldMessages[keyword];
    }
  }

  // Fallback to generic messages based on keyword
  switch (keyword) {
    case "required":
      return `${fieldName || "Field"} is required`;
    case "minLength":
      return `${fieldName || "Field"} must be at least ${
        params?.limit
      } characters long`;
    case "maxLength":
      return `${fieldName || "Field"} cannot exceed ${
        params?.limit
      } characters`;
    case "format":
      return `${fieldName || "Field"} has invalid format`;
    case "pattern":
      return `${fieldName || "Field"} has invalid format`;
    case "type":
      return `${fieldName || "Field"} must be a ${params?.type}`;
    default:
      return error.message || "Validation failed";
  }
}

/**
 * Transform validation errors into user-friendly format
 * @param {Array} validationErrors - Array of validation errors
 * @param {string} schemaType - The type of schema being validated
 * @returns {Object} - Formatted error response
 */
export function formatValidationErrors(
  validationErrors,
  schemaType = "unknown"
) {
  const details = validationErrors.map((error) => ({
    field:
      error.instancePath?.replace("/", "") ||
      error.params?.missingProperty ||
      "unknown",
    message: getCustomErrorMessage(error, schemaType),
    value: error.data,
    constraint: error.keyword,
  }));

  return {
    error: "Validation failed",
    message: "Request data does not match the required schema",
    details,
    statusCode: 400,
  };
}
