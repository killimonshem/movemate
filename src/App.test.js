const handler = require('../api/simple-test');

test('health endpoint returns a response', () => {
  const response = {
    status: jest.fn().mockReturnThis(),
    json: jest.fn(),
  };

  handler({ method: 'GET' }, response);

  expect(response.status).toHaveBeenCalledWith(200);
  expect(response.json).toHaveBeenCalledWith(expect.objectContaining({ message: 'Simple API test working!' }));
});
