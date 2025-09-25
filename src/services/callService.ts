import { doc, setDoc, getDoc, updateDoc, collection, query, where, getDocs, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase';

// Interface for PeerJS call data
export interface PeerJSCallData {
  sessionId: string;
  callerUid: string;
  calleeUid?: string;
  callerPeerId: string;
  calleePeerId?: string;
  status: 'active' | 'ended' | 'expired';
  createdAt: Date;
  endedAt?: Date;
}

// Create a call document when session is confirmed
export const createPeerJSCall = async (sessionId: string, callerUid: string, callerPeerId: string): Promise<void> => {
  try {
    console.log('Creating PeerJS call document for session:', sessionId);
    
    const callData: PeerJSCallData = {
      sessionId: sessionId,
      callerUid: callerUid,
      callerPeerId: callerPeerId,
      status: 'active',
      createdAt: new Date()
    };
    
    // Store in CALLS collection
    await setDoc(doc(db, 'CALLS', sessionId), {
      ...callData,
      createdAt: serverTimestamp()
    });
    
    console.log('PeerJS call document created successfully');
    
  } catch (error) {
    console.error('Failed to create PeerJS call document:', error);
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
export const endPeerJSCall = async (sessionId: string): Promise<void> => {
  try {
    console.log('Ending PeerJS call for session:', sessionId);
    
    const callDocRef = doc(db, 'CALLS', sessionId);
    await updateDoc(callDocRef, {
      status: 'ended',
      endedAt: serverTimestamp()
    });
    
    console.log('PeerJS call ended successfully');
    
  } catch (error) {
    console.error('Failed to end PeerJS call:', error);
    throw error;
  }
};

// Clean up expired calls
export const cleanupExpiredPeerJSCalls = async (): Promise<void> => {
  try {
    console.log('Cleaning up expired PeerJS calls...');
    
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
      const callData = docSnapshot.data() as PeerJSCallData;
      
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
    
    console.log(`Cleaned up ${cleanedCount} expired PeerJS calls`);
    
  } catch (error) {
    console.error('Failed to cleanup expired PeerJS calls:', error);
  }
};

// Get call data for a session
export const getCallData = async (sessionId: string): Promise<PeerJSCallData | null> => {
  try {
    const callDocRef = doc(db, 'CALLS', sessionId);
    const callSnap = await getDoc(callDocRef);
    
    if (callSnap.exists()) {
      return callSnap.data() as PeerJSCallData;
    }
    
    return null;
  } catch (error) {
    console.error('Failed to get call data:', error);
    return null;
  }
};

// Update callee peer ID when interpreter joins
export const updateCalleePeerId = async (sessionId: string, calleeUid: string, calleePeerId: string): Promise<void> => {
  try {
    console.log('Updating callee peer ID for session:', sessionId);
    
    const callDocRef = doc(db, 'CALLS', sessionId);
    await updateDoc(callDocRef, {
      calleeUid: calleeUid,
      calleePeerId: calleePeerId
    });
    
    console.log('Callee peer ID updated successfully');
    
  } catch (error) {
    console.error('Failed to update callee peer ID:', error);
    throw error;
  }
};
