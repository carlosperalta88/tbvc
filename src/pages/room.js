import React, { useEffect } from 'react'
import Layout from '../components/layout'
import { Router } from '@reach/router'
import VideoDisplay from '../components/video-display'
import { navigate } from 'gatsby'

const BounceHome = () => {
  useEffect(() => {
    navigate('/', { replace: true })
  }, [])
  return null
}

export default () => (
  <Layout>
    <Router>
      <VideoDisplay path="room/:roomID" />
      <BounceHome default />
    </Router>
  </Layout>
)