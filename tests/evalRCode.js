const fs = require('fs/promises');
const { Worker } = require('node:worker_threads');

globalThis.Worker = Worker;

(async () => {
	let args = process.argv;
	args.splice(0, 3);
	let l = 0;

	const { WebR } = require(`../dist/webr.js`);
	const webR = new WebR({
			RArgs: args,
	});
	await webR.init();
  let r;

    try {
    // RObjNull
    r = await webR.evalRCode('NULL');
    console.log(await r.toString());
    console.log(await r.type);
    console.log(await r.isNull());
    console.log(await r.toJs());

    // RObjSymbol
    r = await webR.evalRCode('as.symbol("x")');
    console.log(await r.toString());
    console.log(await r.type);
    console.log(await r.isNull());
    console.log(await (await r.printname()).toJs());
    console.log(await (await r.symvalue()).toJs());
    console.log(await (await r.internal()).toJs());
    console.log(await r.toJs());

    // RObjPairlist
    r = await webR.evalRCode('as.pairlist(list(a=1,b=2,c=3))');
    console.log(await r.toString());
    console.log(await r.type);
    console.log(await r.includes('a'));
    console.log(await r.includes('d'));
    console.log(await (await r.car()).toJs());
    console.log(await (await r.cdr()).toJs());
    console.log(await (await r.tag()).toJs());
    console.log(await (await r.get('a')).toJs());
    console.log(await (await r.subset('b')).toJs());
    console.log(await (await r.getDollar('c')).toJs());
    await r.setcar(await webR.evalRCode('"Hello, "'));
    r['b'] = (await webR.evalRCode('"world!"'));
    await webR.ready();
    console.log(await r.toJs());
    r = await webR.evalRCode('quote(foo(bar = NULL))');
    console.log(await r.includes('bar'));
    console.log(await r.includes('baz'));

    // RObjList
    r = await webR.evalRCode('list(a=4,b=5,c=6)');
    console.log(await r.toString());
    console.log(await r.type);
    console.log(await r.length);
    console.log(await r.includes('a'));
    console.log(await r.includes('d'));
    console.log(await r.toJs());
    console.log(await r.toArray());
    console.log(await (await r.get('a')).toJs());
    console.log(await (await r.subset('b')).toJs());
    console.log(await (await r.getDollar('c')).toJs());

    // RObjFunction
    r = await webR.evalRCode('sin');
    console.log(await r.toString());
    console.log(await (await r([0.05, 0.1, 0.2])).toJs());
    console.log(await (await r.exec([0.3, 0.4, 0.5])).toJs());
    r = await webR.evalRCode('besselJ');
    console.log(await (await r(
      (await webR.evalRCode('20')),
      (await webR.evalRCode('5'))
    )).toJs());

    // RObjString
    r = await webR.evalRCode('as.symbol("x")');
    r = await r.printname();
    console.log(await r.toString());
    console.log(await r.type);
    console.log(await r.toJs());

    // RObjEnv
    r = await webR.evalRCode('e = new.env(); e$x = 42; e$y = 43; e$.hidden = 44; e');
    console.log(await r.toString());
    console.log(await r.type);
    console.log(await r.ls());
    console.log(await r.names());
    console.log(await (await r.frame()).toJs());
    console.log(await r.includes('x'));
    console.log(await r.includes('.hidden'));
    console.log(await r.includes('a'));
    console.log(await (await r.get('y')).toJs());
    r['b'] = (await webR.evalRCode('3.1415'));
    await webR.ready();
    console.log(await r.toJs());

    // RObjLogical
    r = await webR.evalRCode('c(TRUE, FALSE, NA, NULL)');
    console.log(await r.toString());
    console.log(await r.type);
    console.log(await r.length);
    console.log(await r.toJs());
    r = await webR.evalRCode('c(x=TRUE, y=FALSE, z=NA, w=NULL)');
    console.log(await r.toJs());
    console.log(await r.names());
    console.log(await r.toArray());
    console.log(await r.toObject());
    console.log(await r.getLogical(1));
    console.log(await r.getLogical(2));
    console.log(await r.getLogical(3));
    r['y'] = true;
    await webR.ready();
    r[3] = true;
    await webR.ready();
    console.log(await r.toJs());
    r = await webR.evalRCode('TRUE');
    console.log(await r.toLogical());

    // RObjInt
    r = await webR.evalRCode('c(as.integer(1), as.integer(2), as.integer(3))');
    console.log(await r.toString());
    console.log(await r.type);
    console.log(await r.length);
    console.log(await r.toJs());
    r = await webR.evalRCode('c(x=as.integer(1), y=as.integer(2), z=as.integer(3))');
    console.log(await r.toJs());
    console.log(await r.names());
    console.log(await r.toArray());
    console.log(await r.toObject());
    console.log(await r.getNumber(1));
    console.log(await r.getNumber(2));
    console.log(await r.getNumber(3));
    r['y'] = 4;
    await webR.ready();
    r[3] = 4;
    await webR.ready();
    console.log(await r.toJs());
    r = await webR.evalRCode('as.integer(4)');
    console.log(await r.toNumber());

    // RObjReal
    r = await webR.evalRCode('c(4,5,6)');
    console.log(await r.toString());
    console.log(await r.type);
    console.log(await r.length);
    console.log(await r.toJs());
    r = await webR.evalRCode('c(x=4, y=5, z=6)');
    console.log(await r.toJs());
    console.log(await r.names());
    console.log(await r.toArray());
    console.log(await r.toObject());
    console.log(await r.getNumber(1));
    console.log(await r.getNumber(2));
    console.log(await r.getNumber(3));
    r['y'] = 7;
    await webR.ready();
    r[3] = 7;
    await webR.ready();
    console.log(await r.toJs());
    r = await webR.evalRCode('7');
    console.log(await r.toNumber());

    // RObjComplex
    r = await webR.evalRCode('c(8+9i,10-11i,-12+13i)');
    console.log(await r.toString());
    console.log(await r.type);
    console.log(await r.length);
    console.log(await r.toJs());
    r = await webR.evalRCode('c(x=8+9i, y=10-11i, z=-12+13i)');
    console.log(await r.toJs());
    console.log(await r.names());
    console.log(await r.toArray());
    console.log(await r.toObject());
    console.log(await r.getComplex(1));
    console.log(await r.getComplex(2));
    console.log(await r.getComplex(3));
    r['y'] = { re: 1, im: 1 };
    await webR.ready();
    r[3] = { re: 1, im: 1 };
    await webR.ready();
    console.log(await r.toJs());
    r = await webR.evalRCode('14+0i');
    console.log(await r.toComplex());

    // RObjCharacter
    r = await webR.evalRCode('c("a", "b", "c")');
    console.log(await r.type);
    console.log(await r.length);
    console.log(await r.toJs());
    r = await webR.evalRCode('c(x="a", y="b", z="c")');
    console.log(await r.toJs());
    console.log(await r.names());
    console.log(await r.toObject());
    console.log(await r.getString(1));
    console.log(await r.getString(2));
    console.log(await r.getString(3));
    r['y'] = "Hello,";
    await webR.ready();
    r[3] = "world!";
    await webR.ready();
    console.log(await r.toJs());
    r = await webR.evalRCode('"abc"');
    console.log(await r.toString());

    // RObjRaw
    r = await webR.evalRCode('c(as.raw(255), as.raw(254), as.raw(253))');
    console.log(await r.toString());
    console.log(await r.type);
    console.log(await r.length);
    console.log(await r.toJs());
    r = await webR.evalRCode('c(a=as.raw(255), b=as.raw(254), c=as.raw(253))');
    console.log(await r.toJs());
    console.log(await r.names());
    console.log(await r.toArray());
    console.log(await r.toObject());
    console.log(await r.getNumber(1));
    console.log(await r.getNumber(2));
    console.log(await r.getNumber(3));
    r['b'] = await webR.evalRCode('as.raw(54)');
    await webR.ready();
    r[3] = await webR.evalRCode('as.raw(55)');
    await webR.ready();
    console.log(await r.toJs());
    r = await webR.evalRCode('as.raw(50)');
    console.log(await r.toNumber());
  } catch (e) {
    console.error(e);
  }
  process.exit();
 })();
