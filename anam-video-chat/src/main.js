import { VideoChat } from './components/VideoChat/index.js';
import '@/styles/global.css';  // Global styles first

document.addEventListener('DOMContentLoaded', () => {
  const container = document.getElementById('app');
  if (!container) {
    console.error('Could not find app container');
    return;
  }
  
  try {
    new VideoChat(container);
  } catch (error) {
    console.error('Error initializing VideoChat:', error);
  }
});