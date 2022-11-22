/* eslint-disable @typescript-eslint/await-thenable */
import { WebR } from '../../webR/webr-main';
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
  RCharacter,
  isRObject,
} from '../../webR/robj';

const webR = new WebR({
  WEBR_URL: '../dist/',
  RArgs: ['--quiet'],
});

beforeAll(async () => {
  await webR.init();
});

test('Convert an RNull value to JS', async () => {
  const result = (await webR.evalRCode('NULL')).result as RNull;
  expect(await result.toJs()).toBeNull();
});

test('Convert an R symbol to JS', async () => {
  const result = (await webR.evalRCode('as.symbol("x")')).result as RSymbol;
  expect(await (await result.printname()).toJs()).toBe('x');
  expect(await (await result.symvalue()).isUnbound()).toBe(true);
  expect(await (await result.internal()).isNull()).toBe(true);
});

test('Get RObject type as a string', async () => {
  const result = (await webR.evalRCode('NULL')).result as RNull;
  expect(await result.toString()).toEqual('[object RObj:null]');
});

describe('Working with R lists and vectors', () => {
  test('Get R object attributes', async () => {
    const vector = (await webR.evalRCode('c(a=1, b=2, c=3)')).result;
    const value = (await vector.attrs()) as RList;
    const attrs = await value.toObject({ depth: 0 });
    expect(attrs.names).toEqual(expect.objectContaining({ names: null, values: ['a', 'b', 'c'] }));
  });

  test('Get R object names', async () => {
    let vector = (await webR.evalRCode('c(a=1, b=2, c=3)')).result;
    let value = await vector.names();
    expect(await value).toEqual(['a', 'b', 'c']);

    vector = (await webR.evalRCode('c(1, 2, 3)')).result;
    value = await vector.names();
    expect(await value).toEqual(null);
  });

  test('Set R object names', async () => {
    const vector = (await webR.evalRCode('c(1, 2, 3)')).result;
    await vector.setNames(['d', 'e', 'f']);
    const value = await vector.names();
    expect(await value).toEqual(['d', 'e', 'f']);

    // @ts-expect-error Deliberate type error to test Error thrown
    const err = vector.setNames(123);
    await expect(err).rejects.toThrow('setNames must be null or an Array of strings or null');
  });

  test('Get an item with [[ operator', async () => {
    const vector = (await webR.evalRCode('list(a=1, b=2, c=3)')).result;
    let value = (await vector.get('b')) as RDouble;
    expect(await value.toNumber()).toEqual(2);
    value = (await vector.get(3)) as RDouble;
    expect(await value.toNumber()).toEqual(3);
  });

  test('Get an item with [ operator', async () => {
    const vector = (await webR.evalRCode('list(a=1+4i, b=2-5i, c=3+6i)')).result;
    const val1 = (await vector.subset('b')) as RList;
    const obj1 = await val1.toObject({ depth: 0 });
    expect(obj1.b).toEqual(expect.objectContaining({ names: null, values: [{ re: 2, im: -5 }] }));

    const val2 = (await vector.subset(3)) as RList;
    const obj2 = await val2.toObject({ depth: 0 });
    expect(obj2.c).toEqual(expect.objectContaining({ names: null, values: [{ re: 3, im: 6 }] }));
  });

  test('Get an item with $ operator', async () => {
    const vector = (await webR.evalRCode('list(a="x", b="y", c="z")')).result;
    const value = (await vector.getDollar('b')) as RCharacter;
    expect(await value.toArray()).toEqual(['y']);
  });

  test('Get an item using the pluck method', async () => {
    const vector = (
      await webR.evalRCode('list(a=1, b=list(d="x",e="y",f=list(g=4,h=5,i=c(6,7))), c=3)')
    ).result;
    let value = (await vector.pluck('b', 'f', 'i', 2)) as RDouble;
    expect(await value.toNumber()).toEqual(7);
    value = (await vector.pluck('b', 'f', 'i', 10)) as RDouble;
    expect(await value).toBeUndefined();
  });

  test('Set an item using the set method', async () => {
    let vector = (await webR.evalRCode('c(a=1, b=2, c=3)')).result;
    const value = (await webR.evalRCode('4')).result;
    vector = await vector.set(1, value);
    vector = await vector.set(2, 5);
    vector = await vector.set('c', 6);
    const result = await (vector as RDouble).toTypedArray();
    expect(Array.from(result)).toEqual([4, 5, 6]);
  });

  test('R pairlist includes method', async () => {
    const result = (await webR.evalRCode('as.pairlist(list(x="a", y="b", z="c"))'))
      .result as RPairlist;
    expect(await result.includes('x')).toBe(true);
    expect(await result.includes('a')).toBe(false);
  });

  test('Convert an R pairlist to JS', async () => {
    const result = (await webR.evalRCode('as.pairlist(list(x="a", y="b", z="c"))'))
      .result as RPairlist;
    const arr = await result.toArray({ depth: 0 });
    expect(arr[0]).toEqual(expect.objectContaining({ names: null, values: ['a'] }));
    expect(arr[1]).toEqual(expect.objectContaining({ names: null, values: ['b'] }));
    expect(arr[2]).toEqual(expect.objectContaining({ names: null, values: ['c'] }));
    const obj = await result.toObject({ depth: 0 });
    expect(obj.x).toEqual(expect.objectContaining({ names: null, values: ['a'] }));
    expect(obj.y).toEqual(expect.objectContaining({ names: null, values: ['b'] }));
    expect(obj.z).toEqual(expect.objectContaining({ names: null, values: ['c'] }));
    const resJs = await result.toTree();
    expect(resJs.names).toEqual(['x', 'y', 'z']);
    expect(resJs.values[0]).toEqual(expect.objectContaining({ names: null, values: ['a'] }));
    expect(resJs.values[1]).toEqual(expect.objectContaining({ names: null, values: ['b'] }));
    expect(resJs.values[2]).toEqual(expect.objectContaining({ names: null, values: ['c'] }));
  });

  test('R list includes method', async () => {
    const result = (await webR.evalRCode('list(x="a", y="b", z="c")')).result as RList;
    expect(await result.includes('x')).toBe(true);
  });

  test('Convert an R list to JS', async () => {
    const result = (await webR.evalRCode('list(x="a", y="b", z="c")')).result as RList;
    const arr = await result.toArray({ depth: 0 });
    expect(arr[0]).toEqual(expect.objectContaining({ names: null, values: ['a'] }));
    expect(arr[1]).toEqual(expect.objectContaining({ names: null, values: ['b'] }));
    expect(arr[2]).toEqual(expect.objectContaining({ names: null, values: ['c'] }));
    const obj = await result.toObject({ depth: 0 });
    expect(obj.x).toEqual(expect.objectContaining({ names: null, values: ['a'] }));
    expect(obj.y).toEqual(expect.objectContaining({ names: null, values: ['b'] }));
    expect(obj.z).toEqual(expect.objectContaining({ names: null, values: ['c'] }));
    const resJs = await result.toJs();
    expect(resJs.names).toEqual(['x', 'y', 'z']);
    expect(resJs.values[0]).toEqual(expect.objectContaining({ names: null, values: ['a'] }));
    expect(resJs.values[1]).toEqual(expect.objectContaining({ names: null, values: ['b'] }));
    expect(resJs.values[2]).toEqual(expect.objectContaining({ names: null, values: ['c'] }));
  });

  test('Fully undefined names attribute', async () => {
    const list = (await webR.evalRCode('list("a", "b", "c")')).result as RList;
    const pairlist = (await webR.evalRCode('pairlist("a", "b", "c")')).result as RPairlist;
    const atomic = (await webR.evalRCode('c("a", "b", "c")')).result as RCharacter;
    const listJs = await list.toTree();
    const pairlistJs = await pairlist.toTree();
    const atomicJs = await atomic.toTree();
    expect(listJs.names).toEqual(null);
    expect(pairlistJs.names).toEqual(null);
    expect(atomicJs.names).toEqual(null);
  });

  test('Partially undefined names attribute', async () => {
    const list = (await webR.evalRCode('list(x="a", y="b", "c")')).result as RList;
    const pairlist = (await webR.evalRCode('pairlist(x="a", y="b", "c")')).result as RPairlist;
    const atomic = (await webR.evalRCode('c(x="a", y="b", "c")')).result as RCharacter;
    const listJs = await list.toTree();
    const pairlistJs = await pairlist.toTree();
    const atomicJs = await atomic.toTree();
    expect(listJs.names).toEqual(['x', 'y', '']);
    expect(pairlistJs.names).toEqual(['x', 'y', '']);
    expect(atomicJs.names).toEqual(['x', 'y', '']);
  });

  test('Missing values in names attribute', async () => {
    const list = (await webR.evalRCode('test = list(1,2); attr(test,"names") <- c("a", NA); test'))
      .result as RList;
    const listJs = await list.toTree();
    expect(listJs.names).toEqual(['a', null]);
    await expect(list.toObject()).rejects.toThrow('Empty or null key when converting');
  });

  test('Converted object has type property', async () => {
    const list = (await webR.evalRCode('list(1,2,3)')).result as RList;
    const listJs = await list.toJs();
    expect(listJs.type).toEqual('list');
    const logical = (await webR.evalRCode('TRUE')).result as RLogical;
    const logicalJs = await logical.toJs();
    expect(logicalJs.type).toEqual('logical');
    const double = (await webR.evalRCode('c(1,2,3)')).result as RDouble;
    const doubleJs = await double.toJs();
    expect(doubleJs.type).toEqual('double');
  });

  test('First key wins when converting R objects to JS objects', async () => {
    const list = (await webR.evalRCode('list(x="a", x="b")')).result as RList;
    const listObj = await list.toObject({ depth: 0 });
    expect(listObj.x).toEqual(expect.objectContaining({ names: null, values: ['a'] }));
    const pairlist = (await webR.evalRCode('pairlist(x="a", x="b")')).result as RPairlist;
    const pairlistObj = await pairlist.toObject({ depth: 0 });
    expect(pairlistObj.x).toEqual(expect.objectContaining({ names: null, values: ['a'] }));
    const atomic = (await webR.evalRCode('c(x="a", x="b")')).result as RCharacter;
    const atomicObj = await atomic.toObject();
    expect(atomicObj.x).toEqual('a');
  });

  test('Empty key when converting to JS object', async () => {
    const list = (await webR.evalRCode('list(x="a", y="b", "c")')).result as RList;
    const pairlist = (await webR.evalRCode('pairlist(x="a", y="b", "c")')).result as RPairlist;
    const atomic = (await webR.evalRCode('c(x="a", y="b", "c")')).result as RCharacter;
    await expect(list.toObject({ depth: 0 })).rejects.toThrow('Empty or null key when converting');
    await expect(pairlist.toObject({ depth: 0 })).rejects.toThrow(
      'Empty or null key when converting'
    );
    await expect(atomic.toObject()).rejects.toThrow('Empty or null key when converting');

    const listJs = await pairlist.toObject({ allowEmptyKey: true, depth: 0 });
    const pairlistJs = await pairlist.toObject({ allowEmptyKey: true, depth: 0 });
    const atomicJs = await atomic.toObject({ allowEmptyKey: true });
    expect(Object.keys(listJs)).toEqual(expect.arrayContaining(['']));
    expect(Object.keys(pairlistJs)).toEqual(expect.arrayContaining(['']));
    expect(Object.keys(atomicJs)).toEqual(expect.arrayContaining(['']));
    expect(listJs['']).toEqual(expect.objectContaining({ names: null, values: ['c'] }));
    expect(pairlistJs['']).toEqual(expect.objectContaining({ names: null, values: ['c'] }));
    expect(atomicJs['']).toEqual('c');
  });

  test('Throw on duplicate keys when converting R objects to JS objects', async () => {
    const list = (await webR.evalRCode('list(x="a", x="b")')).result as RList;
    const listObj = list.toObject({ allowDuplicateKey: false, depth: 0 });
    await expect(listObj).rejects.toThrow('Duplicate key when converting');
    const pairlist = (await webR.evalRCode('pairlist(x="a", x="b")')).result as RPairlist;
    const pairlistObj = pairlist.toObject({ allowDuplicateKey: false, depth: 0 });
    await expect(pairlistObj).rejects.toThrow('Duplicate key when converting');
    const atomic = (await webR.evalRCode('c(x="a", x="b")')).result as RCharacter;
    const atomicObj = atomic.toObject({ allowDuplicateKey: false });
    await expect(atomicObj).rejects.toThrow('Duplicate key when converting');
  });

  test('Convert an R double atomic vector to JS', async () => {
    const polytree = [1, 1, 3, 8, 27, 91, 350, 1376];
    const result = (await webR.evalRCode('c(1, 1, 3, 8, 27, 91, 350, 1376)')).result as RDouble;
    const resJs = await result.toJs();
    expect(resJs.values).toEqual(polytree);
    expect(resJs.names).toEqual(null);
    expect(resJs.type).toEqual('double');
    const resArray = await result.toArray();
    expect(resArray).toEqual(polytree);
  });

  test('Convert an R integer atomic vector to JS', async () => {
    const polytree = [1, 1, 3, 8, 27, 91, 350, 1376];
    const result = (await webR.evalRCode('as.integer(c(1, 1, 3, 8, 27, 91, 350, 1376))'))
      .result as RInteger;
    const resJs = await result.toJs();
    expect(resJs.values).toEqual(polytree);
    expect(resJs.names).toEqual(null);
    expect(resJs.type).toEqual('integer');
    const resArray = await result.toArray();
    expect(resArray).toEqual(polytree);
  });

  test('Convert an R logical atomic vector to JS', async () => {
    const logical = [true, false, null];
    const result = (await webR.evalRCode('c(TRUE, FALSE, NA)')).result as RLogical;
    const resJs = await result.toJs();
    expect(resJs.values).toEqual(logical);
    expect(resJs.names).toEqual(null);
    expect(resJs.type).toEqual('logical');
    const resArray = await result.toArray();
    expect(resArray).toEqual(logical);
  });

  test('Convert an R raw atomic vector to JS', async () => {
    const arr = [2, 4, 6];
    const result = (await webR.evalRCode('as.raw(c(2, 4, 6))')).result as RRaw;
    const resJs = await result.toJs();
    expect(resJs.values).toEqual(arr);
    expect(resJs.names).toEqual(null);
    expect(resJs.type).toEqual('raw');
  });

  test('Convert an R complex atomic vector to JS', async () => {
    const cmplx = [
      { re: 2, im: -7 },
      { re: 1, im: -8 },
    ];
    const result = (await webR.evalRCode('c(2-7i, 1-8i)')).result as RComplex;
    const resJs = await result.toJs();
    expect(resJs.values).toEqual(cmplx);
    expect(resJs.names).toEqual(null);
    expect(resJs.type).toEqual('complex');
  });

  test('Convert an R scalar double to JS number', async () => {
    const result = (await webR.evalRCode('1234')).result as RDouble;
    expect(await result.toNumber()).toEqual(1234);
  });

  test('Convert an R scalar integer to JS number', async () => {
    const result = (await webR.evalRCode('as.integer(5678)')).result as RInteger;
    expect(await result.toNumber()).toEqual(5678);
  });

  test('Convert an R scalar logical to JS', async () => {
    let result = (await webR.evalRCode('TRUE')).result as RLogical;
    expect(await result.toLogical()).toEqual(true);
    result = (await webR.evalRCode('FALSE')).result as RLogical;
    expect(await result.toLogical()).toEqual(false);
    result = (await webR.evalRCode('NA')).result as RLogical;
    expect(await result.toLogical()).toEqual(null);
  });

  test('Convert an R scalar raw to JS number', async () => {
    const result = (await webR.evalRCode('as.raw(255)')).result as RRaw;
    expect(await result.toNumber()).toEqual(255);
  });

  test('Convert an R scalar complex to JS', async () => {
    const result = (await webR.evalRCode('c(-3+4i)')).result as RComplex;
    expect(await result.toComplex()).toEqual({ re: -3, im: 4 });
  });

  test('Convert an R pairlist to depth 1', async () => {
    const result = (await webR.evalRCode('pairlist(pairlist(1))')).result as RPairlist;
    let convert = await result.toTree();
    expect(isRObject(convert.values[0])).toEqual(false);
    convert = await result.toTree({ depth: 1 });
    expect(isRObject(convert.values[0])).toEqual(true);
  });

  test('Convert an R list to depth 1', async () => {
    const result = (await webR.evalRCode('list(list(1))')).result as RList;
    let convert = await result.toTree();
    expect(isRObject(convert.values[0])).toEqual(false);
    convert = await result.toTree({ depth: 1 });
    expect(isRObject(convert.values[0])).toEqual(true);
  });
});

describe('Working with R environments', () => {
  test('Create an R environment', async () => {
    const env = (await webR.evalRCode('new.env()')).result as REnvironment;
    expect(await env.toString()).toEqual('[object RObj:environment]');
  });

  test('List items in an R environment', async () => {
    const env = (await webR.evalRCode('x<-new.env();x$a=1;x$b=2;x$.c=3;x')).result as REnvironment;
    let ls = await env.ls();
    expect(ls).toEqual(['a', 'b']);
    ls = await env.ls(true);
    expect(ls).toEqual(['.c', 'a', 'b']);
    ls = await env.names();
    expect(ls).toEqual(['.c', 'a', 'b']);
  });

  test('Get an item in an R environment', async () => {
    const env = (await webR.evalRCode('x<-new.env();x$a=1;x$b=2;x$.c=3;x')).result as REnvironment;
    let value = (await env.getDollar('a')) as RDouble;
    expect(await value.toNumber()).toEqual(1);
    value = (await env.get('b')) as RDouble;
    expect(await value.toNumber()).toEqual(2);
    value = (await env.subset('.c')) as RDouble;
    expect(await value.toNumber()).toEqual(3);
  });

  test('Convert an R environment to JS', async () => {
    const env = (await webR.evalRCode('x<-new.env();x$a=TRUE;x$b=FALSE;x$.c=NA;x'))
      .result as REnvironment;
    const envJs = await env.toJs();
    expect(envJs.names).toEqual(['.c', 'a', 'b']);
    expect(envJs.values[0]).toEqual(expect.objectContaining({ names: null, values: [null] }));
    expect(envJs.values[1]).toEqual(expect.objectContaining({ names: null, values: [true] }));
    expect(envJs.values[2]).toEqual(expect.objectContaining({ names: null, values: [false] }));
    const envObj = await env.toObject();
    expect(envObj['.c']).toEqual(expect.objectContaining({ names: null, values: [null] }));
    expect(envObj['a']).toEqual(expect.objectContaining({ names: null, values: [true] }));
    expect(envObj['b']).toEqual(expect.objectContaining({ names: null, values: [false] }));
  });

  test('Convert an R environment to depth 1', async () => {
    const env = (await webR.evalRCode('x<-new.env();x$a=TRUE;x$b=FALSE;x$.c=NA;x'))
      .result as REnvironment;
    let convert = await env.toTree();
    expect(isRObject(convert.values[0])).toEqual(false);
    convert = await env.toTree({ depth: 1 });
    expect(isRObject(convert.values[0])).toEqual(true);
  });

  test('Evaluating R code in an environment', async () => {
    const env = (await webR.evalRCode('x<-new.env();x$a=1;x$b=2;x$.c=3;x')).result as REnvironment;
    const value = (await webR.evalRCode('b', env)).result as RDouble;
    expect(await value.toNumber()).toEqual(2);
  });
});

describe('Invoking RFunction objects', () => {
  test('Execute an R function with JS arguments', async () => {
    const choose = (await webR.evalRCode('choose')).result as RFunction;
    const result = (await choose.exec(7, 5)) as RInteger;
    expect(await result.toNumber()).toBe(21);
  });

  test('Execute an R function with RProxy arguments', async () => {
    const factorial = (await webR.evalRCode('factorial')).result as RFunction;
    const four = (await webR.evalRCode('4')).result;
    const result = (await factorial.exec(four)) as RInteger;
    expect(await result.toNumber()).toBe(24);
  });

  test('Pass JS booleans as R logical arguments', async () => {
    const c = (await webR.evalRCode('c')).result as RFunction;
    const logical = (await c.exec(true, [true, false])) as RLogical;
    expect(await logical.toArray()).toEqual([true, true, false]);
  });

  test('Pass JS number as R double arguments', async () => {
    const c = (await webR.evalRCode('c')).result as RFunction;
    const double = (await c.exec(3.0, [3.1, 3.14])) as RDouble;
    expect(await double.toArray()).toEqual([3.0, 3.1, 3.14]);
  });

  test('Pass JS object as R complex arguments', async () => {
    const c = (await webR.evalRCode('c')).result as RFunction;
    const cmplx = (await c.exec({ re: 1, im: 2 }, { re: -3, im: -4 })) as RComplex;
    expect(await cmplx.toArray()).toEqual([
      { re: 1, im: 2 },
      { re: -3, im: -4 },
    ]);
  });

  test('Pass JS string as R character arguments', async () => {
    const c = (await webR.evalRCode('c')).result as RFunction;
    const cmplx = (await c.exec('Hello', ['World', '!'])) as RComplex;
    expect(await cmplx.toArray()).toEqual(['Hello', 'World', '!']);
  });
});

describe('Garbage collection', () => {
  test('Protect and release R objects', async () => {
    const gc = (await webR.evalRCode('gc')).result as RFunction;
    await gc.exec(false, false, true);
    const before = await ((await gc.exec(false, false, true)) as RDouble).toTypedArray();

    const mem = (await webR.evalRCode('rnorm(10000,1,1)')).result;
    mem.preserve();
    const during = await ((await gc.exec(false, false, true)) as RDouble).toTypedArray();

    mem.release();
    const after = await ((await gc.exec(false, false, true)) as RDouble).toTypedArray();

    expect(during[0]).toBeGreaterThan(before[0]);
    expect(during[1]).toBeGreaterThan(before[1]);
    expect(after[0]).toBeLessThan(during[0]);
    expect(after[1]).toBeLessThan(during[1]);
  });
});

afterAll(() => {
  return webR.close();
});
