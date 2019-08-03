// @flow

import getZCEPrice from '../../services/zce-price';

describe('ZCE PRICE Services', () => {
  test('should return the right value', async () => {
    const response = await getZCEPrice(['BRL', 'EUR', 'USD']);

    expect(response).toEqual({
      USD: expect.any(Number),
      BRL: expect.any(Number),
      EUR: expect.any(Number),
    });
  });
});
