// ============================================
// SMARTNOTES AI - APPLICATION CONFIGURATION
// ============================================

// Firebase Configuration
export const firebaseConfig = {
  apiKey: "AIzaSyAmpfBlEOVgKREVHwdJh7xBU2GRmXAUXpY",
  authDomain: "smartnotes-ai-ae90a.firebaseapp.com",
  databaseURL: "https://smartnotes-ai-ae90a-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "smartnotes-ai-ae90a",
  storageBucket: "smartnotes-ai-ae90a.firebasestorage.app",
  messagingSenderId: "1068046768020",
  appId: "1:1068046768020:web:b7e23135369090ef422181",
  measurementId: "G-L4SHVJ6PKW"
};

// Gemini AI Configuration
export const geminiConfig = {
  apiKey: import.meta.env.VITE_GEMINI_API_KEY || "", // Legacy fallback dirutek ke env
  model: "gemini-2.0-flash",  // Fast, modern, and widely supported model
  baseUrl: "https://generativelanguage.googleapis.com/v1beta",
  
  // Default generation config
  generationConfig: {
    temperature: 0.3, // Lower temperature for more deterministic/academic output
    topK: 40,
    topP: 0.95,
    maxOutputTokens: 2048
  }
};

// Multi-Provider AI Configuration
export const aiProvidersConfig = {
  gemini: [
    { key: import.meta.env.VITE_GEMINI_PRIMARY_KEY || "", label: "Primary Gemini" },
    { key: import.meta.env.VITE_GEMINI_SECONDARY_KEY || "", label: "Secondary Gemini" }
  ],
  openrouter: {
    key: import.meta.env.VITE_OPENROUTER_API_KEY || "",
    baseUrl: "https://openrouter.ai/api/v1",
    models: {
      primary: "meta-llama/llama-3.3-70b-instruct:free",
      fallback: "qwen/qwen3.6-plus:free" // Changed to active free endpoint
    }
  }
};

// App Settings
export const appConfig = {
  name: "SmartNotes AI",
  version: "1.0.0",
  defaultLanguage: "id-ID",
  maxRecordingDuration: 3600, // 1 hour in seconds
  autoSaveInterval: 30000,    // 30 seconds
};

// Export all configs
export default {
  firebase: firebaseConfig,
  gemini: geminiConfig,
  aiProviders: aiProvidersConfig,
  app: appConfig
};
