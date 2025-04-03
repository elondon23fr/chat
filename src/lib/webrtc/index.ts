import Peer from 'simple-peer';

// Configuration WebRTC
const configuration = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:global.stun.twilio.com:3478' }
  ]
};

// Classe pour gérer les connexions WebRTC
export class WebRTCManager {
  private peers: Map<number, Peer.Instance> = new Map();
  private localStream: MediaStream | null = null;
  private onStreamCallbacks: Map<number, (stream: MediaStream) => void> = new Map();

  // Initialiser le flux local (webcam)
  async initLocalStream() {
    try {
      this.localStream = await navigator.mediaDevices.getUserMedia({ 
        video: true, 
        audio: true 
      });
      return this.localStream;
    } catch (error) {
      console.error('Erreur lors de l\'accès à la webcam:', error);
      throw error;
    }
  }

  // Arrêter le flux local
  stopLocalStream() {
    if (this.localStream) {
      this.localStream.getTracks().forEach(track => track.stop());
      this.localStream = null;
    }
  }

  // Créer un pair pour un utilisateur spécifique (initiateur)
  createPeer(userId: number, onStream: (stream: MediaStream) => void) {
    if (!this.localStream) {
      throw new Error('Le flux local n\'est pas initialisé');
    }

    this.onStreamCallbacks.set(userId, onStream);

    const peer = new Peer({
      initiator: true,
      trickle: false,
      stream: this.localStream,
      config: configuration
    });

    this.setupPeerEvents(peer, userId);
    this.peers.set(userId, peer);
    
    return peer;
  }

  // Accepter une connexion d'un autre utilisateur
  acceptPeer(userId: number, signal: any, onStream: (stream: MediaStream) => void) {
    if (!this.localStream) {
      throw new Error('Le flux local n\'est pas initialisé');
    }

    this.onStreamCallbacks.set(userId, onStream);

    const peer = new Peer({
      initiator: false,
      trickle: false,
      stream: this.localStream,
      config: configuration
    });

    this.setupPeerEvents(peer, userId);
    peer.signal(signal);
    this.peers.set(userId, peer);
    
    return peer;
  }

  // Configurer les événements pour un pair
  private setupPeerEvents(peer: Peer.Instance, userId: number) {
    peer.on('signal', data => {
      // Cet événement sera géré par le composant parent
      // qui enverra le signal via Socket.IO
    });

    peer.on('stream', stream => {
      const callback = this.onStreamCallbacks.get(userId);
      if (callback) {
        callback(stream);
      }
    });

    peer.on('error', err => {
      console.error('Erreur WebRTC:', err);
      this.destroyPeer(userId);
    });

    peer.on('close', () => {
      this.destroyPeer(userId);
    });
  }

  // Vérifier si un pair existe pour un utilisateur donné
  hasPeer(userId: number): boolean {
    return this.peers.has(userId);
  }

  // Recevoir un signal d'un autre utilisateur
  signalPeer(userId: number, signal: any) {
    const peer = this.peers.get(userId);
    if (peer) {
      peer.signal(signal);
    }
  }

  // Détruire un pair spécifique
  destroyPeer(userId: number) {
    const peer = this.peers.get(userId);
    if (peer) {
      peer.destroy();
      this.peers.delete(userId);
      this.onStreamCallbacks.delete(userId);
    }
  }

  // Détruire tous les pairs
  destroyAllPeers() {
    this.peers.forEach(peer => {
      peer.destroy();
    });
    this.peers.clear();
    this.onStreamCallbacks.clear();
    this.stopLocalStream();
  }

  // Obtenir le flux local
  getLocalStream() {
    return this.localStream;
  }
}
