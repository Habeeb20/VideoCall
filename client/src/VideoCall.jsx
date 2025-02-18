import { useEffect, useRef, useState } from "react";
import { io } from "socket.io-client";

const socket = io("http://localhost:5000");

const VideoCall = () => {
    const localVideoRef = useRef(null);
    const remoteVideoRef = useRef(null);
    const chatInputRef = useRef(null);
    const [callId, setCallId] = useState("");
    const [peerConnection, setPeerConnection] = useState(null);
    const [inCall, setInCall] = useState(false);
    const [generatedCallId, setGeneratedCallId] = useState("");
    const [isSharingScreen, setIsSharingScreen] = useState(false);
    const [messages, setMessages] = useState([]);
    const [chatOpen, setChatOpen] = useState(true);
    const [userId, setUserId] = useState("userA");
    const [joinNotification, setJoinNotification] = useState(""); // New state for join notification
    let screenStream = null;

    useEffect(() => {
        socket.on("callStarted", ({ callId }) => {
            setGeneratedCallId(callId);
            setCallId(callId);
            setInCall(true);
        });

        socket.on("userJoined", (id) => {
            setJoinNotification(`You successfully joined the call with ID: ${id}`);
            startCall();
        });

        socket.on("offer", async ({ sdp }) => {
            const peer = createPeer();
            setPeerConnection(peer);
            await peer.setRemoteDescription(new RTCSessionDescription(sdp));
            const answer = await peer.createAnswer();
            await peer.setLocalDescription(answer);
            socket.emit("answer", { callId, sdp: peer.localDescription });
        });

        socket.on("answer", async ({ sdp }) => {
            await peerConnection.setRemoteDescription(new RTCSessionDescription(sdp));
        });

        socket.on("iceCandidate", (candidate) => {
            peerConnection.addIceCandidate(new RTCIceCandidate(candidate));
        });

        socket.on("callEnded", () => {
            endCall();
        });

        socket.on("message", (message) => {
            setMessages((prevMessages) => {
                if (!prevMessages.find(msg => msg.content === message.content)) {
                    return [...prevMessages, message];
                }
                return prevMessages;
            });
        });
    }, [callId, peerConnection]);

    const startCall = async () => {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
        localVideoRef.current.srcObject = stream;

        const peer = createPeer();
        setPeerConnection(peer);
        stream.getTracks().forEach((track) => peer.addTrack(track, stream));

        const offer = await peer.createOffer();
        await peer.setLocalDescription(offer);
        socket.emit("offer", { callId, sdp: peer.localDescription });
    };

    const joinCall = () => {
        socket.emit("joinCall", callId);
        setInCall(true);
    };

    const createPeer = () => {
        const peer = new RTCPeerConnection({
            iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
        });

        peer.ontrack = (event) => {
            remoteVideoRef.current.srcObject = event.streams[0];
        };

        peer.onicecandidate = ({ candidate }) => {
            if (candidate) {
                socket.emit("iceCandidate", { callId, candidate });
            }
        };

        return peer;
    };

    const endCall = () => {
        socket.emit("endCall", callId);
        setInCall(false);
        setCallId("");
        setGeneratedCallId("");
        if (peerConnection) peerConnection.close();
    };

    const shareScreen = async () => {
        try {
            screenStream = await navigator.mediaDevices.getDisplayMedia({ video: true });
            const sender = peerConnection.getSenders().find((s) => s.track.kind === "video");

            if (sender) {
                sender.replaceTrack(screenStream.getTracks()[0]);
                setIsSharingScreen(true);
            }
        } catch (err) {
            console.error("Error sharing screen:", err);
        }
    };

    const stopSharingScreen = () => {
        if (screenStream) {
            screenStream.getTracks().forEach(track => track.stop());
            const sender = peerConnection.getSenders().find((s) => s.track.kind === "video");
            navigator.mediaDevices.getUserMedia({ video: true, audio: true }).then((stream) => {
                if (sender) {
                    sender.replaceTrack(stream.getTracks()[0]);
                }
                localVideoRef.current.srcObject = stream;
            });
            setIsSharingScreen(false);
        }
    };

    const handleSendMessage = () => {
        const message = chatInputRef.current.value;
        if (message) {
            const messageData = { content: message, sender: userId };
            socket.emit("message", { callId, message: messageData });
            setMessages((prevMessages) => [...prevMessages, messageData]);  // Update message locally for immediate display
            chatInputRef.current.value = "";
        }
    };

    return (
        <div className="video-call-container">
            <h2>Video Call for Ejob</h2>

            {!inCall ? (
                <div className="call-actions">
                    <button onClick={() => socket.emit("startCall")} className="start-call-btn">Start Call</button>

                    <input
                        type="text"
                        placeholder="Enter Call ID"
                        value={callId}
                        onChange={(e) => setCallId(e.target.value)}
                        className="call-id-input"
                    />
                    <button onClick={joinCall} className="join-call-btn">Join Call</button>
                </div>
            ) : (
                <div className="video-call-active">
                    {generatedCallId && (
                        <p className="call-id-display">Share this Call ID: <span>{generatedCallId}</span></p>
                    )}

                    {/* Notification on second caller join */}
                    {joinNotification && <div className="join-notification">{joinNotification}</div>}

                    <div className="video-container">
                        <video ref={localVideoRef} autoPlay playsInline className="local-video" />
                        <video ref={remoteVideoRef} autoPlay playsInline className="remote-video" />
                    </div>

                    {!isSharingScreen ? (
                        <button onClick={shareScreen} className="share-screen-btn">Share Screen</button>
                    ) : (
                        <button onClick={stopSharingScreen} className="stop-sharing-btn">Stop Sharing</button>
                    )}

                    <button onClick={endCall} className="end-call-btn">End Call</button>

                    {/* Chat Section */}
                    <div className="chat-container">
                        <div className="chat-box">
                            {messages.map((msg, index) => (
                                <div key={index} className={`chat-message ${msg.sender === userId ? "from-you" : "to-you"}`}>
                                    <strong>{msg.sender === userId ? "From You: " : "To You: "}</strong>
                                    {msg.content}
                                </div>
                            ))}
                        </div>
                        <div className="chat-input">
                            <input ref={chatInputRef} type="text" placeholder="Type a message" />
                            <button onClick={handleSendMessage}>Send</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default VideoCall;
