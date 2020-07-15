import React, { createContext, useContext, useReducer, useRef } from 'react'
import axios from 'axios'
import { connect, createLocalTracks } from 'twilio-video'

const TWILIO_TOKEN_URL = process.env.TWILIO_TOKEN_URL

const DEFAULT_STATE = {
  identity: false,
  roomName: false,
  token: false,
  room: false,
  activeParticipant: false,
  isActiveParticipantPinned: false
}

const isMobile = (() => {
  if (typeof navigator === 'undefined' || typeof navigator.userAgent !== 'string') {
    return false;
  }
  return /Mobile/.test(navigator.userAgent);
})();

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
    case 'set-active-participant':
      return {
        ...state,
        activeParticipant: action.participant
      }
    case 'disconnect':
      state.room && state.room.disconnect()
      return DEFAULT_STATE
    case 'activeParticipantPinnedToggle':
      return {
        ...state,
        isActiveParticipantPinned: action.appt
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

const connectOptions = {
  // Available only in Small Group or Group Rooms only. Please set "Room Type"
  // to "Group" or "Small Group" in your Twilio Console:
  // https://www.twilio.com/console/video/configure
  bandwidthProfile: {
    video: {
      dominantSpeakerPriority: 'high',
      mode: 'collaboration',
      renderDimensions: {
        high: { height: 720, width: 1280 },
        standard: { height: 90, width: 160 }
      }
    }
  },

  // Available only in Small Group or Group Rooms only. Please set "Room Type"
  // to "Group" or "Small Group" in your Twilio Console:
  // https://www.twilio.com/console/video/configure
  dominantSpeaker: true,

  // Comment this line to disable verbose logging.
  logLevel: 'debug',

  // Comment this line if you are playing music.
  maxAudioBitrate: 16000,

  // VP8 simulcast enables the media server in a Small Group or Group Room
  // to adapt your encoded video quality for each RemoteParticipant based on
  // their individual bandwidth constraints. This has no utility if you are
  // using Peer-to-Peer Rooms, so you can comment this line.
  preferredVideoCodecs: [{ codec: 'VP8', simulcast: true }],

  // Capture 720p video @ 24 fps.
  video: { height: 720, frameRate: 24, width: 1280 }
};

// For mobile browsers, limit the maximum incoming video bitrate to 2.5 Mbps.
if (isMobile) {
  connectOptions
    .bandwidthProfile
    .video
    .maxSubscriptionBitrate = 2500000;
}

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
    el.dataset.identity = participant.identity
    // const name = document.createElement('h4')
    // name.innerText = participant.identity
    // el.appendChild(name)

    container.appendChild(el)

    const addTrack = track => {
      const participantDiv = document.getElementById(id)
      const media = track.attach()
      media.dataset.id = id
      participantDiv.appendChild(media)
    }

    const removeTrack = track => {
      track.detach().forEach((el) => el.remove())
      const container = document.getElementById(id)
      if (container) container.remove()
    }

    participant.tracks.forEach(publication => {
      if (publication.isSubscribed) {
        addTrack(publication.track)
      }
    })

    participant.on('trackSubscribed', addTrack)
    participant.on('trackUnsubscribed', removeTrack)
  }

  const getParticipant = (pId) => {
    const {room} = state
    return [...room.participants][0].filter((part) => part.sid === pId)
  }

  const handleVideoSelection = (p) => {
    const {room, activeParticipant, isActiveParticipantPinned} = state
    const participant = (room.localParticipant.sid === p.dataset.id ? room.localParticipant : getParticipant(p.dataset.id)[0])
    console.log(room.localParticipant)
    if (activeParticipant === participant && isActiveParticipantPinned) {
      // Unpin the RemoteParticipant and update the current active Participant.
      setVideoPriority(participant, null);
      setCurrentActiveParticipant(room);
      dispatch({ type: 'activeParticipantPinnedToggle', appt: !isActiveParticipantPinned })
    } else {
      // Pin the RemoteParticipant as the active Participant.
      if (isActiveParticipantPinned) {
        setVideoPriority(activeParticipant, null);
      }
      setVideoPriority(participant, 'high');
      dispatch({ type: 'activeParticipantPinnedToggle', appt: !isActiveParticipantPinned })
      setActiveParticipant(participant);
    }
  }

  const setActiveParticipant = (participant) => {
    const { activeParticipant, isActiveParticipantPinned } = state
    const activeVideo = document.getElementById('active-video')

    if (activeParticipant) {
      const elActiveParticipant = document.getElementById(activeParticipant.sid).firstChild

      elActiveParticipant.classList.remove('active');
      elActiveParticipant.classList.remove('pinned');

      dispatch({ type: 'set-active-participant', participant: false })
      setTimeout(activeVideo.firstChild.remove(), 100)
    }

    // Set the new active Participant.
    dispatch({ type: 'set-active-participant', participant })
    const { identity, sid } = participant;
    const elParticipant = document.getElementById(sid)

    elParticipant.classList.add('active');
    if (isActiveParticipantPinned) {
      elParticipant.classList.add('pinned');
    }

    // Attach the new active Participant's video.
    const { track } = Array.from(participant.videoTracks.values())[0] || {};
    if (track) {
      const media = track.attach()
      media.dataset.id = sid
      media.dataset.identity = identity
      activeVideo.appendChild(media)
    }

    // Set the new active Participant's identity
    elParticipant.dataset.identity = identity;
  }

  const setCurrentActiveParticipant = (room) => {
    const { dominantSpeaker, localParticipant } = room
    setActiveParticipant(dominantSpeaker || localParticipant)
  }

  /**
   * Set the VideoTrack priority for the given RemoteParticipant. This has no
   * effect in Peer-to-Peer Rooms.
   * @param participant - the RemoteParticipant whose VideoTrack priority is to be set
   * @param priority - null | 'low' | 'standard' | 'high'
   */
  const setVideoPriority = (participant, priority) => {
    console.log(participant)
    participant.videoTracks.forEach(publication => {
      const track = publication.track;
      if (track && track.setPriority) {
        track.setPriority(priority);
      }
    });
  }

  const connectToRoom = async () => {
    if (!token) {
      return
    }

    // On mobile browsers, there is the possibility of not getting any media even
    // after the user has given permission, most likely due to some other app reserving
    // the media device. So, we make sure users always test their media devices before
    // joining the Room. For more best practices, please refer to the following guide:
    // https://www.twilio.com/docs/video/build-js-video-application-recommendations-and-best-practices
    const deviceIds = {
      audio: isMobile ? null : window.localStorage.getItem('audioDeviceId'),
      video: isMobile ? null : window.localStorage.getItem('videoDeviceId')
    };

    const devices = await navigator.mediaDevices.enumerateDevices()
    .catch(error => console.log(`fuck: ${error}`))

    const localTracks = await createLocalTracks(deviceIds)
    const room = await connect(
      token,
      {
        ...connectOptions,
        name: roomName,
        audio: localTracks.LocalAudioTrack,
        video: {
          ...localTracks.LocalVideoTrack,
          width: 320
        }
      }
    ).catch(err => { console.error(`Unable to join the room ${err.message}`) })

    const localTrack = [...room.localParticipant.videoTracks.values()][0].track
    
    if (!videoRef.current.hasChildNodes()) {
      const { sid, identity } = room.localParticipant
      const localEl = localTrack.attach()
      const el = document.createElement('div')
      el.className = 'local-broadcast'
      el.appendChild(localEl)
      el.id = sid
      el.dataset.identity = identity
      localEl.dataset.id = sid
      videoRef.current.appendChild(el)
    }

    // Handles participants connection
    const handleParticipant = handleRemoteParticipant(videoRef.current)
    room.participants.forEach(handleParticipant)
    
    // Room events
    room.on('participantConnected', handleParticipant)
    room.on('participantDisconnected', handleParticipant)
    
    dispatch({ type: 'set-active-room', room })
    setCurrentActiveParticipant(room)
  }

  const startVideo = () => connectToRoom()
  const leaveRoom = () => dispatch({type: 'disconnect'})

  return { state, getRoomToken, startVideo, videoRef, leaveRoom, handleVideoSelection }
}

export default useTwilioVideo