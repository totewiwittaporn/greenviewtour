import { useLayoutEffect, useRef, useState } from 'react'
// Scale the real document as one surface. Typography and pagination stay at
// their native paper size; the dialog is the sole vertical scroll owner.
export function FitDocument({children}) {
 const frame=useRef(null),content=useRef(null),[box,setBox]=useState({scale:1,height:100})
 useLayoutEffect(()=>{
  const update=()=>{
   if (!frame.current||!content.current) return
   const width=content.current.offsetWidth, available=frame.current.clientWidth
   if (!width||!available) return
   const scale=available/width, height=Math.ceil(content.current.offsetHeight*scale)
   setBox(old=>Math.abs(old.scale-scale)<.0001&&old.height===height?old:{scale,height})
  }
  const observer=new ResizeObserver(update)
  observer.observe(frame.current);observer.observe(content.current);update()
  return ()=>observer.disconnect()
 },[])
 return <div className="fit-document" ref={frame} style={{height:box.height}}>
  <div className="fit-document-inner" ref={content} style={{transform:`scale(${box.scale})`}}>{children}</div>
 </div>
}
