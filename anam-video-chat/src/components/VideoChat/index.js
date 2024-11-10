import { unsafe_createClientWithApiKey } from '@anam-ai/js-sdk';
import './style.css'

export class VideoChat {
    constructor(container) {
      // Debug log to verify environment variable loading
      console.log('Environment variables loaded:', {
        apiKeyExists: !!import.meta.env.VITE_ANAM_API_KEY,
        mode: import.meta.env.MODE
      });
  
      this.container = container;
      this.anamClient = null;
      this.userStream = null;
      this.isVideoEnabled = true;
      this.isAudioEnabled = false;
      this.currentStreamingMessage = null;
      this.currentStreamContent = '';
      this.isStreaming = false;
  
      this.init();
    }
    
    init() {
      this.render();
      this.attachEventListeners();
    }
  
    render() {
        this.container.innerHTML = `
        <div class="container">
          <div class="video-container">
              <video class="video-background" autoplay loop muted>
                  <source src="/media/video-tablets.mp4" type="video/mp4">
              </video>
              <video id="video-element-id" autoplay playsinline></video>
              <audio id="audio-element-id" autoplay></audio>
      
              <div class="stream-status" id="streamStatus" style="display: none;">
                  <span class="status-live"></span>
                  Live
              </div>
          </div>
      
          <div class="controls-row">
              <div class="user-video-container">
                  <video id="user-video" autoplay playsinline muted></video>
              </div>
      
              <div class="video-controls">
                  <button id="toggleVideo" class="control-button">📷</button>
                  <button id="toggleAudio" class="control-button muted">🎤</button>
              </div>
      
              <button id="startButton" class="control-button play"></button>
          </div>
      
          <div class="persona-selector">
              <div class="persona-circle active">
                  <img src="/media/Leo.png" alt="Dumuzi-Abzu">
                  <div class="persona-name">
                      <span class="sumerian">Dumuzi-Abzu</span>
                      <span class="english">Faithful Son of the Deep</span>
                  </div>
              </div>
              <div class="persona-circle">
                  <img src="/media/Enna.png" alt="Ninlil-Ek">
                  <div class="persona-name">
                      <span class="sumerian">Ninlil-Ek</span>
                      <span class="english">Lady of the Open Wind</span>
                  </div>
              </div>
              <div class="persona-circle">
                  <img src="/media/Sargon.png" alt="Šarru-kīn">
                  <div class="persona-name">
                      <span class="sumerian">Šarru-kīn</span>
                      <span class="english">True King</span>
                  </div>
              </div>
              <div class="persona-circle">
                  <img src="/media/Lugan.png" alt="Lugal-Gal">
                  <div class="persona-name">
                      <span class="sumerian">Lugal-Gal</span>
                      <span class="english">Great King</span>
                  </div>
              </div>
              <div class="persona-circle">
                  <img src="/media/Kuba.png" alt="Kulla-Bāni">
                  <div class="persona-name">
                      <span class="sumerian">Kulla-Bāni</span>
                      <span class="english">Creator of All</span>
                  </div>
              </div>
          </div>
      
          <div id="messageLog"></div>
        </div>
      `;
    }

//   addMessageToLog(role, content, isStreaming = false) {
//     const messageLog = document.getElementById('messageLog');
    
//     if (isStreaming && this.currentStreamingMessage) {
//         const contentDiv = this.currentStreamingMessage.querySelector('.message-content');
//         contentDiv.textContent = content;
//         messageLog.scrollTop = messageLog.scrollHeight;
//         return;
//     }

//     const messageDiv = document.createElement('div');
//     messageDiv.className = `message ${role.toLowerCase()}`;
    
//     const header = document.createElement('div');
//     header.className = 'message-header';
//     header.textContent = role === 'ai' ? 'Dumuzi-Abzu' : 'You';
    
//     const contentDiv = document.createElement('div');
//     contentDiv.className = 'message-content';
//     contentDiv.textContent = content;
    
//     messageDiv.appendChild(header);
//     messageDiv.appendChild(contentDiv);
//     messageLog.appendChild(messageDiv);
//     messageLog.scrollTop = messageLog.scrollHeight;

//     if (isStreaming) {
//         this.currentStreamingMessage = messageDiv;
//     }
//   }

//   finalizeStreamingMessage() {
//     this.currentStreamingMessage = null;
//   }

  async setupUserMedia() {
    try {
        this.userStream = await navigator.mediaDevices.getUserMedia({
            video: true,
            audio: true
        });
        
        const userVideo = document.getElementById('user-video');
        userVideo.srcObject = this.userStream;
        
        document.getElementById('toggleVideo').classList.remove('muted');
        document.getElementById('toggleAudio').classList.remove('muted');
        
        return this.userStream;
    } catch (error) {
        console.error('Error accessing user media:', error);
        this.addMessageToLog('ai', 'Unable to access camera or microphone. Please check permissions.');
        throw error;
    }
  }

  async initializeAnamClient() {
    try {
        const apiKey = import.meta.env.VITE_ANAM_API_KEY;
        console.log('Attempting to initialize with API key:', apiKey ? 'Key exists' : 'No key found');

        if (!apiKey) {
            throw new Error('API key not found. Make sure VITE_ANAM_API_KEY is set in your .env file');
        }

        this.anamClient = unsafe_createClientWithApiKey(apiKey, {
            personaId: '49dd9603-2e9c-4a1a-b1ce-a25f8d31e95d'
        });

        this.anamClient.addListener('CONNECTION_ESTABLISHED', () => {
            console.log('Connected to Anam AI');
        });

        this.anamClient.addListener('MESSAGE_HISTORY_UPDATED', (messages) => {
            if (!this.currentStreamingMessage) {
                document.getElementById('messageLog').innerHTML = '';
                messages.forEach(msg => {
                    this.addMessageToLog(
                        msg.role === 'assistant' ? 'ai' : 'human',
                        msg.content
                    );
                });
            }
        });

        this.anamClient.addListener('MESSAGE_STREAM_EVENT_RECEIVED', (message) => {
            if (message.type === 'transcript') {
                if (message.role === 'human') {
                    this.addMessageToLog('human', message.content);
                } else if (message.role === 'assistant') {
                    if (!message.isPartial) {
                        this.currentStreamContent = message.content;
                        this.addMessageToLog('ai', this.currentStreamContent);
                        this.currentStreamContent = '';
                        this.finalizeStreamingMessage();
                    } else {
                        this.currentStreamContent = message.content;
                        this.addMessageToLog('ai', this.currentStreamContent, true);
                    }
                }
            }
        });

        console.log('Anam client initialized with Dumuzi-Abzu');
        return true;
    } catch (error) {
        console.error('Error initializing Anam client:', error);
        this.addMessageToLog('ai', `Error: ${error.message}`);
        return false;
    }
  }

  async handleStartStop() {
    const startButton = document.getElementById('startButton');
    const videoElement = document.getElementById('video-element-id');
    
    if (!this.isStreaming) {
        try {
            const stream = await this.setupUserMedia();
            
            if (!this.anamClient) {
                const initialized = await this.initializeAnamClient();
                if (!initialized) {
                    throw new Error('Failed to initialize Anam client');
                }
            }

            console.log('Starting stream...');
            await this.anamClient.streamToVideoAndAudioElements(
                'video-element-id',
                'audio-element-id',
                stream
            );
            videoElement.style.display = 'block'; // Show video element when streaming starts
                        
            this.isStreaming = true;
            startButton.classList.remove('play');
            startButton.classList.add('stop');
            document.getElementById('streamStatus').style.display = 'flex';
            
            console.log('Stream started successfully');
        } catch (error) {
            console.error('Error starting stream:', error);
            this.addMessageToLog('ai', `Error: ${error.message}`);
        }
    } else {
        if (this.anamClient) {
            this.anamClient.stopStreaming();
            // Clear the video element's srcObject
            videoElement.srcObject = null;
            // Hide the video element so background video is visible
            videoElement.style.display = 'none';
        }
        
        if (this.userStream) {
            this.userStream.getTracks().forEach(track => track.stop());
            this.userStream = null;
            document.getElementById('user-video').srcObject = null;
        }
        
        this.isStreaming = false;
        startButton.classList.remove('stop');
        startButton.classList.add('play');
        document.getElementById('streamStatus').style.display = 'none';
    }
}

  attachEventListeners() {
    document.getElementById('toggleVideo')?.addEventListener('click', () => {
        if (this.userStream) {
            const videoTrack = this.userStream.getVideoTracks()[0];
            if (videoTrack) {
                this.isVideoEnabled = !this.isVideoEnabled;
                videoTrack.enabled = this.isVideoEnabled;
                document.getElementById('toggleVideo').classList.toggle('muted', !this.isVideoEnabled);
            }
        }
    });

    document.getElementById('toggleAudio')?.addEventListener('click', () => {
        if (this.userStream) {
            const audioTrack = this.userStream.getAudioTracks()[0];
            if (audioTrack) {
                this.isAudioEnabled = !this.isAudioEnabled;
                audioTrack.enabled = this.isAudioEnabled;
                document.getElementById('toggleAudio').classList.toggle('muted', !this.isAudioEnabled);
            }
        }
    });

    document.getElementById('startButton').addEventListener('click', () => this.handleStartStop());

    window.addEventListener('beforeunload', () => {
        if (this.userStream) {
            this.userStream.getTracks().forEach(track => track.stop());
        }
    });
  }
}