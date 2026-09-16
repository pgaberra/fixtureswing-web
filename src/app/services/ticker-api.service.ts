import { Injectable, inject } from '@angular/core';
import { Api } from '../api/api';
import { getTicker } from '../api/fn/ticker/get-ticker';
import { TickerDto } from '../api/models/ticker-dto';

/** The page-facing wrapper around the generated client: components never call `Api` directly. */
@Injectable({ providedIn: 'root' })
export class TickerApiService {
  private readonly api = inject(Api);

  load(): Promise<TickerDto> {
    return this.api.invoke(getTicker);
  }
}
