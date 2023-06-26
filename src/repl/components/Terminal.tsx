import React from "react";
import { Terminal as XTerminal } from 'xterm';
import { Readline } from 'xterm-readline';
import { FitAddon } from 'xterm-addon-fit';
import { TerminalInterface } from '../App';
import { WebR } from "../../webR/webr-main";
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

  React.useEffect(() => {
    if (!divRef.current) return;
    divRef.current.addEventListener('keydown', handleCtrlC, true);

    return () => {
      divRef.current!.removeEventListener('keydown', handleCtrlC);
    };
  }, [handleCtrlC]);

  React.useEffect(() => {
    if (!divRef.current || termRef.current) return;
  
    const term = new XTerminal({
      theme: {
        background: "#FFFFFF",
        foreground: "#000000",
        cursor: "#000000",
        selectionBackground: "#9999CC",
      },
      screenReaderMode: true,
    });
    term.write('webR is downloading, please wait...');
  
    const fitAddon = new FitAddon();
    const readline = new Readline();
    readline.setCtrlCHandler(() => webR.interrupt());
    setReadline(readline);

    term.loadAddon(fitAddon);
    term.loadAddon(readline);
    term.open(divRef.current);
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

  React.useEffect(() => {
    if (!readline) return;

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

  return <div ref={divRef} className='term'></div>;
}

export default Terminal;
