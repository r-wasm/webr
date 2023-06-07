import { IN_NODE } from './compat';
import { WebR, WebROptions } from './webr-main';

export interface ConsoleCallbacks {
  stdout?: (line: string) => void;
  stderr?: (line: string) => void;
  prompt?: (line: string) => void;
  canvasExec?: (line: string) => void;
}

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
 * R code can be sent as input by calling the ``stdin`` method with a single
 * line of textual input.
 *
 * A long running R computation can be interrupted by calling the `interrupt`
 * method.
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
 * Once constructed, start the Console using the ``run`` method. The `run`
 * method starts an asynchronous infinite loop that waits for output from the
 * webR worker and then calls the relevant callbacks.
 */
export class Console {
  /** The supporting instance of webR */
  webR: WebR;
  /**
   * A HTML canvas element
   *
   * The canvas graphics device writes to this element by default. Undefined
   * when HTML canvas is unsupported.
   */
  canvas: HTMLCanvasElement | undefined;
  /** Called when webR outputs to ``stdout`` */
  #stdout: (line: string) => void;
  /** Called when webR outputs to ``stderr`` */
  #stderr: (line: string) => void;
  /** Called when webR prompts for input */
  #prompt: (line: string) => void;
  /** Called when webR writes to the HTML canvas element */
  #canvasExec: (line: string) => void;

  /**
   * @param {ConsoleCallbacks} callbacks A list of webR Console callbacks to
   * be used for this console.
   * @param {WebROptions} options The options to use for the new instance of
   * webR started to support this console.
   */
  constructor(
    callbacks: ConsoleCallbacks = {},
    options: WebROptions = {
      REnv: {
        R_HOME: '/usr/lib/R',
        FONTCONFIG_PATH: '/etc/fonts',
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
   * @param {string} input A line of input text.
   */
  stdin(input: string) {
    this.webR.writeConsole(input);
  }

  /**
   * Interrupt a long running R computation and return to the prompt
   */
  interrupt() {
    this.webR.interrupt();
  }

  /**
   * The default function called when webR outputs to ``stdout``
   * @param {string} text The line sent to stdout by webR.
   */
  #defaultStdout = (text: string) => {
    console.log(text);
  };

  /**
   * The default function called when webR outputs to ``stderr``
   * @param {string} text The line sent to stderr by webR.
   */
  #defaultStderr = (text: string) => {
    console.error(text);
  };

  /**
   * The default function called when webR writes out a prompt
   * @param {string} text The text content of the prompt.
   */
  #defaultPrompt = (text: string) => {
    const input = prompt(text);
    if (input) this.stdin(`${input}\n`);
  };

  /**
   * The default function called when webR writes to HTML canvas
   * @param {string} exec The canvas API command as a text string.
   */
  #defaultCanvasExec = (exec: string) => {
    if (IN_NODE) {
      throw new Error('Plotting with HTML canvas is not yet supported under Node');
    }
    Function(`this.getContext('2d').${exec}`).bind(this.canvas)();
  };

  /**
   * Start the webR console
   */
  run() {
    this.#run();
  }

  /*
   * Start the asynchronous infinite loop
   *
   * This loop waits for output from webR and dispatches callbacks based on the
   * message recieved.
   *
   * The promise returned by this asynchronous function resolves only once the
   * webR communication channel has closed.
   */
  async #run() {
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
        case 'closed':
          return;
        default:
          console.warn(`Unhandled output type for webR Console: ${output.type}.`);
      }
    }
  }
}
