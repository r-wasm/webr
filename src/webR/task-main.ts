// Original code from Synclink and Comlink. Released under Apache 2.0.

import { Endpoint,
         SZ_BUF_FITS_IDX,
         SZ_BUF_SIZE_IDX,
         generateUUID,
         WireValue } from './task-common'
import { sleep } from './utils'

let encoder = new TextEncoder();

/**
 * Respond to a blocking request. Most of the work has already been done in
 * asynclink, we are just responsible here for getting the return value back to
 * the requester through this slightly convoluted Atomics protocol.
 *
 * @param endpoint A message port to receive messages from. Other thread is
 *        blocked, so we can't send messages back.
 * @param msg The message that was recieved. We will use it to read out the
 *        buffers to write the answer into. NOTE: requester owns buffers.
 * @param returnValue The value we want to send back to the requester. We have
 *        to encode it into data_buffer.
 */
export async function syncResponse(
  endpoint: Endpoint,
  msg: any,
  returnValue: WireValue
) {
  try {
    let { size_buffer, data_buffer, signal_buffer, taskId } = msg;
    // console.warn(msg);

    let bytes = encoder.encode(JSON.stringify(returnValue));
    let fits = bytes.length <= data_buffer.length;

    Atomics.store(size_buffer, SZ_BUF_SIZE_IDX, bytes.length);
    Atomics.store(size_buffer, SZ_BUF_FITS_IDX, +fits);
    if (!fits) {
      // console.log("      need larger buffer", taskId)
      // Request larger buffer
      let [uuid, data_promise] = requestResponseMessage(endpoint);

      // Write UUID into data_buffer so syncRequest knows where to respond to.
      data_buffer.set(encoder.encode(uuid));
      await signalRequester(signal_buffer, taskId);

      // Wait for response with new bigger data_buffer
      data_buffer = ((await data_promise) as any).data_buffer;
    }

    // Encode result into data_buffer
    data_buffer.set(bytes);
    Atomics.store(size_buffer, SZ_BUF_FITS_IDX, +true);

    // @ts-ignore
    // console.log("       signaling completion", taskId)
    await signalRequester(signal_buffer, taskId);
  } catch (e) {
    console.warn(e);
  }
}

function requestResponseMessage(
  ep: Endpoint
): [string, Promise<WireValue>] {
  const id = generateUUID();
  return [
    id,
    new Promise((resolve) => {
      ep.addEventListener("message", function l(ev: MessageEvent) {
        if (!ev.data || !ev.data.id || ev.data.id !== id) {
          return;
        }
        ep.removeEventListener("message", l as any);
        resolve(ev.data);
      } as any);
      if (ep.start) {
        ep.start();
      }
    }),
  ];
}

async function signalRequester(signal_buffer: Uint32Array, taskId: number) {
  let index = (taskId >> 1) % 32;
  let sleepTime = 1;
  while (Atomics.compareExchange(signal_buffer, index + 1, 0, taskId) !== 0) {
    // No Atomics.asyncWait except on Chrome =(
    await sleep(sleepTime);
    if (sleepTime < 32) {
      // exponential backoff
      sleepTime *= 2;
    }
  }
  Atomics.or(signal_buffer, 0, 1 << index);
  // @ts-ignore
  Atomics.notify(signal_buffer, 0);
}
