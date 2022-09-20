import { IN_NODE } from '../webR/compat';
import { WebR, WebROptions } from '../webR/webr-main';

/**
 * @callback ConsoleCallback
 * @param {string} text
 * @return {void}
 */

/**
 * Text-based Interactive Console for WebR
 *
 * A helper application to assist in creating an interactive R REPL based on
 * JavaScript callbacks.
 *
 * Callback functions ``stdout`` and ``stderr`` are called with a single line
 * of output as the first argument. The default implementation of `stdout` and
 * `stderr` writes to the console using `console.log` and `console.error`.
 *
 * R code should input by calling the ``stdin`` method with a single line of
 * textual input.
 *
 * The ``prompt`` callback function is called when webR produces a prompt at
 * the REPL console and is therefore awaiting user input. The prompt character
 * (usually ``>`` or ``+``) is given as the first argument to the callback
 * function. The default implementation of `prompt` shows a JavaScript prompt
 * asking the user for input, and then sends the user input to `stdin`.
 *
 * The ``canvasExec`` callback function is called when webR writes plots to
 * the built-in HTML canvas graphics device.
 *
 * Once constructed, start the Console using the ``run`` method. This method
 * returns a promise than never resolves. The `run` method consists of an
 * asynchronous infinite loop that waits for output from the webR worker and
 * then calls the relevant callbacks.
 *
 * @class
 * @property {WebR} webR The supporting instance of webR.
 * @property {ConsoleCallback} stdout Called when webR outputs to ``stdout``.
 * @property {ConsoleCallback} stderr Called when webR outputs to ``stderr``.
 * @property {ConsoleCallback} prompt Called when webR prompts for input.
 * @property {ConsoleCallback} canvasExec Called when webR writes to the HTML
 * canvas element.
 * @property {HTMLCanvasElement} canvas The HTML canvas element written to
 * by default.
 */
export class Console {
  webR: WebR;
  canvas: HTMLCanvasElement | undefined;
  #stdout;
  #stderr;
  #prompt;
  #canvasExec;

  /**
   * @constructor
   * @param {Object} callbacks
   * @param {ConsoleCallback} callbacks.stdout Called when webR outputs
   * to stdout.
   * @param {ConsoleCallback} callbacks.stderr Called when webR outputs
   * to stderr.
   * @param {ConsoleCallback} callbacks.prompt Called when webR prompts
   * for input.
   * @param {ConsoleCallback} callbacks.canvasExec Called when webR writes
   * to HTML canvas.
   * @param {WebROptions} options The options for the new webR instance.
   */
  constructor(
    callbacks: {
      stdout?: (text: string) => void;
      stderr?: (text: string) => void;
      prompt?: (text: string) => void;
      canvasExec?: (text: string) => void;
    } = {},
    options: WebROptions = {
      REnv: {
        R_HOME: '/usr/lib/R',
        R_ENABLE_JIT: '0',
        R_DEFAULT_DEVICE: 'canvas',
      },
    }
  ) {
    this.webR = new WebR(options);
    if (!IN_NODE) {
      this.canvas = document.createElement('canvas');
      this.canvas.setAttribute('width', '1008');
      this.canvas.setAttribute('height', '1008');
    }
    this.#stdout = callbacks.stdout || this.#defaultStdout;
    this.#stderr = callbacks.stderr || this.#defaultStderr;
    this.#prompt = callbacks.prompt || this.#defaultPrompt;
    this.#canvasExec = callbacks.canvasExec || this.#defaultCanvasExec;
  }

  /**
   * Write a line of input to webR's REPL through ``stdin``
   * @param {string} input - A line of input text
   */
  stdin(input: string) {
    this.webR.writeConsole(input + '\n');
  }

  /**
   * The default function called when webR outputs to ``stdout``
   * @param {string} text - The line sent to stdout by webR
   */
  #defaultStdout = (text: string) => {
    console.log(text);
  };

  /**
   * The default function called when webR outputs to ``stderr``
   * @param {string} text - The line sent to stderr by webR
   */
  #defaultStderr = (text: string) => {
    console.error(text);
  };

  /**
   * The default function called when webR writes out a prompt
   * @param {string} text - The text content of the prompt
   */
  #defaultPrompt = (text: string) => {
    const input = prompt(text);
    if (input) this.stdin(`${input}\n`);
  };

  /**
   * The default function called when webR writes to HTML canvas
   * @param {string} exec - The canvas API command as a text string
   */
  #defaultCanvasExec = (exec: string) => {
    if (IN_NODE) {
      throw new Error('Plotting with HTML canvas is not yet supported under Node');
    }
    Function(`this.getContext('2d').${exec}`).bind(this.canvas)();
  };

  /**
   * Start the webR console
   *
   * Start the infinite loop waiting for output from webR and dispatching
   * callbacks based on the message recieved.
   *
   * The promise returned by this asynchronous function never resolves.
   */
  async run() {
    for (;;) {
      const output = await this.webR.read();
      switch (output.type) {
        case 'stdout':
          this.#stdout(output.data as string);
          break;
        case 'stderr':
          this.#stderr(output.data as string);
          break;
        case 'prompt':
          this.#prompt(output.data as string);
          break;
        case 'canvasExec':
          this.#canvasExec(output.data as string);
          break;
        default:
          console.warn(`Unhandled output type for webR Console: ${output.type}.`);
      }
    }
  }
}
