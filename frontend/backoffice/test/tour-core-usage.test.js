import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'

test('Tour Program composes Backoffice Core instead of owning page-local UI primitives',()=>{
 const editor=readFileSync(new URL('../src/features/settings/tours/TourProgramEditor.jsx',import.meta.url),'utf8')
 const view=readFileSync(new URL('../src/features/settings/tours/TourProgramViewDialog.jsx',import.meta.url),'utf8')
 assert.match(editor,/core\/ui\/FormSection\.jsx/)
 assert.match(editor,/core\/ui\/MasterDetail\.jsx/)
 assert.doesNotMatch(editor,/TourProgramEditor\.css|TourMasterDetail/)
 assert.match(view,/core\/ui\/ModalView\.jsx/)
 assert.doesNotMatch(view,/TourProgramViewDialog\.css|dialog-actions/)
})
