import React, { useEffect } from 'react'
import { navigate } from 'gatsby'
import useTwilioVideo from '../hooks/use-twilio-video'
import Styles from './video-display.module.css'

const VideoDisplay = ({ roomID }) => {
  const { state, startVideo, videoRef, leaveRoom, handleVideoSelection } = useTwilioVideo()

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

  const test = (el) => {
    console.log(el.target)
    handleVideoSelection(el.target)
  }

  return (<>
    <button className={Styles.leave} onClick={leaveRoom}>Leave Room</button>
    <div className={Styles.chat}>
      <div 
        className={Styles.participants} 
        ref={videoRef}
        onClick={test}
      />
      <div
        id='active-video'
        className={Styles.activeParticipant}
      />
    </div>
  </>)
}

export default VideoDisplay