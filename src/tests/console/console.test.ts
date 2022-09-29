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
    WEBR_URL: '../dist/',
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

afterAll(() => {
  return con.webR.close();
});
