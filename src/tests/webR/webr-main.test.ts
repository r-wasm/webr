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
  RInteger,
  RFunction,
} from '../../webR/robj-main';

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
    const rObj = await new webR.RObject(jsObj);
    expect(await rObj.type()).toEqual('null');
    expect(await rObj.toJs()).toEqual({ type: 'null' });
  });

  test('Create an atomic vector', async () => {
    const jsObj = { type: 'integer', values: [10, 20, 30], names: ['x', 'y', 'z'] };
    const rObj = (await new webR.RObject(jsObj)) as RInteger;
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
    const rObj = (await new webR.RObject(jsObj)) as RList;
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
    const rObj = (await new webR.RObject(jsObj)) as RPairlist;
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
    const rObj = (await new webR.RObject(jsObj)) as REnvironment;
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

describe('Create R vectors from JS arrays using RObject constructor', () => {
  test('Convert a JS null to R logical NA', async () => {
    const rObj = (await new webR.RObject(null)) as RLogical;
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
    const rObj = (await new webR.RObject(jsObj)) as RLogical;
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
    const rObj = (await new webR.RObject(jsObj)) as RDouble;
    expect(await rObj.type()).toEqual('double');
    expect(await rObj.toArray()).toEqual(jsObj);
  });

  test('Create a character atomic vector', async () => {
    const jsObj = ['a', 'b', 'c', null];
    const rObj = (await new webR.RObject(jsObj)) as RCharacter;
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
    const rObj = (await new webR.RObject(jsObj)) as RComplex;
    expect(await rObj.type()).toEqual('complex');
    expect(await rObj.toJs()).toEqual(
      expect.objectContaining({
        values: [{ re: 1, im: 2 }, { re: -3, im: -4 }, null],
        names: null,
      })
    );
  });
});

describe('Create R objects from JS objects using proxy constructors', () => {
  test('Create an R NULL', async () => {
    const rObj = await new webR.RObject({ type: 'null' });
    expect(await rObj.type()).toEqual('null');
    expect(await rObj.isNull()).toEqual(true);
  });

  test('Create a logical atomic vector', async () => {
    const jsObj = { a: true, b: false, c: true, d: null };
    const rObj = await new webR.RLogical(jsObj);
    expect(await rObj.type()).toEqual('logical');
    expect(await rObj.toJs()).toEqual(
      expect.objectContaining({
        values: Object.values(jsObj),
        names: Object.keys(jsObj),
      })
    );
  });

  test('Create an integer atomic vector', async () => {
    const jsObj = { a: 10, b: 11, c: 12, d: null };
    const rObj = await new webR.RInteger(jsObj);
    expect(await rObj.type()).toEqual('integer');
    expect(await rObj.toJs()).toEqual(
      expect.objectContaining({
        values: Object.values(jsObj),
        names: Object.keys(jsObj),
      })
    );
  });

  test('Create a double atomic vector', async () => {
    const jsObj = { a: 11, b: 23, c: 47, d: null };
    const rObj = await new webR.RDouble(jsObj);
    expect(await rObj.type()).toEqual('double');
    expect(await rObj.toJs()).toEqual(
      expect.objectContaining({
        values: Object.values(jsObj),
        names: Object.keys(jsObj),
      })
    );
  });

  test('Create a character atomic vector', async () => {
    const jsObj = { x: 'a', y: 'b', z: 'c', w: null };
    const rObj = await new webR.RCharacter(jsObj);
    expect(await rObj.type()).toEqual('character');
    expect(await rObj.toJs()).toEqual(
      expect.objectContaining({
        values: Object.values(jsObj),
        names: Object.keys(jsObj),
      })
    );
  });

  test('Create a complex atomic vector', async () => {
    const jsObj = { a: { re: 1, im: 2 }, b: { re: -3, im: -4 }, c: null };
    const rObj = await new webR.RComplex(jsObj);
    expect(await rObj.type()).toEqual('complex');
    expect(await rObj.toJs()).toEqual(
      expect.objectContaining({
        values: Object.values(jsObj),
        names: Object.keys(jsObj),
      })
    );
  });

  test('Create a raw atomic vector', async () => {
    const jsObj = { a: 210, b: 211, c: 212 };
    const rObj = await new webR.RRaw(jsObj);
    expect(await rObj.type()).toEqual('raw');
    expect(await rObj.toJs()).toEqual(
      expect.objectContaining({
        values: Object.values(jsObj),
        names: Object.keys(jsObj),
      })
    );
  });

  test('Create a list containing both a logical NA and R NULL', async () => {
    const jsObj = [true, 2, null, webR.objs.null];
    const rObj = await new webR.RList(jsObj);
    expect(await rObj.type()).toEqual('list');

    let elem = await rObj.get(1);
    expect(await elem.type()).toEqual('logical');
    expect(await elem.toJs()).toEqual(
      expect.objectContaining({
        values: [true],
        names: null,
      })
    );

    elem = await rObj.get(2);
    expect(await elem.type()).toEqual('double');
    expect(await elem.toJs()).toEqual(
      expect.objectContaining({
        values: [2],
        names: null,
      })
    );

    elem = await rObj.get(3);
    expect(await elem.type()).toEqual('logical');
    expect(await elem.toJs()).toEqual(
      expect.objectContaining({
        values: [null],
        names: null,
      })
    );

    elem = await rObj.get(4);
    expect(await elem.type()).toEqual('null');
    expect(await elem.isNull()).toEqual(true);
  });

  test('Create a pairlist containing both a logical NA and R NULL', async () => {
    const jsObj = [true, 2, null, webR.objs.null];
    const rObj = await new webR.RPairlist(jsObj);
    expect(await rObj.type()).toEqual('pairlist');

    let elem = await rObj.get(1);
    expect(await elem.type()).toEqual('logical');
    expect(await elem.toJs()).toEqual(
      expect.objectContaining({
        values: [true],
        names: null,
      })
    );

    elem = await rObj.get(2);
    expect(await elem.type()).toEqual('double');
    expect(await elem.toJs()).toEqual(
      expect.objectContaining({
        values: [2],
        names: null,
      })
    );

    elem = await rObj.get(3);
    expect(await elem.type()).toEqual('logical');
    expect(await elem.toJs()).toEqual(
      expect.objectContaining({
        values: [null],
        names: null,
      })
    );

    elem = await rObj.get(4);
    expect(await elem.type()).toEqual('null');
    expect(await elem.isNull()).toEqual(true);
  });

  test('Create an environment', async () => {
    const rObj = await new webR.REnvironment({ x: 123, y: 456 });
    expect(await rObj.type()).toEqual('environment');
    expect(await rObj.ls()).toEqual(['x', 'y']);

    let elem = (await rObj.get('x')) as RDouble;
    expect(await elem.type()).toEqual('double');
    expect(await elem.toNumber()).toEqual(123);
    elem = (await rObj.get('y')) as RDouble;
    expect(await elem.type()).toEqual('double');
    expect(await elem.toNumber()).toEqual(456);
  });

  test('Create a symbol', async () => {
    const rObj = await new webR.RSymbol('foo');
    expect(await rObj.type()).toEqual('symbol');
    expect(await rObj.toString()).toEqual('foo');
  });

  test('Create a string', async () => {
    const rObj = await new webR.RString('foo');
    expect(await rObj.type()).toEqual('string');
    expect(await rObj.toString()).toEqual('foo');
  });

  test('Create a call', async () => {
    const c = await new webR.RSymbol('c');
    const rObj = await new webR.RCall([c, 1, 2, 3, 'x', 'y', 'z']);
    const res = await rObj.exec();
    expect(await rObj.type()).toEqual('call');
    expect(await res.type()).toEqual('character');
    expect(await res.toJs()).toEqual(
      expect.objectContaining({
        values: ['1', '2', '3', 'x', 'y', 'z'],
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
    const newRObj = (await new webR.RObject(jsObj)) as RList;
    const env = await new webR.REnvironment({ newRObj, rObj });
    const identical = (await webR.evalR('identical(rObj, newRObj)', env)) as RLogical;
    expect(await rObj.type()).toEqual('list');
    expect(await identical.toBoolean()).toEqual(true);
  });

  test('Round trip convert to partial depth and ensure result is identical', async () => {
    const rObj = (await webR.evalR(
      'list(a=list(e=c(T,F,NA),f=c(1,2,3)), b=pairlist(g=c(4L,5L,6L)), c=list(h=c("abc","def"), i=list(7i)))'
    )) as RList;
    const jsObj = await rObj.toTree({ depth: 1 });
    const newRObj = (await new webR.RObject(jsObj)) as RList;
    const env = await new webR.REnvironment({ newRObj, rObj });
    const identical = (await webR.evalR('identical(rObj, newRObj)', env)) as RLogical;
    expect(await rObj.type()).toEqual('list');
    expect(await identical.toBoolean()).toEqual(true);
  });
});

describe('Access R objects via the main thread object cache', () => {
  test('R NULL', async () => {
    expect(await webR.objs.null.type()).toEqual('null');
    expect(await webR.objs.null.isNull()).toEqual(true);
  });

  test('R TRUE', async () => {
    expect(await webR.objs.true.type()).toEqual('logical');
    expect(await webR.objs.true.toBoolean()).toEqual(true);
  });

  test('R FALSE', async () => {
    expect(await webR.objs.false.type()).toEqual('logical');
    expect(await webR.objs.false.toBoolean()).toEqual(false);
  });

  test('Logical NA', async () => {
    expect(await webR.objs.na.type()).toEqual('logical');
    expect(await webR.objs.na.toArray()).toEqual([null]);
  });

  test('R global environment', async () => {
    await webR.objs.globalEnv.bind('abc', 123);
    expect(await webR.objs.globalEnv.ls()).toEqual(expect.arrayContaining(['abc']));

    const check = (await webR.evalR('abc + 456')) as RDouble;
    expect(await check.toNumber()).toEqual(579);
    webR.evalR('rm(abc)');
  });

  test('R base environment', async () => {
    expect(await webR.objs.baseEnv.ls()).toEqual(
      expect.arrayContaining(['R.Version', '*', '+', '=', '$', 'sin', 'message', 'if', 'while'])
    );
    const len = (await webR.objs.baseEnv.get('length')) as RFunction;
    const check = await len(['x', 'y', 'z']);
    expect(check).toEqual(expect.objectContaining({ type: 'integer', names: null, values: [3] }));
  });
});

beforeEach(() => {
  jest.restoreAllMocks();
});

afterAll(() => {
  return webR.close();
});
