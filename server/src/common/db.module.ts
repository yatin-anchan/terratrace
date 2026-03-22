import { Module, Global } from '@nestjs/common'
import { neon } from '@neondatabase/serverless'
import { drizzle } from 'drizzle-orm/neon-http'
import * as schema from '../db/schema'

const DB_PROVIDER = {
  provide: 'DB',
  useFactory: () => {
    const sql = neon(process.env.DATABASE_URL!)
    return drizzle(sql, { schema })
  },
}

@Global()
@Module({
  providers: [DB_PROVIDER],
  exports: [DB_PROVIDER],
})
export class DbModule {}