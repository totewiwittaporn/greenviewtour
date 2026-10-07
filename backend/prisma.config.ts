// Reference-schema code generation only. Never load dotenv/provider credentials.
import {defineConfig} from 'prisma/config'
if(process.argv.some(value=>['migrate','db','studio'].includes(value)))throw new Error('REFERENCE_DATABASE_COMMAND_RETIRED: use npm run local:db:migrate')
export default defineConfig({
 schema:'prisma/schema.prisma',
 migrations:{path:'prisma/migrations'},
 datasource:{url:'postgresql://unused:unused@127.0.0.1:1/reference_generation_only'},
})
