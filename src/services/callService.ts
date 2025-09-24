import { doc, setDoc, getDoc, updateDoc, collection, query, where, getDocs, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase';

// Interface for WebRTC call data
export interface WebRTCCallData {
  sessionId: string;
  callerUid: string;
  calleeUid?: string;
  status: 'active' | 'ended' | 'expired';
  createdAt: Date;
  endedAt?: Date;
}

// Create a call document when session is confirmed
export const createWebRTCCall = async (sessionId: string, callerUid: string): Promise<void> => {
  try {
    console.log('Creating WebRTC call document for session:', sessionId);
    
    const callData: WebRTCCallData = {
      sessionId: sessionId,
      callerUid: callerUid,
      status: 'active',
      createdAt: new Date()
    };
    
    // Store in CALLS collection
    await setDoc(doc(db, 'CALLS', sessionId), {
      ...callData,
      createdAt: serverTimestamp()
    });
    
    console.log('WebRTC call document created successfully');
    
  } catch (error) {
    console.error('Failed to create WebRTC call document:', error);
    throw error;
  }
};

// Check if call exists for a session
export const checkCallExists = async (sessionId: string): Promise<boolean> => {
  try {
    const callDocRef = doc(db, 'CALLS', sessionId);
    const callSnap = await getDoc(callDocRef);
    return callSnap.exists();
  } catch (error) {
    console.error('Failed to check call existence:', error);
    return false;
  }
};

// End call and update status
export const endWebRTCCall = async (sessionId: string): Promise<void> => {
  try {
    console.log('Ending WebRTC call for session:', sessionId);
    
    const callDocRef = doc(db, 'CALLS', sessionId);
    await updateDoc(callDocRef, {
      status: 'ended',
      endedAt: serverTimestamp()
    });
    
    console.log('WebRTC call ended successfully');
    
  } catch (error) {
    console.error('Failed to end WebRTC call:', error);
    throw error;
  }
};

// Clean up expired calls
export const cleanupExpiredWebRTCCalls = async (): Promise<void> => {
  try {
    console.log('Cleaning up expired WebRTC calls...');
    
    const callsRef = collection(db, 'CALLS');
    const q = query(
      callsRef,
      where('status', '==', 'active')
    );
    
    const querySnapshot = await getDocs(q);
    
    let cleanedCount = 0;
    const now = new Date();
    const expirationTime = 2 * 60 * 60 * 1000; // 2 hours in milliseconds
    
    for (const docSnapshot of querySnapshot.docs) {
      const callData = docSnapshot.data() as WebRTCCallData;
      
      // Check if call is expired (older than 2 hours)
      const createdAt = callData.createdAt instanceof Date ? callData.createdAt : new Date(callData.createdAt);
      if (now.getTime() - createdAt.getTime() > expirationTime) {
        await updateDoc(doc(db, 'CALLS', docSnapshot.id), {
          status: 'expired',
          endedAt: serverTimestamp()
        });
        cleanedCount++;
      }
    }
    
    console.log(`Cleaned up ${cleanedCount} expired WebRTC calls`);
    
  } catch (error) {
    console.error('Failed to cleanup expired WebRTC calls:', error);
  }
};
