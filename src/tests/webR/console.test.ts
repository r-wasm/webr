import { Console } from '../../webR/webr-main';
import { promiseHandles } from '../../webR/utils';

const stdout = jest.fn();
const stderr = jest.fn();
const prompt = jest.fn();

let waitForPrompt = promiseHandles();
const con = new Console(
  {
    stdout: stdout,
    stderr: stderr,
    prompt: (line: string) => waitForPrompt.resolve(prompt(line)),
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
