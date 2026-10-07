// Isolated Local regression entry. No deployment or ordinary dev config references this file.
import worker from './worker.ts'
export default {
  fetch(request:Request,env:any,ctx:ExecutionContext){
    return worker.fetch(request,env,ctx,true)
  },
}
