import { sleep } from '../../webR/utils';

test('Utils sleep', async () => {
  await expect(sleep(100)).resolves.not.toThrow();
});
