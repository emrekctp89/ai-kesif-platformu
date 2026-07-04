import { successResponse, errorResponse, HTTP_STATUS } from '../../src/utils/api-response';

describe('API Response Utilities', () => {
  describe('successResponse', () => {
    it('should return a properly formatted success response', () => {
      const data = { id: 1, name: 'Test' };
      const response = successResponse(data, 'Kayıt bulundu');

      expect(response.success).toBe(true);
      expect(response.statusCode).toBe(HTTP_STATUS.OK);
      expect(response.message).toBe('Kayıt bulundu');
      expect(response.data).toEqual(data);
      expect(response.timestamp).toBeDefined();
    });

    it('should use default message if not provided', () => {
      const response = successResponse({ test: true });
      expect(response.message).toBe('İşlem başarılı');
    });
  });

  describe('errorResponse', () => {
    it('should return a properly formatted error response', () => {
      const response = errorResponse('Giriş başarısız', HTTP_STATUS.UNAUTHORIZED);

      expect(response.success).toBe(false);
      expect(response.statusCode).toBe(HTTP_STATUS.UNAUTHORIZED);
      expect(response.message).toBe('Giriş başarısız');
      expect(response.timestamp).toBeDefined();
      expect(response.details).toBeUndefined();
    });

    it('should include details if provided', () => {
      const details = { field: 'email', issue: 'invalid' };
      const response = errorResponse('Hata', 400, details);

      expect(response.details).toEqual(details);
    });
  });
});
