// A small error class: throw new ApiError(404, 'Customer not found')
// The error handler turns it into  { "message": "Customer not found" }  with status 404.
export default class ApiError extends Error {
  constructor(status, message, code) {
    super(message);
    this.status = status;
    this.code = code; // optional short code the frontend can check, e.g. 'HAS_BILLS'
  }
}
