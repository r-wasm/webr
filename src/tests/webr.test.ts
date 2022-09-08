/* eslint-disable @typescript-eslint/await-thenable */
import { WebR } from '../webR/webr-main';
import { Message } from '../webR/chan/message';
import {
  RNull,
  RDouble,
  RInteger,
  RFunction,
  RSymbol,
  RLogical,
  RComplex,
  RRaw,
  RPairlist,
  RList,
  REnvironment,
} from '../webR/robj';
import { sleep } from '../webR/utils';

import util from 'util';

const webR = new WebR({
  WEBR_URL: '../dist/',
  RArgs: ['--quiet'],
});

jest.setTimeout(10000);

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

describe('Download and install binary webR packages', () => {
  test('Install packages via evalRCode', async () => {
    await webR.evalRCode('webr::install("cli", repos="https://repo.webr.workers.dev/")');
    const pkg = (await webR.evalRCode('"cli" %in% library(cli)')) as RLogical;
    expect(await pkg.toLogical()).toEqual(true);
  });

  test('Install packages via API', async () => {
    await webR.installPackages(['MASS']);
    const pkg = (await webR.evalRCode('"MASS" %in% library(MASS)')) as RLogical;
    expect(await pkg.toLogical()).toEqual(true);
  });
});

describe('Test webR virtual filesystem', () => {
  const testFileContents = new Uint8Array([1, 2, 4, 7, 11, 16, 22, 29, 37, 46]);
  test('Upload a file to the VFS', async () => {
    await expect(webR.putFileData('/tmp/testFile', testFileContents)).resolves.not.toThrow();
    const readFile = (await webR.evalRCode('readBin("/tmp/testFile", "raw", 10)')) as RRaw;
    expect(Array.from(await readFile.toArray())).toEqual(Array.from(testFileContents));
  });

  test('Download a file from the VFS', async () => {
    const fileContents = await webR.getFileData('/tmp/testFile');
    expect(fileContents).toStrictEqual(testFileContents);
  });

  test('Receive information about a file on the VFS', async () => {
    const fileInfo = await webR.getFSNode('/tmp/testFile');
    expect(fileInfo).toHaveProperty('name', 'testFile');
    expect(fileInfo).toHaveProperty('isFolder', false);
  });

  test('Receive information about a directory on the VFS', async () => {
    const fileInfo = await webR.getFSNode('/tmp');
    expect(fileInfo).toHaveProperty('name', 'tmp');
    expect(fileInfo).toHaveProperty('isFolder', true);
  });
});

describe('Evaluate R code', () => {
  test('Evaluate code and return a proxy', async () => {
    const result = await webR.evalRCode('42');
    expect(util.types.isProxy(result)).toBe(true);
  });

  test('Evaluate R code without setting up error handlers', async () => {
    const result = webR.evalRCode('webr::global_prompt_install()', undefined, {
      withHandlers: false,
    });
    await expect(result).resolves.not.toThrow();
  });

  test('RProxy _target property', async () => {
    const result = await webR.evalRCode('42');
    expect(result._target).toHaveProperty('type', 'PTR');
    expect(result._target).toHaveProperty('methods');
    expect(result._target).toHaveProperty('obj');
    expect(result._target.obj).toEqual(expect.any(Number));
  });

  test('Throw an error if passed an invalid environment', async () => {
    // @ts-expect-error Deliberate type error to test Error thrown
    const promise = webR.evalRCode('3.14159', { env: 42 });
    await expect(promise).rejects.toThrow('invalid environment object');
  });

  test('Throw an error if passed an invalid environment object type', async () => {
    const euler = await webR.evalRCode('0.57722');
    await expect(webR.evalRCode('x', euler)).rejects.toThrow('env argument with invalid SEXP type');
  });

  test('Throw errors from R', async () => {
    const badSyntax = webR.evalRCode('42+');
    await expect(badSyntax).rejects.toThrow('parse error');
  });

  test('Write to stderr while evaluating R code', async () => {
    await webR.flush();
    const res = webR.evalRCode('message("Hello, stderr!")');
    await expect(res).resolves.not.toThrow();
    expect((await webR.read()).data).toBe('Hello, stderr!');
  });
});

test('Convert an RNull value to JS', async () => {
  const result = (await webR.evalRCode('NULL')) as RNull;
  expect(await result.toJs()).toBeNull();
});

test('Convert an R symbol to JS', async () => {
  const result = (await webR.evalRCode('as.symbol("x")')) as RSymbol;
  expect(await (await result.printname()).toJs()).toBe('x');
  expect(await (await result.symvalue()).isUnbound()).toBe(true);
  expect(await (await result.internal()).isNull()).toBe(true);
});

test('Get RObject type as a string', async () => {
  const result = (await webR.evalRCode('NULL')) as RNull;
  expect(await result.toString()).toEqual('[object RObj:Null]');
});

describe('Working with R lists and vectors', () => {
  test('Get R object attributes', async () => {
    const vector = await webR.evalRCode('c(a=1, b=2, c=3)');
    const value = await vector.attrs();
    expect(await value.toJs()).toEqual({ names: ['a', 'b', 'c'] });
  });

  test('Get R object names', async () => {
    let vector = await webR.evalRCode('c(a=1, b=2, c=3)');
    let value = await vector.names();
    expect(await value).toEqual(['a', 'b', 'c']);

    vector = await webR.evalRCode('c(1, 2, 3)');
    value = await vector.names();
    expect(await value).toBeUndefined();
  });

  test('Get an item with [[ operator', async () => {
    const vector = await webR.evalRCode('list(a=1, b=2, c=3)');
    let value = (await vector.get('b')) as RDouble;
    expect(await value.toNumber()).toEqual(2);
    value = (await vector.get(3)) as RDouble;
    expect(await value.toNumber()).toEqual(3);
  });

  test('Get an item with [ operator', async () => {
    const vector = await webR.evalRCode('list(a=1+4i, b=2-5i, c=3+6i)');
    let value = await vector.subset('b');
    expect(await value.toJs()).toEqual({ b: [{ re: 2, im: -5 }] });
    value = await vector.subset(3);
    expect(await value.toJs()).toEqual({ c: [{ re: 3, im: 6 }] });
  });

  test('Get an item with $ operator', async () => {
    const vector = await webR.evalRCode('list(a="x", b="y", c="z")');
    const value = await vector.getDollar('b');
    expect(await value.toJs()).toEqual(['y']);
  });

  test('Get an item using the pluck method', async () => {
    const vector = await webR.evalRCode(
      'list(a=1, b=list(d="x",e="y",f=list(g=4,h=5,i=c(6,7))), c=3)'
    );
    let value = (await vector.pluck('b', 'f', 'i', 2)) as RDouble;
    expect(await value.toNumber()).toEqual(7);
    value = (await vector.pluck('b', 'f', 'i', 10)) as RDouble;
    expect(await value).toBeUndefined();
  });

  test('Set an item using the set method', async () => {
    let vector = await webR.evalRCode('c(a=1, b=2, c=3)');
    const value = await webR.evalRCode('4');
    vector = await vector.set(1, value);
    vector = await vector.set(2, 5);
    vector = await vector.set('c', 6);
    const result = (await vector.toJs()) as Float64Array;
    expect(Array.from(result)).toEqual([4, 5, 6]);
  });

  test('R pairlist includes method', async () => {
    const result = (await webR.evalRCode('as.pairlist(list(x="a", y="b", z="c"))')) as RPairlist;
    expect(await result.includes('x')).toBe(true);
    expect(await result.includes('a')).toBe(false);
  });

  test('Convert an R pairlist to JS', async () => {
    const result = (await webR.evalRCode('as.pairlist(list(x="a", y="b", z="c"))')) as RPairlist;
    expect(await result.toJs()).toEqual({ x: ['a'], y: ['b'], z: ['c'] });
  });

  test('R list includes method', async () => {
    const result = (await webR.evalRCode('list(x="a", y="b", z="c")')) as RList;
    expect(await result.includes('x')).toBe(true);
  });

  test('Convert an R list to JS', async () => {
    const result = (await webR.evalRCode('list(x="a", y="b", z="c")')) as RList;
    expect(await result.toJs()).toEqual({ x: ['a'], y: ['b'], z: ['c'] });
    expect(await result.toArray()).toEqual([['a'], ['b'], ['c']]);
  });

  test('Convert an R double atomic vector to JS', async () => {
    const polytree = [1, 1, 3, 8, 27, 91, 350, 1376];
    const result = await webR.evalRCode('c(1, 1, 3, 8, 27, 91, 350, 1376)');
    const values = (await result.toJs()) as Float64Array;
    expect(Array.from(values)).toStrictEqual(polytree);
  });

  test('Convert an R integer atomic vector to JS', async () => {
    const polytree = [1, 1, 3, 8, 27, 91, 350, 1376];
    const result = await webR.evalRCode('as.integer(c(1, 1, 3, 8, 27, 91, 350, 1376))');
    const values = (await result.toJs()) as Int32Array;
    expect(Array.from(values)).toStrictEqual(polytree);
  });

  test('Convert an R logical atomic vector to JS', async () => {
    const logical = [true, false, 'NA'];
    const result = await webR.evalRCode('c(TRUE,FALSE,NA)');
    expect(await result.toJs()).toEqual(logical);
  });

  test('Convert an R raw atomic vector to JS', async () => {
    const arr = [2, 4, 6];
    const result = await webR.evalRCode('as.raw(c(2, 4, 6))');
    const values = (await result.toJs()) as Uint8Array;
    expect(Array.from(values)).toStrictEqual(arr);
  });

  test('Convert an R complex atomic vector to JS', async () => {
    const cmplx = [
      { re: 2, im: -7 },
      { re: 1, im: -8 },
    ];
    const result = await webR.evalRCode('c(2-7i, 1-8i)');
    expect(await result.toJs()).toEqual(cmplx);
  });

  test('Convert an R scalar double to JS number', async () => {
    const result = (await webR.evalRCode('1234')) as RDouble;
    expect(await result.toNumber()).toStrictEqual(1234);
  });

  test('Convert an R scalar integer to JS number', async () => {
    const result = (await webR.evalRCode('as.integer(5678)')) as RInteger;
    expect(await result.toNumber()).toStrictEqual(5678);
  });

  test('Convert an R scalar logical to JS', async () => {
    let result = (await webR.evalRCode('TRUE')) as RLogical;
    expect(await result.toLogical()).toEqual(true);
    result = (await webR.evalRCode('FALSE')) as RLogical;
    expect(await result.toLogical()).toEqual(false);
    result = (await webR.evalRCode('NA')) as RLogical;
    expect(await result.toLogical()).toEqual('NA');
  });

  test('Convert an R scalar raw to JS number', async () => {
    const result = (await webR.evalRCode('as.raw(255)')) as RRaw;
    expect(await result.toNumber()).toEqual(255);
  });

  test('Convert an R scalar complex to JS', async () => {
    const result = (await webR.evalRCode('c(-3+4i)')) as RComplex;
    expect(await result.toComplex()).toEqual({ re: -3, im: 4 });
  });
});

describe('Working with R environments', () => {
  test('Create an R environment', async () => {
    const env = (await webR.evalRCode('new.env()')) as REnvironment;
    expect(await env.toString()).toEqual('[object RObj:Environment]');
  });

  test('List items in an R environment', async () => {
    const env = (await webR.evalRCode('x<-new.env();x$a=1;x$b=2;x$.c=3;x')) as REnvironment;
    let ls = await env.ls();
    expect(ls).toEqual(['a', 'b']);
    ls = await env.ls(true);
    expect(ls).toEqual(['.c', 'a', 'b']);
    ls = await env.names();
    expect(ls).toEqual(['.c', 'a', 'b']);
  });

  test('Get an item in an R environment', async () => {
    const env = (await webR.evalRCode('x<-new.env();x$a=1;x$b=2;x$.c=3;x')) as REnvironment;
    let value = (await env.getDollar('a')) as RDouble;
    expect(await value.toNumber()).toEqual(1);
    value = (await env.get('b')) as RDouble;
    expect(await value.toNumber()).toEqual(2);
    value = (await env.subset('.c')) as RDouble;
    expect(await value.toNumber()).toEqual(3);
  });

  test('Convert an R environment to JS', async () => {
    const env = (await webR.evalRCode('x<-new.env();x$a=TRUE;x$b=FALSE;x$.c=NA;x')) as REnvironment;
    expect(await env.toJs()).toEqual({ '.c': ['NA'], a: [true], b: [false] });
  });

  test('Evaluating R code in an environment', async () => {
    const env = (await webR.evalRCode('x<-new.env();x$a=1;x$b=2;x$.c=3;x')) as REnvironment;
    const value = (await webR.evalRCode('b', env)) as RDouble;
    expect(await value.toNumber()).toEqual(2);
  });
});

describe('Invoking RFunction objects', () => {
  test('Execute an R function with JS arguments', async () => {
    const choose = (await webR.evalRCode('choose')) as RFunction;
    const result = (await choose.exec(7, 5)) as RInteger;
    expect(await result.toNumber()).toBe(21);
  });

  test('Execute an R function with RProxy arguments', async () => {
    const factorial = (await webR.evalRCode('factorial')) as RFunction;
    const four = await webR.evalRCode('4');
    const result = (await factorial.exec(four)) as RInteger;
    expect(await result.toNumber()).toBe(24);
  });

  test('Pass JS booleans as R logical arguments', async () => {
    const c = (await webR.evalRCode('c')) as RFunction;
    const logical = (await c.exec(true, [true, false])) as RLogical;
    expect(Array.from(await logical.toJs())).toStrictEqual([true, true, false]);
  });

  test('Pass JS number as R double arguments', async () => {
    const c = (await webR.evalRCode('c')) as RFunction;
    const double = (await c.exec(3.0, [3.1, 3.14])) as RDouble;
    expect(Array.from(await double.toArray())).toStrictEqual([3.0, 3.1, 3.14]);
  });

  test('Pass JS object as R complex arguments', async () => {
    const c = (await webR.evalRCode('c')) as RFunction;
    const cmplx = (await c.exec({ re: 1, im: 2 }, { re: -3, im: -4 })) as RComplex;
    expect(Array.from(await cmplx.toJs())).toEqual([
      { re: 1, im: 2 },
      { re: -3, im: -4 },
    ]);
  });

  test('Pass JS string as R character arguments', async () => {
    const c = (await webR.evalRCode('c')) as RFunction;
    const cmplx = (await c.exec('Hello', ['World', '!'])) as RComplex;
    expect(Array.from(await cmplx.toJs())).toEqual(['Hello', 'World', '!']);
  });
});

describe('Garbage collection', () => {
  test('Protect and release R objects', async () => {
    const gc = (await webR.evalRCode('gc')) as RFunction;
    await gc.exec(false, false, true);
    const before = await ((await gc.exec(false, false, true)) as RDouble).toArray();

    const mem = await webR.evalRCode('rnorm(10000,1,1)');
    mem.preserve();
    const during = await ((await gc.exec(false, false, true)) as RDouble).toArray();

    mem.release();
    const after = await ((await gc.exec(false, false, true)) as RDouble).toArray();

    expect(during[0]).toBeGreaterThan(before[0]);
    expect(during[1]).toBeGreaterThan(before[1]);
    expect(after[0]).toBeLessThan(during[0]);
    expect(after[1]).toBeLessThan(during[1]);
  });
});

test('Utils sleep', async () => {
  await expect(sleep(100)).resolves.not.toThrow();
});

afterAll(() => {
  return webR.close();
});
