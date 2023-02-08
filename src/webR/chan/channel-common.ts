import { SharedBufferChannelMain, SharedBufferChannelWorker } from './channel-shared';
import { ServiceWorkerChannelMain, ServiceWorkerChannelWorker } from './channel-service';
import { WebROptions } from '../webr-main';
import { isCrossOrigin } from '../utils';
import { IN_NODE } from '../compat';

// This file refers to objects imported from `./channel-shared` and
// `./channel-service.` These can't be included in `./channel` as this
// causes a circular dependency issue.

export const ChannelType = {
  Automatic: 0,
  SharedArrayBuffer: 1,
  ServiceWorker: 2,
} as const;

export type ChannelInitMessage = {
  type: string;
  data: {
    config: Required<WebROptions>;
    channelType: Exclude<
      (typeof ChannelType)[keyof typeof ChannelType],
      typeof ChannelType.Automatic
    >;
    clientId?: string;
    location?: string;
  };
};

export function newChannelMain(data: Required<WebROptions>) {
  switch (data.channelType) {
    case ChannelType.SharedArrayBuffer:
      return new SharedBufferChannelMain(data);
    case ChannelType.ServiceWorker:
      return new ServiceWorkerChannelMain(data);
    case ChannelType.Automatic:
    default:
      if (IN_NODE || crossOriginIsolated) {
        return new SharedBufferChannelMain(data);
      }
      /*
       * TODO: If we are not cross-origin isolated but we can still use service
       * workers, we could setup a service worker to inject the relevant headers
       * to enable cross-origin isolation.
       */
      if ('serviceWorker' in navigator && !isCrossOrigin(data.SW_URL)) {
        return new ServiceWorkerChannelMain(data);
      }
      throw new Error("Can't initialise main thread communication channel");
  }
}

export function newChannelWorker(msg: ChannelInitMessage) {
  switch (msg.data.channelType) {
    case ChannelType.SharedArrayBuffer:
      return new SharedBufferChannelWorker();
    case ChannelType.ServiceWorker:
      return new ServiceWorkerChannelWorker(msg.data);
    default:
      throw new Error('Unknown worker channel type recieved');
  }
}
