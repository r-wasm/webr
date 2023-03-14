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
  RObject,
} from '../../webR/robj-main';

const webR = new WebR({
  baseUrl: '../dist/',
  RArgs: ['--quiet'],
});

let initShelterSize = -1;

beforeAll(async () => {
  await webR.init();
  initShelterSize = await webR.globalShelter.size();
});

// We don't destroy objects during unit tests but when webR starts
// the count should be zero
test('Initial shelter size', async () => {
  expect(initShelterSize).toEqual(0);
});

test('Convert an RNull value to JS', async () => {
  const result = (await webR.evalR('NULL')) as RNull;
  const nullObj = await result.toJs();
  expect(nullObj.type).toEqual('null');
});

test('Convert an R symbol to JS', async () => {
  const result = (await webR.evalR('as.symbol("x")')) as RSymbol;
  expect(await (await result.printname()).toString()).toBe('x');
  expect(await (await result.symvalue()).isUnbound()).toBe(true);
  expect(await (await result.internal()).isNull()).toBe(true);
});

test('Get RObject type as a string', async () => {
  const result = (await webR.evalR('NULL')) as RNull;
  expect(await result.toString()).toEqual('[object RObject:null]');
});

describe('Working with R lists and vectors', () => {
  test('Get R object attributes', async () => {
    const vector = await webR.evalR('c(a=1, b=2, c=3)');
    const value = (await vector.attrs()) as RList;
    const attrs = await value.toObject({ depth: 0 });
    expect(attrs.names).toEqual(expect.objectContaining({ names: null, values: ['a', 'b', 'c'] }));
  });

  test('Get R object names', async () => {
    let vector = await webR.evalR('c(a=1, b=2, c=3)');
    let value = await vector.names();
    expect(await value).toEqual(['a', 'b', 'c']);

    vector = await webR.evalR('c(1, 2, 3)');
    value = await vector.names();
    expect(await value).toEqual(null);
  });

  test('Set R object names', async () => {
    const vector = await webR.evalR('c(1, 2, 3)');
    await vector.setNames(['d', 'e', 'f']);
    const value = await vector.names();
    expect(await value).toEqual(['d', 'e', 'f']);

    // @ts-expect-error Deliberate type error to test Error thrown
    const err = vector.setNames(123);
    await expect(err).rejects.toThrow('setNames must be null or an Array of strings or null');
  });

  test('Get an item with [[ operator', async () => {
    const vector = await webR.evalR('list(a=1, b=2, c=3)');
    let value = (await vector.get('b')) as RDouble;
    expect(await value.toNumber()).toEqual(2);
    value = (await vector.get(3)) as RDouble;
    expect(await value.toNumber()).toEqual(3);
  });

  test('Get an item with [ operator', async () => {
    const vector = await webR.evalR('list(a=1+4i, b=2-5i, c=3+6i)');
    const val1 = (await vector.subset('b')) as RList;
    const obj1 = await val1.toObject({ depth: 0 });
    expect(obj1.b).toEqual(expect.objectContaining({ names: null, values: [{ re: 2, im: -5 }] }));

    const val2 = (await vector.subset(3)) as RList;
    const obj2 = await val2.toObject({ depth: 0 });
    expect(obj2.c).toEqual(expect.objectContaining({ names: null, values: [{ re: 3, im: 6 }] }));
  });

  test('Get an item with $ operator', async () => {
    const vector = await webR.evalR('list(a="x", b="y", c="z")');
    const value = (await vector.getDollar('b')) as RCharacter;
    expect(await value.toArray()).toEqual(['y']);
  });

  test('Get an item using the pluck method', async () => {
    const vector = await webR.evalR('list(a=1, b=list(d="x",e="y",f=list(g=4,h=5,i=c(6,7))), c=3)');
    const value = (await vector.pluck('b', 'f', 'i', 2)) as RDouble;
    expect(await value.toNumber()).toEqual(7);
  });

  test('Throw an error when out of bounds using the pluck method', async () => {
    const vector = await webR.evalR('list(a=1, b=2, c=3)');
    const oob = vector.pluck(10);
    await expect(oob).rejects.toThrow('non-local transfer of control occured');

    const lastMsg = (await webR.flush()).pop();
    expect(lastMsg!.type).toEqual('stderr');
    expect(lastMsg!.data).toContain('subscript out of bounds');
  });

  test('Set an item using the set method', async () => {
    let vector = await webR.evalR('c(a=1, b=2, c=3)');
    const value = await webR.evalR('4');
    vector = await vector.set(1, value);
    vector = await vector.set(2, 5);
    vector = await vector.set('c', 6);
    const result = await (vector as RDouble).toTypedArray();
    expect(Array.from(result)).toEqual([4, 5, 6]);
  });

  test('R pairlist includes method', async () => {
    const result = (await webR.evalR('as.pairlist(list(x="a", y="b", z="c"))')) as RPairlist;
    expect(await result.includes('x')).toBe(true);
    expect(await result.includes('a')).toBe(false);
  });

  test('Convert an R pairlist to JS', async () => {
    const result = (await webR.evalR('as.pairlist(list(x="a", y="b", z="c"))')) as RPairlist;
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

  test('R list includes method', async () => {
    const result = (await webR.evalR('list(x="a", y="b", z="c")')) as RList;
    expect(await result.includes('x')).toBe(true);
  });

  test('Convert an R list to JS', async () => {
    const result = (await webR.evalR('list(x="a", y="b", z="c")')) as RList;
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
    const list = (await webR.evalR('list("a", "b", "c")')) as RList;
    const pairlist = (await webR.evalR('pairlist("a", "b", "c")')) as RPairlist;
    const atomic = (await webR.evalR('c("a", "b", "c")')) as RCharacter;
    const listJs = await list.toJs();
    const pairlistJs = await pairlist.toJs();
    const atomicJs = await atomic.toJs();
    expect(listJs.names).toEqual(null);
    expect(pairlistJs.names).toEqual(null);
    expect(atomicJs.names).toEqual(null);
  });

  test('Partially undefined names attribute', async () => {
    const list = (await webR.evalR('list(x="a", y="b", "c")')) as RList;
    const pairlist = (await webR.evalR('pairlist(x="a", y="b", "c")')) as RPairlist;
    const atomic = (await webR.evalR('c(x="a", y="b", "c")')) as RCharacter;
    const listJs = await list.toJs();
    const pairlistJs = await pairlist.toJs();
    const atomicJs = await atomic.toJs();
    expect(listJs.names).toEqual(['x', 'y', '']);
    expect(pairlistJs.names).toEqual(['x', 'y', '']);
    expect(atomicJs.names).toEqual(['x', 'y', '']);
  });

  test('Missing values in names attribute', async () => {
    const list = (await webR.evalR(
      'test = list(1,2); attr(test,"names") <- c("a", NA); test'
    )) as RList;
    const listJs = await list.toJs();
    expect(listJs.names).toEqual(['a', null]);
    await expect(list.toObject()).rejects.toThrow('Empty or null key when converting');
  });

  test('Converted object has type property', async () => {
    const list = (await webR.evalR('list(1,2,3)')) as RList;
    const listJs = await list.toJs();
    expect(listJs.type).toEqual('list');
    const logical = (await webR.evalR('TRUE')) as RLogical;
    const logicalJs = await logical.toJs();
    expect(logicalJs.type).toEqual('logical');
    const double = (await webR.evalR('c(1,2,3)')) as RDouble;
    const doubleJs = await double.toJs();
    expect(doubleJs.type).toEqual('double');
  });

  test('First key wins when converting R objects to JS objects', async () => {
    const list = (await webR.evalR('list(x="a", x="b")')) as RList;
    const listObj = await list.toObject({ depth: 0 });
    expect(listObj.x).toEqual(expect.objectContaining({ names: null, values: ['a'] }));
    const pairlist = (await webR.evalR('pairlist(x="a", x="b")')) as RPairlist;
    const pairlistObj = await pairlist.toObject({ depth: 0 });
    expect(pairlistObj.x).toEqual(expect.objectContaining({ names: null, values: ['a'] }));
    const atomic = (await webR.evalR('c(x="a", x="b")')) as RCharacter;
    const atomicObj = await atomic.toObject();
    expect(atomicObj.x).toEqual('a');
  });

  test('Empty key when converting to JS object', async () => {
    const list = (await webR.evalR('list(x="a", y="b", "c")')) as RList;
    const pairlist = (await webR.evalR('pairlist(x="a", y="b", "c")')) as RPairlist;
    const atomic = (await webR.evalR('c(x="a", y="b", "c")')) as RCharacter;
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
    const list = (await webR.evalR('list(x="a", x="b")')) as RList;
    const listObj = list.toObject({ allowDuplicateKey: false, depth: 0 });
    await expect(listObj).rejects.toThrow('Duplicate key when converting');
    const pairlist = (await webR.evalR('pairlist(x="a", x="b")')) as RPairlist;
    const pairlistObj = pairlist.toObject({ allowDuplicateKey: false, depth: 0 });
    await expect(pairlistObj).rejects.toThrow('Duplicate key when converting');
    const atomic = (await webR.evalR('c(x="a", x="b")')) as RCharacter;
    const atomicObj = atomic.toObject({ allowDuplicateKey: false });
    await expect(atomicObj).rejects.toThrow('Duplicate key when converting');
  });

  test('Convert an R double atomic vector to JS', async () => {
    const polytree = [1, 1, 3, 8, 27, 91, 350, 1376];
    const result = (await webR.evalR('c(1, 1, 3, 8, 27, 91, 350, 1376)')) as RDouble;
    const resJs = await result.toJs();
    expect(resJs.values).toEqual(polytree);
    expect(resJs.names).toEqual(null);
    expect(resJs.type).toEqual('double');
    const resArray = await result.toArray();
    expect(resArray).toEqual(polytree);
  });

  test('Convert an R integer atomic vector to JS', async () => {
    const polytree = [1, 1, 3, 8, 27, 91, 350, 1376];
    const result = (await webR.evalR('as.integer(c(1, 1, 3, 8, 27, 91, 350, 1376))')) as RInteger;
    const resJs = await result.toJs();
    expect(resJs.values).toEqual(polytree);
    expect(resJs.names).toEqual(null);
    expect(resJs.type).toEqual('integer');
    const resArray = await result.toArray();
    expect(resArray).toEqual(polytree);
  });

  test('Convert an R logical atomic vector to JS', async () => {
    const logical = [true, false, null];
    const result = (await webR.evalR('c(TRUE, FALSE, NA)')) as RLogical;
    const resJs = await result.toJs();
    expect(resJs.values).toEqual(logical);
    expect(resJs.names).toEqual(null);
    expect(resJs.type).toEqual('logical');
    const resArray = await result.toArray();
    expect(resArray).toEqual(logical);
  });

  test('Convert an R raw atomic vector to JS', async () => {
    const arr = [2, 4, 6];
    const result = (await webR.evalR('as.raw(c(2, 4, 6))')) as RRaw;
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
    const result = (await webR.evalR('c(2-7i, 1-8i)')) as RComplex;
    const resJs = await result.toJs();
    expect(resJs.values).toEqual(cmplx);
    expect(resJs.names).toEqual(null);
    expect(resJs.type).toEqual('complex');
  });

  test('Convert an R scalar double to JS number', async () => {
    const result = (await webR.evalR('1234')) as RDouble;
    expect(await result.toNumber()).toEqual(1234);
  });

  test('Convert an R scalar integer to JS number', async () => {
    const result = (await webR.evalR('as.integer(5678)')) as RInteger;
    expect(await result.toNumber()).toEqual(5678);
  });

  test('Convert an R scalar logical to JS', async () => {
    let result = (await webR.evalR('TRUE')) as RLogical;
    expect(await result.toBoolean()).toEqual(true);
    result = (await webR.evalR('FALSE')) as RLogical;
    expect(await result.toBoolean()).toEqual(false);
    result = (await webR.evalR('NA')) as RLogical;
    expect(await result.toArray()).toEqual([null]);
    await expect(result.toBoolean()).rejects.toThrow("Can't convert missing value");
  });

  test('Convert an R scalar raw to JS number', async () => {
    const result = (await webR.evalR('as.raw(255)')) as RRaw;
    expect(await result.toNumber()).toEqual(255);
  });

  test('Convert an R scalar complex to JS', async () => {
    const result = (await webR.evalR('c(-3+4i)')) as RComplex;
    expect(await result.toComplex()).toEqual({ re: -3, im: 4 });
  });

  test('Convert an R pairlist to depth 1', async () => {
    const result = (await webR.evalR('pairlist(pairlist(1))')) as RPairlist;
    let convert = await result.toJs();
    expect(isRObject(convert.values[0])).toEqual(false);
    convert = await result.toJs({ depth: 1 });
    expect(isRObject(convert.values[0])).toEqual(true);
  });

  test('Convert an R list to depth 1', async () => {
    const result = (await webR.evalR('list(list(1))')) as RList;
    let convert = await result.toJs();
    expect(isRObject(convert.values[0])).toEqual(false);
    convert = await result.toJs({ depth: 1 });
    expect(isRObject(convert.values[0])).toEqual(true);
  });
});

describe('Working with R environments', () => {
  test('Create an R environment', async () => {
    const env = (await webR.evalR('new.env()')) as REnvironment;
    expect(await env.toString()).toEqual('[object RObject:environment]');
  });

  test('List items in an R environment', async () => {
    const env = (await webR.evalR('x<-new.env();x$a=1;x$b=2;x$.c=3;x')) as REnvironment;
    let ls = await env.ls();
    expect(ls).toEqual(['a', 'b']);
    ls = await env.ls(true);
    expect(ls).toEqual(['.c', 'a', 'b']);
    ls = await env.names();
    expect(ls).toEqual(['.c', 'a', 'b']);
  });

  test('Get an item in an R environment', async () => {
    const env = (await webR.evalR('x<-new.env();x$a=1;x$b=2;x$.c=3;x')) as REnvironment;
    let value = (await env.getDollar('a')) as RDouble;
    expect(await value.toNumber()).toEqual(1);
    value = (await env.get('b')) as RDouble;
    expect(await value.toNumber()).toEqual(2);
    value = (await env.subset('.c')) as RDouble;
    expect(await value.toNumber()).toEqual(3);
  });

  test('Set an item in an R environment', async () => {
    const env = (await webR.evalR('new.env()')) as REnvironment;
    env.bind('a', 1);
    env.bind('b', 2);
    env.bind('.c', 3);
    let value = (await env.getDollar('a')) as RDouble;
    expect(await value.toNumber()).toEqual(1);
    value = (await env.get('b')) as RDouble;
    expect(await value.toNumber()).toEqual(2);
    value = (await env.subset('.c')) as RDouble;
    expect(await value.toNumber()).toEqual(3);
  });

  test('Convert an R environment to JS', async () => {
    const env = (await webR.evalR('x<-new.env();x$a=TRUE;x$b=FALSE;x$.c=NA;x')) as REnvironment;
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
    const env = (await webR.evalR('x<-new.env();x$a=TRUE;x$b=FALSE;x$.c=NA;x')) as REnvironment;
    let convert = await env.toJs();
    expect(isRObject(convert.values[0])).toEqual(false);
    convert = await env.toJs({ depth: 1 });
    expect(isRObject(convert.values[0])).toEqual(true);
  });

  test('Evaluating R code in an environment', async () => {
    const env = (await webR.evalR('x<-new.env();x$a=1;x$b=2;x$.c=3;x')) as REnvironment;
    const value = (await webR.evalR('b', { env })) as RDouble;
    expect(await value.toNumber()).toEqual(2);
  });
});

describe('Invoking RFunction objects', () => {
  test('Execute an R function with JS arguments', async () => {
    const choose = (await webR.evalR('choose')) as RFunction;
    const result = (await choose.exec(7, 5)) as RInteger;
    expect(await result.toNumber()).toBe(21);
  });

  test('Execute an R function with RProxy arguments', async () => {
    const factorial = (await webR.evalR('factorial')) as RFunction;
    const four = await webR.evalR('4');
    const result = (await factorial.exec(four)) as RInteger;
    expect(await result.toNumber()).toBe(24);
  });

  test('Pass JS booleans as R logical arguments', async () => {
    const c = (await webR.evalR('c')) as RFunction;
    const logical = (await c.exec(true, [true, false])) as RLogical;
    expect(await logical.toArray()).toEqual([true, true, false]);
  });

  test('Pass JS number as R double arguments', async () => {
    const c = (await webR.evalR('c')) as RFunction;
    const double = (await c.exec(3.0, [3.1, 3.14])) as RDouble;
    expect(await double.toArray()).toEqual([3.0, 3.1, 3.14]);
  });

  test('Pass JS object as R complex arguments', async () => {
    const c = (await webR.evalR('c')) as RFunction;
    const cmplx = (await c.exec({ re: 1, im: 2 }, { re: -3, im: -4 })) as RComplex;
    expect(await cmplx.toArray()).toEqual([
      { re: 1, im: 2 },
      { re: -3, im: -4 },
    ]);
  });

  test('Pass JS string as R character arguments', async () => {
    const c = (await webR.evalR('c')) as RFunction;
    const cmplx = (await c.exec('Hello', ['World', '!'])) as RComplex;
    expect(await cmplx.toArray()).toEqual(['Hello', 'World', '!']);
  });
});

describe('Reject incorrect object types during R object construction', () => {
  test('Reject incorrect type in RCharacter', async () => {
    const incorrect = new webR.RCharacter(webR.objs.null);
    await expect(incorrect).rejects.toThrow('Unexpected object type');
  });

  test('Reject incorrect type in RComplex', async () => {
    const incorrect = new webR.RComplex(webR.objs.null);
    await expect(incorrect).rejects.toThrow('Unexpected object type');
  });

  test('Reject incorrect type in RDouble', async () => {
    const incorrect = new webR.RDouble(webR.objs.null);
    await expect(incorrect).rejects.toThrow('Unexpected object type');
  });

  test('Reject incorrect type in REnvironment', async () => {
    const incorrect = new webR.REnvironment(webR.objs.null);
    await expect(incorrect).rejects.toThrow('Unexpected object type');
  });

  test('Reject incorrect type in RInteger', async () => {
    const incorrect = new webR.RInteger(webR.objs.null);
    await expect(incorrect).rejects.toThrow('Unexpected object type');
  });

  test('Reject incorrect type in RList', async () => {
    const incorrect = new webR.RList(webR.objs.null);
    await expect(incorrect).rejects.toThrow('Unexpected object type');
  });

  test('Reject incorrect type in RLogical', async () => {
    const incorrect = new webR.RLogical(webR.objs.null);
    await expect(incorrect).rejects.toThrow('Unexpected object type');
  });

  test('Reject incorrect type in RPairlist', async () => {
    const incorrect = new webR.RPairlist(webR.objs.null);
    await expect(incorrect).rejects.toThrow('Unexpected object type');
  });

  test('Reject incorrect type in RRaw', async () => {
    const incorrect = new webR.RRaw(webR.objs.null);
    await expect(incorrect).rejects.toThrow('Unexpected object type');
  });

  test('Reject incorrect type in RString', async () => {
    const incorrect = new webR.RString(webR.objs.null);
    await expect(incorrect).rejects.toThrow('Unexpected object type');
  });

  test('Reject incorrect type in RSymbol', async () => {
    const incorrect = new webR.RSymbol(webR.objs.null);
    await expect(incorrect).rejects.toThrow('Unexpected object type');
  });
});

describe('Garbage collection', () => {
  test('Protect and release R objects', async () => {
    const gc = (await webR.evalR('gc')) as RFunction;
    await gc.exec(false, false, true);
    const before = await ((await gc.exec(false, false, true)) as RDouble).toTypedArray();

    const mem = await webR.evalR('rnorm(10000,1,1)');
    const during = await ((await gc.exec(false, false, true)) as RDouble).toTypedArray();

    webR.destroy(mem);
    const after = await ((await gc.exec(false, false, true)) as RDouble).toTypedArray();

    expect(during[0]).toBeGreaterThan(before[0]);
    expect(during[1]).toBeGreaterThan(before[1]);

    expect(after[0]).toBeLessThan(during[0]);
    expect(after[1]).toBeLessThan(during[1]);
  });

  test('Objects are protected and destroyed', async () => {
    const size = await webR.globalShelter.size();

    const x = await webR.evalR('1');
    const y = await webR.evalR('1');
    expect(await webR.globalShelter.size()).toEqual(size + 2);

    await webR.destroy(x);
    expect(await webR.globalShelter.size()).toEqual(size + 1);

    await webR.globalShelter.destroy(y);
    expect(await webR.globalShelter.size()).toEqual(size);

    await expect(webR.destroy(x)).rejects.toThrow("Can't find object in shelter");
  });

  test('Objects managed in shelter', async () => {
    const globalSize = await webR.globalShelter.size();

    const shelter = await new webR.Shelter();
    expect(await shelter.size()).toEqual(0);

    const x = await shelter.evalR('1');
    const y = await shelter.evalR('1');
    expect(await shelter.size()).toEqual(2);
    expect(await webR.globalShelter.size()).toEqual(globalSize);

    await shelter.destroy(x);
    expect(await shelter.size()).toEqual(1);

    await shelter.destroy(y);
    expect(await shelter.size()).toEqual(0);

    await expect(shelter.destroy(x)).rejects.toThrow("Can't find object in shelter");

    const objs = await Promise.all([
      new shelter.RObject(true),
      new shelter.RLogical(true),
      new shelter.RInteger(1),
      new shelter.RDouble(1),
      new shelter.RCharacter('foo'),
      new shelter.RComplex({ re: 1, im: 1 }),
      new shelter.RRaw(1),
      new shelter.RList(1),
      new shelter.RPairlist(1),
      new shelter.REnvironment({ x: 1 }),
      new shelter.RSymbol('foo'),
      new shelter.RString('foo'),
      new shelter.RCall('foo')
    ]);
    expect(await shelter.size()).toEqual(objs.length);

    for (const obj of objs) {
      await shelter.destroy(obj);
    }
    expect(await shelter.size()).toEqual(0);
  });

  test('Shelter.CaptureR() protects', async () => {
    const shelter = await new webR.Shelter();

    let out = await shelter.captureR('1');
    expect(await shelter.size()).toEqual(1);

    await shelter.destroy(out.result);
    expect(await shelter.size()).toEqual(0);

    out = await shelter.captureR('message("foo")');
    expect(await shelter.size()).toEqual(2);

    await shelter.destroy(out.result);

    const output = out.output as { type: string; data: RObject }[];
    await shelter.destroy(output[0].data);
    expect(await shelter.size()).toEqual(0);
  });

  test('Can purge shelters', async () => {
    const shelter = await new webR.Shelter();

    await shelter.captureR('1');
    await shelter.captureR('1');
    expect(await shelter.size()).toEqual(2);

    await shelter.purge();
    expect(await shelter.size()).toEqual(0);
  });
});

afterAll(() => {
  return webR.close();
});
