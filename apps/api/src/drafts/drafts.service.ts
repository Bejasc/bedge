import { Injectable } from '@nestjs/common';
import { createDraft, findDraft, type DraftView } from '@bedge/database';
import type { DraftCreate } from '@bedge/types';

@Injectable()
export class DraftsService {
  public create(input: DraftCreate): Promise<DraftView> {
    return createDraft(input.payload, input.source);
  }

  public find(code: string): Promise<DraftView | null> {
    return findDraft(code);
  }
}
