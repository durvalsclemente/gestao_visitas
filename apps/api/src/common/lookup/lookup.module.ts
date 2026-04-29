import { Global, Module } from '@nestjs/common';
import { LookupCrudHelper } from './lookup-crud.helper';

@Global()
@Module({
  providers: [LookupCrudHelper],
  exports: [LookupCrudHelper],
})
export class LookupModule {}
