import { makeCrud } from '../../shared/api/crud';
import type { Educador, EducadorFormValues, ListEducadoresQuery } from './types';

export const educadoresApi = makeCrud<
  Educador,
  EducadorFormValues,
  Partial<EducadorFormValues>,
  ListEducadoresQuery
>('educadores');
