import { WebR } from '../../webR/webr-main';
import { Message } from '../../webR/chan/message';
import { RDouble } from '../../webR/robj';

const webR = new WebR({
  WEBR_URL: '../dist/',
  RArgs: ['--quiet'],
});

describe('Test webR instance startup', () => {
  test('Constructs successfully', () => {
    expect(webR).toBeDefined();
  });

  test('Initialises successfully', async () => {
    await expect(webR.init()).resolves.not.toThrow();
  });
});

describe('Test webR simple console input/output', () => {
  test('Wait for a prompt', async () => {
    let msg: Message = await webR.read();
    while (msg.type !== 'prompt') {
      msg = await webR.read();
    }
    expect(msg.data).toBe('> ');
  });

  test('Write an R command to the console', () => {
    expect(() => webR.writeConsole('42\n')).not.toThrow();
  });

  test('Read result line from stdout', async () => {
    expect((await webR.read()).data).toBe('[1] 42');
  });
});

describe('Evaluate R code', () => {
  test('Evaluate R code without setting up error handlers', async () => {
    const result = webR.evalRCode('webr::global_prompt_install()', undefined, {
      withHandlers: false,
    });
    await expect(result).resolves.not.toThrow();
  });

  test('Throw an error if passed an invalid environment', async () => {
    // @ts-expect-error Deliberate type error to test Error thrown
    const promise = webR.evalRCode('3.14159', { env: 42 });
    await expect(promise).rejects.toThrow('invalid environment object');
  });

  test('Throw an error if passed an invalid environment object type', async () => {
    const euler = (await webR.evalRCode('0.57722')).result;
    await expect(webR.evalRCode('x', euler)).rejects.toThrow('env argument with invalid SEXP type');
  });

  test('Throw errors from R', async () => {
    const badSyntax = webR.evalRCode('42+');
    await expect(badSyntax).rejects.toThrow('unexpected end of input');
  });

  test('Write to stdout while evaluating R code', async () => {
    await webR.flush();
    const res = webR.evalRCode('print("Hello, stdout!")');
    await expect(res).resolves.not.toThrow();
    expect((await webR.read()).data).toBe('[1] "Hello, stdout!"');
  });

  test('Write to stderr while evaluating R code', async () => {
    await webR.flush();
    const res = webR.evalRCode('message("Hello, stderr!")', undefined, {
      captureConditions: false,
    });
    await expect(res).resolves.not.toThrow();
    expect((await webR.read()).data).toBe('Hello, stderr!');
  });

  test('Capture stdout while evaluating R code', async () => {
    const composite = await webR.evalRCode('c(1, 2, 4, 6, 12, 24, 36, 48)', undefined, {
      withAutoprint: true,
      captureStreams: true,
    });
    expect(composite.stdout).toEqual(['[1]  1  2  4  6 12 24 36 48']);
  });
});

test('Create simple R object from the main thread', async () => {
  const jsObj = [1, 2, 3, 6, 11, 23, 47, 106, 235];
  const rObj = (await webR.newRObject(jsObj)) as RDouble;
  expect(Array.from(await rObj.toArray())).toEqual(jsObj);
});

afterAll(() => {
  return webR.close();
});
