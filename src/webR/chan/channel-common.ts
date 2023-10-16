import { SharedBufferChannelMain, SharedBufferChannelWorker } from './channel-shared';
import { ServiceWorkerChannelMain, ServiceWorkerChannelWorker } from './channel-service';
import { PostMessageChannelMain, PostMessageChannelWorker } from './channel-postmessage';
import { WebROptions } from '../webr-main';
import { WebRChannelError } from '../error';

// This file refers to objects imported from `./channel-shared` and
// `./channel-service.` These can't be included in `./channel` as this
// causes a circular dependency issue.

export const ChannelType = {
  Automatic: 0,
  SharedArrayBuffer: 1,
  ServiceWorker: 2,
  PostMessage: 3,
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
    case ChannelType.PostMessage:
      return new PostMessageChannelMain(data);
    case ChannelType.Automatic:
    default:
      if (typeof SharedArrayBuffer !== 'undefined') {
        return new SharedBufferChannelMain(data);
      } else {
        return new PostMessageChannelMain(data);
      }
  }
}

export function newChannelWorker(msg: ChannelInitMessage) {
  switch (msg.data.channelType) {
    case ChannelType.SharedArrayBuffer:
      return new SharedBufferChannelWorker();
    case ChannelType.ServiceWorker:
      return new ServiceWorkerChannelWorker(msg.data);
    case ChannelType.PostMessage:
      return new PostMessageChannelWorker();
    default:
      throw new WebRChannelError('Unknown worker channel type recieved');
  }
}
