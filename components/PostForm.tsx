"use client"

import React, { useRef, useEffect, useState } from 'react'

const PostForm = () => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const [image, setImage] = useState<string | null>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (canvas) {
      // ensure a size exists before exporting; adjust as needed
      if (!canvas.width) canvas.width = 300
      if (!canvas.height) canvas.height = 150

      // draw or leave blank; this ensures toDataURL is called on an actual HTMLCanvasElement
      const ctx = canvas.getContext('2d')
      if (ctx) {
        ctx.fillStyle = '#ffffff'
        ctx.fillRect(0, 0, canvas.width, canvas.height)
      }

      const data = canvas.toDataURL('image/png')
      setImage(data)
    }
  }, [])

  return (
    <div className='canvas'>
      {/* hidden canvas element used to generate image data */}
      <canvas ref={canvasRef} style={{ display: 'none' }} />
      <div className="card">
        <div className="card-body">
          <h5 className="card-title">Create a New Post</h5>
          <form>
            <div className="mb-3">
              <label htmlFor="postTitle" className="form-label">Title</label>
              <input type="text" className="form-control" id="postTitle" placeholder="Enter post title" />
            </div>
            <div className="mb-3">
              <label htmlFor="postContent" className="form-label">Content</label>
              <textarea className="form-control" id="postContent" rows={4} placeholder="Write your post here"></textarea>
            </div>
            <button type="submit" className="btn btn-primary">Submit Post</button>
          </form>
        </div>
      </div>
    </div>
  )
}

export default PostForm