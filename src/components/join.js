import React, { useState, useEffect } from 'react'
import Styles from './join.module.css'
import useTwilioVideo from '../hooks/use-twilio-video'
import { navigate } from 'gatsby'

const Join = ({ location }) => {
  const defaultRoom = (location && location.state && location.state.roomname) || ''
  const { state, getRoomToken } = useTwilioVideo()
  const [identity, setIdentity] = useState('')
  const [roomName, setRoomName] = useState(defaultRoom)
  const handleSubmit = event => {
    event.preventDefault()
    getRoomToken({ identity, roomName })
  }

  useEffect(() => {
    if (state.token && state.roomName) {
      navigate(`/room/${state.roomName}`)
    }
  }, [state])

  return (
    <>
      <h1>Join a video chat</h1>
      <pre>{JSON.stringify(state, null, 2)}</pre>
      <form className={Styles.form} onSubmit={handleSubmit}>
        <label htmlFor="identity">
          Display Name:
          <input 
            type="text" 
            id="identity"
            onChange={event => setIdentity(event.target.value)}
           />
        </label>
        <label htmlFor="roomName">
          Which room you want to join?
          <input 
            type="text"
            id="roomName"
            onChange={e => setRoomName(e.target.value)}
          />
        </label>
        <button type="submit">Join</button>
      </form>
    </>
  )
}

export default Join