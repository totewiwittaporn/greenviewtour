// Account migration changes only the directory's provider label, not source identity fields.
export function migratedDirectoryExpected(sourceRows,authRows){
 const accounts=new Map(authRows.map(row=>[row.id,row]))
 if(accounts.size!==authRows.length)throw new Error('IDENTITY_AUTH_DUPLICATE')
 return sourceRows.map(row=>{
  const account=accounts.get(row.id)
  if(!account)return {...row}
  if(account.email!==row.email)throw new Error('IDENTITY_AUTH_EMAIL_DIFFERS')
  return {...row,provider:'better-auth'}
 })
}
