import React, { useState, useEffect, useRef, createContext } from 'react';
import { io } from 'socket.io-client';

const WebRTContext = createContext();

const WebRTCProvider = ({ children }) => {
    const localStreamRef = useRef(null);
    const remoteStreamRef = useRef(null);
    const socketRef = useRef();
    const pcRef = useRef(null);
    const [isMuted, setIsMuted] = useState(false);

    const initPC = () => {
        const pc = new RTCPeerConnection();
        pcRef.current = pc;

        pc.onicecandidate = event => {
            if (event.candidate) {
                socketRef.current.emit('candidate', event.candidate);
            }
        };

        pc.ontrack = event => {
            if (remoteStreamRef.current) {
                remoteStreamRef.current.srcObject = event.streams[0];
            }
        };
    };

    useEffect(() => {
        socketRef.current = io(process.env.REACT_APP_VOICE_API_URL);
        if (!pcRef.current) {
            initPC();
        }

        navigator.mediaDevices.getUserMedia({ audio: true, video: false })
            .then(stream => {
                console.log('Local stream obtained:', stream);
                if (localStreamRef.current) {
                    localStreamRef.current.srcObject = stream;
                    localStreamRef.current.muted = isMuted; // Set initial mute state
                }
                stream.getTracks().forEach(track => pcRef.current.addTrack(track, stream));
            })
            .catch(error => {
                console.error('Error obtaining local stream', error);
            });

        socketRef.current.on('offer', async (offer) => {
            try {
                if (pcRef.current.signalingState !== 'stable') {
                    return;
                }
                await pcRef.current.setRemoteDescription(new RTCSessionDescription(offer));
                const answer = await pcRef.current.createAnswer();
                await pcRef.current.setLocalDescription(answer);
                socketRef.current.emit('answer', answer);
            } catch (error) {
                console.error('Error handling offer', error);
            }
        });

        socketRef.current.on('answer', async (answer) => {
            try {
                await pcRef.current.setRemoteDescription(new RTCSessionDescription(answer));
            } catch (error) {
                console.error('Error handling answer', error);
            }
        });

        socketRef.current.on('candidate', async (candidate) => {
            try {
                await pcRef.current.addIceCandidate(new RTCIceCandidate(candidate));
            } catch (error) {
                console.error('Error adding received ICE candidate', error);
            }
        });

        return () => {
            if (pcRef.current) {
                pcRef.current.close();
                pcRef.current = null;
            }
            socketRef.current.off('offer');
            socketRef.current.off('answer');
            socketRef.current.off('candidate');
        };
    }, [isMuted]);

    const toggleMute = () => {
        if (localStreamRef.current) {
            localStreamRef.current.muted = !isMuted;
            setIsMuted(!isMuted);
        } else {
            console.log('Local stream is not available');
        }
    };

    const createOffer = async () => {
        if (!pcRef.current || pcRef.current.signalingState === 'closed') {
            pcRef.current = new RTCPeerConnection();
            initPC(); // Reinitialize if closed
        }
        const offer = await pcRef.current.createOffer();
        await pcRef.current.setLocalDescription(offer);
        socketRef.current.emit('offer', offer);
    };

    return (
        <WebRTContext.Provider value={{ localStreamRef, remoteStreamRef, isMuted, toggleMute, createOffer }}>
            {children}
        </WebRTContext.Provider>
    );
};

export { WebRTContext, WebRTCProvider };
