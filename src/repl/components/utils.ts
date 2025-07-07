// Originally from src/Components/codeMirror/utils.ts in rstudio/shinylive
// MIT License - Copyright (c) 2022 RStudio, PBC

import { Text } from '@codemirror/state';
import { EditorView } from '@codemirror/view';

export type CursorPosition = { line: number; col: number };

export function offsetToPosition(cmDoc: Text, offset: number): CursorPosition {
  const line = cmDoc.lineAt(offset);
  return { line: line.number, col: offset - line.from };
}

export function positionToOffset(cmDoc: Text, pos: CursorPosition): number {
  const line = cmDoc.line(pos.line);
  // Try go to the next computed position (line.from + pos.col), but don't go
  // past the end of the line (line.to).
  const newOffset = Math.min(line.from + pos.col, line.to);

  // If the new offset is beyond the end of the document, just go to the end.
  if (newOffset > cmDoc.length) {
    return cmDoc.length;
  }
  return newOffset;
}

export function getSelectedText(cmView: EditorView): string {
  const cmState = cmView.state;
  return cmState.sliceDoc(
    cmState.selection.main.from,
    cmState.selection.main.to
  );
}

export function getCurrentLineText(cmView: EditorView): string {
  const cmState = cmView.state;
  const offset = cmState.selection.main.head;
  const pos = offsetToPosition(cmState.doc, offset);
  const lineText = cmState.doc.line(pos.line).text;
  return lineText;
}

export function moveCursorToNextLine(cmView: EditorView): void {
  const cmState = cmView.state;
  const offset = cmState.selection.main.head;
  const pos = offsetToPosition(cmState.doc, offset);
  pos.line += 1;

  // Don't go past the bottom
  if (pos.line > cmState.doc.lines) {
    return;
  }

  const nextLineOffset = positionToOffset(cmState.doc, pos);
  cmView.dispatch({ selection: { anchor: nextLineOffset } });
}

export function decodeTextOrBinaryContent(data: Uint8Array): string {
  try {
    // Get file content, dealing with backspace characters until none remain
    let text = new TextDecoder("utf-8", { fatal: true }).decode(data);
    while (text.match(/.[\b]/)) {
      text = text.replace(/.[\b]/g, '');
    }
    return text;
  } catch (err) {
    // Deal with binary data
    if (!(err instanceof TypeError)) throw err;
    return `<< ${data.byteLength} bytes of binary data >>`;
  }
}
