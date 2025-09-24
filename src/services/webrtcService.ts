import { db } from "../firebase";
import {
  doc, 
  collection, 
  setDoc, 
  getDoc, 
  onSnapshot, 
  addDoc, 
  deleteDoc, 
  serverTimestamp, 
  writeBatch,
  query,
  orderBy,
  limit
} from "firebase/firestore";

type Nullable<T> = T | null;

// ICE servers configuration
const ICE_SERVERS = [
  { urls: "stun:stun.l.google.com:19302" },
  // Add TURN server here for production reliability
  // { urls: "turn:your-turn.example.com:3478", username: "user", credential: "pass" }
];

export interface WebRTCServiceConfig {
  video?: boolean;
  audio?: boolean;
  iceServers?: RTCIceServer[];
}

export class WebRTCService {
  private pc: RTCPeerConnection | null = null;
  private localStream: MediaStream | null = null;
  private remoteStream: MediaStream | null = null;
  private callersUnsub: (() => void) | null = null;
  private calleesUnsub: (() => void) | null = null;
  private offerUnsub: (() => void) | null = null;
  private answerUnsub: (() => void) | null = null;
  private config: WebRTCServiceConfig;

  constructor(config: WebRTCServiceConfig = {}) {
    this.config = {
      video: true,
      audio: true,
      iceServers: ICE_SERVERS,
      ...config
    };
  }

  async startLocalStream(video = true, audio = true): Promise<{ localStream: MediaStream; remoteStream: MediaStream }> {
    try {
      console.log('Starting local media stream...');
      this.localStream = await navigator.mediaDevices.getUserMedia({ 
        video: video ? { width: 1280, height: 720 } : false, 
        audio 
      });
      this.remoteStream = new MediaStream();
      console.log('Local media stream started successfully');
      return { localStream: this.localStream, remoteStream: this.remoteStream };
    } catch (error) {
      console.error('Failed to start local stream:', error);
      throw error;
    }
  }

  createPeerConnection(onTrackCallback: (stream: MediaStream) => void): RTCPeerConnection {
    console.log('Creating peer connection...');
    this.pc = new RTCPeerConnection({ iceServers: this.config.iceServers });

    // Add local tracks to peer connection
    if (this.localStream) {
      this.localStream.getTracks().forEach(track => {
        if (this.pc) {
          this.pc.addTrack(track, this.localStream!);
          console.log('Added local track:', track.kind);
        }
      });
    }

    // Handle remote tracks
    this.pc.ontrack = (event) => {
      console.log('Received remote track:', event.track.kind);
      if (!this.remoteStream) {
        this.remoteStream = new MediaStream();
      }
      
      event.streams[0].getTracks().forEach(track => {
        this.remoteStream!.addTrack(track);
      });
      
      onTrackCallback(this.remoteStream!);
    };

    // Handle ICE connection state changes
    this.pc.oniceconnectionstatechange = () => {
      console.log('ICE connection state:', this.pc?.iceConnectionState);
    };

    // Handle connection state changes
    this.pc.onconnectionstatechange = () => {
      console.log('Connection state:', this.pc?.connectionState);
    };

    console.log('Peer connection created successfully');
    return this.pc;
  }

  // Caller flow: create offer, write to Firestore
  async createCall(sessionId: string, callerUid: string): Promise<any> {
    if (!this.pc) throw new Error("PeerConnection not created");
    
    console.log('Creating call for session:', sessionId);
    const callDocRef = doc(db, "CALLS", sessionId);
    const callerCandidatesCol = collection(callDocRef, "callerCandidates");

    // Collect ICE candidates and write to callerCandidates subcollection
    this.pc.onicecandidate = async (event) => {
      if (event.candidate) {
        try {
          await addDoc(callerCandidatesCol, { 
            candidate: event.candidate.toJSON(), 
            createdAt: serverTimestamp() 
          });
          console.log('Added caller ICE candidate');
        } catch (error) {
          console.error('Failed to add caller ICE candidate:', error);
        }
      }
    };

    // Create offer
    const offer = await this.pc.createOffer();
    await this.pc.setLocalDescription(offer);

    const offerData = {
      sdp: offer.sdp,
      type: offer.type,
      from: callerUid,
      createdAt: serverTimestamp()
    };

    await setDoc(callDocRef, { 
      offer: offerData, 
      createdAt: serverTimestamp(),
      sessionId: sessionId,
      callerUid: callerUid
    });

    console.log('Offer created and saved to Firestore');

    // Listen for answer
    this.answerUnsub = onSnapshot(callDocRef, (snapshot) => {
      const data = snapshot.data();
      if (!this.pc!.currentRemoteDescription && data?.answer) {
        console.log('Received answer, setting remote description');
        const answerDesc = { type: data.answer.type, sdp: data.answer.sdp };
        this.pc!.setRemoteDescription(answerDesc).catch(console.error);
      }
    });

    // Listen for callee ICE candidates
    const calleeCandidatesCol = collection(callDocRef, "calleeCandidates");
    this.calleesUnsub = onSnapshot(
      query(calleeCandidatesCol, orderBy("createdAt", "asc")), 
      (snap) => {
        snap.docChanges().forEach(change => {
          if (change.type === "added") {
            const cand = change.doc.data().candidate;
            this.pc!.addIceCandidate(new RTCIceCandidate(cand)).catch(console.error);
          }
        });
      }
    );

    return callDocRef;
  }

  // Callee flow: read offer, create answer, write answer, and collect candidates
  async answerCall(sessionId: string, calleeUid: string): Promise<any> {
    if (!this.pc) throw new Error("PeerConnection not created");
    
    console.log('Answering call for session:', sessionId);
    const callDocRef = doc(db, "CALLS", sessionId);

    // Wait for offer to be available
    let attempts = 0;
    const maxAttempts = 30; // 30 seconds timeout
    
    console.log('Waiting for offer from caller...');
    
    while (attempts < maxAttempts) {
      try {
        const callSnap = await getDoc(callDocRef);
        
        if (callSnap.exists()) {
          const data = callSnap.data();
          console.log('Call document exists:', data);
          const offer = data?.offer;
          
          if (offer) {
            console.log('Found offer, setting remote description');
            // Set remote description from offer
            await this.pc.setRemoteDescription({ type: offer.type, sdp: offer.sdp });

            // Collect ICE candidates and write to calleeCandidates subcollection
            const calleeCandidatesCol = collection(callDocRef, "calleeCandidates");
            this.pc.onicecandidate = async (event) => {
              if (event.candidate) {
                try {
                  await addDoc(calleeCandidatesCol, { 
                    candidate: event.candidate.toJSON(), 
                    createdAt: serverTimestamp() 
                  });
                  console.log('Added callee ICE candidate');
                } catch (error) {
                  console.error('Failed to add callee ICE candidate:', error);
                }
              }
            };

            // Create answer
            const answer = await this.pc.createAnswer();
            await this.pc.setLocalDescription(answer);

            const answerData = {
              sdp: answer.sdp,
              type: answer.type,
              from: calleeUid,
              createdAt: serverTimestamp()
            };

            await setDoc(callDocRef, { 
              answer: answerData,
              calleeUid: calleeUid
            }, { merge: true });

            console.log('Answer created and saved to Firestore');

            // Listen for caller ICE candidates
            const callerCandidatesCol = collection(callDocRef, "callerCandidates");
            this.callersUnsub = onSnapshot(
              query(callerCandidatesCol, orderBy("createdAt", "asc")), 
              (snap) => {
                snap.docChanges().forEach(change => {
                  if (change.type === "added") {
                    const cand = change.doc.data().candidate;
                    this.pc!.addIceCandidate(new RTCIceCandidate(cand)).catch(console.error);
                  }
                });
              }
            );

            return callDocRef;
          } else {
            console.log('Call document exists but no offer yet, attempt:', attempts + 1);
          }
        } else {
          console.log('Call document does not exist yet, attempt:', attempts + 1);
        }
      } catch (error) {
        console.error('Error checking for offer:', error);
      }
      
      // Wait 1 second before trying again
      await new Promise(resolve => setTimeout(resolve, 1000));
      attempts++;
    }

    throw new Error("Offer not found within timeout period");
  }

  // Toggle microphone
  async toggleMicrophone(): Promise<boolean> {
    if (!this.localStream) return false;
    
    const audioTrack = this.localStream.getAudioTracks()[0];
    if (audioTrack) {
      audioTrack.enabled = !audioTrack.enabled;
      console.log('Microphone toggled:', audioTrack.enabled ? 'ON' : 'OFF');
      return audioTrack.enabled;
    }
    return false;
  }

  // Toggle camera
  async toggleCamera(): Promise<boolean> {
    if (!this.localStream) return false;
    
    const videoTrack = this.localStream.getVideoTracks()[0];
    if (videoTrack) {
      videoTrack.enabled = !videoTrack.enabled;
      console.log('Camera toggled:', videoTrack.enabled ? 'ON' : 'OFF');
      return videoTrack.enabled;
    }
    return false;
  }

  // Start screen sharing
  async startScreenShare(): Promise<void> {
    if (!this.pc) throw new Error("PeerConnection not created");
    
    try {
      console.log('Starting screen share...');
      const screenStream = await navigator.mediaDevices.getDisplayMedia({ 
        video: true, 
        audio: true 
      });
      
      const screenTrack = screenStream.getVideoTracks()[0];
      const sender = this.pc.getSenders().find(s => s.track?.kind === 'video');
      
      if (sender) {
        await sender.replaceTrack(screenTrack);
        console.log('Screen sharing started');
        
        // Handle screen share end
        screenTrack.onended = async () => {
          console.log('Screen share ended, reverting to camera');
          const camStream = await navigator.mediaDevices.getUserMedia({ video: true });
          const camTrack = camStream.getVideoTracks()[0];
          await sender.replaceTrack(camTrack);
        };
      }
    } catch (error) {
      console.error('Failed to start screen sharing:', error);
      throw error;
    }
  }

  // Stop screen sharing
  async stopScreenShare(): Promise<void> {
    if (!this.pc) throw new Error("PeerConnection not created");
    
    try {
      console.log('Stopping screen share...');
      const sender = this.pc.getSenders().find(s => s.track?.kind === 'video');
      
      if (sender) {
        const camStream = await navigator.mediaDevices.getUserMedia({ video: true });
        const camTrack = camStream.getVideoTracks()[0];
        await sender.replaceTrack(camTrack);
        console.log('Screen sharing stopped');
      }
    } catch (error) {
      console.error('Failed to stop screen sharing:', error);
      throw error;
    }
  }

  // Check if connected
  isConnected(): boolean {
    return this.pc ? this.pc.connectionState === 'connected' : false;
  }

  // Get local video track
  getLocalVideoTrack(): MediaStreamTrack | null {
    return this.localStream ? this.localStream.getVideoTracks()[0] || null : null;
  }

  // Get local audio track
  getLocalAudioTrack(): MediaStreamTrack | null {
    return this.localStream ? this.localStream.getAudioTracks()[0] || null : null;
  }

  // Get remote stream
  getRemoteStream(): MediaStream | null {
    return this.remoteStream;
  }

  // Cleanup both client side and optionally Firestore doc
  async hangUp(sessionId: string, cleanupFirestore = true): Promise<void> {
    try {
      console.log('Hanging up call...');
      
      // Stop local tracks
      if (this.localStream) {
        this.localStream.getTracks().forEach(track => {
          track.stop();
          console.log('Stopped local track:', track.kind);
        });
      }

      // Close peer connection
      if (this.pc) {
        this.pc.getSenders().forEach(sender => {
          try { 
            sender.track?.stop(); 
          } catch (e) {
            console.warn('Error stopping sender track:', e);
          }
        });
        this.pc.close();
        console.log('Peer connection closed');
      }
    } catch (e) {
      console.error("Error during local cleanup", e);
    }

    // Unsubscribe listeners
    this.callersUnsub?.();
    this.calleesUnsub?.();
    this.answerUnsub?.();
    this.offerUnsub?.();

    // Optionally delete signaling data
    if (cleanupFirestore) {
      try {
        const callDocRef = doc(db, "CALLS", sessionId);
        await deleteDoc(callDocRef);
        console.log('Call document deleted from Firestore');
      } catch (error) {
        console.warn('Failed to delete call document:', error);
      }
    }

    // Reset state
    this.pc = null;
    this.localStream = null;
    this.remoteStream = null;
    this.callersUnsub = null;
    this.calleesUnsub = null;
    this.offerUnsub = null;
    this.answerUnsub = null;
  }
}
