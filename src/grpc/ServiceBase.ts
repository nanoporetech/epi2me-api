import type { grpc } from '@improbable-eng/grpc-web';
import type { ServiceContext } from './utils.type';

import { Subject } from 'rxjs';
import { createServiceContext } from './utils';

export class ServiceBase {
  private readonly destroy$ = new Subject<void>();
  protected readonly context: ServiceContext;

  constructor(host: string, jwt: string, transport?: grpc.TransportFactory) {
    this.context = createServiceContext(host, jwt, this.destroy$, transport);
  }

  close(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
}
