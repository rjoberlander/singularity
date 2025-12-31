// Import API to ensure it's initialized before hooks are used
import "./api";

// Re-export all hooks from shared package
// Using direct path to the dist file as a workaround for Metro bundler
// not supporting package.json exports field
export * from "../../../packages/shared-api/dist/hooks";
