import { WebRChannelError } from '../error';
import { ChannelWorker } from './channel';
import { Message } from './message';
import { Module } from '../emscripten';
import { EmbeddedCallbacks } from '../webr-worker';

export class EmbeddedChannel implements ChannelWorker {
  #emptyLine = 0;
  #stdout: EmbeddedCallbacks['stdout'];
  #stderr: EmbeddedCallbacks['stderr'];
  #canvasImage: EmbeddedCallbacks['canvasImage'];
  resolve;

  constructor(resolve: () => void, callbacks: EmbeddedCallbacks) {
    this.resolve = resolve;
    this.#stdout = callbacks.stdout;
    this.#stderr = callbacks.stderr;
    this.#canvasImage = callbacks.canvasImage;
  }

  // Request dispatch is not used with the embedded channel
  setDispatchHandler() {}

  // No support for interrupting R code
  setInterrupt() {}
  handleInterrupt() {}

  // No support for stdin, if R asks for input just return an empty line
  inputOrDispatch() {
    return this.#emptyLine;
  }

  read(): Message {
    throw new WebRChannelError(
      'Reading from the main thread is not possible with the embedded webR channel.'
    );
  }

  // Execute the R wasm binary, but do not start the R REPL
  run(_args: string[]){
    const args: string[] = _args || [];
    args.unshift('R');
    const argc = args.length;
    const argv = Module._malloc(4 * (argc + 1));
    args.forEach((arg, idx) => {
      const argvPtr = argv + 4 * idx;
      const argPtr = Module.allocateUTF8(arg);
      Module.setValue(argvPtr, argPtr, '*');
    });
    this.#emptyLine = Module.allocateUTF8('\n');
    Module._Rf_initialize_R(argc, argv);
    Module._setup_Rmainloop();

    // Signal that webR is ready to use
    Module.webr.resolveInit();
  }

  // Handle webR output messages using the provided callbacks.
  write(msg: Message) {
    this.#handleMessages(msg);
  }

  writeSystem(msg: Message) {
    this.#handleMessages(msg);
  }

  #handleMessages(msg: Message) {
    switch(msg.type) {
      case 'stdout':
      case 'console.log':
        this.#stdout(msg.data as string);
        break;
      case 'stderr':
      case 'console.error':
      case 'console.warn':
        this.#stderr(msg.data as string);
        break;
      case 'canvasImage':
        this.#canvasImage(msg.data.image as ImageBitmap);
        break;
      default:
        throw new WebRChannelError(
          `Unhandled message type in embedded webR channel '${msg.type}'`
        );
    }
  }
}
