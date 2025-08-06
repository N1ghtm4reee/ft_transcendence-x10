export class NotificationError extends Error {
  constructor(message, statusCode = 500) {
    super(message);
    this.name = "NotificationError";
    this.statusCode = statusCode;
  }
}

export const handleError = (error, reply) => {
  console.error("Notification service error:", error);

  if (error instanceof NotificationError) {
    return reply.code(error.statusCode).send({
      error: error.message,
    });
  }

  return reply.code(500).send({
    error: "Internal server error",
    details: error.message,
  });
};
