import { sanitizeInput } from './sanitizer';

describe('sanitizeInput', () => {
  it('strips tags without emitting xss configuration warnings', () => {
    const consoleErrorSpy = jest
      .spyOn(console, 'error')
      .mockImplementation(() => undefined);

    const result = sanitizeInput('<script>alert("xss")</script><b>Hello</b>');

    expect(result).toBe('Hello');
    expect(consoleErrorSpy).not.toHaveBeenCalled();

    consoleErrorSpy.mockRestore();
  });
});
