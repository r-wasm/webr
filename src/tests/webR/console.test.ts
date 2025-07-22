import { Console } from '../../webR/webr-main';
import { promiseHandles } from '../../webR/utils';

const stdout = jest.fn();
const stderr = jest.fn();
const canvasNewPage = jest.fn();
const canvasImage = jest.fn();
const prompt = jest.fn();

let waitForPrompt = promiseHandles();
const con = new Console(
  {
    stdout,
    stderr,
    canvasNewPage,
    canvasImage,
    prompt: (line: string) => {
      prompt(line);
      waitForPrompt.resolve();
    }
  },
  {
    baseUrl: '../dist/',
  }
);
con.run();

test('Start up the REPL and wait for user input prompt', async () => {
  await con.webR.init();
  expect(stdout).toHaveBeenCalledWith('Platform: wasm32-unknown-emscripten (32-bit)');
  expect(prompt).toHaveBeenCalledWith('> ');
});

test('Take input and write to stdout', async () => {
  waitForPrompt = promiseHandles();
  con.stdin('42');
  await waitForPrompt.promise;
  expect(stdout).toHaveBeenCalledWith('[1] 42');
});

test('Generate an error message and write to stdout', async () => {
  waitForPrompt = promiseHandles();
  con.stdin(';');
  await waitForPrompt.promise;
  expect(stderr).toHaveBeenCalledWith('Error: unexpected \';\' in ";"');
});

test('HTML canvas events call console callbacks', async () => {
  // Mock the OffscreenCanvas interface for testing under Node
  await con.webR.evalRVoid(`
    webr::eval_js("
      class OffscreenCanvas {
        constructor() {}
        getContext() {
          return {
            arc: () => {},
            beginPath: () => {},
            clearRect: () => {},
            clip: () => {},
            setLineDash: () => {},
            rect: () => {},
            restore: () => {},
            save: () => {},
            stroke: () => {},
          };
        }
        transferToImageBitmap() {
          // No ImageBitmap, create a transferable ArrayBuffer in its place
          return new ArrayBuffer(8);
        }
      }
      globalThis.OffscreenCanvas = OffscreenCanvas;
      undefined;
    ")
  `);

  waitForPrompt = promiseHandles();
  con.stdin(`
    options(device = webr::canvas)
    plot.new()
    points(0)
  `);
  await waitForPrompt.promise;
  expect(canvasNewPage).toHaveBeenCalled();
  expect(canvasImage).toHaveBeenCalled();
});

describe('Interrupt execution', () => {
  test('Interrupt R code executed using the main R REPL', async () => {
    waitForPrompt = promiseHandles();
    con.stdin('while(TRUE){}');
    con.interrupt();
    // A new prompt will appear only if the infinite loop is successfully interrupted
    await waitForPrompt.promise;
    expect(prompt).toHaveBeenCalledWith('> ');
  });

  test('Interrupt webr::eval_js executed using the main R REPL', async () => {
    waitForPrompt = promiseHandles();
    con.stdin('webr::eval_js("globalThis.Module.webr.readConsole()")');
    con.interrupt();
    // A new prompt will appear only if the infinite loop is successfully interrupted
    await waitForPrompt.promise;
    expect(prompt).toHaveBeenCalledWith('> ');
  });
});

afterAll(() => {
  return con.webR.close();
});
