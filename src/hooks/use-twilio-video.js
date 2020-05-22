import React, { createContext, useContext, useReducer, useRef } from 'react'
import axios from 'axios'
import { connect, createLocalTracks } from 'twilio-video'

const TWILIO_TOKEN_URL = process.env.TWILIO_TOKEN_URL

const DEFAULT_STATE = {
  identity: false,
  roomName: false,
  token: false,
  room: false
}

const reducer = (state, action) => {
  switch (action.type) {
    case 'join':
      return { 
        ...state, 
        identity: action.identity, 
        roomName: action.roomName,
        token: action.token
      }
    case 'set-active-room':
      return {
        ...state,
        room: action.room
      }
    default:
      return DEFAULT_STATE
  }
}

const TwilioVideoContext = createContext()

const TwilioVideoProvider = ({ children }) => (
  <TwilioVideoContext.Provider value={useReducer(reducer, DEFAULT_STATE)}>
    {children}
  </TwilioVideoContext.Provider>
)

export const wrapRootElement = ({ element }) => (
  <TwilioVideoProvider>
    {element}
  </TwilioVideoProvider>
)

const useTwilioVideo = () => {
  const [state, dispatch] = useContext(TwilioVideoContext)
  const videoRef = useRef()
  const { roomName, token } = state

  const getRoomToken = async({ identity, roomName }) => {
    const result = await axios.post(TWILIO_TOKEN_URL,
      {
        identity,
        room: roomName
      })

      dispatch({ type: 'join', token: result.data, identity, roomName })
  }

  const handleRemoteParticipant = container => participant => {
    const id = participant.sid
    const el = document.createElement('div')
    el.id = id
    el.className = 'remote-participant'
    const name = document.createElement('h4')
    name.innerText = participant.identity
    el.appendChild(name)

    container.appendChild(el)

    const addTrack = track => {
      const participantDiv = document.getElementById(id)
      const media = track.attach()
      participantDiv.appendChild(media)
    }

    participant.tracks.forEach(publication => {
      if (publication.isSubscribed) {
        addTrack(publication.track)
      }
    })

    participant.on('trackSubscribed', addTrack)
  }

  const connectToRoom = async () => {
    if (!token) {
      return
    }

    const devices = await navigator.mediaDevices.enumerateDevices()
    .catch(error => console.log(`fuck: ${error}`))

    let videoInput = devices.find(device => device.kind === 'videoinput')
    let audioInput = devices.find(device => device.kind === 'audioinput')

    if (!videoInput) {
      console.error(`Sorry, You can't join without a camera`)
      return
    }

    const localTracks = await createLocalTracks({ 
      audio: { deviceId: audioInput.deviceId }, 
      video: { deviceId: videoInput.deviceId } 
    })
    
    const room = await connect(
      token,
      {
        name: roomName,
        tracks: localTracks,
        logLevel: 'info'
      }
    ).catch(err => { console.error(`Unable to join the room ${err.message}`) })


    const localTrack = [...room.localParticipant.videoTracks.values()][0].track
    
    if (!videoRef.current.hasChildNodes()) {
      const localEl = localTrack.attach()
      const el = document.createElement('div')
      el.className = 'local-broadcast'
      el.appendChild(localEl)
      videoRef.current.appendChild(el)
    }

    const handleParticipant = handleRemoteParticipant(videoRef.current)

    room.participants.forEach(handleParticipant)
    room.on('participantConnected', handleParticipant)

    dispatch({ type: 'set-active-room', room })
  }

  const startVideo = () => connectToRoom()

  return { state, getRoomToken, startVideo, videoRef }
}

export default useTwilioVideo