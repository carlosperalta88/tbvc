import React, { useEffect } from 'react'
import { navigate } from 'gatsby'
import useTwilioVideo from '../hooks/use-twilio-video'
import Styles from './video-display.module.css'

const VideoDisplay = ({ roomID }) => {
  const { state, startVideo, videoRef, leaveRoom, toggleAudio, toggleVideo } = useTwilioVideo()

  useEffect(() => {
    if (!state.token) {
      navigate('/', { state: { roomName: roomID }})
    }

    if(!state.room) {
      startVideo()
    }
    window.addEventListener('beforeunload', leaveRoom)

    return () => {
      window.removeEventListener('beforeunload', leaveRoom)
    }
  }, [state, roomID, startVideo, leaveRoom])

  return (<>
    <h1>Room: "{roomID}"</h1>
    <button onClick={leaveRoom}>Leave Room</button>
    <div 
      className={Styles.chat} 
      ref={videoRef}
    />
  </>)
}

export default VideoDisplay