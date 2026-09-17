// Minimal Express-style response for calling controllers directly in tests.
export const fakeResponse = () => ({
  statusCode: 200,
  body: undefined,
  headers: {},
  status(code) {
    this.statusCode = code;
    return this;
  },
  json(body) {
    this.body = body;
    return this;
  },
  send(body) {
    this.body = body;
    return this;
  },
  setHeader(name, value) {
    this.headers[name] = value;
    return this;
  },
});

export const callController = async (handler, req = {}) => {
  const res = fakeResponse();
  await handler({ params: {}, query: {}, body: {}, ...req }, res);
  return res;
};
