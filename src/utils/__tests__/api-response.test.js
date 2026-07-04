import { successResponse, errorResponse, paginatedResponse } from '../api-response';

describe('api-response utility', () => {
  describe('successResponse', () => {
    it('returns a standard success structure with data', () => {
      const data = { id: 1, name: 'Test' };
      const response = successResponse(data);

      expect(response).toEqual({
        success: true,
        statusCode: 200,
        message: 'İşlem başarılı',
        data,
        timestamp: expect.any(String),
      });
    });

    it('returns success structure with custom message if provided', () => {
      const data = { id: 1 };
      const response = successResponse(data, 'Operation successful');

      expect(response).toEqual({
        success: true,
        statusCode: 200,
        data,
        message: 'Operation successful',
        timestamp: expect.any(String),
      });
    });
  });

  describe('errorResponse', () => {
    it('returns a standard error structure with default code', () => {
      const response = errorResponse('Something went wrong');

      expect(response).toEqual({
        success: false,
        statusCode: 500,
        message: 'Something went wrong',
        timestamp: expect.any(String),
      });
    });

    it('returns error structure with custom error code', () => {
      const response = errorResponse('Not found', 404);

      expect(response).toEqual({
        success: false,
        statusCode: 404,
        message: 'Not found',
        timestamp: expect.any(String),
      });
    });
  });

  describe('paginatedResponse', () => {
    it('returns a standard paginated response structure', () => {
      const items = [{ id: 1 }, { id: 2 }];
      const response = paginatedResponse(items, 1, 2, 10);

      expect(response).toEqual({
        success: true,
        statusCode: 200,
        message: 'Veriler başarıyla alındı',
        data: items,
        pagination: {
          page: 1,
          pageSize: 2,
          total: 10,
          totalPages: 5,
          hasNextPage: true,
          hasPrevPage: false,
          nextPage: 2,
          prevPage: null,
        },
        timestamp: expect.any(String),
      });
    });
  });
});
