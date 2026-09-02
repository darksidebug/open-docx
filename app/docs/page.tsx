import React from 'react'
import Editor from './Editor'
import Toolbar from '@/components/Toolbar'
import Toolbar2 from '@/components/Toolbar2'

const page = () => {
  return (
    <div className='bg-[#F9FBFD]'>
      <Toolbar2 />
      {/* <Toolbar /> */}
      <Editor />
    </div>
  )
}

export default page
