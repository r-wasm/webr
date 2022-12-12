import { WebR } from '../../webR/webr-main';
import { Message } from '../../webR/chan/message';
import { promiseHandles } from '../../webR/utils';
import {
  RDouble,
  RLogical,
  RCharacter,
  RComplex,
  RList,
  RPairlist,
  REnvironment,
  RNull,
  RInteger,
} from '../../webR/robj';

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
    const result = webR.captureR('webr::global_prompt_install()', undefined, {
      withHandlers: false,
    });
    await expect(result).resolves.not.toThrow();
  });

  test('Throw an error if passed an invalid environment', async () => {
    // @ts-expect-error Deliberate type error to test Error thrown
    const promise = webR.evalR('3.14159', { env: 42 });
    await expect(promise).rejects.toThrow('invalid environment object');
  });

  test('Throw an error if passed an invalid environment object type', async () => {
    const euler = await webR.evalR('0.57722');
    // @ts-expect-error Deliberate type error to test Error thrown
    await expect(webR.evalR('x', euler)).rejects.toThrow('env argument with invalid SEXP type');
  });

  test('Handle syntax errors in evalR', async () => {
    const badSyntax = webR.evalR('42+');
    await expect(badSyntax).rejects.toThrow('unexpected end of input');
  });

  test('Write to stdout while evaluating R code', async () => {
    await webR.flush();
    const res = webR.captureR('print("Hello, stdout!")', undefined, {
      captureStreams: false,
    });
    await expect(res).resolves.not.toThrow();
    expect((await webR.read()).data).toBe('[1] "Hello, stdout!"');
  });

  test('Write to stderr while evaluating R code', async () => {
    await webR.flush();
    const res = webR.captureR('message("Hello, stderr!")', undefined, {
      captureStreams: false,
      captureConditions: false,
    });
    await expect(res).resolves.not.toThrow();
    expect((await webR.read()).data).toBe('Hello, stderr!');
  });

  /* Since console.log and console.warn are called from the worker thread in the
   * next two tests, we cannot mock them in the usual way. Instead we spy on
   * node's process.stdout and process.stderr streams, where console logging is
   * ultimately written.
   */
  test('Send output to console.log while evaluating R code', async () => {
    const waitForOutput = promiseHandles();
    const spyStdout = jest.spyOn(process.stdout, 'write').mockImplementation(() => {
      waitForOutput.resolve();
      return true;
    });
    await webR.evalR('print(c(30, 42, 66, 70, 78, 102))');
    await waitForOutput.promise;
    const buffer = spyStdout.mock.calls[0][0] as Buffer;
    expect(buffer.includes('[1]  30  42  66  70  78 102')).toEqual(true);
    spyStdout.mockReset();
    spyStdout.mockRestore();
  });

  test('Send conditions to console.warn while evaluating R code', async () => {
    const waitForOutput = promiseHandles();
    const spyStderr = jest.spyOn(process.stderr, 'write').mockImplementation(() => {
      waitForOutput.resolve();
      return true;
    });
    await webR.evalR('warning("This is a warning!")');
    await waitForOutput.promise;
    const buffer = spyStderr.mock.calls[0][0] as Buffer;
    expect(buffer.includes('Warning message: \nThis is a warning!')).toEqual(true);
    spyStderr.mockReset();
    spyStderr.mockRestore();
  });

  test('Error conditions are re-thrown in JS when evaluating R code', async () => {
    const throws = webR.evalR('stop("This is an error from R!")');
    await expect(throws).rejects.toThrow('This is an error from R!');
  });

  test('Capture stdout while capturing R code', async () => {
    const composite = await webR.captureR('c(1, 2, 4, 6, 12, 24, 36, 48)', undefined, {
      withAutoprint: true,
      captureStreams: true,
    });
    expect(composite.output).toEqual([{ type: 'stdout', data: '[1]  1  2  4  6 12 24 36 48' }]);
  });

  test('Capture stderr while capturing R code', async () => {
    const res = await webR.captureR('message("Hello, stderr!")', undefined, {
      captureStreams: true,
      captureConditions: false,
    });
    expect(res.output).toEqual([{ type: 'stderr', data: 'Hello, stderr!' }]);
  });

  test('Capture conditions while capturing R code', async () => {
    const res = await webR.captureR('warning("This is a warning message")', undefined, {
      captureConditions: true,
    });
    const cond = res.output as { type: string; data: RList }[];
    expect(cond[0].type).toEqual('warning');
    const condMsg = (await cond[0].data.get('message')) as RCharacter;
    expect(await condMsg.toString()).toContain('This is a warning message');
  });
});

describe('Create R objects using serialised form', () => {
  test('Create an R NULL', async () => {
    const jsObj = { type: 'null' };
    const rObj = (await webR.newRObject(jsObj)) as RNull;
    expect(await rObj.type()).toEqual('null');
    expect(await rObj.toJs()).toEqual({ type: 'null' });
  });

  test('Create an atomic vector', async () => {
    const jsObj = { type: 'integer', values: [10, 20, 30], names: ['x', 'y', 'z'] };
    const rObj = (await webR.newRObject(jsObj)) as RInteger;
    expect(await rObj.type()).toEqual('integer');
    expect(await rObj.toArray()).toEqual([10, 20, 30]);
    expect(await rObj.toJs()).toEqual({
      type: 'integer',
      names: ['x', 'y', 'z'],
      values: [10, 20, 30],
    });
  });

  test('Create a list', async () => {
    const jsObj = { type: 'list', values: [true, 3.14, 'abc'], names: ['x', 'y', 'z'] };
    const rObj = (await webR.newRObject(jsObj)) as RList;
    expect(await rObj.type()).toEqual('list');
    const list = await rObj.toJs();
    expect(list.names).toEqual(['x', 'y', 'z']);
    expect(list.values[0]).toEqual({
      type: 'logical',
      names: null,
      values: [true],
    });
    expect(list.values[1]).toEqual({
      type: 'double',
      names: null,
      values: [3.14],
    });
    expect(list.values[2]).toEqual({
      type: 'character',
      names: null,
      values: ['abc'],
    });
  });

  test('Create a pairlist', async () => {
    const jsObj = { type: 'pairlist', values: [true, 3.14, 'abc'], names: ['x', 'y', 'z'] };
    const rObj = (await webR.newRObject(jsObj)) as RPairlist;
    expect(await rObj.type()).toEqual('pairlist');
    const list = await rObj.toJs();
    expect(list.names).toEqual(['x', 'y', 'z']);
    expect(list.values[0]).toEqual({
      type: 'logical',
      names: null,
      values: [true],
    });
    expect(list.values[1]).toEqual({
      type: 'double',
      names: null,
      values: [3.14],
    });
    expect(list.values[2]).toEqual({
      type: 'character',
      names: null,
      values: ['abc'],
    });
  });

  test('Create an environment', async () => {
    const jsObj = { type: 'environment', names: ['x', 'y'], values: [123, 'abc'] };
    const rObj = (await webR.newRObject(jsObj)) as REnvironment;
    expect(await rObj.type()).toEqual('environment');
    expect(await rObj.ls()).toEqual(['x', 'y']);
    const x = await rObj.get('x');
    const y = await rObj.get('y');
    expect(await x.toJs()).toEqual(
      expect.objectContaining({
        values: [123],
        names: null,
      })
    );
    expect(await y.toJs()).toEqual(
      expect.objectContaining({
        values: ['abc'],
        names: null,
      })
    );
  });
});

describe('Create R atomic vectors from JS arrays', () => {
  test('Convert a JS null to R logical NA', async () => {
    const rObj = (await webR.newRObject(null)) as RLogical;
    expect(await rObj.type()).toEqual('logical');
    expect(await rObj.toJs()).toEqual(
      expect.objectContaining({
        values: [null],
        names: null,
      })
    );
  });

  test('Create a logical atomic vector', async () => {
    const jsObj = [true, false, true, null];
    const rObj = (await webR.newRObject(jsObj)) as RLogical;
    expect(await rObj.type()).toEqual('logical');
    expect(await rObj.toJs()).toEqual(
      expect.objectContaining({
        values: [true, false, true, null],
        names: null,
      })
    );
  });

  test('Create a double atomic vector', async () => {
    const jsObj = [1, 2, 3, 6, 11, 23, 47, 106, null];
    const rObj = (await webR.newRObject(jsObj)) as RDouble;
    expect(await rObj.type()).toEqual('double');
    expect(await rObj.toArray()).toEqual(jsObj);
  });

  test('Create a character atomic vector', async () => {
    const jsObj = ['a', 'b', 'c', null];
    const rObj = (await webR.newRObject(jsObj)) as RCharacter;
    expect(await rObj.type()).toEqual('character');
    expect(await rObj.toJs()).toEqual(
      expect.objectContaining({
        values: ['a', 'b', 'c', null],
        names: null,
      })
    );
  });

  test('Create a complex atomic vector', async () => {
    const jsObj = [{ re: 1, im: 2 }, { re: -3, im: -4 }, null];
    const rObj = (await webR.newRObject(jsObj)) as RComplex;
    expect(await rObj.type()).toEqual('complex');
    expect(await rObj.toJs()).toEqual(
      expect.objectContaining({
        values: [{ re: 1, im: 2 }, { re: -3, im: -4 }, null],
        names: null,
      })
    );
  });
});

describe('Serialise nested R lists, pairlists and vectors unambiguously', () => {
  test('Round trip convert to full depth and ensure result is identical', async () => {
    const rObj = (await webR.evalR(
      'list(a=list(e=c(T,F,NA),f=c(1,2,3)), b=pairlist(g=c(4L,5L,6L)), c=list(h=c("abc","def"), i=list(7i)))'
    )) as RList;
    const jsObj = await rObj.toTree();
    const newRObj = (await webR.newRObject(jsObj)) as RList;
    const env = (await webR.newRObject({
      type: 'environment',
      names: ['newRObj', 'rObj'],
      values: [newRObj, rObj],
    })) as REnvironment;
    const identical = (await webR.evalR('identical(rObj, newRObj)', env)) as RLogical;
    expect(await rObj.type()).toEqual('list');
    expect(await identical.toLogical()).toEqual(true);
  });

  test('Round trip convert to partial depth and ensure result is identical', async () => {
    const rObj = (await webR.evalR(
      'list(a=list(e=c(T,F,NA),f=c(1,2,3)), b=pairlist(g=c(4L,5L,6L)), c=list(h=c("abc","def"), i=list(7i)))'
    )) as RList;
    const jsObj = await rObj.toTree({ depth: 1 });
    const newRObj = (await webR.newRObject(jsObj)) as RList;
    const env = (await webR.newRObject({
      type: 'environment',
      names: ['newRObj', 'rObj'],
      values: [newRObj, rObj],
    })) as REnvironment;
    const identical = (await webR.evalR('identical(rObj, newRObj)', env)) as RLogical;
    expect(await rObj.type()).toEqual('list');
    expect(await identical.toLogical()).toEqual(true);
  });
});

beforeEach(() => {
  jest.restoreAllMocks();
});

afterAll(() => {
  return webR.close();
});
