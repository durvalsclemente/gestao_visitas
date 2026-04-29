import { makeCrud } from '../../shared/api/crud';
import type { Visitador, VisitadorFormValues, ListVisitadoresQuery } from './types';

export const visitadoresApi = makeCrud<
  Visitador,
  VisitadorFormValues,
  Partial<VisitadorFormValues>,
  ListVisitadoresQuery
>('visitadores');
