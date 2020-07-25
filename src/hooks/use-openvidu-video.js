import React, { createContext, useContext, useReducer, useRef } from 'react'
import axios from 'axios'
import { OpenVidu } from 'openvidu-browser'

const OPENVIDU_API = process.env.OPENVIDU_API

const DEFAULT_STATE = {
  sessionName: false,
  identity: false,
  token: false,
  activeParticipant: false,
  isActiveParticipantPinned: false,
  isLogged: false,
  session: false
}

const reducer = (state, action) => {
    switch (action.type) {
      case 'join-vidu':
        return { 
          ...state, 
          token: action.token,
          sessionName: action.sessionName,
          isLogged: action.isLogged
        }
      case 'logged-vidu':
        return {
          ...state,
          isLogged: action.isLogged
        }
      case 'session-created':
        return {
          ...state,
          session: action.session
        }
      case 'remove-user-vidu':
        return {
          ...state,
          isLogged: false,
          sessionName: false,
          token: false
        }
      case 'set-active-participant':
        return {
          ...state,
          activeParticipant: action.participant
        }
      case 'disconnect-vidu':
        state.session && state.session.disconnect()
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

const OpenviduContext = createContext()

const OpenviduProvider = ({ children }) => (
  <OpenviduContext.Provider value={useReducer(reducer, DEFAULT_STATE)}>
    {children}
  </OpenviduContext.Provider>
)

export const wrapRootElement = ({ element }) => (
    <OpenviduProvider>
      {element}
    </OpenviduProvider>
)

const useOpenviduVideo = () => {
  const [state, dispatch] = useContext(TwilioVideoContext)
  const videoRef = useRef()
  const { sessionName, token, identity } = state

  const joinSession = async() => {
    await login({user: "publisher1", pass: "pass"}).catch(error => {
      console.warn('There was an error connecting to the session:', error.code, error.message);
    })

    await getToken(sessionName).catch(error => {
      console.warn('There was an error connecting to the session:', error.code, error.message);
    })

    const OV = new OpenVidu()
    const session = OV.initSession()

    dispatch({type: 'session-created', session})
    session.on('streamCreated', (event) => {

			// Subscribe to the Stream to receive it
			// HTML video will be appended to element with 'active-video' id
			const subscriber = session.subscribe(event.stream, videoRef);

			// When the HTML video has been appended to DOM...
			subscriber.on('videoElementCreated', (event) => {

				// Add a new HTML element for the user's name and nickname over its video
				// appendUserData(event.element, subscriber.stream.connection);
			})
    })
    
    // On every Stream destroyed...
		session.on('streamDestroyed', (event) => {
			// Delete the HTML element with the user's name and nickname
			// removeUserData(event.stream.connection);
    });
    
    session.connect(token, { clientData: identity })
      .then(() => {
        if (isPublisher(identity)) {

					// --- 6) Get your own camera stream ---

					var publisher = OV.initPublisher(videoRef, {
						audioSource: undefined, // The source of audio. If undefined default microphone
						videoSource: undefined, // The source of video. If undefined default webcam
						publishAudio: true,  	// Whether you want to start publishing with your audio unmuted or not
						publishVideo: true,  	// Whether you want to start publishing with your video enabled or not
						resolution: '640x480',  // The resolution of your video
						frameRate: 30,			// The frame rate of your video
						insertMode: 'APPEND',	// How the video is inserted in the target element 'active-video'
						mirror: false       	// Whether to mirror your local video or not
					});

					// --- 7) Specify the actions when events take place in our publisher ---

					// When our HTML video has been added to DOM...
					publisher.on('videoElementCreated', (event) => {
						// Init the main video with ours and append our data
						var userData = {
							nickName: identity,
							userName: identity
						};
						// initMainVideo(event.element, userData);
						// appendUserData(event.element, userData);
						// $(event.element).prop('muted', true); // Mute local video
					});


					// --- 8) Publish your stream ---

					session.publish(publisher);

				} else {
					console.warn('You don\'t have permissions to publish');
					// initMainVideoThumbnail(); // Show SUBSCRIBER message in main video
				}
      })
  }

  const login = async({ user, pass }) => {
    const result = await axios.post(`${OPENVIDU_API}/api-login/login`,
    {
      user,
      pass
    })
    .catch((err) => dispatch({ type: 'logged', isLogged: false}))

    if (result.statusCode === 200) {
      dispatch({ type: 'logged', isLogged: true})
      return
    }
    
    dispatch({ type: 'logged', isLogged: false})
  }

  const logout = async() => {
    await axios.post(`${OPENVIDU_API}/api-login/logout`, {})
        .catch((err) => dispatch({ type: 'logged', isLogged: false}))

    dispatch({ type: 'logged', isLogged: false})
  }

  const leaveSession = () => dispatch({type: 'disconnect'})

  const removeUser = async() => {
    const { sessionName, token } = state
    const result = await axios.post(`${OPENVIDU_API}/api-sessions/get-token`,
    {
      sessionName: sessionName,
      token: token
    })
    if (result.statusCode !== 200) return console.error(result)
    dispatch({ type: 'remove-user'})
  }

  const getToken = async({ sessionName }) => {
    const result = await axios.post(`${OPENVIDU_API}/api-sessions/get-token`,
      {
        sessionName
      })

      dispatch({ type: 'join', token: result[0], sessionName, isLogged: true })
  }

  return {joinSession, logout, state, videoRef, leaveSession}
}

export default useOpenviduVideo