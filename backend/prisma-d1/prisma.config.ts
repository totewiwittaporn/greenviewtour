import {defineConfig} from 'prisma/config'
if(process.argv.some(value=>['migrate','db','studio'].includes(value)))throw new Error('D1_CODEGEN_ONLY: use npm run local:db:migrate for the active Local state')
export default defineConfig({
  schema:'schema.prisma',
  datasource:{url:'file:./local.db'},
})
