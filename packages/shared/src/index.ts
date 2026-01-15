// Export all shared modules
export * from './types';
export * from './constants';

// Services - Hybrid Export (Flat + Namespaced)
// This supports both "import { login }" and "import { authService }" usage

// Auth
export * from './services/authService';
import * as authService from './services/authService';
export { authService };

// Analytics
export * from './services/analyticsService';
import * as analyticsService from './services/analyticsService';
export { analyticsService };

// Content Refinery
// Content Refinery (Server-side only - disabled for mobile compatibility)
// export * from './services/contentRefinery';
// import * as contentRefinery from './services/contentRefinery';
// export { contentRefinery };

// Facebook Pixel
export * from './services/facebookPixelService';
import * as facebookPixelService from './services/facebookPixelService';
export { facebookPixelService };

// Gemini (Server-side only)
// export * from './services/geminiService';
// import * as geminiService from './services/geminiService';
// export { geminiService };

// OpenAI (Server-side only)
// export * from './services/openaiService';
// import * as openaiService from './services/openaiService';
// export { openaiService };

// Performance
export * from './services/performanceService';
import * as performanceService from './services/performanceService';
export { performanceService };

// Preloader
export * from './services/preloaderService';
import * as preloaderService from './services/preloaderService';
export { preloaderService };

// Profile
export * from './services/profileService';
import * as profileService from './services/profileService';
export { profileService };

// Question Cache
export * from './services/questionCacheService';
import * as questionCacheService from './services/questionCacheService';
export { questionCacheService };

// Sprint
export * from './services/sprintService';
import * as sprintService from './services/sprintService';
export { sprintService };

// Variant Generator (Server-side only)
// export * from './services/variantGenerator';
// import * as variantGenerator from './services/variantGenerator';
// export { variantGenerator };

// Vertex Backend
// export * from './services/vertexBackendService'; 
import * as vertexBackendService from './services/vertexBackendService';
export { vertexBackendService };


// Lib
export * from './lib/taxonomy';
export * from './lib/utils';
export * from './lib/log';
export * from './lib/health';
export * from './lib/explCache';
export * from './lib/supabase';
export * from './lib/svgSanitizer';

// Hooks (Careful with React usage)
export * from './hooks/useDashboardData';

// Validation
export * from './lib/clientValidator';
export * from './lib/taxonomy/physicsRules';
