import { WebR } from '../../webR/webr-main';
import { Message } from '../../webR/chan/message';
import {
  RObjectTree,
  RawType,
  RDouble,
  RLogical,
  RType,
  RCharacter,
  RComplex,
  RList,
  REnvironment,
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

describe('Create R objects from the main thread', () => {
  test('Create a logical atomic vector', async () => {
    const jsObj = [true, false, true, null];
    const rObj = (await webR.newRObject(jsObj)) as RLogical;
    expect(await rObj.type()).toEqual(RType.Logical);
    expect(await rObj.toJs()).toEqual(
      expect.objectContaining({
        values: [true, false, true, null],
        names: null,
        missing: [false, false, false, true],
      })
    );
  });

  test('Create a double atomic vector', async () => {
    const jsObj = [1, 2, 3, 6, 11, 23, 47, 106, null];
    const rObj = (await webR.newRObject(jsObj)) as RDouble;
    expect(await rObj.type()).toEqual(RType.Double);
    expect(await rObj.toArray()).toEqual(jsObj);
  });

  test('Create a character atomic vector', async () => {
    const jsObj = ['a', 'b', 'c', null];
    const rObj = (await webR.newRObject(jsObj)) as RCharacter;
    expect(await rObj.type()).toEqual(RType.Character);
    expect(await rObj.toJs()).toEqual(
      expect.objectContaining({
        values: ['a', 'b', 'c', null],
        names: null,
        missing: [false, false, false, true],
      })
    );
  });

  test('Create a complex atomic vector', async () => {
    const jsObj = [{ re: 1, im: 2 }, { re: -3, im: -4 }, null];
    const rObj = (await webR.newRObject(jsObj)) as RComplex;
    expect(await rObj.type()).toEqual(RType.Complex);
    expect(await rObj.toJs()).toEqual(
      expect.objectContaining({
        values: [{ re: 1, im: 2 }, { re: -3, im: -4 }, null],
        names: null,
        missing: [false, false, true],
      })
    );
  });

  test('Create a list', async () => {
    const jsObj = [true, 3.14, 'abc'];
    const rObj = (await webR.newRObject(jsObj)) as RList;
    expect(await rObj.type()).toEqual(RType.List);
    const list = await rObj.toJs();
    expect(list.values[0]).toEqual({
      type: 'Logical',
      names: null,
      values: [true],
      missing: [false],
    });
    expect(list.values[1]).toEqual({
      type: 'Double',
      names: null,
      values: [3.14],
      missing: [false],
    });
    expect(list.values[2]).toEqual({
      type: 'Character',
      names: null,
      values: ['abc'],
      missing: [false],
    });
  });

  test('Create an environment', async () => {
    const jsObj = { x: 123, y: 'abc' };
    const rObj = (await webR.newRObject(jsObj)) as REnvironment;
    expect(await rObj.type()).toEqual(RType.Environment);
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

  test('Round trip convert nested R objects and ensure result is identical', async () => {
    const rObj = (
      await webR.evalRCode(
        'list(a=list(e=c(T,F,NA),f=c(1,2,3)), b=pairlist(g=c(4L,5L,6L)), c=list(h=c("abc","def"), i=list(7i)))'
      )
    ).result as RList;
    const jsObj = await rObj.toTree();
    const newRObj = (await webR.newRObject(jsObj)) as RList;
    const env = (await webR.newRObject({ newRObj, rObj })) as REnvironment;
    const identical = (await webR.evalRCode('identical(rObj, newRObj)', env)).result as RLogical;
    expect(await rObj.type()).toEqual(RType.List);
    expect(await identical.toLogical()).toEqual(true);
  });

  test('Round trip convert R object containing proxies and ensure result is identical', async () => {
    const rObj = (
      await webR.evalRCode(
        'list(a=list(e=c(T,F,NA),f=c(1,2,3)), b=pairlist(g=c(4L,5L,6L)), c=list(h=c("abc","def"), i=list(7i)))'
      )
    ).result as RList;
    const jsObj = await rObj.toTree({ depth: 1 });
    const newRObj = (await webR.newRObject(jsObj)) as RList;
    const env = (await webR.newRObject({ newRObj, rObj })) as REnvironment;
    const identical = (await webR.evalRCode('identical(rObj, newRObj)', env)).result as RLogical;
    expect(await rObj.type()).toEqual(RType.List);
    expect(await identical.toLogical()).toEqual(true);
  });
});

afterAll(() => {
  return webR.close();
});
