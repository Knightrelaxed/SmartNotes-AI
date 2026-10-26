// ============================================
// SMARTNOTES AI - APPLICATION CONFIGURATION
// ============================================

// Firebase Configuration
export const firebaseConfig = {
  apiKey: "AIzaSyAwbDw9ZRGmjYZ3_e3pYMuBpM7qFZ8pUJw",
  authDomain: "smartnotesai-f8e13.firebaseapp.com",
  projectId: "smartnotesai-f8e13",
  storageBucket: "smartnotesai-f8e13.firebasestorage.app",
  messagingSenderId: "1083200273741",
  appId: "1:1083200273741:web:a9dbbd2bc57fcc8145cb04",
  measurementId: "G-033GJ1YBHK"
};

// Gemini AI Configuration
export const geminiConfig = {
  apiKey: import.meta.env.VITE_GEMINI_API_KEY || "", // Legacy fallback dirutek ke env
  model: "gemini-3.5-flash-lite",  // Ultra-fast, lightweight, and modern Gemini model
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

// Admin Config
export const adminConfig = {
  // Opsional: jika ingin membatasi ke email tertentu via Environment Variable (.env)
  adminEmail: import.meta.env.VITE_ADMIN_EMAIL || '',
};

// Export all configs
export default {
  firebase: firebaseConfig,
  gemini: geminiConfig,
  aiProviders: aiProvidersConfig,
  app: appConfig
};
