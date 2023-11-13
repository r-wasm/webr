import React from 'react';
import { Terminal as XTerminal } from 'xterm';
import { Readline } from 'xterm-readline';
import { FitAddon } from 'xterm-addon-fit';
import { TerminalInterface } from '../App';
import { WebR } from '../../webR/webr-main';
import 'xterm/css/xterm.css';

export function Terminal({
  webR,
  terminalInterface,
}: {
  webR: WebR;
  terminalInterface: TerminalInterface;
}) {
  const divRef = React.useRef<HTMLDivElement | null>(null);
  const termRef = React.useRef<XTerminal | null>(null);
  const [readline, setReadline] = React.useState<Readline>();

  const handleCtrlC = React.useCallback((event: KeyboardEvent) => {
    if (event.key === 'c' && event.ctrlKey) {
      webR.interrupt();
    }
  }, []);

  // Handle ctrl-c here so that code executed by the Editor can be interrupted
  React.useEffect(() => {
    divRef.current!.addEventListener('keydown', handleCtrlC, true);
    return () => {
      divRef.current!.removeEventListener('keydown', handleCtrlC);
    };
  }, [handleCtrlC]);

  React.useEffect(() => {
    // Don't reinitialise XTerminal after an instance has been created
    if (termRef.current || !divRef.current) {
      return;
    }

    const term = new XTerminal({
      theme: {
        background: '#FFF',
        foreground: '#111',
        cursor: '#111',
        selectionBackground: '#99C',
      },
      screenReaderMode: true,
    });
    term.write('webR is downloading, please wait...');

    const fitAddon = new FitAddon();
    const readline = new Readline();
    setReadline(readline);

    term.loadAddon(fitAddon);
    term.loadAddon(readline);
    term.open(divRef.current);
    term.element?.setAttribute('aria-label', 'R Terminal');
    fitAddon.fit();

    const resizeObserver = new ResizeObserver(() => {
      (async () => {
        await webR.init();
        const dims = fitAddon.proposeDimensions();
        await webR.evalRVoid(`options(width=${dims ? dims.cols : 80})`);
      })();
      fitAddon.fit();
    });
    resizeObserver.observe(divRef.current);

    termRef.current = term;
  }, []);

  /*
   * Setup an interface so that other components can read from and write to this
   * component's xterm instance.
   */
  React.useEffect(() => {
    if (!readline){
      return;
    }

    terminalInterface.println = (msg: string) => {
      readline.println(msg);
    };

    terminalInterface.write = (msg: string) => {
      readline.write(msg);
    };

    terminalInterface.read = async (prompt: string) => {
      return readline.read(prompt);
    };
  }, [readline, terminalInterface]);

  return <div
    role="region"
    aria-label="Terminal Pane"
    ref={divRef}
    className='term'
  ></div>;
}

export default Terminal;
