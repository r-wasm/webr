import { WebR } from '../../webR/webr-main';
import { Message } from '../../webR/chan/message';
import { RObjectTree, RawType, RDouble } from '../../webR/robj';

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

  test('Handle syntax errors in evalRCode', async () => {
    const badSyntax = await webR.evalRCode('42+');
    const cond = badSyntax.output as { type: string; data: RObjectTree<RawType[]> }[];
    expect(cond[0].type).toEqual('error');
    expect(cond[0].data.names).toEqual(expect.arrayContaining(['message']));
    expect(cond[0].data.values[0]).toEqual(expect.stringContaining('unexpected end of input'));
  });

  test('Write to stdout while evaluating R code', async () => {
    await webR.flush();
    const res = webR.evalRCode('print("Hello, stdout!")', undefined, {
      captureStreams: false,
    });
    await expect(res).resolves.not.toThrow();
    expect((await webR.read()).data).toBe('[1] "Hello, stdout!"');
  });

  test('Write to stderr while evaluating R code', async () => {
    await webR.flush();
    const res = webR.evalRCode('message("Hello, stderr!")', undefined, {
      captureStreams: false,
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
    expect(composite.output).toEqual([{ type: 'stdout', data: '[1]  1  2  4  6 12 24 36 48' }]);
  });

  test('Capture stderr while evaluating R code', async () => {
    const res = await webR.evalRCode('message("Hello, stderr!")', undefined, {
      captureStreams: true,
      captureConditions: false,
    });
    expect(res.output).toEqual([{ type: 'stderr', data: 'Hello, stderr!' }]);
  });

  test('Capture condition while evaluating R code', async () => {
    const res = await webR.evalRCode('warning("This is a warning message")', undefined, {
      captureConditions: true,
    });
    const cond = res.output as { type: string; data: RObjectTree<RawType[]> }[];
    expect(cond[0].type).toEqual('warning');
    expect(cond[0].data.names).toEqual(expect.arrayContaining(['message']));
    expect(cond[0].data.values).toEqual(expect.arrayContaining(['This is a warning message']));
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
