import React, { useContext, useState } from 'react';
import useWebRTC from './useWebRTC';
import { SocketContext } from '../../context/socketContext';



const VoiceCall = () => {
    const {socket} = useContext(SocketContext);
    const { localStreamRef, remoteStreamRef, isMuted, toggleMute, createOffer } = useWebRTC(socket);
    const [isCallActive, setIsCallActive] = useState(false);

    const handleCall = () => {
        setIsCallActive(!isCallActive);
        createOffer();
    };

    return (
        <div>
            <h1>Voice Call</h1>
            <button onClick={handleCall} disabled={isCallActive}>Call</button>
            <button onClick={toggleMute}>
                {isMuted ? 'Unmute' : 'Mute'}
            </button>
            <div>
                <h2>Local Stream</h2>
                <audio ref={localStreamRef} autoPlay muted />
            </div>
            <div>
                <h2>Remote Stream</h2>
                <audio ref={remoteStreamRef} autoPlay />
            </div>
        </div>
    );
};

export default VoiceCall;
