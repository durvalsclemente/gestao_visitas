import { makeCrud } from '../../shared/api/crud';
import type { Assistido, AssistidoFormValues, ListAssistidosQuery } from './types';

export const assistidosApi = makeCrud<
  Assistido,
  AssistidoFormValues,
  Partial<AssistidoFormValues>,
  ListAssistidosQuery
>('assistidos');
