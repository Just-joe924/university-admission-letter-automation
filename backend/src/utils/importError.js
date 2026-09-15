// An expected, user-facing import failure (bad file, validation errors,
// conflicts). `status` is the HTTP status to respond with and `details` is an
// optional payload (e.g. a fresh preview) to include in the response.
export class ImportError extends Error {
  constructor(message, status = 400, details = undefined) {
    super(message);
    this.name = "ImportError";
    this.status = status;
    this.details = details;
  }
}
